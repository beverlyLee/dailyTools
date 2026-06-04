import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const getConfig = async () => {
  const response = await api.get('/config')
  return response.data
}

export const getBuildings = async () => {
  const response = await api.get('/buildings')
  return response.data
}

export const analyzeLunchDrift = async (params) => {
  const response = await api.post('/analyze', params)
  return response.data
}

export const getStatistics = async (buildingName) => {
  const response = await api.get('/statistics', { params: { building_name: buildingName } })
  return response.data
}

export default api
