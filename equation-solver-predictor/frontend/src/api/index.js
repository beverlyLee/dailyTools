import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const odeApi = {
  getModels: () => api.get('/ode/models'),
  getMethods: () => api.get('/ode/methods'),
  solve: (data) => api.post('/ode/solve', data),
  parameterScan: (data) => api.post('/ode/parameter-scan', data),
  getHistory: () => api.get('/ode/history'),
  getHistoryById: (id) => api.get(`/ode/history/${id}`)
}

export const regressionApi = {
  train: (data) => api.post('/regression/train', data),
  predict: (data) => api.post('/regression/predict', data),
  predictBatch: (data) => api.post('/regression/predict-batch', data),
  getModels: () => api.get('/regression/models'),
  getModelById: (id) => api.get(`/regression/models/${id}`),
  getFeatureImportance: () => api.get('/regression/feature-importance'),
  getResiduals: () => api.get('/regression/residuals'),
  getDataInfo: () => api.get('/regression/data-info'),
  getPredictionHistory: (params) => api.get('/regression/prediction-history', { params })
}

export default api
