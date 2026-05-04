import numpy as np
from typing import Tuple


def create_fcc_lattice(
    n_unit_cells: int,
    density: float,
    mass: float = 1.0
) -> Tuple[np.ndarray, np.ndarray, float]:
    n_atoms = 4 * (n_unit_cells ** 3)
    box_size = (n_atoms / density) ** (1.0 / 3.0)
    a = box_size / n_unit_cells
    
    positions = []
    basis_vectors = np.array([
        [0.0, 0.0, 0.0],
        [0.5, 0.5, 0.0],
        [0.5, 0.0, 0.5],
        [0.0, 0.5, 0.5],
    ]) * a
    
    for i in range(n_unit_cells):
        for j in range(n_unit_cells):
            for k in range(n_unit_cells):
                cell_origin = np.array([i, j, k]) * a
                for basis in basis_vectors:
                    positions.append(cell_origin + basis)
    
    positions = np.array(positions, dtype=np.float64)
    masses = np.full(n_atoms, mass, dtype=np.float64)
    
    return positions, masses, box_size


def create_sc_lattice(
    n_unit_cells: int,
    density: float,
    mass: float = 1.0
) -> Tuple[np.ndarray, np.ndarray, float]:
    n_atoms = n_unit_cells ** 3
    box_size = (n_atoms / density) ** (1.0 / 3.0)
    a = box_size / n_unit_cells
    
    positions = []
    for i in range(n_unit_cells):
        for j in range(n_unit_cells):
            for k in range(n_unit_cells):
                positions.append(np.array([i, j, k]) * a)
    
    positions = np.array(positions, dtype=np.float64)
    masses = np.full(n_atoms, mass, dtype=np.float64)
    
    return positions, masses, box_size


def create_bcc_lattice(
    n_unit_cells: int,
    density: float,
    mass: float = 1.0
) -> Tuple[np.ndarray, np.ndarray, float]:
    n_atoms = 2 * (n_unit_cells ** 3)
    box_size = (n_atoms / density) ** (1.0 / 3.0)
    a = box_size / n_unit_cells
    
    positions = []
    basis_vectors = np.array([
        [0.0, 0.0, 0.0],
        [0.5, 0.5, 0.5],
    ]) * a
    
    for i in range(n_unit_cells):
        for j in range(n_unit_cells):
            for k in range(n_unit_cells):
                cell_origin = np.array([i, j, k]) * a
                for basis in basis_vectors:
                    positions.append(cell_origin + basis)
    
    positions = np.array(positions, dtype=np.float64)
    masses = np.full(n_atoms, mass, dtype=np.float64)
    
    return positions, masses, box_size


def generate_velocities(
    n_atoms: int,
    temperature: float,
    masses: np.ndarray,
    seed: int = None
) -> np.ndarray:
    if seed is not None:
        np.random.seed(seed)
    
    velocities = np.random.randn(n_atoms, 3)
    
    velocities = velocities - np.mean(velocities, axis=0)
    
    scaling = np.sqrt(temperature / np.sum(masses * np.sum(velocities ** 2, axis=1)) * (3 * n_atoms - 3))
    velocities = velocities * scaling
    
    return velocities
