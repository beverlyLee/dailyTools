import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
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

export const essayApi = {
  submit: (data) => api.post('/essays/submit', data),
  getById: (id) => api.get(`/essays/${id}`),
  reAnalyze: (id) => api.post(`/essays/${id}/re-analyze`),
  uploadImage: (formData) => api.post('/essays/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const classApi = {
  getAll: (params) => api.get('/classes', { params }),
  create: (data) => api.post('/classes', data),
  getById: (id) => api.get(`/classes/${id}`),
  addStudent: (classId, data) => api.post(`/classes/${classId}/students`, data),
  createAssignment: (classId, data) => api.post(`/classes/${classId}/assignments`, data)
}

export const analysisApi = {
  getClassOverview: (classId) => api.get(`/analysis/class/${classId}/overview`),
  getClassErrors: (classId) => api.get(`/analysis/class/${classId}/errors`),
  getClassStudents: (classId) => api.get(`/analysis/class/${classId}/students`),
  getClassDimensions: (classId) => api.get(`/analysis/class/${classId}/dimensions`)
}

export default api
