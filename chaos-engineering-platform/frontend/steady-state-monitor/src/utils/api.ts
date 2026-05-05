import axios from 'axios'
import type {
  Metric,
  MetricThreshold,
  MetricValue,
  MetricHistory,
  SteadyStateCheck,
  Violation,
  CircuitBreakerEvent
} from '@/types'

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const metricApi = {
  getList: async (): Promise<{ data: Metric[] }> => {
    const response = await apiClient.get('/metrics')
    return response.data
  },

  getCurrent: async (): Promise<{ data: MetricValue[] }> => {
    const response = await apiClient.get('/metrics/current')
    return response.data
  },

  getHistory: async (
    metricId: string,
    params?: { startTime?: string; endTime?: string; step?: number }
  ): Promise<{ data: MetricHistory }> => {
    const response = await apiClient.get(`/metrics/${metricId}/history`, { params })
    return response.data
  }
}

export const thresholdApi = {
  getList: async (): Promise<{ data: MetricThreshold[] }> => {
    const response = await apiClient.get('/metrics/thresholds')
    return response.data
  },

  getByExperiment: async (experimentId: string): Promise<{ data: MetricThreshold[] }> => {
    const response = await apiClient.get(`/metrics/thresholds?experimentId=${experimentId}`)
    return response.data
  },

  create: async (data: Partial<MetricThreshold>): Promise<{ data: MetricThreshold }> => {
    const response = await apiClient.post('/metrics/thresholds', data)
    return response.data
  },

  update: async (id: string, data: Partial<MetricThreshold>): Promise<{ data: MetricThreshold }> => {
    const response = await apiClient.put(`/metrics/thresholds/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/metrics/thresholds/${id}`)
  }
}

export const checkApi = {
  getList: async (params?: { status?: string }): Promise<{ data: SteadyStateCheck[] }> => {
    const response = await apiClient.get('/steady-state-checks', { params })
    return response.data
  },

  getById: async (id: string): Promise<{ data: SteadyStateCheck }> => {
    const response = await apiClient.get(`/steady-state-checks/${id}`)
    return response.data
  },

  create: async (data: Partial<SteadyStateCheck>): Promise<{ data: SteadyStateCheck }> => {
    const response = await apiClient.post('/steady-state-checks', data)
    return response.data
  },

  update: async (id: string, data: Partial<SteadyStateCheck>): Promise<{ data: SteadyStateCheck }> => {
    const response = await apiClient.put(`/steady-state-checks/${id}`, data)
    return response.data
  },

  start: async (id: string): Promise<{ data: SteadyStateCheck }> => {
    const response = await apiClient.post(`/steady-state-checks/${id}/start`)
    return response.data
  },

  stop: async (id: string): Promise<{ data: SteadyStateCheck }> => {
    const response = await apiClient.post(`/steady-state-checks/${id}/stop`)
    return response.data
  }
}

export const violationApi = {
  getList: async (checkId?: string, params?: { acknowledged?: boolean; level?: string }): Promise<{ data: Violation[] }> => {
    const queryParams = new URLSearchParams()
    if (checkId) queryParams.set('checkId', checkId)
    if (params?.acknowledged !== undefined) queryParams.set('acknowledged', String(params.acknowledged))
    if (params?.level) queryParams.set('level', params.level)
    
    const response = await apiClient.get(`/violations?${queryParams.toString()}`)
    return response.data
  },

  acknowledge: async (id: string): Promise<void> => {
    await apiClient.post(`/violations/${id}/acknowledge`)
  }
}

export const circuitBreakerApi = {
  getEvents: async (params?: { experimentId?: string; limit?: number }): Promise<{ data: CircuitBreakerEvent[] }> => {
    const response = await apiClient.get('/circuit-breaker/events', { params })
    return response.data
  },

  triggerRollback: async (experimentId: string, reason: string): Promise<{ data: CircuitBreakerEvent }> => {
    const response = await apiClient.post('/circuit-breaker/rollback', { experimentId, reason })
    return response.data
  },

  getStatus: async (experimentId?: string): Promise<{ data: { status: string; lastEvent?: CircuitBreakerEvent } }> => {
    const params = experimentId ? { experimentId } : {}
    const response = await apiClient.get('/circuit-breaker/status', { params })
    return response.data
  }
}

export default apiClient
