import axios from 'axios'

const API_BASE_URL = '/api/sentiment'

export const getSentimentData = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/news`, { params })
    return response.data
  } catch (error) {
    console.error('获取舆情数据失败:', error)
    return []
  }
}

export const getSentimentTrend = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/trend`, { params })
    return response.data
  } catch (error) {
    console.error('获取舆情趋势失败:', error)
    return {}
  }
}

export const getHotTopics = async (params = {}) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/hot-topics`, { params })
    return response.data
  } catch (error) {
    console.error('获取热门话题失败:', error)
    return []
  }
}

export const startMonitoring = async (config) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/start`, config)
    return response.data
  } catch (error) {
    console.error('启动监控失败:', error)
    throw error
  }
}

export const stopMonitoring = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/stop`)
    return response.data
  } catch (error) {
    console.error('停止监控失败:', error)
    throw error
  }
}

export const getMonitoringStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/status`)
    return response.data
  } catch (error) {
    console.error('获取监控状态失败:', error)
    return { running: false }
  }
}
