import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const healthRecordApi = {
  getAll: () => api.get('/api/health-records'),
  
  getByDate: (date) => api.get(`/api/health-records/date?date=${date}`),
  
  getByDateRange: (startDate, endDate) => 
    api.get(`/api/health-records/range?start_date=${startDate}&end_date=${endDate}`),
  
  create: (data) => api.post('/api/health-records', data),
  
  update: (id, data) => api.put(`/api/health-records/${id}`, data),
  
  delete: (id) => api.delete(`/api/health-records/${id}`),
}

export const airQualityApi = {
  getCurrent: (location = '101010100') => 
    api.get(`/api/air-quality/current?location=${location}`),
  
  getLocations: () => api.get('/api/air-quality/locations'),
  
  getDataSourceStatus: () => api.get('/api/air-quality/data-source-status'),
}

export const correlationApi = {
  analyze: (params = {}) => {
    const { location, startDate, endDate } = params
    let url = '/api/correlation/analyze'
    const queryParams = []
    
    if (location) queryParams.push(`location=${location}`)
    if (startDate) queryParams.push(`start_date=${startDate}`)
    if (endDate) queryParams.push(`end_date=${endDate}`)
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&')
    }
    
    return api.get(url)
  },
  
  getMockData: () => api.get('/api/correlation/mock'),
}

export default api
