import axios from 'axios';
import type {
  ClassicExample,
  SolveODERequest,
  SolveODEResponse,
  PoincareSectionRequest,
  PoincareSectionResponse,
  ParameterScanRequest,
  ParameterScanResponse,
  ScanRecord,
} from '../types';

const API_BASE = '/api';

export const odeApi = {
  getExamples: async (): Promise<ClassicExample[]> => {
    const response = await axios.get(`${API_BASE}/ode/examples`);
    return response.data.data;
  },

  getExampleDetail: async (key: string): Promise<ClassicExample> => {
    const response = await axios.get(`${API_BASE}/ode/examples/${key}`);
    return response.data.data;
  },

  solve: async (request: SolveODERequest): Promise<SolveODEResponse> => {
    const response = await axios.post(`${API_BASE}/ode/solve`, request);
    return response.data;
  },

  computePoincare: async (request: PoincareSectionRequest): Promise<PoincareSectionResponse> => {
    const response = await axios.post(`${API_BASE}/ode/poincare`, request);
    return response.data;
  },

  runParameterScan: async (request: ParameterScanRequest): Promise<ParameterScanResponse> => {
    const response = await axios.post(`${API_BASE}/parameter-scan/run`, request);
    return response.data;
  },

  getScanRecords: async (skip: number = 0, limit: number = 100): Promise<ScanRecord[]> => {
    const response = await axios.get(`${API_BASE}/parameter-scan/records`, {
      params: { skip, limit }
    });
    return response.data.data;
  },

  getScanRecordDetail: async (id: number): Promise<any> => {
    const response = await axios.get(`${API_BASE}/parameter-scan/records/${id}`);
    return response.data.data;
  },

  deleteScanRecord: async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE}/parameter-scan/records/${id}`);
  },

  healthCheck: async (): Promise<{ status: string }> => {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  }
};
