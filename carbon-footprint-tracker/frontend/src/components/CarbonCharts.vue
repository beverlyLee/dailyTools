<template>
  <div class="charts-container">
    <div class="card chart-card">
      <div class="card-header">
        <h3 class="card-title">碳排放构成</h3>
      </div>
      <div v-if="hasData" class="chart-wrapper">
        <v-chart class="chart" :option="pieChartOption" autoresize />
      </div>
      <div v-else class="empty-state">
        <p>暂无数据</p>
        <p style="font-size: 0.9rem; color: #999;">添加记录后将显示图表</p>
      </div>
    </div>
    
    <div class="card chart-card">
      <div class="card-header">
        <h3 class="card-title">碳排放趋势</h3>
        <div class="chart-controls">
          <select v-model="trendRangeType" class="form-select" style="width: auto; padding: 0.5rem; font-size: 0.9rem;">
            <option value="preset">预设</option>
            <option value="custom">自定义</option>
          </select>
          <template v-if="trendRangeType === 'preset'">
            <select v-model="trendDays" class="form-select" style="width: auto; padding: 0.5rem; font-size: 0.9rem;">
              <option :value="7">近7天</option>
              <option :value="14">近14天</option>
              <option :value="30">近30天</option>
              <option :value="90">近90天</option>
            </select>
          </template>
          <template v-else>
            <input 
              type="date" 
              v-model="customStartDate" 
              class="form-input" 
              style="width: auto; padding: 0.5rem; font-size: 0.9rem;"
            />
            <span style="margin: 0 0.25rem;">至</span>
            <input 
              type="date" 
              v-model="customEndDate" 
              class="form-input" 
              style="width: auto; padding: 0.5rem; font-size: 0.9rem;"
            />
          </template>
        </div>
      </div>
      <div v-if="hasTrendData" class="chart-wrapper">
        <v-chart class="chart" :option="lineChartOption" autoresize />
      </div>
      <div v-else class="empty-state">
        <p>暂无数据</p>
        <p style="font-size: 0.9rem; color: #999;">添加多天记录后将显示趋势</p>
      </div>
    </div>
    
    <div class="card chart-card">
      <div class="card-header">
        <h3 class="card-title">分类统计</h3>
        <div class="chart-controls">
          <select v-model="statsSortBy" class="form-select" style="width: auto; padding: 0.5rem; font-size: 0.9rem;">
            <option value="carbon">按排放量</option>
            <option value="count">按记录数</option>
          </select>
          <select v-model="statsSortOrder" class="form-select" style="width: auto; padding: 0.5rem; font-size: 0.9rem;">
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </div>
      </div>
      <div v-if="hasData" class="stats-container">
        <div v-for="(stat, index) in sortedStats" :key="stat.type" class="stat-item">
          <div class="stat-rank">{{ index + 1 }}</div>
          <div class="stat-icon" :style="{ backgroundColor: getTypeColor(stat.type) }">
            {{ getTypeEmoji(stat.type) }}
          </div>
          <div class="stat-info">
            <p class="stat-label">{{ getTypeLabel(stat.type) }}</p>
            <p class="stat-value">{{ stat.total.toFixed(2) }} kg CO₂</p>
            <p class="stat-count">{{ stat.count }} 条记录</p>
          </div>
          <div class="stat-percentage">
            {{ getPercentage(stat.total) }}%
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>暂无数据</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  }
})

const trendDays = ref(30)
const trendRangeType = ref('preset')
const today = new Date().toISOString().split('T')[0]
const customStartDate = ref(() => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
})
const customEndDate = ref(today)

const statsSortBy = ref('carbon')
const statsSortOrder = ref('desc')

const typeLabels = {
  transport: '出行',
  diet: '饮食',
  home: '家庭能源',
  shopping: '购物'
}

const typeColors = {
  transport: '#667eea',
  diet: '#f093fb',
  home: '#4facfe',
  shopping: '#43e97b'
}

const typeEmojis = {
  transport: '🚗',
  diet: '🍽️',
  home: '🏠',
  shopping: '🛍️'
}

const getTypeLabel = (type) => {
  if (typeLabels[type]) return typeLabels[type]
  if (type.startsWith('custom_')) {
    return type.replace('custom_', '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }
  return type
}

const getTypeColor = (type) => {
  if (typeColors[type]) return typeColors[type]
  if (type.startsWith('custom_')) {
    const hash = type.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    const hue = hash % 360
    return `hsl(${hue}, 70%, 60%)`
  }
  return '#667eea'
}

const getTypeEmoji = (type) => {
  if (typeEmojis[type]) return typeEmojis[type]
  return '📊'
}

const totalCarbon = computed(() => {
  return props.records.reduce((sum, record) => sum + (record.carbon_emission || 0), 0)
})

const hasData = computed(() => {
  return props.records.length > 0
})

const statsByType = computed(() => {
  const stats = {}
  
  props.records.forEach(record => {
    const type = record.type
    if (!stats[type]) {
      stats[type] = {
        type: type,
        total: 0,
        count: 0,
        subtypes: {}
      }
    }
    
    stats[type].total += record.carbon_emission
    stats[type].count += 1
    
    const subtype = record.subtype
    if (!stats[type].subtypes[subtype]) {
      stats[type].subtypes[subtype] = {
        total: 0,
        count: 0
      }
    }
    
    stats[type].subtypes[subtype].total += record.carbon_emission
    stats[type].subtypes[subtype].count += 1
  })
  
  return stats
})

const sortedStats = computed(() => {
  const statsList = Object.values(statsByType.value)
  
  return statsList.sort((a, b) => {
    let valueA, valueB
    
    if (statsSortBy.value === 'carbon') {
      valueA = a.total
      valueB = b.total
    } else {
      valueA = a.count
      valueB = b.count
    }
    
    if (statsSortOrder.value === 'desc') {
      return valueB - valueA
    }
    return valueA - valueB
  })
})

const pieChartData = computed(() => {
  const data = []
  
  Object.entries(statsByType.value).forEach(([type, stat]) => {
    data.push({
      name: getTypeLabel(type),
      value: stat.total,
      itemStyle: {
        color: getTypeColor(type)
      }
    })
  })
  
  return data.sort((a, b) => b.value - a.value)
})

const filteredRecords = computed(() => {
  if (trendRangeType.value === 'preset') {
    const days = trendDays.value
    const todayDate = new Date()
    const startDate = new Date(todayDate)
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]
    
    return props.records.filter(record => record.date >= startDateStr)
  } else {
    return props.records.filter(record => {
      return record.date >= customStartDate.value && record.date <= customEndDate.value
    })
  }
})

const trendData = computed(() => {
  const records = filteredRecords.value
  
  if (records.length === 0) {
    return []
  }
  
  let startDate, endDate
  
  if (trendRangeType.value === 'preset') {
    const days = trendDays.value
    endDate = new Date()
    startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days)
  } else {
    startDate = new Date(customStartDate.value)
    endDate = new Date(customEndDate.value)
  }
  
  const data = {}
  const dateFormat = (date) => date.toISOString().split('T')[0]
  
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateStr = dateFormat(currentDate)
    data[dateStr] = 0
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  records.forEach(record => {
    if (data.hasOwnProperty(record.date)) {
      data[record.date] += record.carbon_emission
    }
  })
  
  return Object.entries(data).map(([date, value]) => ({
    date,
    value
  }))
})

const hasTrendData = computed(() => {
  return trendData.value.length > 0 && trendData.value.some(item => item.value > 0)
})

const pieChartOption = computed(() => {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} kg CO₂ ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: '5%',
      data: pieChartData.value.map(item => item.name)
    },
    series: [
      {
        name: '碳排放构成',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{d}%',
          fontSize: 12,
          fontWeight: 'bold'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: true
        },
        data: pieChartData.value
      }
    ]
  }
})

const lineChartOption = computed(() => {
  const dates = trendData.value.map(item => item.date)
  const values = trendData.value.map(item => item.value)
  
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const date = params[0].axisValue
        const value = params[0].data
        return `${date}<br/>碳排放: ${value.toFixed(2)} kg CO₂`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
        formatter: (value) => {
          const date = new Date(value)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'kg CO₂',
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: '碳排放',
        type: 'line',
        stack: 'Total',
        data: values,
        smooth: true,
        lineStyle: {
          color: '#667eea',
          width: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
              { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
            ]
          }
        },
        itemStyle: {
          color: '#667eea'
        }
      }
    ]
  }
})

const getPercentage = (value) => {
  if (totalCarbon.value === 0) return 0
  return ((value / totalCarbon.value) * 100).toFixed(1)
}
</script>

<style scoped>
.charts-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.chart-card {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.chart-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.form-select, .form-input {
  padding: 0.5rem;
  font-size: 0.9rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.3s ease;
}

.form-select:focus, .form-input:focus {
  border-color: #667eea;
}

.chart-wrapper {
  width: 100%;
  height: 300px;
}

.chart {
  width: 100%;
  height: 100%;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #999;
}

.stats-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background-color: #f0f2f5;
  transform: translateX(5px);
}

.stat-rank {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
  margin-right: 0.75rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-right: 1rem;
}

.stat-info {
  flex: 1;
}

.stat-label {
  margin: 0;
  font-weight: 500;
  color: #333;
}

.stat-value {
  margin: 0.25rem 0 0 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #667eea;
}

.stat-count {
  margin: 0;
  font-size: 0.85rem;
  color: #999;
}

.stat-percentage {
  font-size: 1.25rem;
  font-weight: 600;
  color: #667eea;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .chart-controls {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .form-select, .form-input {
    flex: 1;
    min-width: 80px;
  }
}
</style>
