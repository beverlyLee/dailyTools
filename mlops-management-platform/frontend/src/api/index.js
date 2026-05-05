import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const experimentsApi = {
  listExperiments: () => api.get('/experiments/'),
  getExperimentRuns: (experimentId) => api.get(`/experiments/${experimentId}/runs`),
  getRunDetails: (runId) => api.get(`/experiments/runs/${runId}`),
  compareRuns: (runIds) => api.post('/experiments/runs/compare', { run_ids: runIds }),
  getModelRanking: (experimentId, metricName = 'accuracy', higherIsBetter = true) => 
    api.get(`/experiments/${experimentId}/ranking`, { 
      params: { metric_name: metricName, higher_is_better: higherIsBetter } 
    }),
  registerBestModel: (experimentId, modelName, metricName = 'accuracy', higherIsBetter = true) =>
    api.post(`/experiments/${experimentId}/register-best-model`, {
      model_name: modelName,
      metric_name: metricName,
      higher_is_better: higherIsBetter
    })
}

export const modelsApi = {
  listModels: () => api.get('/models/'),
  getModelDetails: (modelName) => api.get(`/models/${modelName}`),
  transitionStage: (modelName, version, stage) => 
    api.post(`/models/${modelName}/versions/${version}/stage`, { stage }),
  getLatestProduction: (modelName) => api.get(`/models/${modelName}/latest-production`)
}

export const monitoringApi = {
  listServices: () => api.get('/monitoring/services'),
  registerService: (serviceName) => api.post(`/monitoring/services/${serviceName}/register`),
  unregisterService: (serviceName) => api.delete(`/monitoring/services/${serviceName}`),
  getServiceMetrics: (serviceName, minutes = 5) => 
    api.get(`/monitoring/services/${serviceName}/metrics`, { params: { minutes } }),
  getAllMetrics: () => api.get('/monitoring/metrics'),
  simulateRequest: (serviceName) => api.post(`/monitoring/services/${serviceName}/simulate-request`),
  setBaseline: (serviceName, predictions) => 
    api.post(`/monitoring/services/${serviceName}/set-baseline`, { predictions }),
  rollback: (serviceName, fromVersion, toVersion, reason) =>
    api.post(`/monitoring/services/${serviceName}/rollback`, {
      from_version: fromVersion,
      to_version: toVersion,
      reason
    }),
  getRollbackHistory: (serviceName) => 
    api.get(`/monitoring/services/${serviceName}/rollback-history`)
}

export const healthApi = {
  check: () => api.get('/health')
}

export default api
