export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Atom {
  id: number;
  position: Vector3D;
  velocity: Vector3D;
  force: Vector3D;
  type: string;
  mass: number;
}

export interface SimulationState {
  step: number;
  time: number;
  positions: number[][];
  velocities: number[][];
  forces: number[][];
  temperature: number;
  pressure: number;
  potential_energy: number;
  kinetic_energy: number;
  total_energy: number;
}

export interface SystemInfo {
  n_atoms: number;
  box_size: number;
  density: number;
  initial_temperature: number;
  timestep: number;
  mass: number;
  epsilon: number;
  sigma: number;
  cutoff: number;
  n_unit_cells: number;
}

export interface SimulationConfig {
  n_unit_cells?: number;
  density?: number;
  temperature?: number;
  timestep?: number;
  mass?: number;
  epsilon?: number;
  sigma?: number;
  cutoff?: number;
  seed?: number;
}

export interface SimulationResponse {
  simulation_id: string;
  system_info: SystemInfo;
  initial_state: SimulationState;
}

export interface StepResponse {
  success: boolean;
  state: SimulationState;
}

export interface SavedSimulation {
  id: number;
  name: string;
  num_atoms: number;
  created_at: string;
  frame_count: number;
}

export interface FrameInfo {
  frame_number: number;
  time: number;
  temperature: number;
  pressure: number;
  potential_energy: number;
  kinetic_energy: number;
  total_energy: number;
}

export interface FrameDetails {
  frame_number: number;
  atoms: {
    id: number;
    position: Vector3D;
    velocity: Vector3D;
  }[];
}

export interface EnergyHistoryPoint {
  step: number;
  pe: number;
  ke: number;
  te: number;
}

export interface PureStrategyEquilibrium {
  player1_strategy: string;
  player2_strategy: string;
  player1_payoff: number;
  player2_payoff: number;
  row_index: number;
  col_index: number;
}

export interface MixedStrategyEquilibrium {
  player1_distribution: Record<string, number>;
  player2_distribution: Record<string, number>;
  player1_expected_payoff: number;
  player2_expected_payoff: number;
  player1_support: number[];
  player2_support: number[];
}

export interface NashEquilibriumResponse {
  pure_equilibria: PureStrategyEquilibrium[];
  mixed_equilibria: MixedStrategyEquilibrium[];
  has_pure_equilibrium: boolean;
  has_mixed_equilibrium: boolean;
  message: string;
}

export interface PayoffMatrixData {
  player1_strategies: string[];
  player2_strategies: string[];
  payoff_matrix_player1: number[][];
  payoff_matrix_player2: number[][];
}

export interface GameExample {
  id: number;
  name: string;
  category?: string;
  description?: string;
  player1_strategies: string[];
  player2_strategies: string[];
  payoff_matrix_player1: number[][];
  payoff_matrix_player2: number[][];
}
