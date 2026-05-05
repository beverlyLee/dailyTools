import axios from 'axios'

const API_BASE_URL = '/api/industry'

export const getIndustryChain = async (industry = '新能源') => {
  try {
    const response = await axios.get(`${API_BASE_URL}/chain`, { params: { industry } })
    return response.data
  } catch (error) {
    console.error('获取产业链数据失败:', error)
    return {}
  }
}

export const getCompanyList = async (industry = '新能源') => {
  try {
    const response = await axios.get(`${API_BASE_URL}/companies`, { params: { industry } })
    return response.data
  } catch (error) {
    console.error('获取公司列表失败:', error)
    return []
  }
}

export const getCompanyDetail = async (companyId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/company/${companyId}`)
    return response.data
  } catch (error) {
    console.error('获取公司详情失败:', error)
    return null
  }
}

export const getFinancialData = async (industry = '新能源') => {
  try {
    const response = await axios.get(`${API_BASE_URL}/financial`, { params: { industry } })
    return response.data
  } catch (error) {
    console.error('获取财务数据失败:', error)
    return {}
  }
}

export const getShareholders = async (companyId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/company/${companyId}/shareholders`)
    return response.data
  } catch (error) {
    console.error('获取股东信息失败:', error)
    return []
  }
}

export const getRelatedCompanies = async (companyId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/company/${companyId}/related`)
    return response.data
  } catch (error) {
    console.error('获取关联公司失败:', error)
    return []
  }
}

export const searchCompanies = async (keyword) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/search`, { params: { keyword } })
    return response.data
  } catch (error) {
    console.error('搜索公司失败:', error)
    return []
  }
}

export const getIndustryList = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/list`)
    return response.data
  } catch (error) {
    console.error('获取行业列表失败:', error)
    return []
  }
}
