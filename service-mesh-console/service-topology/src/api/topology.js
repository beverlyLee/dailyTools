import axios from 'axios';

const API_BASE_URL = '/api/topology';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 获取服务拓扑图
export const getTopology = async () => {
  try {
    const response = await api.get('/');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取拓扑图失败');
  } catch (error) {
    console.error('获取拓扑图失败:', error);
    throw error;
  }
};

// 获取服务列表
export const getServices = async () => {
  try {
    const response = await api.get('/services');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取服务列表失败');
  } catch (error) {
    console.error('获取服务列表失败:', error);
    throw error;
  }
};

// 获取服务详情
export const getServiceDetails = async (serviceName) => {
  try {
    const response = await api.get(`/services/${serviceName}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取服务详情失败');
  } catch (error) {
    console.error(`获取服务 ${serviceName} 详情失败:`, error);
    throw error;
  }
};

// 获取服务实例列表
export const getServiceInstances = async (serviceName) => {
  try {
    const response = await api.get(`/services/${serviceName}/instances`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取服务实例列表失败');
  } catch (error) {
    console.error(`获取服务 ${serviceName} 实例列表失败:`, error);
    throw error;
  }
};

// 获取服务指标
export const getMetrics = async (serviceName = null) => {
  try {
    const params = serviceName ? { service: serviceName } : {};
    const response = await api.get('/metrics', { params });
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || '获取指标失败');
  } catch (error) {
    console.error('获取指标失败:', error);
    throw error;
  }
};

// 轮询获取实时数据
export const pollTopology = (interval = 5000, callback) => {
  const fetchData = async () => {
    try {
      const topology = await getTopology();
      const metrics = await getMetrics();
      callback({ topology, metrics, error: null });
    } catch (error) {
      callback({ topology: null, metrics: null, error });
    }
  };

  fetchData();
  const intervalId = setInterval(fetchData, interval);

  return () => clearInterval(intervalId);
};

export default {
  getTopology,
  getServices,
  getServiceDetails,
  getServiceInstances,
  getMetrics,
  pollTopology,
};
