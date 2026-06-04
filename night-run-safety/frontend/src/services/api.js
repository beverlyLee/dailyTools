import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api` 
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
      console.error(`API 请求失败 [${error.config?.url}]:`, error.message);
      console.warn('请确保后端服务已启动。后端启动命令：cd night-run-safety && python src/main.py');
    }
    return Promise.reject(error);
  }
);

export const healthCheck = () => api.get('/health');

export const getConfig = () => api.get('/config');

export const getSegments = (params = {}) =>
  api.get('/segments', { params });

export const getSegmentInfo = (lng, lat) =>
  api.get('/segment/info', { params: { lng, lat } });

export const findRoute = (data) => api.post('/route', data);

export const getHeatmapData = (params = {}) =>
  api.get('/safety/heatmap', { params });

export const getSafetyStats = () => api.get('/safety/stats');

export const crawlData = (data) => api.post('/crawl', data);

export default api;
