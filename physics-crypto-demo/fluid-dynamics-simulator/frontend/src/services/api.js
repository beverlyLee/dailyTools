import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const simulationApi = {
  init: async (params) => {
    const response = await api.post('/simulation/init', params);
    return response.data;
  },

  step: async (steps = 1) => {
    const response = await api.post('/simulation/step', { steps });
    return response.data;
  },

  saveSnapshot: async () => {
    const response = await api.post('/simulation/snapshot');
    return response.data;
  },

  getSimulations: async () => {
    const response = await api.get('/simulation/simulations');
    return response.data;
  },

  getSimulation: async (id) => {
    const response = await api.get(`/simulation/simulations/${id}`);
    return response.data;
  },

  getSnapshot: async (id, gridWidth = 256, gridHeight = 128) => {
    const response = await api.get(`/simulation/snapshots/${id}`, {
      params: { grid_width: gridWidth, grid_height: gridHeight }
    });
    return response.data;
  },

  deleteSimulation: async (id) => {
    const response = await api.delete(`/simulation/simulations/${id}`);
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/simulation/status');
    return response.data;
  }
};

export default api;
