import numpy as np
from typing import Tuple, Optional


def create_fcc_lattice(
    n_unit_cells: int = 3,
    density: float = 0.8,
    mass: float = 1.0
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Create a face-centered cubic (FCC) lattice structure.
    
    Args:
        n_unit_cells: Number of unit cells in each dimension
        density: Number density (number of atoms per unit volume)
        mass: Mass of each atom
    
    Returns:
        Tuple of (positions, masses, box_size)
        - positions: numpy array of shape (n_atoms, 3)
        - masses: numpy array of shape (n_atoms,)
        - box_size: length of simulation box
    """
    n_atoms_per_cell = 4
    n_atoms = n_unit_cells ** 3 * n_atoms_per_cell
    
    box_size = (n_atoms / density) ** (1/3)
    lattice_constant = box_size / n_unit_cells
    
    positions = []
    
    base_positions = np.array([
        [0.0, 0.0, 0.0],
        [0.5, 0.5, 0.0],
        [0.5, 0.0, 0.5],
        [0.0, 0.5, 0.5],
    ]) * lattice_constant
    
    for i in range(n_unit_cells):
        for j in range(n_unit_cells):
            for k in range(n_unit_cells):
                cell_origin = np.array([i, j, k]) * lattice_constant
                for base in base_positions:
                    positions.append(cell_origin + base)
    
    positions = np.array(positions)
    masses = np.full(n_atoms, mass)
    
    return positions, masses, box_size


def generate_velocities(
    n_atoms: int,
    temperature: float,
    masses: np.ndarray,
    seed: Optional[int] = None
) -> np.ndarray:
    """
    Generate initial velocities from Maxwell-Boltzmann distribution.
    
    Args:
        n_atoms: Number of atoms
        temperature: Target temperature (in reduced units)
        masses: Array of atom masses
        seed: Random seed for reproducibility
    
    Returns:
        velocities: numpy array of shape (n_atoms, 3)
    """
    if seed is not None:
        rng = np.random.Generator(np.random.PCG64(seed))
    else:
        rng = np.random.Generator(np.random.PCG64())
    
    velocities = rng.standard_normal((n_atoms, 3))
    
    for i in range(n_atoms):
        velocities[i] /= np.sqrt(masses[i])
    
    velocity_center = np.mean(velocities, axis=0)
    velocities -= velocity_center
    
    current_ke = 0.5 * np.sum(masses[:, np.newaxis] * velocities ** 2)
    expected_ke = 1.5 * n_atoms * temperature
    
    scaling_factor = np.sqrt(expected_ke / current_ke)
    velocities *= scaling_factor
    
    return velocities
