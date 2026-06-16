import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../../shared/types';

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  <T>(response: AxiosResponse<ApiResponse<T>>): T => {
    const res = response.data;
    if (res.success && res.data !== undefined) {
      return res.data;
    }
    return undefined as T;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        localStorage.removeItem('token');
      }
      const message = error.response.data?.message || error.response.data?.error || `请求失败 (${status})`;
      return Promise.reject(new Error(message));
    } else if (error.request) {
      return Promise.reject(new Error('网络连接失败，请检查网络'));
    } else {
      return Promise.reject(new Error('请求配置错误'));
    }
  }
);

export default apiClient;
