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

export interface SolveODERequest {
  equation_key?: string;
  custom_equation?: string;
  initial_conditions: number[];
  parameters: Record<string, number>;
  solver_method: 'euler' | 'rk4' | 'rk45';
  t_start: number;
  t_end: number;
  num_points: number;
}

export interface SolveODEResponse {
  success: boolean;
  message: string;
  data: SolutionData;
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

export interface PoincareSectionRequest {
  equation_key: string;
  initial_conditions: number[];
  parameters: Record<string, number>;
  solver_method: 'euler' | 'rk4' | 'rk45';
  t_start: number;
  t_end: number;
  num_points: number;
  plane_dimension: number;
  plane_value: number;
  direction: number;
}

export interface PoincareSectionResponse {
  success: boolean;
  message: string;
  data: PoincareData;
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
  analysis?: PoincareAnalysis;
}

export interface PoincareAnalysis {
  num_points: number;
  num_unique_points?: number;
  behavior: string;
  description: string;
  mean_distance?: number;
  std_distance?: number;
  variance?: number[];
}

export interface ParameterScanRequest {
  equation_key: string;
  initial_conditions: number[];
  parameters: Record<string, number>;
  scan_parameter: string;
  param_start: number;
  param_end: number;
  param_steps: number;
  solver_method: 'euler' | 'rk4' | 'rk45';
  t_start: number;
  t_end: number;
  num_points: number;
  save_to_db: boolean;
}

export interface ParameterScanResponse {
  success: boolean;
  message: string;
  data: ParameterScanData;
}

export interface ParameterScanData {
  record_id?: number;
  equation_key: string;
  equation_name: string;
  scan_parameter: string;
  parameter_range: number[];
  parameter_steps: number;
  parameter_values: number[];
  results: ParameterScanResult[];
  variables: string[];
}

export interface ParameterScanResult {
  parameter_value: number;
  final_state?: number[];
  max_values?: number[];
  min_values?: number[];
  mean_values?: number[];
  std_steady_state?: number[];
  success: boolean;
  error?: string;
}

export interface ScanRecord {
  id: number;
  equation_name: string;
  parameter_name: string;
  parameter_start: number;
  parameter_end: number;
  parameter_steps: number;
  created_at: string;
}
