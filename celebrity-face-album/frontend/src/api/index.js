import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('响应错误:', error)
    let message = '请求失败'
    if (error.response) {
      message = error.response.data.detail || `请求失败: ${error.response.status}`
    } else if (error.request) {
      message = '服务器无响应，请检查网络连接'
    }
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

// 简历相关API
export const resumeApi = {
  // 上传简历文件
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/resume/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  
  // 解析简历
  parse: (filePath, fileType) => {
    return api.post('/resume/parse', null, {
      params: {
        file_path: filePath,
        file_type: fileType
      }
    })
  },
  
  // 获取简历列表
  getList: (skip = 0, limit = 100) => {
    return api.get('/resume/list', {
      params: { skip, limit }
    })
  },
  
  // 获取简历详情
  getDetail: (id) => {
    return api.get(`/resume/${id}`)
  },
  
  // 删除简历
  delete: (id) => {
    return api.delete(`/resume/${id}`)
  }
}

// 岗位相关API
export const jobApi = {
  // 创建岗位
  create: (data) => {
    return api.post('/job/', data)
  },
  
  // 获取岗位列表
  getList: (skip = 0, limit = 100) => {
    return api.get('/job/list', {
      params: { skip, limit }
    })
  },
  
  // 获取岗位详情
  getDetail: (id) => {
    return api.get(`/job/${id}`)
  },
  
  // 更新岗位
  update: (id, data) => {
    return api.put(`/job/${id}`, data)
  },
  
  // 删除岗位
  delete: (id) => {
    return api.delete(`/job/${id}`)
  }
}

// 匹配相关API
export const matchApi = {
  // 批量匹配简历与岗位
  match: (resumeIds, jobId) => {
    return api.post('/match/', {
      resume_ids: resumeIds,
      job_description_id: jobId
    })
  },
  
  // 获取岗位匹配结果
  getJobResults: (jobId, minScore = 0) => {
    return api.get(`/match/job/${jobId}`, {
      params: { min_score: minScore }
    })
  },
  
  // 获取简历匹配历史
  getResumeHistory: (resumeId) => {
    return api.get(`/match/resume/${resumeId}`)
  },
  
  // 删除匹配结果
  delete: (id) => {
    return api.delete(`/match/${id}`)
  }
}

// 健康检查
export const healthCheck = () => {
  return api.get('/health')
}

export default api
