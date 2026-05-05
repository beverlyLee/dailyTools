export interface ClassicExample {
  key: string;
  name: string;
  description: string;
  dimension: number;
  variables: string[];
  default_initial: number[];
  default_params: Record<string, number>;
  param_ranges: Record<string, number[]>;
  t_span: number[];
}

export interface SolutionData {
  equation_key: string;
  equation_name: string;
  solver_method: string;
  time: number[];
  states: number[][];
  variables: string[];
  parameters: Record<string, number>;
  initial_conditions: number[];
  t_span: number[];
}

export interface PoincareData {
  equation_key: string;
  equation_name: string;
  plane_dimension: number;
  plane_variable: string;
  plane_value: number;
  direction: number;
  remaining_variables: string[];
  points: number[][];
  times: number[];
  num_points: number;
  analysis: PoincareAnalysis | null;
}

export interface PoincareAnalysis {
  num_points: number;
  num_unique_points: number;
  behavior: string;
  description: string;
  mean_distance: number;
  std_distance: number;
  variance: number[];
}

export interface ParameterScanData {
  record_id: number | null;
  equation_key: string;
  equation_name: string;
  scan_parameter: string;
  parameter_range: number[];
  parameter_steps: number;
  parameter_values: number[];
  results: ScanResult[];
  variables: string[];
}

export interface ScanResult {
  parameter_value: number;
  final_state: number[];
  max_values: number[];
  min_values: number[];
  mean_values: number[];
  std_steady_state: number[];
  success: boolean;
  error?: string;
}

export type SolverMethodType = 'euler' | 'rk4' | 'rk45';

export type TabType = 'solution' | 'phase' | 'poincare' | 'scan';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
