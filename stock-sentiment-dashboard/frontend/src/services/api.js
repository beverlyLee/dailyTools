import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const stockApi = {
  getStockInfo: (code) => api.get(`/api/stock/${code}`),
  getStockChart: (code) => api.get(`/api/stock/${code}/chart`),
  getMoneyFlow: (code) => api.get(`/api/stock/${code}/moneyflow`),
  getNews: (code) => api.get(`/api/news/${code}`),
  getAllNews: (count = 10) => api.get(`/api/news?count=${count}`),
  getSentimentStats: () => api.get('/api/sentiment/stats'),
  getHealth: () => api.get('/api/health'),
};

export default api;
