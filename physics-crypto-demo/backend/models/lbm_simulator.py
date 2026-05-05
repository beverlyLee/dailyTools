import numpy as np
import taichi as ti
from typing import Dict, Tuple, List

ti.init(arch=ti.cpu)

@ti.data_oriented
class LBMSimulator:
    def __init__(self, nx: int = 256, ny: int = 128, reynolds: float = 1000.0, inlet_vel: float = 0.1):
        self.nx = nx
        self.ny = ny
        self.reynolds = reynolds
        self.inlet_vel = inlet_vel
        
        # LBM D2Q9 参数
        self.q = 9
        self.c = np.array([
            [0, 1, 0, -1, 0, 1, -1, -1, 1],
            [0, 0, 1, 0, -1, 1, 1, -1, -1]
        ], dtype=np.int32).T
        
        self.w = np.array([4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36], dtype=np.float64)
        
        # 计算粘性系数和松弛时间
        char_length = ny
        self.nu = inlet_vel * char_length / reynolds
        self.tau = 3.0 * self.nu + 0.5
        
        # Taichi 场
        self.f = ti.field(dtype=ti.f64, shape=(nx, ny, self.q))
        self.f_new = ti.field(dtype=ti.f64, shape=(nx, ny, self.q))
        self.rho = ti.field(dtype=ti.f64, shape=(nx, ny))
        self.u = ti.Vector.field(2, dtype=ti.f64, shape=(nx, ny))
        self.obstacle = ti.field(dtype=ti.i32, shape=(nx, ny))
        
        # 初始化
        self.initialize()
        self.setup_obstacle()
    
    @ti.kernel
    def initialize(self):
        # 初始化密度为 1，速度为 0
        for i, j, k in self.f:
            self.f[i, j, k] = self.w[k]
        
        # 设置入口速度
        for j in range(self.ny):
            self.u[0, j][0] = self.inlet_vel
            self.u[0, j][1] = 0.0
            self.rho[0, j] = 1.0
        
        self.update_equilibrium()
    
    @ti.kernel
    def update_equilibrium(self):
        for i, j, k in self.f:
            u_mag = self.u[i, j][0]**2 + self.u[i, j][1]**2
            cu = self.c[k, 0] * self.u[i, j][0] + self.c[k, 1] * self.u[i, j][1]
            self.f[i, j, k] = self.w[k] * self.rho[i, j] * (
                1.0 + 3.0 * cu + 4.5 * cu**2 - 1.5 * u_mag
            )
    
    @ti.kernel
    def setup_obstacle(self):
        # 创建一个圆形障碍物
        cx = self.nx // 4
        cy = self.ny // 2
        r = min(self.ny // 8, 12)
        
        for i, j in self.obstacle:
            dx = i - cx
            dy = j - cy
            if dx*dx + dy*dy <= r*r:
                self.obstacle[i, j] = 1
            else:
                self.obstacle[i, j] = 0
    
    @ti.kernel
    def collision(self):
        for i, j, k in self.f:
            if self.obstacle[i, j] == 0:
                # 计算宏观量
                rho_local = 0.0
                ux_local = 0.0
                uy_local = 0.0
                
                for k2 in range(self.q):
                    rho_local += self.f[i, j, k2]
                    ux_local += self.c[k2, 0] * self.f[i, j, k2]
                    uy_local += self.c[k2, 1] * self.f[i, j, k2]
                
                ux_local /= rho_local
                uy_local /= rho_local
                
                self.rho[i, j] = rho_local
                self.u[i, j][0] = ux_local
                self.u[i, j][1] = uy_local
                
                # 计算平衡分布函数并碰撞
                u_mag = ux_local**2 + uy_local**2
                for k2 in range(self.q):
                    cu = self.c[k2, 0] * ux_local + self.c[k2, 1] * uy_local
                    feq = self.w[k2] * rho_local * (
                        1.0 + 3.0 * cu + 4.5 * cu**2 - 1.5 * u_mag
                    )
                    self.f_new[i, j, k2] = self.f[i, j, k2] - (self.f[i, j, k2] - feq) / self.tau
            else:
                # 障碍物：反弹边界（中间反射方案）
                # f1->f3, f2->f4, f5->f7, f6->f8 (及其反向)
                opp = [0, 3, 4, 1, 2, 7, 8, 5, 6]
                for k2 in range(self.q):
                    self.f_new[i, j, k2] = self.f[i, j, opp[k2]]
    
    @ti.kernel
    def streaming(self):
        for i, j, k in self.f:
            if self.obstacle[i, j] == 0:
                # 迁移
                i_prev = (i - self.c[k, 0]) % self.nx
                j_prev = (j - self.c[k, 1]) % self.ny
                
                if self.obstacle[i_prev, j_prev] == 0:
                    self.f[i, j, k] = self.f_new[i_prev, j_prev, k]
    
    @ti.kernel
    def apply_boundary_conditions(self):
        # 入口：左边界，Dirichlet 速度条件 (Zou/He)
        for j in range(self.ny):
            if self.obstacle[0, j] == 0:
                # 入口速度分布
                u_in = self.inlet_vel * (1.0 + 0.01 * np.sin(j * 0.1))  # 微小扰动
                u_in = self.inlet_vel
                
                # 计算 rho
                rho_in = (self.f[0, j, 0] + self.f[0, j, 2] + self.f[0, j, 4] +
                          2.0 * (self.f[0, j, 3] + self.f[0, j, 6] + self.f[0, j, 7])) / (1.0 - u_in)
                
                # 设置未知的分布函数
                feq1 = self.w[1] * rho_in * (1.0 + 3.0 * u_in + 4.5 * u_in**2)
                feq5 = self.w[5] * rho_in * (1.0 + 3.0 * (u_in + 0.0) + 4.5 * (u_in + 0.0)**2)
                feq8 = self.w[8] * rho_in * (1.0 + 3.0 * (u_in - 0.0) + 4.5 * (u_in - 0.0)**2)
                
                # 非平衡反弹
                fneq3 = self.f[0, j, 3] - self.w[3] * rho_in * (1.0 - 3.0 * u_in + 4.5 * u_in**2)
                fneq6 = self.f[0, j, 6] - self.w[6] * rho_in * (1.0 + 3.0 * (-u_in - 0.0) + 4.5 * (-u_in - 0.0)**2)
                fneq7 = self.f[0, j, 7] - self.w[7] * rho_in * (1.0 + 3.0 * (-u_in + 0.0) + 4.5 * (-u_in + 0.0)**2)
                
                self.f[0, j, 1] = feq1 + fneq3
                self.f[0, j, 5] = feq5 + fneq7
                self.f[0, j, 8] = feq8 + fneq6
                
                self.u[0, j][0] = u_in
                self.u[0, j][1] = 0.0
                self.rho[0, j] = rho_in
        
        # 出口：右边界，对流出口条件
        for j in range(self.ny):
            if self.obstacle[self.nx-1, j] == 0:
                # 简单的 Neumann 条件
                for k in range(self.q):
                    self.f[self.nx-1, j, k] = self.f[self.nx-2, j, k]
        
        # 上下边界：无滑移反弹
        for i in range(self.nx):
            if self.obstacle[i, 0] == 0:
                # 下边界
                opp = [0, 1, 4, 3, 2, 8, 7, 6, 5]
                for k in range(self.q):
                    self.f[i, 0, k] = self.f_new[i, 0, opp[k]]
            
            if self.obstacle[i, self.ny-1] == 0:
                # 上边界
                opp = [0, 1, 2, 3, 4, 6, 5, 8, 7]
                for k in range(self.q):
                    self.f[i, self.ny-1, k] = self.f_new[i, self.ny-1, opp[k]]
    
    def step(self, steps: int = 1):
        for _ in range(steps):
            self.collision()
            self.streaming()
            self.apply_boundary_conditions()
    
    def get_state(self) -> Dict:
        rho_np = self.rho.to_numpy()
        u_np = self.u.to_numpy()
        obstacle_np = self.obstacle.to_numpy()
        
        # 计算涡量
        ux = u_np[:, :, 0]
        uy = u_np[:, :, 1]
        
        # 简单的中心差分计算涡量
        vorticity = np.zeros_like(ux)
        for i in range(1, self.nx-1):
            for j in range(1, self.ny-1):
                if obstacle_np[i, j] == 0:
                    dux_dy = (ux[i, j+1] - ux[i, j-1]) / 2.0
                    duy_dx = (uy[i+1, j] - uy[i-1, j]) / 2.0
                    vorticity[i, j] = duy_dx - dux_dy
        
        # 计算速度大小
        speed = np.sqrt(ux**2 + uy**2)
        
        return {
            'density': rho_np.tolist(),
            'velocity_x': ux.tolist(),
            'velocity_y': uy.tolist(),
            'speed': speed.tolist(),
            'vorticity': vorticity.tolist(),
            'obstacle': obstacle_np.tolist(),
            'grid_size': [self.nx, self.ny],
            'reynolds': self.reynolds,
            'inlet_velocity': self.inlet_vel,
            'nu': self.nu,
            'tau': self.tau
        }
    
    def get_snapshot_data(self) -> Dict:
        # 获取用于存储的快照数据（压缩版）
        u_np = self.u.to_numpy()
        obstacle_np = self.obstacle.to_numpy()
        
        ux = u_np[:, :, 0]
        uy = u_np[:, :, 1]
        
        # 降采样以减少存储
        sample_rate = max(1, self.nx // 128)
        sampled_ux = ux[::sample_rate, ::sample_rate]
        sampled_uy = uy[::sample_rate, ::sample_rate]
        sampled_obstacle = obstacle_np[::sample_rate, ::sample_rate]
        
        return {
            'velocity_x': sampled_ux.tolist(),
            'velocity_y': sampled_uy.tolist(),
            'obstacle': sampled_obstacle.tolist(),
            'sample_rate': sample_rate,
            'original_size': [self.nx, self.ny]
        }
