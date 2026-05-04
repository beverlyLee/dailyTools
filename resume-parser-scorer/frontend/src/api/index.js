import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      ElMessage.error(error.response.data.detail || '请求失败')
    } else {
      ElMessage.error('网络错误')
    }
    return Promise.reject(error)
  }
)

export const resumeApi = {
  upload(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  parse(filePath, fileType) {
    return api.post('/resume/parse', null, {
      params: { file_path: filePath, file_type: fileType }
    })
  },
  
  save(resumeData, filePath, fileType) {
    return api.post('/resume/save', resumeData, {
      params: { file_path: filePath, file_type: fileType }
    })
  },
  
  uploadParseSave(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/resume/upload-parse-save', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  list(skip = 0, limit = 20, keyword = '') {
    const params = { skip, limit }
    if (keyword) params.keyword = keyword
    return api.get('/resume/list', { params })
  },
  
  get(id) {
    return api.get(`/resume/${id}`)
  },
  
  delete(id) {
    return api.delete(`/resume/${id}`)
  }
}

export const jobApi = {
  create(jobData) {
    return api.post('/job/', jobData)
  },
  
  list(skip = 0, limit = 20, keyword = '') {
    const params = { skip, limit }
    if (keyword) params.keyword = keyword
    return api.get('/job/list', { params })
  },
  
  get(id) {
    return api.get(`/job/${id}`)
  },
  
  update(id, jobData) {
    return api.put(`/job/${id}`, jobData)
  },
  
  delete(id) {
    return api.delete(`/job/${id}`)
  }
}

export const matchApi = {
  calculate(resumeId, jobId) {
    return api.post('/match/calculate', null, {
      params: { resume_id: resumeId, job_id: jobId }
    })
  },
  
  batch(resumeIds, jobId) {
    return api.post('/match/batch', {
      resume_ids: resumeIds,
      job_description_id: jobId
    })
  },
  
  matchAll(jobId) {
    return api.post('/match/match-all', null, {
      params: { job_id: jobId }
    })
  },
  
  history(resumeId = null, jobId = null, limit = 50) {
    const params = { limit }
    if (resumeId) params.resume_id = resumeId
    if (jobId) params.job_id = jobId
    return api.get('/match/history', { params })
  }
}

export default api
