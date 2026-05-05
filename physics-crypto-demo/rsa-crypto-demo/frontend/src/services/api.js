import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const rsaApi = {
  generateKey: async (params) => {
    const response = await api.post('/rsa/generate-key', params);
    return response.data;
  },

  encrypt: async (params) => {
    const response = await api.post('/rsa/encrypt', params);
    return response.data;
  },

  decrypt: async (params) => {
    const response = await api.post('/rsa/decrypt', params);
    return response.data;
  },

  modExp: async (params) => {
    const response = await api.post('/rsa/mod-exp', params);
    return response.data;
  },

  verify: async (params) => {
    const response = await api.post('/rsa/verify', params);
    return response.data;
  },

  isPrime: async (number) => {
    const response = await api.post('/rsa/is-prime', { number });
    return response.data;
  },

  getKeyPairs: async () => {
    const response = await api.get('/rsa/key-pairs');
    return response.data;
  },

  getKeyPair: async (id) => {
    const response = await api.get(`/rsa/key-pairs/${id}`);
    return response.data;
  },

  deleteKeyPair: async (id) => {
    const response = await api.delete(`/rsa/key-pairs/${id}`);
    return response.data;
  },

  getCryptoRecords: async () => {
    const response = await api.get('/history/crypto-records');
    return response.data;
  },

  getCryptoRecord: async (id) => {
    const response = await api.get(`/history/crypto-records/${id}`);
    return response.data;
  },

  deleteCryptoRecord: async (id) => {
    const response = await api.delete(`/history/crypto-records/${id}`);
    return response.data;
  }
};

export default api;
