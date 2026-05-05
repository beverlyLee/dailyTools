import axios from 'axios'
import type { Schema, CRUDResult } from '../types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

export async function createSchema(schema: Omit<Schema, 'createdAt' | 'updatedAt'>): Promise<Schema> {
  const response = await api.post('/schemas', schema)
  return response.data
}

export async function getSchema(id: string): Promise<Schema> {
  const response = await api.get(`/schemas/${id}`)
  return response.data
}

export async function updateSchema(id: string, schema: Partial<Schema>): Promise<Schema> {
  const response = await api.put(`/schemas/${id}`, schema)
  return response.data
}

export async function deleteSchema(id: string): Promise<void> {
  await api.delete(`/schemas/${id}`)
}

export async function listSchemas(): Promise<Schema[]> {
  const response = await api.get('/schemas')
  return response.data.data || []
}

export async function generateCRUD(schemaId: string): Promise<CRUDResult> {
  const response = await api.post(`/schemas/${schemaId}/generate`)
  return response.data
}
