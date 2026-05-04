import numpy as np
from typing import Tuple


class LennardJonesPotential:
    def __init__(self, epsilon: float = 1.0, sigma: float = 1.0, cutoff: float = 2.5):
        self.epsilon = epsilon
        self.sigma = sigma
        self.cutoff = cutoff
        self.cutoff_sq = cutoff * cutoff
        
        self.sigma6 = sigma ** 6
        self.sigma12 = self.sigma6 * self.sigma6
        
        self.shift_energy = 4 * epsilon * (
            (self.sigma12 / (self.cutoff_sq ** 6)) - 
            (self.sigma6 / (self.cutoff_sq ** 3))
        )
    
    def compute(self, positions: np.ndarray, box_size: float) -> Tuple[np.ndarray, float]:
        n_atoms = positions.shape[0]
        forces = np.zeros_like(positions)
        potential_energy = 0.0
        
        half_box = box_size / 2.0
        
        for i in range(n_atoms - 1):
            for j in range(i + 1, n_atoms):
                dr = positions[i] - positions[j]
                
                for k in range(3):
                    if dr[k] > half_box:
                        dr[k] -= box_size
                    elif dr[k] < -half_box:
                        dr[k] += box_size
                
                r_sq = np.sum(dr * dr)
                
                if r_sq < self.cutoff_sq:
                    inv_r_sq = 1.0 / r_sq
                    inv_r6 = inv_r_sq ** 3
                    inv_r12 = inv_r6 * inv_r6
                    
                    phi = 4 * self.epsilon * (self.sigma12 * inv_r12 - self.sigma6 * inv_r6)
                    potential_energy += phi - self.shift_energy
                    
                    dphi_dr = 24 * self.epsilon * inv_r_sq * (
                        2 * self.sigma12 * inv_r12 - self.sigma6 * inv_r6
                    )
                    
                    force = dphi_dr * dr
                    forces[i] += force
                    forces[j] -= force
        
        return forces, potential_energy
    
    def compute_pressure(
        self, 
        positions: np.ndarray, 
        forces: np.ndarray, 
        box_size: float,
        temperature: float,
        n_atoms: int
    ) -> float:
        volume = box_size ** 3
        ideal_pressure = n_atoms * temperature / volume
        
        virial = 0.0
        half_box = box_size / 2.0
        
        for i in range(n_atoms - 1):
            for j in range(i + 1, n_atoms):
                dr = positions[i] - positions[j]
                
                for k in range(3):
                    if dr[k] > half_box:
                        dr[k] -= box_size
                    elif dr[k] < -half_box:
                        dr[k] += box_size
                
                virial += np.dot(dr, forces[i])
        
        virial_pressure = virial / (3 * volume)
        
        return ideal_pressure + virial_pressure
