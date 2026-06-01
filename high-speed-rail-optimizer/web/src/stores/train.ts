import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Train, QueryParams, Station, DataSourceOption } from '@/types'
import { trainApi } from '@/api/train'
import { ElMessage } from 'element-plus'

export const useTrainStore = defineStore('train', () => {
  const stations = ref<Record<string, string>>({})
  const trains = ref<Train[]>([])
  const loading = ref(false)
  const currentDataSource = ref<string>('hybrid')
  const currentDataSourceName = ref<string>('混合模式')
  const dataSourceOptions = ref<DataSourceOption[]>([])

  const queryParams = ref<QueryParams>({
    from: 'BJP',
    to: 'SHH',
    date: new Date().toISOString().split('T')[0],
    sortBy: 'time',
    trainTypes: [],
    seatTypes: [],
    dataSource: 'hybrid'
  })

  const stationList = computed<Station[]>(() => {
    return Object.entries(stations.value).map(([code, name]) => ({
      code,
      name,
      pinyin: ''
    }))
  })

  async function loadStations() {
    try {
      const res = await trainApi.getStations()
      if (res.success) {
        stations.value = res.data
      }
    } catch (error) {
      console.error('Failed to load stations:', error)
    }
  }

  async function loadDataSourceOptions() {
    try {
      const res = await trainApi.getDataSources()
      if (res.success) {
        dataSourceOptions.value = res.data
      }
    } catch (error) {
      console.error('Failed to load data sources:', error)
    }
  }

  async function searchTrains(showMessage = false) {
    loading.value = true
    try {
      const res = await trainApi.queryTrains(queryParams.value)
      if (res.success) {
        trains.value = res.data
        currentDataSource.value = res.dataSource || queryParams.value.dataSource
        currentDataSourceName.value = res.dataSourceName || getDataSourceName(queryParams.value.dataSource)
        
        if (showMessage) {
          ElMessage.success(`查询成功，共找到 ${res.count} 个车次（${currentDataSourceName.value}）`)
        }
      } else {
        if (showMessage) {
          ElMessage.error('查询失败：' + (res.message || '未知错误'))
        }
      }
    } catch (error: any) {
      console.error('Failed to search trains:', error)
      if (showMessage) {
        ElMessage.error('查询失败：' + (error.message || '网络错误'))
      }
    } finally {
      loading.value = false
    }
  }

  async function switchDataSource(dataSource: string) {
    queryParams.value.dataSource = dataSource
    currentDataSource.value = dataSource
    currentDataSourceName.value = getDataSourceName(dataSource)
    
    ElMessage.info(`正在切换数据源：${currentDataSourceName.value}`)
    await searchTrains(true)
  }

  function getDataSourceName(dataSource?: string): string {
    const names: Record<string, string> = {
      'hybrid': '混合模式',
      'real': '12306实时',
      'mock': '模拟数据'
    }
    return names[dataSource || 'hybrid'] || '未知'
  }

  function setQueryParams(params: Partial<QueryParams>) {
    Object.assign(queryParams.value, params)
  }

  return {
    stations,
    trains,
    loading,
    queryParams,
    stationList,
    currentDataSource,
    currentDataSourceName,
    dataSourceOptions,
    loadStations,
    loadDataSourceOptions,
    searchTrains,
    switchDataSource,
    setQueryParams,
    getDataSourceName
  }
})
