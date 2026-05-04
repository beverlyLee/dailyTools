import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const recordsApi = {
  getAllRecords: async () => {
    const response = await api.get('/records')
    return response.data
  },
  
  getRecordsByType: async (type) => {
    const response = await api.get(`/records/type/${type}`)
    return response.data
  },
  
  addRecord: async (record) => {
    const response = await api.post('/records', record)
    return response.data
  },
  
  deleteRecord: async (id) => {
    const response = await api.delete(`/records/${id}`)
    return response.data
  },
  
  getCalculations: async () => {
    const response = await api.get('/calculations')
    return response.data
  },
  
  getCalculationsByDateRange: async (startDate, endDate) => {
    const response = await api.get('/calculations/range', {
      params: { startDate, endDate }
    })
    return response.data
  },
  
  getEmissionFactors: async () => {
    const response = await api.get('/emission-factors')
    return response.data
  }
}

export default api
