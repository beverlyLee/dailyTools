import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const documentApi = {
  getAll: () => api.get('/documents/'),
  getById: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents/', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  
  getVersions: (id) => api.get(`/documents/${id}/versions`),
  getVersion: (id, versionNumber) => api.get(`/documents/${id}/versions/${versionNumber}`),
  restoreVersion: (id, versionNumber) => api.post(`/documents/${id}/versions/${versionNumber}/restore`),
  
  getCorrections: (id) => api.get(`/documents/${id}/corrections`),
  saveCorrection: (data) => api.post('/documents/corrections', data),
  applyCorrection: (id) => api.post(`/documents/corrections/${id}/apply`)
}

export const proofreaderApi = {
  check: (text) => api.post('/proofreader/check', { text }),
  checkPoliticalTerms: (text) => api.post('/proofreader/check/political-terms', { text }),
  checkCollocations: (text) => api.post('/proofreader/check/collocations', { text }),
  checkPunctuation: (text) => api.post('/proofreader/check/punctuation', { text }),
  
  checkFormat: (text) => api.post('/proofreader/check/format', { text }),
  checkTitleHierarchy: (text) => api.post('/proofreader/check/format/title-hierarchy', { text }),
  checkDocumentNumber: (text) => api.post('/proofreader/check/format/document-number', { text }),
  checkRedHead: (text) => api.post('/proofreader/check/format/red-head', { text }),
  
  polish: (text) => api.post('/proofreader/polish', { text }),
  polishColloquial: (text) => api.post('/proofreader/polish/colloquial', { text }),
  polishPhrases: (text) => api.post('/proofreader/polish/phrases', { text }),
  polishSentence: (text) => api.post('/proofreader/polish/sentence', { text }),
  
  fullCheck: (text) => api.post('/proofreader/full-check', { text })
}

export default api
