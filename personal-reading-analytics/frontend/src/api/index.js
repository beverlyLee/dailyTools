import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API请求失败:', error)
    return Promise.reject(error)
  }
)

export const healthApi = {
  check: () => api.get('/health')
}

export const booksApi = {
  getAll: () => api.get('/books'),
  getById: (id) => api.get(`/books/${id}`),
  create: (book) => api.post('/books', book),
  update: (id, book) => api.put(`/books/${id}`, book),
  delete: (id) => api.delete(`/books/${id}`)
}

export const sessionsApi = {
  getAll: (bookId) => {
    const params = bookId ? { book_id: bookId } : {}
    return api.get('/sessions', { params })
  },
  getById: (id) => api.get(`/sessions/${id}`),
  create: (session) => api.post('/sessions', session),
  update: (id, session) => api.put(`/sessions/${id}`, session),
  delete: (id) => api.delete(`/sessions/${id}`)
}

export const notesApi = {
  getAll: (sessionId) => {
    const params = sessionId ? { session_id: sessionId } : {}
    return api.get('/notes', { params })
  },
  getById: (id) => api.get(`/notes/${id}`),
  create: (note) => api.post('/notes', note),
  update: (id, note) => api.put(`/notes/${id}`, note),
  delete: (id) => api.delete(`/notes/${id}`)
}

export const analyticsApi = {
  getStatistics: () => api.get('/analytics/statistics'),
  getReadingSpeed: () => api.get('/analytics/reading-speed'),
  getHeatmap: () => api.get('/analytics/heatmap'),
  getProgress: (bookId) => api.get(`/analytics/progress/${bookId}`)
}

export const nlpApi = {
  extractKeywords: (text, topN) => api.post('/nlp/keywords', { text, top_n: topN }),
  analyzeSentiment: (text) => api.post('/nlp/sentiment', { text }),
  getThemes: () => api.get('/nlp/themes'),
  getPatterns: () => api.get('/nlp/patterns')
}

export const syncApi = {
  importCSV: (formData, onUploadProgress) => 
    api.post('/sync/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    }),
  exportCSV: (type) => api.get(`/sync/export?type=${type}`, { responseType: 'blob' }),
  getOAuthConfig: (provider) => api.get(`/sync/oauth-config/${provider}`),
  checkMockOAuth: (provider) => api.get(`/sync/use-mock/${provider}`)
}

export default api
