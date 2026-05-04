import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const healthApi = {
  check: () => apiClient.get('/health')
}

export const entriesApi = {
  getList: (params = {}) => apiClient.get('/entries', { params }),
  create: (data) => apiClient.post('/entries', data)
}

export const analyticsApi = {
  getEfficiency: (params = {}) => apiClient.get('/analytics/efficiency', { params }),
  getPeakFocus: (params = {}) => apiClient.get('/analytics/peak-focus', { params }),
  getOverview: (params = {}) => apiClient.get('/analytics/overview', { params }),
  getHeatmap: (params = {}) => apiClient.get('/analytics/heatmap', { params })
}

export const syncApi = {
  syncRescueTime: (data) => apiClient.post('/sync/rescuetime', data),
  syncToggl: (data) => apiClient.post('/sync/toggl', data)
}

export const mockApi = {
  generate: (params = {}) => apiClient.get('/mock/generate', { params }),
  import: (data) => apiClient.post('/mock/import', data)
}

export const statsApi = {
  getStats: () => apiClient.get('/stats')
}

export default apiClient
