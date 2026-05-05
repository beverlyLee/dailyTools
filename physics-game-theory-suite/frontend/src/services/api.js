import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});


export const healthApi = {
  check: () => api.get('/health'),
  ping: () => api.get('/health/ping'),
};


export const simulationApi = {
  create: (config) => api.post('/simulation/create', config),
  
  step: (simulationId, steps = 1, saveInterval = 1) => 
    api.post(`/simulation/${simulationId}/step`, null, {
      params: { steps, save_interval: saveInterval }
    }),
  
  getState: (simulationId) => api.get(`/simulation/${simulationId}/state`),
  
  getInfo: (simulationId) => api.get(`/simulation/${simulationId}/info`),
  
  scaleTemperature: (simulationId, targetTemperature) => 
    api.post(`/simulation/${simulationId}/scale-temperature`, {
      target_temperature: targetTemperature
    }),
  
  close: (simulationId) => api.delete(`/simulation/${simulationId}`),
  
  save: (simulationId, name) => 
    api.post(`/simulation/${simulationId}/save`, { name }),
  
  listActive: () => api.get('/simulation'),
};


export const trajectoryApi = {
  list: () => api.get('/trajectory'),
  
  getInfo: (simulationId) => api.get(`/trajectory/${simulationId}`),
  
  getFrames: (simulationId) => api.get(`/trajectory/${simulationId}/frames`),
  
  getFrameDetails: (simulationId, frameNumber) => 
    api.get(`/trajectory/${simulationId}/frames/${frameNumber}`),
  
  delete: (simulationId) => api.delete(`/trajectory/${simulationId}`),
};


export const gameSolverApi = {
  solve: (request, saveHistory = true) => 
    api.post('/game-solver/solve', request, {
      params: { save_history: saveHistory }
    }),
  
  getHistory: (limit = 20, offset = 0) => 
    api.get('/game-solver/history', { params: { limit, offset } }),
  
  deleteHistory: (historyId) => 
    api.delete(`/game-solver/history/${historyId}`),
};


export const gameExamplesApi = {
  getAll: () => api.get('/game-examples'),
  
  getById: (exampleId) => api.get(`/game-examples/${exampleId}`),
  
  getByCategory: (category) => api.get(`/game-examples/category/${category}`),
  
  getCategories: () => api.get('/game-examples/categories'),
};


export default api;
