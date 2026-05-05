import numpy as np
from typing import Callable, Tuple


class VelocityVerletIntegrator:
    """
    Velocity-Verlet integrator for molecular dynamics simulations.
    
    The algorithm:
    1. v(t + Δt/2) = v(t) + (1/2) * a(t) * Δt
    2. r(t + Δt) = r(t) + v(t + Δt/2) * Δt
    3. Apply periodic boundary conditions
    4. Compute a(t + Δt) from forces at new positions
    5. v(t + Δt) = v(t + Δt/2) + (1/2) * a(t + Δt) * Δt
    """
    
    def __init__(self, timestep: float = 0.001):
        """
        Initialize the Velocity-Verlet integrator.
        
        Args:
            timestep: Integration time step Δt
        """
        self.timestep = timestep
    
    def step(
        self,
        positions: np.ndarray,
        velocities: np.ndarray,
        forces: np.ndarray,
        masses: np.ndarray,
        box_size: float,
        force_function: Callable[[np.ndarray, float], Tuple[np.ndarray, float]]
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, float]:
        """
        Perform one integration step.
        
        Args:
            positions: Current positions, shape (n_atoms, 3)
            velocities: Current velocities, shape (n_atoms, 3)
            forces: Current forces, shape (n_atoms, 3)
            masses: Atom masses, shape (n_atoms,)
            box_size: Size of simulation box
            force_function: Function that computes (forces, potential_energy)
        
        Returns:
            Tuple of (new_positions, new_velocities, new_forces, potential_energy)
        """
        n_atoms = positions.shape[0]
        
        accelerations = forces / masses[:, np.newaxis]
        
        velocities_half = velocities + 0.5 * accelerations * self.timestep
        
        new_positions = positions + velocities_half * self.timestep
        
        new_positions = new_positions % box_size
        
        new_forces, potential_energy = force_function(new_positions, box_size)
        
        new_accelerations = new_forces / masses[:, np.newaxis]
        
        new_velocities = velocities_half + 0.5 * new_accelerations * self.timestep
        
        return new_positions, new_velocities, new_forces, potential_energy
    
    def compute_kinetic_energy(
        self,
        velocities: np.ndarray,
        masses: np.ndarray
    ) -> float:
        """
        Compute kinetic energy from velocities.
        
        KE = (1/2) * Σ m_i * v_i²
        
        Args:
            velocities: Velocity array, shape (n_atoms, 3)
            masses: Mass array, shape (n_atoms,)
        
        Returns:
            kinetic_energy: Scalar kinetic energy
        """
        return 0.5 * np.sum(masses[:, np.newaxis] * velocities ** 2)
    
    def compute_temperature(
        self,
        velocities: np.ndarray,
        masses: np.ndarray,
        n_atoms: int
    ) -> float:
        """
        Compute temperature from kinetic energy.
        
        From equipartition theorem: (1/2) * Σ m_i * v_i² = (3/2) * N * k_B * T
        
        In reduced units: k_B = 1, so T = (2/3N) * KE
        
        Args:
            velocities: Velocity array, shape (n_atoms, 3)
            masses: Mass array, shape (n_atoms,)
            n_atoms: Number of atoms
        
        Returns:
            temperature: Scalar temperature
        """
        ke = self.compute_kinetic_energy(velocities, masses)
        return (2.0 / 3.0) * ke / n_atoms
    
    def scale_velocities_to_temperature(
        self,
        velocities: np.ndarray,
        masses: np.ndarray,
        target_temperature: float,
        n_atoms: int
    ) -> np.ndarray:
        """
        Scale velocities to achieve target temperature (velocity rescaling).
        
        Args:
            velocities: Current velocities, shape (n_atoms, 3)
            masses: Mass array, shape (n_atoms,)
            target_temperature: Desired temperature
            n_atoms: Number of atoms
        
        Returns:
            scaled_velocities: Velocities scaled to target temperature
        """
        current_temperature = self.compute_temperature(velocities, masses, n_atoms)
        
        if current_temperature < 1e-10:
            return velocities
        
        scaling_factor = np.sqrt(target_temperature / current_temperature)
        
        return velocities * scaling_factor
