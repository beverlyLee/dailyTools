import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API请求失败:', error)
    return Promise.reject(error)
  }
)

// 图像生成相关API
export const imageApi = {
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/image/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  detectKeypoints: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/image/detect-keypoints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  generateStyleTransfer: (file, styleType, keypoints, userId) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('style_type', styleType)
    formData.append('keypoints', JSON.stringify(keypoints))
    if (userId) {
      formData.append('user_id', userId)
    }
    return api.post('/image/generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getTaskStatus: (taskId) => {
    return api.get(`/image/task/${taskId}`)
  },

  getHistory: (userId, limit = 20, offset = 0) => {
    return api.get('/image/history', {
      params: { user_id: userId, limit, offset },
    })
  },

  getStyles: () => {
    return api.get('/image/styles')
  },

  inpaint: (imageFile, maskFile, prompt, strength = 0.75) => {
    const formData = new FormData()
    formData.append('image_file', imageFile)
    formData.append('mask_file', maskFile)
    formData.append('prompt', prompt)
    formData.append('strength', strength)
    return api.post('/image/inpaint', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// 音乐生成相关API
export const musicApi = {
  generateMusic: (prompt, folkRatio, modernity, model = 'ernie', userId) => {
    return api.post('/music/generate', {
      prompt,
      folk_ratio: folkRatio,
      modernity,
      model,
    }, {
      params: userId ? { user_id: userId } : {},
    })
  },

  getTaskStatus: (taskId) => {
    return api.get(`/music/task/${taskId}`)
  },

  getHistory: (userId, limit = 20, offset = 0) => {
    return api.get('/music/history', {
      params: { user_id: userId, limit, offset },
    })
  },

  adjustMidi: (midiData, adjustments) => {
    return api.post('/music/adjust-midi', {
      midi_data: midiData,
      adjustments,
    })
  },

  getModels: () => {
    return api.get('/music/models')
  },
}

// 图表生成相关API
export const chartApi = {
  query: (queryText) => {
    return api.post('/chart/query', {
      query: queryText,
    })
  },

  getSchema: () => {
    return api.get('/chart/schema')
  },

  initSampleData: () => {
    return api.post('/chart/init-sample-data')
  },

  getExampleQueries: () => {
    return api.get('/chart/example-queries')
  },
}

export default api
