import axios from 'axios'
import type { Experiment, ExperimentLog, ExperimentStep, FaultType, MetricThreshold } from '@/types'

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const experimentApi = {
  getList: async (params?: { status?: string; page?: number; size?: number }) => {
    const response = await apiClient.get('/experiments', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/experiments/${id}`)
    return response.data
  },

  create: async (data: Partial<Experiment>) => {
    const response = await apiClient.post('/experiments', data)
    return response.data
  },

  update: async (id: string, data: Partial<Experiment>) => {
    const response = await apiClient.put(`/experiments/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/experiments/${id}`)
    return response.data
  },

  start: async (id: string) => {
    const response = await apiClient.post(`/experiments/${id}/start`)
    return response.data
  },

  pause: async (id: string) => {
    const response = await apiClient.post(`/experiments/${id}/pause`)
    return response.data
  },

  resume: async (id: string) => {
    const response = await apiClient.post(`/experiments/${id}/resume`)
    return response.data
  },

  abort: async (id: string) => {
    const response = await apiClient.post(`/experiments/${id}/abort`)
    return response.data
  },

  getLogs: async (id: string, params?: { level?: string; limit?: number }) => {
    const response = await apiClient.get(`/experiments/${id}/logs`, { params })
    return response.data
  },

  getStatus: async (id: string) => {
    const response = await apiClient.get(`/experiments/${id}/status`)
    return response.data
  }
}

export const faultTypeApi = {
  getList: async () => {
    const response = await apiClient.get('/fault-types')
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/fault-types/${id}`)
    return response.data
  }
}

export const targetApi = {
  getNamespaces: async () => {
    const response = await apiClient.get('/targets/namespaces')
    return response.data
  },

  getPods: async (namespace: string, labelSelector?: string) => {
    const response = await apiClient.get('/targets/pods', {
      params: { namespace, labelSelector }
    })
    return response.data
  },

  getServices: async (namespace: string) => {
    const response = await apiClient.get('/targets/services', {
      params: { namespace }
    })
    return response.data
  }
}

export const metricApi = {
  getList: async () => {
    const response = await apiClient.get('/metrics')
    return response.data
  },

  getThresholds: async (experimentId?: string) => {
    const params = experimentId ? { experimentId } : {}
    const response = await apiClient.get('/metrics/thresholds', { params })
    return response.data
  },

  updateThresholds: async (thresholds: MetricThreshold[]) => {
    const response = await apiClient.put('/metrics/thresholds', thresholds)
    return response.data
  },

  getCurrent: async () => {
    const response = await apiClient.get('/metrics/current')
    return response.data
  },

  getHistory: async (metric: string, params?: { startTime?: string; endTime?: string; step?: number }) => {
    const response = await apiClient.get(`/metrics/${metric}/history`, { params })
    return response.data
  }
}

export default apiClient
