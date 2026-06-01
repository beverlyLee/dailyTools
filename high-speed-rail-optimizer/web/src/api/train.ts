import axios from 'axios'
import type { Train, QueryParams, ApiResponse, DataSourceOption } from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000
})

export const trainApi = {
  async getStations(): Promise<ApiResponse<Record<string, string>>> {
    const response = await api.get('/stations')
    return response.data
  },

  async queryTrains(params: QueryParams): Promise<ApiResponse<Train[]>> {
    const response = await api.get('/query', {
      params: {
        from: params.from,
        to: params.to,
        date: params.date,
        sort: params.sortBy,
        trainTypes: params.trainTypes?.join(','),
        seatTypes: params.seatTypes?.join(','),
        dataSource: params.dataSource
      }
    })
    return response.data
  },

  async getTrainDetail(trainCode: string, date: string): Promise<ApiResponse<Train>> {
    const response = await api.get('/train-detail', {
      params: { trainCode, date }
    })
    return response.data
  },

  async refreshRealTimeData(from: string, to: string, date: string): Promise<ApiResponse<any>> {
    const response = await api.post('/refresh-data', { from, to, date })
    return response.data
  },

  async getDataSources(): Promise<ApiResponse<DataSourceOption[]>> {
    const response = await api.get('/data-sources')
    return response.data
  }
}

export default api
