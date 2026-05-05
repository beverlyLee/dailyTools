"""
分子动力学核心模拟器
实现：晶格结构生成、Lennard-Jones势函数、Velocity-Verlet积分器、
      周期性边界条件、温度压力能量计算、NVE系综验证
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import uuid
import json
from datetime import datetime


class LatticeType(Enum):
    FCC = "FCC"  # 面心立方
    BCC = "BCC"  # 体心立方
    SC = "SC"    # 简单立方


@dataclass
class AtomType:
    name: str
    mass: float           # 原子质量 (amu)
    sigma: float          # LJ参数 sigma (Å)
    epsilon: float        # LJ参数 epsilon (kcal/mol)


@dataclass
class Atom:
    index: int
    type: str
    position: np.ndarray   # (x, y, z) 位置 (Å)
    velocity: np.ndarray   # (vx, vy, vz) 速度 (Å/fs)
    force: np.ndarray      # (fx, fy, fz) 受力 (kcal/(mol·Å))


# 常用原子类型
ATOM_TYPES = {
    "Ar": AtomType(name="Ar", mass=39.95, sigma=3.405, epsilon=0.238),
    "Xe": AtomType(name="Xe", mass=131.29, sigma=4.10, epsilon=0.310),
    "Kr": AtomType(name="Kr", mass=83.80, sigma=3.60, epsilon=0.280),
}


class MDSimulator:
    """分子动力学模拟器 - 微正则系综(NVE)"""
    
    # 单位转换常数
    BOLTZMANN = 0.0019872041    # kcal/(mol·K)
    FEMTO_TO_SEC = 1e-15
    ANG_TO_METER = 1e-10
    KCAL_TO_JOULE = 4184.0
    AVOGADRO = 6.022e23
    
    def __init__(
        self,
        lattice_type: LatticeType = LatticeType.FCC,
        unit_cells: int = 3,
        atom_type: str = "Ar",
        lattice_constant: Optional[float] = None,
        temperature: float = 300.0,
        timestep: float = 1.0,
        cutoff: Optional[float] = None,
    ):
        """
        初始化分子动力学模拟器
        
        Args:
            lattice_type: 晶格类型 (FCC, BCC, SC)
            unit_cells: 每个方向的晶胞数
            atom_type: 原子类型
            lattice_constant: 晶格常数 (Å)，默认使用 LJ sigma*2^(1/6)
            temperature: 初始温度 (K)
            timestep: 时间步长 (fs)
            cutoff: 截断半径 (Å)，默认使用 2.5*sigma
        """
        self.lattice_type = lattice_type
        self.unit_cells = unit_cells
        self.atom_type = atom_type
        self.atom_params = ATOM_TYPES[atom_type]
        
        # 设置截断半径
        self.sigma = self.atom_params.sigma
        self.epsilon = self.atom_params.epsilon
        self.cutoff = cutoff if cutoff else 2.5 * self.sigma
        
        # 晶格常数 (使用 LJ 晶体的近邻距离 = 2^(1/6)*sigma)
        if lattice_constant is None:
            if lattice_type == LatticeType.FCC:
                self.lattice_constant = self.sigma * (2 ** (1/6)) * np.sqrt(2)
            elif lattice_type == LatticeType.BCC:
                self.lattice_constant = self.sigma * (2 ** (1/6)) * 2 / np.sqrt(3)
            else:  # SC
                self.lattice_constant = self.sigma * (2 ** (1/6))
        else:
            self.lattice_constant = lattice_constant
        
        self.temperature = temperature
        self.timestep = timestep
        self.mass = self.atom_params.mass
        
        # 模拟状态
        self.current_step = 0
        self.atoms: List[Atom] = []
        self.box_length = self.unit_cells * self.lattice_constant
        self.volume = self.box_length ** 3
        self.n_atoms = 0
        
        # 初始化晶格
        self._initialize_lattice()
        
        # 统计数据历史
        self.stats_history = []
        
        # 轨迹数据帧
        self.trajectory_frames = []
    
    def _initialize_lattice(self):
        """根据晶格类型初始化原子位置"""
        atoms = []
        a = self.lattice_constant
        idx = 0
        
        for i in range(self.unit_cells):
            for j in range(self.unit_cells):
                for k in range(self.unit_cells):
                    base_x = i * a
                    base_y = j * a
                    base_z = k * a
                    
                    if self.lattice_type == LatticeType.FCC:
                        # 面心立方: 8个顶点 + 6个面心
                        positions = [
                            (0, 0, 0),
                            (0, a/2, a/2),
                            (a/2, 0, a/2),
                            (a/2, a/2, 0),
                        ]
                    elif self.lattice_type == LatticeType.BCC:
                        # 体心立方: 8个顶点 + 1个体心
                        positions = [
                            (0, 0, 0),
                            (a/2, a/2, a/2),
                        ]
                    else:  # SC
                        positions = [(0, 0, 0)]
                    
                    for dx, dy, dz in positions:
                        pos = np.array([base_x + dx, base_y + dy, base_z + dz], dtype=np.float64)
                        atom = Atom(
                            index=idx,
                            type=self.atom_type,
                            position=pos,
                            velocity=np.zeros(3, dtype=np.float64),
                            force=np.zeros(3, dtype=np.float64),
                        )
                        atoms.append(atom)
                        idx += 1
        
        self.atoms = atoms
        self.n_atoms = len(atoms)
        
        # 初始化速度
        self._initialize_velocities()
    
    def _initialize_velocities(self):
        """根据麦克斯韦-玻尔兹曼分布初始化速度"""
        # 随机生成速度
        np.random.seed(42)  # 可复现性
        std = np.sqrt(self.BOLTZMANN * self.temperature / self.mass)
        
        for atom in self.atoms:
            atom.velocity = np.random.normal(0, std, 3)
        
        # 移除整体动量（质心速度归零）
        total_velocity = np.zeros(3)
        for atom in self.atoms:
            total_velocity += atom.velocity
        
        avg_velocity = total_velocity / self.n_atoms
        for atom in self.atoms:
            atom.velocity -= avg_velocity
        
        # 重标度速度到目标温度
        self._rescale_velocities(self.temperature)
    
    def _rescale_velocities(self, target_temp: float):
        """根据目标温度重标度速度"""
        current_temp = self._compute_temperature()
        if current_temp > 0:
            scaling_factor = np.sqrt(target_temp / current_temp)
            for atom in self.atoms:
                atom.velocity *= scaling_factor
    
    def _compute_temperature(self) -> float:
        """计算瞬时温度"""
        # 动能 = sum(0.5 * m * v^2)
        # 温度 = (2 * KE) / (3 * N * kB)
        kinetic_energy = 0.0
        for atom in self.atoms:
            kinetic_energy += 0.5 * self.mass * np.sum(atom.velocity ** 2)
        
        # 3个自由度每个原子
        degrees_of_freedom = 3 * self.n_atoms
        temperature = (2 * kinetic_energy) / (degrees_of_freedom * self.BOLTZMANN)
        return temperature
    
    def _compute_forces(self) -> Tuple[float, float]:
        """
        计算所有原子的受力 (周期性边界条件 + 最小镜像约定)
        
        Returns:
            potential_energy: 系统势能 (kcal/mol)
            virial: 维里项 (用于压力计算)
        """
        # 重置所有力
        for atom in self.atoms:
            atom.force = np.zeros(3)
        
        potential_energy = 0.0
        virial = 0.0
        cutoff_sq = self.cutoff ** 2
        
        sigma = self.sigma
        epsilon = self.epsilon
        box_length = self.box_length
        
        # 计算截断处的势能（用于移位）
        rc_over_sigma = self.cutoff / sigma
        rc_over_sigma6 = rc_over_sigma ** 6
        rc_over_sigma12 = rc_over_sigma6 ** 2
        u_shift = 4 * epsilon * (1/rc_over_sigma12 - 1/rc_over_sigma6)
        
        # 遍历所有原子对 (i < j)
        for i in range(self.n_atoms):
            atom_i = self.atoms[i]
            for j in range(i + 1, self.n_atoms):
                atom_j = self.atoms[j]
                
                # 位移向量 r_j - r_i
                dr = atom_j.position - atom_i.position
                
                # 最小镜像约定
                dr = dr - box_length * np.round(dr / box_length)
                
                r_sq = np.sum(dr ** 2)
                
                if r_sq < cutoff_sq:
                    r = np.sqrt(r_sq)
                    
                    # Lennard-Jones 势
                    # V(r) = 4*epsilon*[(sigma/r)^12 - (sigma/r)^6]
                    # 力 F = -dV/dr
                    
                    r_inv = 1.0 / r
                    sigma_over_r = sigma * r_inv
                    sigma_over_r2 = sigma_over_r ** 2
                    sigma_over_r4 = sigma_over_r2 ** 2
                    sigma_over_r6 = sigma_over_r4 * sigma_over_r2
                    sigma_over_r12 = sigma_over_r6 ** 2
                    
                    # 势能（截断移位）
                    u_pair = 4 * epsilon * (sigma_over_r12 - sigma_over_r6) - u_shift
                    potential_energy += u_pair
                    
                    # 力的大小: |F| = dV/dr
                    # dV/dr = 4*epsilon*(-12*sigma^12/r^13 + 6*sigma^6/r^7)
                    #       = 24*epsilon/r * (2*(sigma/r)^12 - (sigma/r)^6)
                    force_magnitude = 24 * epsilon * r_inv * (2 * sigma_over_r12 - sigma_over_r6)
                    
                    # 力向量
                    force_vector = force_magnitude * (dr * r_inv)
                    
                    atom_i.force += force_vector
                    atom_j.force -= force_vector
                    
                    # 维里项: r_ij · F_ij
                    virial += np.dot(dr, force_vector)
        
        return potential_energy, virial
    
    def _compute_kinetic_energy(self) -> float:
        """计算动能"""
        ke = 0.0
        for atom in self.atoms:
            ke += 0.5 * self.mass * np.sum(atom.velocity ** 2)
        return ke
    
    def _compute_pressure(self, kinetic_energy: float, virial: float) -> float:
        """
        计算压力（使用维里方程）
        
        P = (N * kB * T) / V + (1 / (3V)) * <sum_{i<j} r_ij · F_ij>
        """
        # 理想气体项: N*kBT/V
        # 单位转换需要注意
        temperature = self._compute_temperature()
        
        # 压力单位: kcal/(mol·Å^3) 转换为 bar
        # 1 bar = 1e5 Pa = 1e5 N/m^2 = 1e5 J/m^3 = 1e5 / 4184 kcal/(m^3)
        # = 1e5 / (4184 * 1e30) kcal/(Å^3)
        
        # N * kB * T
        ideal_gas_term = self.n_atoms * self.BOLTZMANN * temperature
        
        # 维里项
        virial_term = virial / 3.0
        
        # 总压力: P = (NkBT + virial/3) / V
        pressure = (ideal_gas_term + virial_term) / self.volume
        
        return pressure
    
    def step(self):
        """
        执行一个时间步长（Velocity-Verlet 算法）
        
        Velocity-Verlet:
        1. r(t+dt) = r(t) + v(t)*dt + 0.5*a(t)*dt^2
        2. v(t+dt/2) = v(t) + 0.5*a(t)*dt
        3. a(t+dt) = F(t+dt)/m (通过计算新位置的力)
        4. v(t+dt) = v(t+dt/2) + 0.5*a(t+dt)*dt
        """
        dt = self.timestep
        
        # 步骤 1 & 2: 更新位置和半时间步速度
        for atom in self.atoms:
            # a = F/m
            acceleration = atom.force / self.mass
            
            # v(t + dt/2) = v(t) + 0.5 * a(t) * dt
            atom.velocity += 0.5 * acceleration * dt
            
            # r(t + dt) = r(t) + v(t+dt/2) * dt
            atom.position += atom.velocity * dt
            
            # 应用周期性边界条件
            atom.position = atom.position % self.box_length
        
        # 步骤 3: 计算新位置的力
        potential_energy, virial = self._compute_forces()
        
        # 步骤 4: 完成速度更新
        for atom in self.atoms:
            acceleration = atom.force / self.mass
            # v(t+dt) = v(t+dt/2) + 0.5 * a(t+dt) * dt
            atom.velocity += 0.5 * acceleration * dt
        
        # 计算统计量
        kinetic_energy = self._compute_kinetic_energy()
        temperature = self._compute_temperature()
        pressure = self._compute_pressure(kinetic_energy, virial)
        total_energy = potential_energy + kinetic_energy
        
        self.current_step += 1
        
        stats = {
            "step": self.current_step,
            "temperature": temperature,
            "pressure": pressure,
            "potential_energy": potential_energy,
            "kinetic_energy": kinetic_energy,
            "total_energy": total_energy,
        }
        
        self.stats_history.append(stats)
        
        return stats
    
    def run(self, n_steps: int, record_interval: int = 10) -> Dict:
        """
        运行模拟
        
        Args:
            n_steps: 要运行的步数
            record_interval: 记录轨迹的间隔步数
        
        Returns:
            模拟统计信息
        """
        start_step = self.current_step
        end_step = start_step + n_steps
        
        # 初始状态记录
        self._record_frame()
        
        while self.current_step < end_step:
            stats = self.step()
            
            # 按间隔记录轨迹
            if (self.current_step - start_step) % record_interval == 0:
                self._record_frame()
        
        # 计算能量守恒验证（总能波动）
        total_energies = [s["total_energy"] for s in self.stats_history[-n_steps:]]
        mean_energy = np.mean(total_energies)
        energy_fluctuation = np.std(total_energies) / abs(mean_energy) if abs(mean_energy) > 1e-10 else 0
        
        return {
            "start_step": start_step,
            "end_step": self.current_step,
            "final_temperature": stats["temperature"],
            "final_pressure": stats["pressure"],
            "final_potential_energy": stats["potential_energy"],
            "final_kinetic_energy": stats["kinetic_energy"],
            "final_total_energy": stats["total_energy"],
            "energy_conservation_check": {
                "mean_total_energy": mean_energy,
                "relative_fluctuation": energy_fluctuation,
                "is_conserved": energy_fluctuation < 0.01,  # 1%阈值
            },
            "n_frames_recorded": len(self.trajectory_frames),
        }
    
    def _record_frame(self):
        """记录当前帧的原子状态"""
        frame = {
            "step": self.current_step,
            "box_length": self.box_length,
            "atoms": [
                {
                    "index": atom.index,
                    "type": atom.type,
                    "x": atom.position[0],
                    "y": atom.position[1],
                    "z": atom.position[2],
                    "vx": atom.velocity[0],
                    "vy": atom.velocity[1],
                    "vz": atom.velocity[2],
                    "fx": atom.force[0],
                    "fy": atom.force[1],
                    "fz": atom.force[2],
                }
                for atom in self.atoms
            ],
            "stats": self.stats_history[-1] if self.stats_history else None,
        }
        self.trajectory_frames.append(frame)
    
    def get_frame(self, step_idx: int) -> Optional[Dict]:
        """获取指定帧"""
        if 0 <= step_idx < len(self.trajectory_frames):
            return self.trajectory_frames[step_idx]
        return None
    
    def get_trajectory_data(self, frame_start: int = 0, frame_end: int = -1) -> List[Dict]:
        """获取轨迹数据"""
        if frame_end < 0:
            frame_end = len(self.trajectory_frames)
        return self.trajectory_frames[frame_start:frame_end]
    
    def get_current_stats(self) -> Dict:
        """获取当前统计量"""
        if self.stats_history:
            return self.stats_history[-1]
        return {
            "step": 0,
            "temperature": 0,
            "pressure": 0,
            "potential_energy": 0,
            "kinetic_energy": 0,
            "total_energy": 0,
        }


# 模拟管理器（用于支持多个并发模拟）
class SimulationManager:
    def __init__(self):
        self.simulations: Dict[str, MDSimulator] = {}
        self.simulation_configs: Dict[str, Dict] = {}
    
    def create_simulation(self, config: Dict) -> str:
        """创建新的模拟实例"""
        sim_id = str(uuid.uuid4())
        
        lattice_type = LatticeType(config.get("lattice_type", "FCC"))
        
        simulator = MDSimulator(
            lattice_type=lattice_type,
            unit_cells=config.get("unit_cells", 3),
            atom_type=config.get("atom_type", "Ar"),
            temperature=config.get("temperature", 300.0),
            timestep=config.get("timestep", 1.0),
        )
        
        self.simulations[sim_id] = simulator
        self.simulation_configs[sim_id] = {
            **config,
            "created_at": datetime.now().isoformat(),
            "status": "initialized",
        }
        
        return sim_id
    
    def get_simulation(self, sim_id: str) -> Optional[MDSimulator]:
        return self.simulations.get(sim_id)
    
    def get_simulation_status(self, sim_id: str) -> Optional[Dict]:
        if sim_id not in self.simulations:
            return None
        sim = self.simulations[sim_id]
        config = self.simulation_configs[sim_id]
        return {
            "simulation_id": sim_id,
            "status": config.get("status", "unknown"),
            "current_step": sim.current_step,
            "total_steps": config.get("steps", 0),
            "n_atoms": sim.n_atoms,
            "box_length": sim.box_length,
            "created_at": config.get("created_at"),
        }
    
    def run_simulation(self, sim_id: str, steps: int, record_interval: int = 10) -> Dict:
        """运行指定的模拟"""
        if sim_id not in self.simulations:
            raise ValueError(f"Simulation {sim_id} not found")
        
        self.simulation_configs[sim_id]["status"] = "running"
        simulator = self.simulations[sim_id]
        
        result = simulator.run(steps, record_interval)
        
        self.simulation_configs[sim_id]["status"] = "completed"
        self.simulation_configs[sim_id]["result"] = result
        
        return result


# 全局单例管理器
simulation_manager = SimulationManager()
