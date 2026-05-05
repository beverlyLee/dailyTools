import axios from 'axios'
import type { PageData, GeneratedCode } from '../types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

export async function savePage(pageData: Omit<PageData, 'createdAt' | 'updatedAt'>): Promise<PageData> {
  const response = await api.post('/pages', pageData)
  return response.data
}

export async function getPage(id: string): Promise<PageData> {
  const response = await api.get(`/pages/${id}`)
  return response.data
}

export async function updatePage(id: string, pageData: Partial<PageData>): Promise<PageData> {
  const response = await api.put(`/pages/${id}`, pageData)
  return response.data
}

export async function deletePage(id: string): Promise<void> {
  await api.delete(`/pages/${id}`)
}

export async function listPages(): Promise<PageData[]> {
  const response = await api.get('/pages')
  return response.data.data || []
}

export async function generateCode(pageId: string, framework: 'vue' | 'react' = 'vue'): Promise<GeneratedCode> {
  const response = await api.post(`/pages/${pageId}/generate?framework=${framework}`)
  return response.data
}
