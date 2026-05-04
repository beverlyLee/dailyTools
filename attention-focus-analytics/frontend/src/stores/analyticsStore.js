import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { analyticsApi, entriesApi, statsApi, mockApi, syncApi } from '../api'

export const useAnalyticsStore = defineStore('analytics', () => {
  const overviewData = ref(null)
  const efficiencyData = ref(null)
  const peakFocusData = ref(null)
  const heatmapData = ref(null)
  const entries = ref([])
  const stats = ref(null)
  
  const loading = ref(false)
  const error = ref(null)
  const dataSource = ref('mock')

  const overallScore = computed(() => {
    return overviewData.value?.data?.overall?.overallScore || 0
  })

  const efficiencyScore = computed(() => {
    return overviewData.value?.data?.overall?.components?.efficiency || 0
  })

  const productivityScore = computed(() => {
    return overviewData.value?.data?.overall?.components?.productivity || 0
  })

  const concentrationScore = computed(() => {
    return overviewData.value?.data?.overall?.components?.concentration || 0
  })

  const peakHour = computed(() => {
    return overviewData.value?.data?.overall?.peakResult?.peakHour ?? null
  })

  const totalTimeFormatted = computed(() => {
    return overviewData.value?.data?.overall?.efficiencyResult?.totalTimeFormatted || '0小时0分钟'
  })

  const deepWorkTimeFormatted = computed(() => {
    return overviewData.value?.data?.overall?.efficiencyResult?.deepWorkTimeFormatted || '0小时0分钟'
  })

  const shallowWorkTimeFormatted = computed(() => {
    return overviewData.value?.data?.overall?.efficiencyResult?.shallowWorkTimeFormatted || '0小时0分钟'
  })

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    if (score >= 30) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score) => {
    if (score >= 70) return 'bg-green-100'
    if (score >= 50) return 'bg-yellow-100'
    if (score >= 30) return 'bg-orange-100'
    return 'bg-red-100'
  }

  async function fetchOverview(params = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await analyticsApi.getOverview(params)
      overviewData.value = response.data
      dataSource.value = response.data.dataSource || 'mock'
      return response.data
    } catch (err) {
      error.value = err.message || '获取概览数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchEfficiency(params = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await analyticsApi.getEfficiency(params)
      efficiencyData.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || '获取效率数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchPeakFocus(params = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await analyticsApi.getPeakFocus(params)
      peakFocusData.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || '获取峰值专注数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchHeatmap(params = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await analyticsApi.getHeatmap(params)
      heatmapData.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || '获取热力图数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchEntries(params = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await entriesApi.getList(params)
      entries.value = response.data.data || []
      return response.data
    } catch (err) {
      error.value = err.message || '获取时间条目失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createEntry(data) {
    loading.value = true
    error.value = null
    try {
      const response = await entriesApi.create(data)
      await fetchEntries()
      return response.data
    } catch (err) {
      error.value = err.message || '创建时间条目失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      const response = await statsApi.getStats()
      stats.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || '获取统计数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function importMockData(days = 14) {
    loading.value = true
    error.value = null
    try {
      const response = await mockApi.import({ days })
      await fetchOverview()
      await fetchStats()
      return response.data
    } catch (err) {
      error.value = err.message || '导入模拟数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function syncFromProvider(provider, apiKey, useMock = false) {
    loading.value = true
    error.value = null
    try {
      let response
      if (provider === 'rescuetime') {
        response = await syncApi.syncRescueTime({ apiKey, useMock })
      } else if (provider === 'toggl') {
        response = await syncApi.syncToggl({ apiKey, useMock })
      } else {
        throw new Error('不支持的提供商')
      }
      await fetchOverview()
      await fetchStats()
      return response.data
    } catch (err) {
      error.value = err.message || '同步数据失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    overviewData,
    efficiencyData,
    peakFocusData,
    heatmapData,
    entries,
    stats,
    loading,
    error,
    dataSource,
    overallScore,
    efficiencyScore,
    productivityScore,
    concentrationScore,
    peakHour,
    totalTimeFormatted,
    deepWorkTimeFormatted,
    shallowWorkTimeFormatted,
    getScoreColor,
    getScoreBgColor,
    fetchOverview,
    fetchEfficiency,
    fetchPeakFocus,
    fetchHeatmap,
    fetchEntries,
    createEntry,
    fetchStats,
    importMockData,
    syncFromProvider,
    clearError
  }
})
