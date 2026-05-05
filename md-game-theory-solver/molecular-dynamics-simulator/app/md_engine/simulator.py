import numpy as np
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict

from .potentials import LennardJonesPotential
from .integrators import VelocityVerletIntegrator
from .lattice import create_fcc_lattice, generate_velocities


@dataclass
class SimulationState:
    """Data class representing a single simulation state/frame."""
    step: int
    time: float
    positions: np.ndarray
    velocities: np.ndarray
    forces: np.ndarray
    temperature: float
    pressure: float
    potential_energy: float
    kinetic_energy: float
    total_energy: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for JSON serialization."""
        return {
            'step': self.step,
            'time': self.time,
            'positions': self.positions.tolist(),
            'velocities': self.velocities.tolist(),
            'forces': self.forces.tolist(),
            'temperature': self.temperature,
            'pressure': self.pressure,
            'potential_energy': self.potential_energy,
            'kinetic_energy': self.kinetic_energy,
            'total_energy': self.total_energy,
        }


class MDSimulator:
    """
    Main molecular dynamics simulation class.
    
    This class orchestrates the MD simulation:
    - Initializes lattice structure and velocities
    - Manages the integration loop
    - Tracks system properties (temperature, pressure, energy)
    - Stores trajectory for analysis
    """
    
    def __init__(
        self,
        n_unit_cells: int = 5,
        density: float = 0.8,
        temperature: float = 1.0,
        timestep: float = 0.001,
        mass: float = 1.0,
        epsilon: float = 1.0,
        sigma: float = 1.0,
        cutoff: float = 2.5,
        seed: Optional[int] = None,
    ):
        """
        Initialize the MD simulator.
        
        Args:
            n_unit_cells: Number of FCC unit cells in each dimension
            density: Number density (atoms per unit volume)
            temperature: Initial temperature (reduced units)
            timestep: Integration time step
            mass: Atom mass
            epsilon: LJ energy parameter
            sigma: LJ length parameter
            cutoff: LJ cutoff distance (in sigma units)
            seed: Random seed for velocity initialization
        """
        self.n_unit_cells = n_unit_cells
        self.density = density
        self.initial_temperature = temperature
        self.timestep = timestep
        self.mass = mass
        self.epsilon = epsilon
        self.sigma = sigma
        self.cutoff = cutoff
        self.seed = seed
        
        self.positions, self.masses, self.box_size = create_fcc_lattice(
            n_unit_cells, density, mass
        )
        
        self.n_atoms = self.positions.shape[0]
        
        self.velocities = generate_velocities(
            self.n_atoms, temperature, self.masses, seed
        )
        
        self.potential = LennardJonesPotential(epsilon, sigma, cutoff)
        self.integrator = VelocityVerletIntegrator(timestep)
        
        self.forces, self.potential_energy = self.potential.compute(
            self.positions, self.box_size
        )
        
        self.step_count = 0
        self.time = 0.0
        
        self.kinetic_energy = self.integrator.compute_kinetic_energy(
            self.velocities, self.masses
        )
        self.total_energy = self.potential_energy + self.kinetic_energy
        self.temperature = self.integrator.compute_temperature(
            self.velocities, self.masses, self.n_atoms
        )
        self.pressure = 0.0
        
        self.trajectory: List[SimulationState] = []
        self._save_state()
    
    def _save_state(self):
        """Save current state to trajectory."""
        state = SimulationState(
            step=self.step_count,
            time=self.time,
            positions=self.positions.copy(),
            velocities=self.velocities.copy(),
            forces=self.forces.copy(),
            temperature=self.temperature,
            pressure=self.pressure,
            potential_energy=self.potential_energy,
            kinetic_energy=self.kinetic_energy,
            total_energy=self.total_energy,
        )
        self.trajectory.append(state)
    
    def step(self, n_steps: int = 1, save_interval: int = 1) -> SimulationState:
        """
        Run simulation for a number of steps.
        
        Args:
            n_steps: Number of integration steps to perform
            save_interval: Save state to trajectory every N steps
        
        Returns:
            Final simulation state after all steps
        """
        for i in range(n_steps):
            self.positions, self.velocities, self.forces, self.potential_energy = (
                self.integrator.step(
                    self.positions,
                    self.velocities,
                    self.forces,
                    self.masses,
                    self.box_size,
                    lambda pos, box: self.potential.compute(pos, box),
                )
            )
            
            self.step_count += 1
            self.time += self.timestep
            
            self.kinetic_energy = self.integrator.compute_kinetic_energy(
                self.velocities, self.masses
            )
            self.total_energy = self.potential_energy + self.kinetic_energy
            self.temperature = self.integrator.compute_temperature(
                self.velocities, self.masses, self.n_atoms
            )
            
            self.pressure = self.potential.compute_pressure(
                self.positions,
                self.forces,
                self.box_size,
                self.temperature,
                self.n_atoms,
            )
            
            if (i + 1) % save_interval == 0:
                self._save_state()
        
        return self.get_state()
    
    def get_state(self) -> SimulationState:
        """Get current simulation state."""
        return SimulationState(
            step=self.step_count,
            time=self.time,
            positions=self.positions.copy(),
            velocities=self.velocities.copy(),
            forces=self.forces.copy(),
            temperature=self.temperature,
            pressure=self.pressure,
            potential_energy=self.potential_energy,
            kinetic_energy=self.kinetic_energy,
            total_energy=self.total_energy,
        )
    
    def get_trajectory(self) -> List[SimulationState]:
        """Get full trajectory history."""
        return self.trajectory
    
    def get_trajectory_frame(self, frame_index: int) -> Optional[SimulationState]:
        """Get a specific frame from trajectory."""
        if 0 <= frame_index < len(self.trajectory):
            return self.trajectory[frame_index]
        return None
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system configuration information."""
        return {
            'n_atoms': self.n_atoms,
            'box_size': self.box_size,
            'density': self.density,
            'initial_temperature': self.initial_temperature,
            'timestep': self.timestep,
            'mass': self.mass,
            'epsilon': self.epsilon,
            'sigma': self.sigma,
            'cutoff': self.cutoff,
            'n_unit_cells': self.n_unit_cells,
        }
    
    def scale_velocities(self, target_temperature: float):
        """
        Scale velocities to achieve target temperature.
        
        Args:
            target_temperature: Desired temperature
        """
        self.velocities = self.integrator.scale_velocities_to_temperature(
            self.velocities, self.masses, target_temperature, self.n_atoms
        )
        self.kinetic_energy = self.integrator.compute_kinetic_energy(
            self.velocities, self.masses
        )
        self.temperature = self.integrator.compute_temperature(
            self.velocities, self.masses, self.n_atoms
        )
        self.total_energy = self.potential_energy + self.kinetic_energy
