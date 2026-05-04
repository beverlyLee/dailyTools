const BASE_URL = 'http://localhost:8000'
const API_PREFIX = '/api/v1'

const request = (options) => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': options.contentType || 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error(res.data.detail || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败'))
      }
    })
  })
}

const uploadFile = (options) => {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + options.url,
      filePath: options.filePath,
      name: options.name || 'image',
      formData: options.formData || {},
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(res.data))
        } else {
          reject(new Error('上传失败'))
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败'))
      }
    })
  })
}

const diseaseApi = {
  identify: (imagePath, plantId = null) => {
    const formData = {}
    if (plantId !== null) {
      formData.plant_id = plantId
    }
    
    return uploadFile({
      url: `${API_PREFIX}/disease/identify`,
      filePath: imagePath,
      name: 'image',
      formData: formData
    })
  },
  
  getClasses: () => {
    return request({
      url: `${API_PREFIX}/disease/classes`,
      method: 'GET'
    })
  },
  
  getTreatment: (diseaseName) => {
    return request({
      url: `${API_PREFIX}/disease/treatment/${encodeURIComponent(diseaseName)}`,
      method: 'GET'
    })
  },
  
  getAllTreatments: () => {
    return request({
      url: `${API_PREFIX}/disease/treatments`,
      method: 'GET'
    })
  }
}

const plantApi = {
  getAll: (skip = 0, limit = 100) => {
    return request({
      url: `${API_PREFIX}/plant/`,
      method: 'GET',
      data: { skip, limit }
    })
  },
  
  getById: (plantId) => {
    return request({
      url: `${API_PREFIX}/plant/${plantId}`,
      method: 'GET'
    })
  },
  
  create: (plantData) => {
    return request({
      url: `${API_PREFIX}/plant/`,
      method: 'POST',
      data: plantData
    })
  },
  
  update: (plantId, plantData) => {
    return request({
      url: `${API_PREFIX}/plant/${plantId}`,
      method: 'PUT',
      data: plantData
    })
  },
  
  delete: (plantId) => {
    return request({
      url: `${API_PREFIX}/plant/${plantId}`,
      method: 'DELETE'
    })
  },
  
  getHealthRecords: (plantId, skip = 0, limit = 50) => {
    return request({
      url: `${API_PREFIX}/plant/${plantId}/records`,
      method: 'GET',
      data: { skip, limit }
    })
  },
  
  createHealthRecord: (plantId, recordData) => {
    return request({
      url: `${API_PREFIX}/plant/${plantId}/records`,
      method: 'POST',
      data: recordData
    })
  },
  
  getHealthRecord: (plantId, recordId) => {
    return request({
      url: `${API_PREFIX}/plant/${plantId}/records/${recordId}`,
      method: 'GET'
    })
  },
  
  deleteHealthRecord: (plantId, recordId) => {
    return request({
      url: `${API_PREFIX}/plant/${plantId}/records/${recordId}`,
      method: 'DELETE'
    })
  }
}

const healthApi = {
  check: () => {
    return request({
      url: `${API_PREFIX}/health/`,
      method: 'GET'
    })
  },
  
  ping: () => {
    return request({
      url: `${API_PREFIX}/health/ping`,
      method: 'GET'
    })
  },
  
  loadModel: () => {
    return request({
      url: `${API_PREFIX}/health/model/load`,
      method: 'POST'
    })
  },
  
  unloadModel: () => {
    return request({
      url: `${API_PREFIX}/health/model/unload`,
      method: 'POST'
    })
  },
  
  getModelStatus: () => {
    return request({
      url: `${API_PREFIX}/health/model/status`,
      method: 'GET'
    })
  }
}

export default {
  request,
  uploadFile,
  diseaseApi,
  plantApi,
  healthApi
}
