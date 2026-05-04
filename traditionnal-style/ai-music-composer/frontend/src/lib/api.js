const API_BASE = '/api'

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  }
  
  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '请求失败' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export const musicAPI = {
  async generate(params) {
    return request('/music/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  },
  
  async checkTask(taskId) {
    return request(`/music/task/${taskId}`)
  },
  
  async processStyle(params) {
    return request('/music/style/process', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  },
  
  async analyzeStyle(midiData) {
    const encoded = encodeURIComponent(midiData)
    return request(`/music/style/analyze?midi_data=${encoded}`)
  },
  
  async exportMidi(compositionId) {
    return fetch(`${API_BASE}/music/export/midi/${compositionId}`, {
      method: 'POST'
    })
  },
  
  async exportMidiRaw(midiData) {
    const formData = new FormData()
    formData.append('midi_data', midiData)
    
    return fetch(`${API_BASE}/music/export/midi-raw`, {
      method: 'POST',
      body: formData
    })
  }
}

export const compositionAPI = {
  async create(params) {
    return request('/compositions/', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  },
  
  async list(params = {}) {
    const query = new URLSearchParams(params).toString()
    return request(`/compositions/${query ? '?' + query : ''}`)
  },
  
  async get(id) {
    return request(`/compositions/${id}`)
  },
  
  async update(id, params) {
    return request(`/compositions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params)
    })
  },
  
  async delete(id) {
    return request(`/compositions/${id}`, {
      method: 'DELETE'
    })
  },
  
  async share(id) {
    return request(`/compositions/${id}/share`, {
      method: 'POST'
    })
  },
  
  async unshare(id) {
    return request(`/compositions/${id}/unshare`, {
      method: 'POST'
    })
  },
  
  async fork(id, newTitle) {
    const query = newTitle ? `?new_title=${encodeURIComponent(newTitle)}` : ''
    return request(`/compositions/${id}/fork${query}`, {
      method: 'POST'
    })
  },
  
  async getByShareToken(token) {
    return request(`/compositions/share/${token}`)
  }
}

export default { musicAPI, compositionAPI }
