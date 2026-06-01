<template>
  <div class="app">
    <header class="header">
      <h1>🐾 宠物消费洞察分析平台</h1>
      <p>基于行业报告、电商平台、社交媒体的宠物消费数据分析</p>
    </header>
    
    <main class="main">
      <div class="control-panel">
        <div class="data-source-section">
          <label class="section-label">📊 选择数据源:</label>
          <div class="data-source-buttons">
            <button 
              v-for="source in dataSources" 
              :key="source.id"
              class="source-btn"
              :class="{ active: currentSource.id === source.id }"
              @click="switchDataSource(source.id)"
            >
              <span class="source-icon">{{ source.name.slice(0, 2) }}</span>
              <span class="source-name">{{ source.name.slice(2) }}</span>
            </button>
          </div>
          <div class="source-description" v-if="currentSource">
            <span class="desc-label">数据说明:</span>
            <span class="desc-text">{{ currentSource.description }}</span>
          </div>
        </div>
        
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-icon">🍖</span>
            <span class="stat-label">宠物食品占比</span>
            <span class="stat-value food">{{ foodShare.toFixed(1) }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">💊</span>
            <span class="stat-label">医疗健康占比</span>
            <span class="stat-value medical">{{ medicalShare.toFixed(1) }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🧸</span>
            <span class="stat-label">用品玩具占比</span>
            <span class="stat-value supplies">{{ suppliesShare.toFixed(1) }}%</span>
          </div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h2>消费结构旭日图</h2>
            <span class="chart-badge">{{ currentSource?.name || '加载中...' }}</span>
          </div>
          <div ref="sunburstChart" class="chart-container"></div>
        </div>
        
        <div class="chart-card">
          <div class="chart-header">
            <h2>品牌热度趋势对比</h2>
            <span class="chart-badge">{{ currentSource?.name || '加载中...' }}</span>
          </div>
          <div ref="trendChart" class="chart-container"></div>
        </div>
        
        <div class="chart-card full-width">
          <div class="chart-header">
            <h2>国产 vs 进口品牌市场热度变化</h2>
            <span class="chart-badge">{{ currentSource?.name || '加载中...' }}</span>
          </div>
          <div ref="compareChart" class="chart-container"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import axios from 'axios'

const sunburstChart = ref(null)
const trendChart = ref(null)
const compareChart = ref(null)

const foodShare = ref(0)
const medicalShare = ref(0)
const suppliesShare = ref(0)
const dataSources = ref([])
const currentSource = ref(null)

const initSunburstChart = (data) => {
  if (!sunburstChart.value) return
  
  const chart = echarts.getInstanceByDom(sunburstChart.value) || echarts.init(sunburstChart.value)
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%'
    },
    series: {
      type: 'sunburst',
      data: data,
      radius: ['12%', '90%'],
      center: ['50%', '52%'],
      label: {
        rotate: 'radial',
        fontSize: 12,
        color: '#fff'
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2
      },
      levels: [
        {},
        {
          r0: '12%',
          r: '38%',
          label: {
            rotate: 0,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        {
          r0: '38%',
          r: '68%',
          label: {
            rotate: 'tangential'
          }
        },
        {
          r0: '68%',
          r: '90%',
          label: {
            position: 'outside',
            padding: 3,
            silent: false,
            color: '#333'
          }
        }
      ]
    }
  }
  chart.setOption(option, true)
}

const initTrendChart = (data) => {
  if (!trendChart.value) return
  
  const chart = echarts.getInstanceByDom(trendChart.value) || echarts.init(trendChart.value)
  
  const series = []
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
  
  Object.keys(data.brands).forEach((brand, index) => {
    series.push({
      name: brand,
      type: 'line',
      data: data.brands[brand],
      smooth: true,
      lineStyle: {
        width: 2,
        color: colors[index % colors.length]
      },
      itemStyle: {
        color: colors[index % colors.length]
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colors[index % colors.length] + '40' },
          { offset: 1, color: colors[index % colors.length] + '10' }
        ])
      }
    })
  })

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: Object.keys(data.brands),
      bottom: 0,
      type: 'scroll',
      textStyle: {
        fontSize: 11
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '18%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.years,
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '热度指数',
      nameTextStyle: {
        color: '#999'
      },
      axisLine: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: series
  }
  chart.setOption(option, true)
}

const initCompareChart = (data) => {
  if (!compareChart.value) return
  
  const chart = echarts.getInstanceByDom(compareChart.value) || echarts.init(compareChart.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['国产品牌平均', '进口品牌平均'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.years,
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '平均热度指数',
      nameTextStyle: {
        color: '#999'
      },
      axisLine: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        name: '国产品牌平均',
        type: 'line',
        data: data.domestic_trend,
        smooth: true,
        lineStyle: {
          width: 4,
          color: '#FF6B6B'
        },
        itemStyle: {
          color: '#FF6B6B',
          fontSize: 14
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 107, 0.35)' },
            { offset: 1, color: 'rgba(255, 107, 107, 0.05)' }
          ])
        }
      },
      {
        name: '进口品牌平均',
        type: 'line',
        data: data.import_trend,
        smooth: true,
        lineStyle: {
          width: 4,
          color: '#4ECDC4'
        },
        itemStyle: {
          color: '#4ECDC4',
          fontSize: 14
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(78, 205, 196, 0.35)' },
            { offset: 1, color: 'rgba(78, 205, 196, 0.05)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option, true)
}

const loadData = async (sourceId = null) => {
  try {
    const actualSource = sourceId || currentSource.value?.id || 'industry_report_2024'
    const queryString = `?source=${actualSource}`
    
    const [structureRes, trendsRes] = await Promise.all([
      axios.get(`/api/consumption-structure${queryString}`),
      axios.get(`/api/brand-trends${queryString}`)
    ])
    
    const structure = structureRes.data
    const trends = trendsRes.data
    
    foodShare.value = structure.summary.food_share
    medicalShare.value = structure.summary.medical_share
    suppliesShare.value = structure.summary.supplies_share
    
    await nextTick()
    
    initSunburstChart(structure.sunburst)
    initTrendChart(trends)
    initCompareChart(trends)
  } catch (error) {
    console.error('Failed to fetch data:', error)
  }
}

const switchDataSource = async (sourceId) => {
  try {
    const targetSource = dataSources.value.find(s => s.id === sourceId)
    if (targetSource) {
      currentSource.value = targetSource
      await loadData(sourceId)
    }
  } catch (error) {
    console.error('Failed to switch data source:', error)
  }
}

const loadDataSources = async () => {
  try {
    const res = await axios.get('/api/data-sources')
    dataSources.value = res.data.available
    if (!currentSource.value) {
      currentSource.value = res.data.current
    }
  } catch (error) {
    console.error('Failed to load data sources:', error)
  }
}

onMounted(async () => {
  await loadDataSources()
  await loadData()
  
  window.addEventListener('resize', () => {
    echarts.getInstanceByDom(sunburstChart.value)?.resize()
    echarts.getInstanceByDom(trendChart.value)?.resize()
    echarts.getInstanceByDom(compareChart.value)?.resize()
  })
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  padding: 20px;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 24px;
}

.header h1 {
  font-size: 2.2rem;
  margin-bottom: 8px;
  font-weight: 700;
}

.header p {
  font-size: 1rem;
  opacity: 0.9;
  font-weight: 400;
}

.main {
  max-width: 1400px;
  margin: 0 auto;
}

.control-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.data-source-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.section-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  font-size: 0.95rem;
}

.data-source-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.source-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.source-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.source-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.source-icon {
  font-size: 1.1rem;
}

.source-name {
  font-weight: 500;
}

.source-description {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #666;
}

.desc-label {
  font-weight: 500;
  color: #888;
}

.desc-text {
  color: #666;
}

.stats-bar {
  display: flex;
  justify-content: space-around;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border-radius: 12px;
  transition: transform 0.2s ease;
}

.stat-item:hover {
  transform: translateY(-3px);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
}

.stat-value.food {
  color: #FF6B6B;
}

.stat-value.medical {
  color: #4ECDC4;
}

.stat-value.supplies {
  color: #45B7D1;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.chart-header h2 {
  font-size: 1.1rem;
  color: #333;
  margin: 0;
  font-weight: 600;
}

.chart-badge {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 500;
}

.chart-container {
  height: 380px;
}

@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-bar {
    flex-direction: column;
  }
  
  .data-source-buttons {
    justify-content: center;
  }
}
</style>
