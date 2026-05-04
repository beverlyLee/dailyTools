import { auth } from '../stores/auth'

const API_BASE = '/api'

class ApiClient {
  constructor() {
    this.token = null
    auth.subscribe(state => {
      this.token = state.token
    })
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    }

    const response = await fetch(url, config)
    
    if (response.status === 401) {
      auth.logout()
      throw new Error('Unauthorized')
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }
    
    return response.json()
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    return this.request(url, { method: 'GET' })
  }

  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()

export const authApi = {
  getLoginUrl: () => `${API_BASE}/auth/login`,
  checkAuth: () => api.get('/auth/check'),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
}

export const dataApi = {
  sync: (force = false, useLocalFallback = true) => 
    api.get('/data/sync', { force, use_local_fallback: useLocalFallback }),
  getHistory: (limit = 50, offset = 0) =>
    api.get('/data/history', { limit, offset }),
  getFeatures: (trackId) =>
    api.get(`/data/features/${trackId}`),
  getStats: () =>
    api.get('/data/stats/count')
}

export const analysisApi = {
  getEvolution: (year = null, forceRefresh = false) =>
    api.get('/analysis/evolution', { year, force_refresh: forceRefresh }),
  getTrend: (feature, year = null) =>
    api.get(`/analysis/trends/${feature}`, { year }),
  getMonthly: (year = null) =>
    api.get('/analysis/monthly', { year })
}
