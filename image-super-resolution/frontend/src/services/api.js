import axios from 'axios'

const API_BASE_URL = ''

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const projectsAPI = {
  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/api/projects/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  process: async (projectId, options) => {
    const response = await api.post(`/api/projects/${projectId}/process`, options)
    return response.data
  },

  getResult: async (projectId) => {
    const response = await api.get(`/api/projects/${projectId}/result`)
    return response.data
  },

  list: async (limit = 50) => {
    const response = await api.get(`/api/projects?limit=${limit}`)
    return response.data
  },

  delete: async (projectId) => {
    const response = await api.delete(`/api/projects/${projectId}`)
    return response.data
  }
}

export const healthAPI = {
  check: async () => {
    const response = await api.get('/api/health')
    return response.data
  }
}

export default api
