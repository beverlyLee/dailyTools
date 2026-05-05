import numpy as np
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict
from enum import Enum

from .potentials import LennardJonesPotential
from .integrators import VelocityVerletIntegrator
from .lattice import create_lattice, generate_velocities, LatticeType


class AtomType(Enum):
    ARGON = "argon"
    HELIUM = "helium"
    NEON = "neon"
    KRYPTON = "krypton"
    CUSTOM = "custom"


ATOM_TYPE_PARAMS = {
    AtomType.ARGON: {"epsilon": 120.0, "sigma": 3.405, "mass": 39.95},
    AtomType.HELIUM: {"epsilon": 10.22, "sigma": 2.556, "mass": 4.003},
    AtomType.NEON: {"epsilon": 35.6, "sigma": 2.749, "mass": 20.18},
    AtomType.KRYPTON: {"epsilon": 164.0, "sigma": 3.633, "mass": 83.80},
}


@dataclass
class SimulationState:
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
    def __init__(
        self,
        lattice_type: LatticeType = "fcc",
        n_unit_cells: int = 5,
        density: float = 0.8,
        temperature: float = 1.0,
        timestep: float = 0.001,
        mass: float = 1.0,
        epsilon: float = 1.0,
        sigma: float = 1.0,
        cutoff: float = 2.5,
        seed: Optional[int] = None,
        atom_type: Optional[AtomType] = None,
    ):
        self.lattice_type = lattice_type
        self.n_unit_cells = n_unit_cells
        self.density = density
        self.initial_temperature = temperature
        self.timestep = timestep
        self.seed = seed
        self.atom_type = atom_type
        
        if atom_type and atom_type in ATOM_TYPE_PARAMS:
            params = ATOM_TYPE_PARAMS[atom_type]
            self.mass = params["mass"]
            self.epsilon = params["epsilon"]
            self.sigma = params["sigma"]
        else:
            self.mass = mass
            self.epsilon = epsilon
            self.sigma = sigma
        
        self.cutoff = cutoff
        
        self.positions, self.masses, self.box_size = create_lattice(
            lattice_type, n_unit_cells, density, self.mass
        )
        
        self.n_atoms = self.positions.shape[0]
        
        self.velocities = generate_velocities(
            self.n_atoms, temperature, self.masses, seed
        )
        
        self.potential = LennardJonesPotential(self.epsilon, self.sigma, self.cutoff)
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
        return self.trajectory
    
    def get_trajectory_frame(self, frame_index: int) -> Optional[SimulationState]:
        if 0 <= frame_index < len(self.trajectory):
            return self.trajectory[frame_index]
        return None
    
    def get_system_info(self) -> Dict[str, Any]:
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
            'lattice_type': self.lattice_type,
            'atom_type': self.atom_type.value if self.atom_type else None,
        }
    
    def scale_velocities(self, target_temperature: float):
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
