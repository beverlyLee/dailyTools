import axios from 'axios';
import type { Bill, BillStats, UploadResult, OCRResult } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export const billService = {
  async uploadCSV(file: File, source: 'wechat' | 'alipay'): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    
    const response = await api.post('/bills/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadOCR(imageFile: File): Promise<OCRResult> {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await api.post('/bills/upload/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getBills(params?: {
    page?: number;
    page_size?: number;
    category?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ bills: Bill[]; total: number }> {
    const response = await api.get('/bills', { params });
    return response.data;
  },

  async getStats(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<BillStats> {
    const response = await api.get('/bills/stats', { params });
    return response.data;
  },

  async updateCategory(billId: number, category: string): Promise<Bill> {
    const response = await api.put(`/bills/${billId}/category`, { category });
    return response.data;
  },

  async deleteBill(billId: number): Promise<void> {
    await api.delete(`/bills/${billId}`);
  },
};

export const categoryService = {
  async getAllCategories(): Promise<string[]> {
    const response = await api.get('/categories');
    return response.data;
  },

  async classifyText(text: string): Promise<{ category: string; confidence: number }> {
    const response = await api.post('/categories/classify', { text });
    return response.data;
  },
};
