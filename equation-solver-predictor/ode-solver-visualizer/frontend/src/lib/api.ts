import axios from 'axios';
import type { 
  ClassicExample, 
  SolutionData, 
  PoincareData, 
  ParameterScanData,
  SolverMethodType 
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const odeApi = {
  async getExamples(): Promise<ClassicExample[]> {
    const response = await api.get('/ode/examples');
    return response.data.data;
  },

  async getExample(equationKey: string): Promise<ClassicExample> {
    const response = await api.get(`/ode/examples/${equationKey}`);
    return response.data.data;
  },

  async solve(params: {
    equation_key: string;
    initial_conditions: number[];
    parameters: Record<string, number>;
    solver_method: SolverMethodType;
    t_start: number;
    t_end: number;
    num_points: number;
  }): Promise<{ success: boolean; message?: string; data: SolutionData }> {
    const response = await api.post('/ode/solve', params);
    return response.data;
  },

  async computePoincare(params: {
    equation_key: string;
    initial_conditions: number[];
    parameters: Record<string, number>;
    solver_method: SolverMethodType;
    t_start: number;
    t_end: number;
    num_points: number;
    plane_dimension: number;
    plane_value: number;
    direction: number;
  }): Promise<{ success: boolean; message?: string; data: PoincareData }> {
    const response = await api.post('/ode/poincare', params);
    return response.data;
  },

  async runParameterScan(params: {
    equation_key: string;
    initial_conditions: number[];
    parameters: Record<string, number>;
    scan_parameter: string;
    param_start: number;
    param_end: number;
    param_steps: number;
    solver_method: SolverMethodType;
    t_start: number;
    t_end: number;
    num_points: number;
    save_to_db: boolean;
  }): Promise<{ success: boolean; message?: string; data: ParameterScanData }> {
    const response = await api.post('/parameter-scan/run', params);
    return response.data;
  },

  async getScanRecords(): Promise<any[]> {
    const response = await api.get('/parameter-scan/records');
    return response.data.data;
  },
};
