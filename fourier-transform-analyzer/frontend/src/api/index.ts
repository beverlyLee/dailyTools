import axios from 'axios';
import { SignalRequest, SignalResponse, SnapshotCreate, SnapshotResponse, SnapshotListResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const signalApi = {
  generateAndAnalyze: async (request: SignalRequest): Promise<SignalResponse> => {
    const response = await api.post<SignalResponse>('/signal/generate', request);
    return response.data;
  },

  filterOnly: async (request: SignalRequest): Promise<SignalResponse> => {
    const response = await api.post<SignalResponse>('/signal/filter-only', request);
    return response.data;
  },
};

export const snapshotApi = {
  create: async (snapshot: SnapshotCreate): Promise<SnapshotResponse> => {
    const response = await api.post<SnapshotResponse>('/snapshots/', snapshot);
    return response.data;
  },

  list: async (skip = 0, limit = 100): Promise<SnapshotListResponse[]> => {
    const response = await api.get<SnapshotListResponse[]>(`/snapshots/?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  get: async (id: number): Promise<SnapshotResponse> => {
    const response = await api.get<SnapshotResponse>(`/snapshots/${id}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/snapshots/${id}`);
  },
};

export default api;
