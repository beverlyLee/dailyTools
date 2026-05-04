import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const tasteAnalysisApi = {
  analyze: (userId) => api.get('/taste/analyze/', { params: { user_id: userId } }),
  getDeviation: (userId) => api.get('/taste/deviation/', { params: { user_id: userId } }),
  getGenres: (userId) => api.get('/taste/genres/', { params: { user_id: userId } }),
  getExtremes: (userId, limit = 5) => api.get('/taste/extremes/', { params: { user_id: userId, limit } }),
  compare: (userId, otherUserIds) => api.post('/taste/compare/', { user_id: userId, other_user_ids: otherUserIds }),
}

export const ratingsApi = {
  getAll: (userId) => api.get('/ratings/', { params: { user_id: userId } }),
  rate: (mediaId, userId, rating, comment = '') => 
    api.post('/ratings/rate/', { media_id: mediaId, user_id: userId, rating, comment }),
}

export const mediaApi = {
  search: (query, type = 'movie', page = 1) => 
    api.get('/media/search/', { params: { q: query, type, page } }),
  getDetails: (tmdbId, type = 'movie') => 
    api.post(`/media/${tmdbId}/details/`, null, { params: { type } }),
  getPopular: (type = 'movie', page = 1) => 
    api.get('/media/popular/', { params: { type, page } }),
  getTrending: (type = 'all', timeWindow = 'week') => 
    api.get('/media/trending/', { params: { type, time_window: timeWindow } }),
  getGenres: (type = 'movie') => 
    api.get('/media/genres/', { params: { type } }),
}

export const historyApi = {
  getAll: (userId) => api.get('/history/', { params: { user_id: userId } }),
  log: (mediaId, userId, progress = 0, completed = false, watchDate = null) => 
    api.post('/history/log/', { 
      media_id: mediaId, 
      user_id: userId, 
      progress, 
      completed,
      watch_date: watchDate 
    }),
}

export default api
