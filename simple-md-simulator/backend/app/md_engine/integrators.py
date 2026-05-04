import numpy as np
from typing import Callable, Tuple


class VelocityVerletIntegrator:
    def __init__(self, dt: float):
        self.dt = dt
        self.dt_half = dt / 2.0
    
    def step(
        self,
        positions: np.ndarray,
        velocities: np.ndarray,
        forces: np.ndarray,
        masses: np.ndarray,
        box_size: float,
        force_computer: Callable
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, float]:
        n_atoms = positions.shape[0]
        inv_masses = 1.0 / masses.reshape(-1, 1)
        
        positions += velocities * self.dt + 0.5 * forces * inv_masses * self.dt * self.dt
        
        positions = positions % box_size
        
        velocities += 0.5 * forces * inv_masses * self.dt
        
        new_forces, potential_energy = force_computer(positions, box_size)
        
        velocities += 0.5 * new_forces * inv_masses * self.dt
        
        return positions, velocities, new_forces, potential_energy
    
    def compute_kinetic_energy(self, velocities: np.ndarray, masses: np.ndarray) -> float:
        return 0.5 * np.sum(masses * np.sum(velocities ** 2, axis=1))
    
    def compute_temperature(self, velocities: np.ndarray, masses: np.ndarray, n_atoms: int) -> float:
        ke = self.compute_kinetic_energy(velocities, masses)
        return (2.0 / 3.0) * ke / n_atoms
    
    def scale_velocities_to_temperature(
        self, 
        velocities: np.ndarray, 
        masses: np.ndarray,
        target_temperature: float,
        n_atoms: int
    ) -> np.ndarray:
        current_temp = self.compute_temperature(velocities, masses, n_atoms)
        if current_temp > 0:
            scale_factor = np.sqrt(target_temperature / current_temp)
            return velocities * scale_factor
        return velocities
    
    def remove_center_of_mass_motion(
        self,
        velocities: np.ndarray,
        masses: np.ndarray
    ) -> np.ndarray:
        total_mass = np.sum(masses)
        com_velocity = np.sum(masses.reshape(-1, 1) * velocities, axis=0) / total_mass
        return velocities - com_velocity
