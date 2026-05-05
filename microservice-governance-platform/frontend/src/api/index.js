import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 可以在这里添加 token 等认证信息
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    return Promise.reject(error)
  }
)

// 服务拓扑相关 API
export const topologyApi = {
  // 获取服务拓扑图
  getTopology: () => api.get('/topology'),
  
  // 获取服务详细指标
  getServiceMetrics: (serviceName) => api.get(`/topology/service/${serviceName}/metrics`),
  
  // 获取服务调用关系
  getServiceDependencies: (serviceName) => api.get(`/topology/service/${serviceName}/dependencies`),
  
  // 获取所有服务列表
  getServices: () => api.get('/services'),
  
  // 获取服务健康状态
  getServiceHealth: (serviceName) => api.get(`/services/${serviceName}/health`)
}

// 流量治理相关 API
export const trafficApi = {
  // 金丝雀发布规则
  getCanaryRules: () => api.get('/traffic/canary'),
  createCanaryRule: (data) => api.post('/traffic/canary', data),
  updateCanaryRule: (id, data) => api.put(`/traffic/canary/${id}`, data),
  deleteCanaryRule: (id) => api.delete(`/traffic/canary/${id}`),
  
  // 蓝绿部署规则
  getBlueGreenRules: () => api.get('/traffic/bluegreen'),
  createBlueGreenRule: (data) => api.post('/traffic/bluegreen', data),
  updateBlueGreenRule: (id, data) => api.put(`/traffic/bluegreen/${id}`, data),
  deleteBlueGreenRule: (id) => api.delete(`/traffic/bluegreen/${id}`),
  
  // 熔断降级规则
  getCircuitBreakerRules: () => api.get('/traffic/circuitbreaker'),
  createCircuitBreakerRule: (data) => api.post('/traffic/circuitbreaker', data),
  updateCircuitBreakerRule: (id, data) => api.put(`/traffic/circuitbreaker/${id}`, data),
  deleteCircuitBreakerRule: (id) => api.delete(`/traffic/circuitbreaker/${id}`),
  
  // 流量镜像规则
  getMirrorRules: () => api.get('/traffic/mirror'),
  createMirrorRule: (data) => api.post('/traffic/mirror', data),
  updateMirrorRule: (id, data) => api.put(`/traffic/mirror/${id}`, data),
  deleteMirrorRule: (id) => api.delete(`/traffic/mirror/${id}`),
  
  // 故障注入规则
  getFaultRules: () => api.get('/traffic/fault'),
  createFaultRule: (data) => api.post('/traffic/fault', data),
  updateFaultRule: (id, data) => api.put(`/traffic/fault/${id}`, data),
  deleteFaultRule: (id) => api.delete(`/traffic/fault/${id}`)
}

export default api
