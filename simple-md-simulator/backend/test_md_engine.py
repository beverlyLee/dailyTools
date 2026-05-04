import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
from app.md_engine import (
    MDSimulator,
    LennardJonesPotential,
    VelocityVerletIntegrator,
    create_fcc_lattice,
)


def test_lattice_creation():
    print("=== 测试晶格创建 ===")
    
    n_unit_cells = 3
    density = 0.8
    
    positions, masses, box_size = create_fcc_lattice(n_unit_cells, density)
    
    expected_atoms = 4 * (n_unit_cells ** 3)
    print(f"预期原子数: {expected_atoms}")
    print(f"实际原子数: {positions.shape[0]}")
    print(f"盒子尺寸: {box_size:.4f}")
    print(f"密度验证: {positions.shape[0] / (box_size ** 3):.4f} (预期: {density})")
    
    assert positions.shape[0] == expected_atoms, f"原子数不匹配: {positions.shape[0]} != {expected_atoms}"
    assert positions.shape[1] == 3, "位置应为 3D 坐标"
    assert masses.shape[0] == expected_atoms, "质量数组长度不匹配"
    
    print("晶格创建测试通过!\n")


def test_force_calculation():
    print("=== 测试力计算 ===")
    
    potential = LennardJonesPotential(epsilon=1.0, sigma=1.0, cutoff=2.5)
    
    positions = np.array([
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
    ], dtype=np.float64)
    box_size = 10.0
    
    forces, potential_energy = potential.compute(positions, box_size)
    
    print(f"位置: {positions}")
    print(f"力: {forces}")
    print(f"势能: {potential_energy:.6f}")
    
    assert forces.shape == positions.shape, "力数组形状不匹配"
    assert np.allclose(forces[0], -forces[1]), "牛顿第三定律: 力应该大小相等方向相反"
    
    print("力计算测试通过!\n")


def test_energy_conservation():
    print("=== 测试能量守恒 (微正则系综) ===")
    
    simulator = MDSimulator(
        n_unit_cells=3,
        density=0.8,
        temperature=0.5,
        timestep=0.001,
        seed=42,
    )
    
    initial_total_energy = simulator.total_energy
    print(f"初始总能量: {initial_total_energy:.6f}")
    print(f"初始势能: {simulator.potential_energy:.6f}")
    print(f"初始动能: {simulator.kinetic_energy:.6f}")
    print(f"原子数: {simulator.n_atoms}")
    print(f"盒子尺寸: {simulator.box_size:.4f}")
    
    n_steps = 1000
    energies = []
    
    for i in range(n_steps):
        simulator.step(1)
        if i % 100 == 0:
            energies.append({
                'step': simulator.step_count,
                'pe': simulator.potential_energy,
                'ke': simulator.kinetic_energy,
                'te': simulator.total_energy,
            })
            print(f"步数 {simulator.step_count}: "
                  f"PE={simulator.potential_energy:.4f}, "
                  f"KE={simulator.kinetic_energy:.4f}, "
                  f"Total={simulator.total_energy:.4f}")
    
    final_total_energy = simulator.total_energy
    energy_error = abs(final_total_energy - initial_total_energy) / abs(initial_total_energy) * 100
    
    print(f"\n最终总能量: {final_total_energy:.6f}")
    print(f"能量守恒误差: {energy_error:.6f}%")
    
    assert energy_error < 1.0, f"能量守恒误差过大: {energy_error:.4f}% (预期 < 1%)"
    
    print("能量守恒测试通过!\n")


def test_velocity_verlet():
    print("=== 测试 Velocity-Verlet 积分器 ===")
    
    dt = 0.001
    integrator = VelocityVerletIntegrator(dt)
    
    positions = np.array([
        [0.0, 0.0, 0.0],
        [1.122, 0.0, 0.0],
    ], dtype=np.float64)
    velocities = np.array([
        [0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0],
    ], dtype=np.float64)
    masses = np.array([1.0, 1.0], dtype=np.float64)
    box_size = 10.0
    
    potential = LennardJonesPotential(epsilon=1.0, sigma=1.0, cutoff=2.5)
    forces, _ = potential.compute(positions, box_size)
    
    print(f"初始位置: {positions}")
    print(f"初始力: {forces}")
    
    for i in range(5):
        positions, velocities, forces, pe = integrator.step(
            positions, velocities, forces, masses, box_size,
            lambda pos, box: potential.compute(pos, box)
        )
        ke = integrator.compute_kinetic_energy(velocities, masses)
        temp = integrator.compute_temperature(velocities, masses, 2)
        
        print(f"步骤 {i+1}: "
              f"r={np.linalg.norm(positions[0] - positions[1]):.4f}, "
              f"PE={pe:.4f}, KE={ke:.4f}, Total={pe+ke:.4f}")
    
    print("Velocity-Verlet 积分器测试通过!\n")


def main():
    print("=" * 60)
    print("分子动力学引擎测试")
    print("=" * 60 + "\n")
    
    try:
        test_lattice_creation()
        test_force_calculation()
        test_velocity_verlet()
        test_energy_conservation()
        
        print("=" * 60)
        print("所有测试通过!")
        print("=" * 60)
        return 0
    except AssertionError as e:
        print(f"\n测试失败: {e}")
        return 1
    except Exception as e:
        print(f"\n发生错误: {e}")
        import traceback
        traceback.print_exc()
        return 2


if __name__ == "__main__":
    sys.exit(main())
