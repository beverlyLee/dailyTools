import axios from 'axios';

const api = axios.create({
  baseURL: '/api/demand',
  timeout: 15000,
});

export const getForecast = (productId, days = 30) => 
  api.get('/forecast', { params: { productId, days } });

export const getHistoryData = (productId, days = 90) =>
  api.get('/history', { params: { productId, days } });

export const runSimulation = (params) =>
  api.post('/simulate', params);

export const getReplenishmentSuggestions = () =>
  api.get('/replenishment');

export const approveReplenishment = (id) =>
  api.post(`/replenishment/${id}/approve`);

export const getExternalFactors = (days = 30) =>
  api.get('/external-factors', { params: { days } });

export default api;
