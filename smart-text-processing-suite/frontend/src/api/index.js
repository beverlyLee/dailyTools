import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const essayApi = {
  checkEssay: (data) => api.post('/essay/check', data),
  getHistory: (params) => api.get('/essay/history', { params }),
  getDetail: (id) => api.get(`/essay/${id}`)
}

export const documentApi = {
  checkDocument: (data) => api.post('/document/check', data),
  getVersions: (documentId) => api.get(`/document/${documentId}/versions`),
  getVersion: (documentId, versionId) => api.get(`/document/${documentId}/version/${versionId}`),
  saveDocument: (data) => api.post('/document/save', data)
}

export default api
