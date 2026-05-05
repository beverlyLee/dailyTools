import numpy as np
from typing import Tuple


class LennardJonesPotential:
    """
    Lennard-Jones potential for molecular dynamics simulations.
    
    V(r) = 4ε[(σ/r)^12 - (σ/r)^6]
    F(r) = -dV/dr = 24ε/r[(σ/r)^6 - 2(σ/r)^12] * r̂
    """
    
    def __init__(self, epsilon: float = 1.0, sigma: float = 1.0, cutoff: float = 2.5):
        """
        Initialize Lennard-Jones potential.
        
        Args:
            epsilon: Energy parameter (depth of potential well)
            sigma: Length parameter (distance where potential is zero)
            cutoff: Cutoff distance for potential (in units of sigma)
        """
        self.epsilon = epsilon
        self.sigma = sigma
        self.cutoff = cutoff * sigma
        self.cutoff_sq = self.cutoff ** 2
        
        self.shift = 4 * epsilon * (
            (sigma / self.cutoff) ** 12 - 
            (sigma / self.cutoff) ** 6
        )
    
    def compute(
        self, 
        positions: np.ndarray, 
        box_size: float
    ) -> Tuple[np.ndarray, float]:
        """
        Compute forces and potential energy using minimum image convention.
        
        Args:
            positions: Array of atom positions, shape (n_atoms, 3)
            box_size: Size of simulation box
        
        Returns:
            Tuple of (forces, potential_energy)
            - forces: numpy array of shape (n_atoms, 3)
            - potential_energy: scalar value
        """
        n_atoms = positions.shape[0]
        forces = np.zeros_like(positions)
        potential_energy = 0.0
        
        for i in range(n_atoms):
            for j in range(i + 1, n_atoms):
                r_ij = positions[i] - positions[j]
                
                r_ij -= box_size * np.round(r_ij / box_size)
                
                r_sq = np.sum(r_ij ** 2)
                
                if r_sq < self.cutoff_sq:
                    r = np.sqrt(r_sq)
                    
                    sigma_over_r = self.sigma / r
                    sigma_over_r_6 = sigma_over_r ** 6
                    sigma_over_r_12 = sigma_over_r_6 ** 2
                    
                    lj_potential = 4 * self.epsilon * (sigma_over_r_12 - sigma_over_r_6)
                    potential_energy += (lj_potential - self.shift)
                    
                    force_magnitude = 24 * self.epsilon / r_sq * (
                        2 * sigma_over_r_12 - sigma_over_r_6
                    )
                    force_vector = force_magnitude * r_ij
                    
                    forces[i] += force_vector
                    forces[j] -= force_vector
        
        return forces, potential_energy
    
    def compute_pressure(
        self,
        positions: np.ndarray,
        forces: np.ndarray,
        box_size: float,
        temperature: float,
        n_atoms: int
    ) -> float:
        """
        Compute pressure using the virial theorem.
        
        P = (NkT)/V + (1/(3V)) * Σ<r_ij · F_ij>
        
        Args:
            positions: Array of atom positions
            forces: Array of forces on each atom
            box_size: Size of simulation box
            temperature: Current temperature
            n_atoms: Number of atoms
        
        Returns:
            pressure: Scalar pressure value
        """
        volume = box_size ** 3
        
        ideal_gas_pressure = n_atoms * temperature / volume
        
        virial = 0.0
        for i in range(n_atoms):
            virial += np.dot(positions[i], forces[i])
        
        virial_pressure = virial / (3 * volume)
        
        pressure = ideal_gas_pressure + virial_pressure
        
        return pressure
