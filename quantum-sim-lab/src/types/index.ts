export interface ComplexNumber {
  real: number;
  imag: number;
}

export interface GateInfo {
  gate_type: string;
  qubits: number[];
  parameters: number[];
}

export interface BlochSphereState {
  x: number;
  y: number;
  z: number;
}

export interface CircuitState {
  amplitudes: ComplexNumber[];
  probabilities: number[];
  bloch_spheres: BlochSphereState[];
}

export interface SimulationResult {
  final_state: CircuitState;
  step_states: CircuitState[];
  probability_distribution: Record<string, number>;
  measurement_results: number[][];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CircuitGate {
  id: string;
  type: string;
  qubits: number[];
  column: number;
}

export interface Subcircuit {
  id: string;
  name: string;
  gates: CircuitGate[];
  inputQubits: number;
  outputQubits: number;
}
