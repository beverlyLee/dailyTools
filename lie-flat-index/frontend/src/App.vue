<template>
  <div class="container">
    <div class="header">
      <h1>😴 年轻人躺平指数</h1>
      <p>基于睡眠数据和加班强度的城市生活方式分析</p>
      <div class="data-source-toggle">
        <button 
          :class="{ active: useRealData }" 
          @click="toggleDataSource(true)"
          :disabled="isLoading"
        >
          📊 真实公开数据
        </button>
        <button 
          :class="{ active: !useRealData }" 
          @click="toggleDataSource(false)"
          :disabled="isLoading"
        >
          📋 模拟演示数据
        </button>
      </div>
    </div>
    
    <div class="data-source-info" v-if="dataSourceInfo">
      <div class="info-item">
        <strong>💤 睡眠数据来源：</strong> {{ dataSourceInfo.sleep_data.source }}
        <span class="update-time">（更新于：{{ dataSourceInfo.sleep_data.last_updated }}）</span>
      </div>
      <div class="info-item">
        <strong>💼 加班数据来源：</strong> {{ dataSourceInfo.overtime_data.source }}
        <span class="update-time">（更新于：{{ dataSourceInfo.overtime_data.last_updated }}）</span>
      </div>
      <div class="info-item references" v-if="dataSourceInfo.overtime_data.references && dataSourceInfo.overtime_data.references.length > 0">
        <strong>📚 数据引用来源：</strong>
        <ul>
          <li v-for="(ref, idx) in dataSourceInfo.overtime_data.references" :key="idx">{{ ref }}</li>
        </ul>
      </div>
    </div>
    
    <div class="content">
      <div class="card">
        <h2>📊 生活方式雷达图对比</h2>
        <div class="city-selector">
          <label v-for="city in availableCities" :key="city">
            <input 
              type="checkbox" 
              :value="city" 
              v-model="selectedCities"
              @change="updateRadarChart"
            >
            {{ city }}
          </label>
        </div>
        <div class="radar-chart-wrapper">
          <div ref="radarChart" class="radar-chart"></div>
          <div v-if="isLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <p>数据加载中...</p>
          </div>
          <div v-if="radarError && !isLoading" class="error-overlay">
            <p class="error-icon">⚠️</p>
            <p>数据加载失败，显示降级数据</p>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h2>🏆 全国城市躺平排行榜</h2>
        <div v-if="isLoading" class="table-loading">数据加载中...</div>
        <table v-else class="ranking-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>城市</th>
              <th>入睡时间</th>
              <th>下班时间</th>
              <th>躺平指数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="city in rankingData" :key="city.city">
              <td :class="`rank-${city.rank}`">{{ city.rank }}</td>
              <td>{{ city.city }}</td>
              <td>{{ city.avg_bedtime }}</td>
              <td>{{ city.avg_offwork_time }}</td>
              <td>
                <span class="flatness-score" :class="getScoreClass(city.flatness_index)">
                  {{ city.flatness_index }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'

const radarChart = ref(null)
const selectedCities = ref(['北京', '上海', '成都'])
const rankingData = ref([])
const useRealData = ref(true)
const dataSourceInfo = ref(null)
const isLoading = ref(false)
const radarError = ref(false)
const API_BASE = ''

const availableCities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆', '武汉', '沈阳', '哈尔滨', '长春', '大连', '青岛', '南京']

const fallbackDataSource = {
  sleep_data: {
    source: '本地降级数据',
    type: '降级演示数据',
    last_updated: '2025-01',
    references: []
  },
  overtime_data: {
    source: '本地降级数据',
    type: '降级演示数据',
    last_updated: '2025-01',
    references: ['数据加载失败，使用本地演示数据']
  }
}

let chartInstance = null

const initRadarChart = async () => {
  await nextTick()
  if (radarChart.value && !chartInstance) {
    chartInstance = echarts.init(radarChart.value)
    showEmptyRadarChart()
  }
}

const showEmptyRadarChart = () => {
  if (!chartInstance) return
  chartInstance.setOption({
    tooltip: { trigger: 'item' },
    radar: {
      indicator: [
        { name: '睡眠时长', max: 100 },
        { name: '休闲时间', max: 100 },
        { name: '下班早晚', max: 100 },
        { name: '加班强度', max: 100 },
        { name: '生活节奏', max: 100 }
      ],
      radius: '60%',
      axisName: { color: '#ccc', fontSize: 12 }
    },
    series: [{
      type: 'radar',
      data: []
    }]
  })
}

const toggleDataSource = async (useReal) => {
  useRealData.value = useReal
  await Promise.all([
    fetchRankingData(),
    updateRadarChart()
  ])
}

const fetchRankingData = async () => {
  isLoading.value = true
  try {
    const response = await fetch(`${API_BASE}/api/ranking?use_real_data=${useRealData.value}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const result = await response.json()
    if (result.success) {
      rankingData.value = result.data
      dataSourceInfo.value = result.data_source || fallbackDataSource
    }
  } catch (error) {
    console.error('获取排行榜数据失败:', error)
    useFallbackData()
  } finally {
    isLoading.value = false
  }
}

const updateRadarChart = async () => {
  if (selectedCities.value.length === 0) return
  
  isLoading.value = true
  radarError.value = false
  
  try {
    const cities = selectedCities.value.join(',')
    const response = await fetch(`${API_BASE}/api/radar?cities=${cities}&use_real_data=${useRealData.value}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const result = await response.json()
    
    if (result.success && chartInstance) {
      renderRadarChart(result.data.series, result.data.indicators)
      if (result.data_source) {
        dataSourceInfo.value = result.data_source
      }
    }
  } catch (error) {
    console.error('获取雷达图数据失败:', error)
    radarError.value = true
    useFallbackRadarData()
  } finally {
    isLoading.value = false
  }
}

const renderRadarChart = (series, indicators) => {
  if (!chartInstance) return
  
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']
  
  chartInstance.setOption({
    tooltip: {
      trigger: 'item'
    },
    legend: {
      data: series.map(s => s.name),
      bottom: 10
    },
    radar: {
      indicator: indicators,
      radius: '60%',
      axisName: {
        color: '#333',
        fontSize: 12
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(114, 172, 209, 0.2)', 'rgba(114, 172, 209, 0.1)']
        }
      }
    },
    series: [{
      type: 'radar',
      data: series.map((s, i) => ({
        value: s.value,
        name: s.name,
        lineStyle: {
          color: colors[i % colors.length],
          width: 2
        },
        areaStyle: {
          color: colors[i % colors.length],
          opacity: 0.3
        },
        itemStyle: {
          color: colors[i % colors.length]
        }
      }))
    }]
  }, true)
}

const useFallbackRadarData = () => {
  const fallbackSeries = [
    { name: '北京', value: [60, 55, 50, 45, 58] },
    { name: '上海', value: [62, 58, 52, 48, 60] },
    { name: '成都', value: [85, 75, 78, 80, 82] }
  ]
  const fallbackIndicators = [
    { name: '睡眠时长', max: 100 },
    { name: '休闲时间', max: 100 },
    { name: '下班早晚', max: 100 },
    { name: '加班强度', max: 100 },
    { name: '生活节奏', max: 100 }
  ]
  renderRadarChart(fallbackSeries, fallbackIndicators)
  dataSourceInfo.value = fallbackDataSource
}

const useFallbackData = () => {
  rankingData.value = [
    { rank: 1, city: '哈尔滨', avg_bedtime: '23:10', avg_offwork_time: '17:45', flatness_index: 71.25 },
    { rank: 2, city: '长春', avg_bedtime: '23:15', avg_offwork_time: '18:00', flatness_index: 69.5 },
    { rank: 3, city: '成都', avg_bedtime: '23:30', avg_offwork_time: '18:30', flatness_index: 67.6 },
    { rank: 4, city: '沈阳', avg_bedtime: '23:20', avg_offwork_time: '18:15', flatness_index: 66.8 },
    { rank: 5, city: '大连', avg_bedtime: '23:35', avg_offwork_time: '18:45', flatness_index: 63.65 },
    { rank: 6, city: '西安', avg_bedtime: '23:45', avg_offwork_time: '18:50', flatness_index: 61.2 },
    { rank: 7, city: '重庆', avg_bedtime: '23:50', avg_offwork_time: '19:00', flatness_index: 59.8 },
    { rank: 8, city: '青岛', avg_bedtime: '23:55', avg_offwork_time: '19:10', flatness_index: 58.5 },
    { rank: 9, city: '武汉', avg_bedtime: '00:10', avg_offwork_time: '19:30', flatness_index: 55.2 },
    { rank: 10, city: '广州', avg_bedtime: '00:20', avg_offwork_time: '19:45', flatness_index: 52.8 }
  ]
  dataSourceInfo.value = fallbackDataSource
}

const getScoreClass = (score) => {
  if (score >= 70) return 'score-high'
  if (score >= 50) return 'score-medium'
  return 'score-low'
}

onMounted(async () => {
  await initRadarChart()
  await fetchRankingData()
  await updateRadarChart()
  
  window.addEventListener('resize', () => {
    chartInstance?.resize()
  })
})
</script>
