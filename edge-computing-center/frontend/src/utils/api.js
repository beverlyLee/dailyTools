import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success) {
      return response.data;
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const nodeAPI = {
  getAll: () => api.get('/nodes'),
  getById: (id) => api.get(`/nodes/${id}`),
  create: (data) => api.post('/nodes', data),
  update: (id, data) => api.put(`/nodes/${id}`, data),
  delete: (id) => api.delete(`/nodes/${id}`),
  getStats: (id) => api.get(`/nodes/${id}/stats`),
  getMetrics: (id, hours = 24) => api.get(`/nodes/${id}/metrics?hours=${hours}`),
  connectSSH: (id) => api.get(`/nodes/${id}/ssh`),
};

export const appAPI = {
  getAll: () => api.get('/apps'),
  getById: (id) => api.get(`/apps/${id}`),
  create: (data) => api.post('/apps', data),
  delete: (id) => api.delete(`/apps/${id}`),
};

export const deploymentAPI = {
  getAll: () => api.get('/deployments'),
  getById: (id) => api.get(`/deployments/${id}`),
  create: (data) => api.post('/deployments', data),
  rollback: (id) => api.post(`/deployments/${id}/rollback`),
  getLogs: (id) => api.get(`/deployments/${id}/logs`),
};

export const electronAPI = {
  executeSSH: (options) => {
    if (window.electronAPI) {
      return window.electronAPI.executeSSH(options);
    }
    return Promise.reject(new Error('Electron API not available'));
  },
  pingNode: (ip) => {
    if (window.electronAPI) {
      return window.electronAPI.pingNode(ip);
    }
    return Promise.resolve({ success: true, latency: 50 + Math.random() * 50 });
  },
};

export default api;
