import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentAlarms: () => api.get('/dashboard/alarms'),
  getMapMarkers: () => api.get('/dashboard/map-markers')
}

export const deviceApi = {
  getAll: () => api.get('/devices'),
  getById: (deviceId) => api.get(`/devices/${deviceId}`),
  getStatusSummary: () => api.get('/devices/status')
}

export const securityApi = {
  getCameras: () => api.get('/security/cameras'),
  getCameraById: (id) => api.get(`/security/cameras/${id}`),
  getAccessDevices: () => api.get('/security/access'),
  getAccessRecords: (params) => api.get('/security/access/records', { params }),
  openDoor: (deviceId) => api.post(`/security/access/${deviceId}/open`),
  getFireDevices: () => api.get('/security/fire'),
  getFireAlarms: () => api.get('/security/fire/alarms'),
  getAlarms: (params) => api.get('/security/alarms', { params }),
  getAlarmById: (id) => api.get(`/security/alarms/${id}`),
  handleAlarm: (id, data) => api.put(`/security/alarms/${id}/handle`, data),
  markFalseAlarm: (id) => api.put(`/security/alarms/${id}/false`)
}

export const energyApi = {
  getOverview: (params) => api.get('/energy/overview', { params }),
  getTrend: (params) => api.get('/energy/trend', { params }),
  getBuildingStats: (params) => api.get('/energy/building', { params }),
  getPeakValleyAnalysis: (params) => api.get('/energy/peak-valley', { params }),
  getRanking: (params) => api.get('/energy/ranking', { params }),
  getOptimizationReport: (params) => api.get('/energy/optimization', { params }),
  getOptimizationHistory: () => api.get('/energy/optimization/history')
}

export default api
