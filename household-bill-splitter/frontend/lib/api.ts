import axios from 'axios'
import type { User, Bill, SplitShare, Transfer, Balance, OCRResult, Settlement, SplitResult } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const userApi = {
  getUsers: (): Promise<User[]> => api.get('/users').then(res => res.data),
  getUser: (id: number): Promise<User> => api.get(`/users/${id}`).then(res => res.data),
  createUser: (user: Partial<User>): Promise<User> => api.post('/users', user).then(res => res.data),
  updateUser: (id: number, user: Partial<User>): Promise<User> => api.put(`/users/${id}`, user).then(res => res.data),
  deleteUser: (id: number): Promise<void> => api.delete(`/users/${id}`),
}

export const billApi = {
  getBills: (): Promise<Bill[]> => api.get('/bills').then(res => res.data),
  getBill: (id: number): Promise<Bill> => api.get(`/bills/${id}`).then(res => res.data),
  createBill: (bill: Partial<Bill>): Promise<Bill> => api.post('/bills', bill).then(res => res.data),
  updateBill: (id: number, bill: Partial<Bill>): Promise<Bill> => api.put(`/bills/${id}`, bill).then(res => res.data),
  deleteBill: (id: number): Promise<void> => api.delete(`/bills/${id}`),
  updateItemCategory: (billId: number, itemId: number, category: string): Promise<void> => 
    api.put(`/bills/${billId}/items/${itemId}/category`, { category }),
}

export const ocrApi = {
  uploadImage: (file: File): Promise<{ ocr_record_id: number; result: OCRResult }> => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/ocr/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data)
  },
  parseText: (text: string): Promise<OCRResult> => 
    api.post('/ocr/parse-text', { text }).then(res => res.data),
  getRecords: (): Promise<any[]> => api.get('/ocr/records').then(res => res.data),
  getRecord: (id: number): Promise<any> => api.get(`/ocr/records/${id}`).then(res => res.data),
}

export const splitApi = {
  getStrategies: (): Promise<{ name: string; description: string; params: string[] }[]> => 
    api.get('/split/strategies').then(res => res.data),
  calculate: (data: { bill_id: number; strategy: string; user_ids: number[]; params: Record<string, any> }): Promise<{ bill_id: number; strategy: string; total: number; shares: SplitShare[] }> => 
    api.post('/split/calculate', data).then(res => res.data),
  save: (data: { bill_id: number; strategy: string; user_ids: number[]; params: Record<string, any> }): Promise<{ bill_id: number; strategy: string; split_results: SplitResult[] }> => 
    api.post('/split/save', data).then(res => res.data),
  getResults: (billId: number): Promise<SplitResult[]> => 
    api.get(`/split/results/${billId}`).then(res => res.data),
}

export const settlementApi = {
  calculate: (billIds: number[]): Promise<{ balances: Balance[]; transfers: Transfer[] }> => 
    api.post('/settlement/calculate', { bill_ids: billIds }).then(res => res.data),
  calculateAll: (): Promise<{ balances: Balance[]; transfers: Transfer[]; bill_ids: string[] }> => 
    api.get('/settlement/calculate-all').then(res => res.data),
  save: (data: { transfers: Transfer[]; bill_ids: number[] }): Promise<{ message: string; count: number }> => 
    api.post('/settlement/save', data).then(res => res.data),
  getSettlements: (): Promise<Settlement[]> => 
    api.get('/settlement').then(res => res.data),
  markPaid: (id: number): Promise<Settlement> => 
    api.put(`/settlement/${id}/paid`).then(res => res.data),
}

export default api
