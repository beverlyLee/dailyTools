import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const imageService = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  detectKeypoints: async (imagePath) => {
    const response = await api.post('/api/images/detect-keypoints', {
      image_path: imagePath,
    });
    return response.data;
  },

  getModelImages: async () => {
    const response = await api.get('/api/models');
    return response.data;
  },

  getFashionStyles: async () => {
    const response = await api.get('/api/fashions');
    return response.data;
  },
};

export const styleTransferService = {
  transferStyle: async (params) => {
    const response = await api.post('/api/style-transfer/apply', {
      source_image: params.sourceImage,
      target_fashion: params.targetFashion,
      keypoints: params.keypoints,
      strength: params.strength || 0.8,
      preserve_structure: params.preserveStructure !== false,
    });
    return response.data;
  },

  inpaintRegion: async (params) => {
    const response = await api.post('/api/style-transfer/inpaint', {
      image_path: params.imagePath,
      mask_points: params.maskPoints,
      prompt: params.prompt,
      strength: params.strength || 0.6,
    });
    return response.data;
  },

  getTransferStatus: async (taskId) => {
    const response = await api.get(`/api/style-transfer/status/${taskId}`);
    return response.data;
  },
};

export const historyService = {
  getHistory: async (page = 1, pageSize = 20) => {
    const response = await api.get('/api/history', {
      params: {
        page,
        page_size: pageSize,
      },
    });
    return response.data;
  },

  saveHistory: async (params) => {
    const response = await api.post('/api/history', {
      source_image: params.sourceImage,
      result_image: params.resultImage,
      fashion_style: params.fashionStyle,
      metadata: params.metadata,
    });
    return response.data;
  },

  deleteHistory: async (id) => {
    const response = await api.delete(`/api/history/${id}`);
    return response.data;
  },

  getHistoryDetail: async (id) => {
    const response = await api.get(`/api/history/${id}`);
    return response.data;
  },
};

export const downloadService = {
  downloadImage: async (imagePath, filename) => {
    const response = await api.get(`/api/download/${imagePath}`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'result.png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  downloadHighQuality: async (imagePath, options = {}) => {
    const response = await api.post('/api/download/high-quality', {
      image_path: imagePath,
      quality: options.quality || 100,
      format: options.format || 'png',
    }, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `result.${options.format || 'png'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

export default api;
