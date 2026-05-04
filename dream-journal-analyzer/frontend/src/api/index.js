import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
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
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      return Promise.reject(new Error(error.response.data.error || '请求失败'));
    } else if (error.request) {
      return Promise.reject(new Error('网络错误，请检查网络连接'));
    } else {
      return Promise.reject(new Error('请求配置错误'));
    }
  }
);

export const dreamApi = {
  getAll: () => {
    return api.get('/dreams');
  },

  getById: (id) => {
    return api.get(`/dreams/${id}`);
  },

  create: (data) => {
    return api.post('/dreams', data);
  },

  update: (id, data) => {
    return api.put(`/dreams/${id}`, data);
  },

  delete: (id) => {
    return api.delete(`/dreams/${id}`);
  },

  analyze: (id) => {
    return api.post(`/dreams/${id}/analyze`);
  }
};

export default dreamApi;
