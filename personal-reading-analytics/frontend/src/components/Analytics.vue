<template>
  <div class="analytics">
    <h2 class="text-xl font-bold mb-6">数据分析</h2>

    <div class="grid grid-2 mb-6">
      <div class="card">
        <div class="card-header">
          <h3>阅读时段热力图</h3>
        </div>
        <div class="card-body">
          <div v-if="heatmapData?.length > 0" class="chart-container-large">
            <v-chart class="chart" :option="heatmapOption" autoresize />
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">📅</div>
            <div class="empty-state-title">暂无热力图数据</div>
            <div class="empty-state-description">添加一些阅读会话后即可查看热力图</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>阅读速度趋势</h3>
        </div>
        <div class="card-body">
          <div v-if="readingSpeedData?.session_speeds?.length > 0" class="chart-container-large">
            <v-chart class="chart" :option="speedTrendOption" autoresize />
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">📈</div>
            <div class="empty-state-title">暂无速度数据</div>
            <div class="empty-state-description">完成一些阅读会话后即可查看速度趋势</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-2 mb-6">
      <div class="card">
        <div class="card-header">
          <h3>书籍阅读进度</h3>
        </div>
        <div class="card-body">
          <div v-if="booksWithProgress.length > 0">
            <div v-for="book in booksWithProgress" :key="book.id" class="mb-4 last:mb-0">
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium">{{ book.title }}</span>
                <span class="text-secondary text-sm">{{ Math.round(book.progress) }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${book.progress}%` }"></div>
              </div>
              <div class="flex justify-between mt-1 text-sm text-secondary">
                <span>已读 {{ book.pagesRead }} 页</span>
                <span>共 {{ book.totalPages }} 页</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">📚</div>
            <div class="empty-state-title">暂无书籍数据</div>
            <div class="empty-state-description">添加一些书籍后即可查看阅读进度</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>阅读统计概览</h3>
        </div>
        <div class="card-body">
          <div v-if="statistics" class="stats-overview">
            <div class="grid grid-2 gap-4">
              <div class="stat-box">
                <div class="stat-box-value">{{ statistics.totalSessions }}</div>
                <div class="stat-box-label">总阅读会话</div>
              </div>
              <div class="stat-box">
                <div class="stat-box-value">{{ statistics.totalPages }}</div>
                <div class="stat-box-label">总阅读页数</div>
              </div>
              <div class="stat-box">
                <div class="stat-box-value">{{ formatMinutes(statistics.totalMinutes) }}</div>
                <div class="stat-box-label">总阅读时间</div>
              </div>
              <div class="stat-box">
                <div class="stat-box-value">{{ statistics.averageSpeed?.toFixed(2) || '0.00' }}</div>
                <div class="stat-box-label">平均速度 (页/分钟)</div>
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-200">
              <div class="flex justify-between items-center mb-2">
                <span class="text-secondary">最喜欢阅读时间：</span>
                <span class="badge badge-primary">{{ statistics.favoriteReadingTime || '暂无' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-secondary">阅读最多类型：</span>
                <span class="badge badge-success">{{ statistics.mostReadGenre || '暂无' }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-title">暂无统计数据</div>
            <div class="empty-state-description">添加一些阅读记录后即可查看统计</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <h3>阅读主题分析</h3>
        </div>
        <div class="card-body">
          <div v-if="themes.length > 0">
            <div v-for="(theme, index) in themes" :key="index" class="theme-card mb-4 last:mb-0">
              <div class="flex justify-between items-center mb-2">
                <span class="font-semibold text-lg">#{{ index + 1 }} {{ theme.theme }}</span>
                <span class="badge badge-primary">{{ theme.strength }} 次出现</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="(keyword, idx) in theme.keywords" 
                  :key="idx"
                  class="badge badge-secondary"
                >
                  {{ keyword }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">🎯</div>
            <div class="empty-state-title">暂无主题数据</div>
            <div class="empty-state-description">添加一些阅读笔记后即可分析主题</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>阅读模式分析</h3>
        </div>
        <div class="card-body">
          <div v-if="patterns" class="patterns-list">
            <div class="pattern-item mb-4">
              <div class="flex justify-between items-center">
                <span class="text-secondary">平均会话时长：</span>
                <span class="font-semibold">{{ formatMinutes(patterns.averageSessionLength) }}</span>
              </div>
            </div>

            <div class="pattern-item mb-4">
              <div class="flex justify-between items-center">
                <span class="text-secondary">偏好阅读时间：</span>
                <span class="badge badge-primary">{{ patterns.preferredReadingTime?.formatted || '暂无' }}</span>
              </div>
            </div>

            <div class="pattern-item mb-4">
              <div class="flex justify-between items-center">
                <span class="text-secondary">记笔记频率：</span>
                <span class="font-semibold">{{ patterns.noteTakingFrequency.toFixed(2) }} 笔记/会话</span>
              </div>
            </div>

            <div v-if="patterns.sentiment" class="pattern-item">
              <div class="mb-2 font-medium">情感分析：</div>
              <div class="grid grid-3 gap-2 text-center">
                <div class="sentiment-box" :class="{ active: patterns.sentiment.positiveNotes > 0 }">
                  <div class="sentiment-value">{{ patterns.sentiment.positiveNotes }}</div>
                  <div class="sentiment-label text-success">积极</div>
                </div>
                <div class="sentiment-box" :class="{ active: patterns.sentiment.neutralNotes > 0 }">
                  <div class="sentiment-value">{{ patterns.sentiment.neutralNotes }}</div>
                  <div class="sentiment-label text-secondary">中性</div>
                </div>
                <div class="sentiment-box" :class="{ active: patterns.sentiment.negativeNotes > 0 }">
                  <div class="sentiment-value">{{ patterns.sentiment.negativeNotes }}</div>
                  <div class="sentiment-label text-danger">消极</div>
                </div>
              </div>
              <div class="mt-2 text-center">
                <span class="text-secondary">整体情感倾向：</span>
                <span class="font-semibold" :class="getSentimentClass(patterns.sentiment.overall)">
                  {{ formatSentiment(patterns.sentiment.overall) }} ({{ patterns.sentiment.overall.toFixed(2) }})
                </span>
              </div>
            </div>

            <div v-if="patterns.keywords?.length > 0" class="pattern-item mt-4 pt-4 border-t border-gray-200">
              <div class="mb-2 font-medium">高频关键词：</div>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="(keyword, index) in patterns.keywords.slice(0, 15)" 
                  :key="index"
                  class="badge badge-primary"
                >
                  {{ keyword.word }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">暂无模式数据</div>
            <div class="empty-state-description">添加更多数据后即可分析阅读模式</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useReadingStore } from '../stores/readingStore'
import { analyticsApi } from '../api'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { 
  LineChart, 
  HeatmapChart,
  BarChart
} from 'echarts/charts'
import { 
  GridComponent, 
  TooltipComponent, 
  LegendComponent,
  VisualMapComponent,
  TitleComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  HeatmapChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  TitleComponent
])

const readingStore = useReadingStore()

const heatmapData = ref(null)
const readingSpeedData = ref(null)
const statistics = ref(null)
const themes = ref([])
const patterns = ref(null)
const booksProgress = ref({})

const booksWithProgress = computed(() => {
  return readingStore.books.map(book => ({
    ...book,
    ...(booksProgress.value[book.id] || {
      progress: 0,
      pagesRead: 0,
      totalPages: book.total_pages || 0
    })
  }))
})

const heatmapOption = computed(() => {
  if (!heatmapData.value?.heatmap?.length) return {}

  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)

  return {
    tooltip: {
      position: 'top',
      formatter: (params) => {
        return `${days[params.data[0]]} ${hours[params.data[1]]}<br/>阅读次数: ${params.data[2]}`
      }
    },
    grid: {
      height: '50%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: hours,
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: days,
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: 0,
      max: Math.max(...heatmapData.value.heatmap.map(d => d[2]), 1),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
      }
    },
    series: [
      {
        name: '阅读次数',
        type: 'heatmap',
        data: heatmapData.value.heatmap,
        label: {
          show: false
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

const speedTrendOption = computed(() => {
  if (!readingSpeedData.value?.session_speeds?.length) return {}

  const sortedSessions = [...readingSpeedData.value.session_speeds].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  )

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const data = params[0]
        return `${data.name}<br/>阅读速度: ${data.value.toFixed(2)} 页/分钟`
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
      data: sortedSessions.map((_, index) => `会话 ${index + 1}`)
    },
    yAxis: {
      type: 'value',
      name: '页/分钟'
    },
    series: [
      {
        name: '阅读速度',
        type: 'line',
        smooth: true,
        data: sortedSessions.map(s => s.speed),
        areaStyle: {
          color: 'rgba(79, 70, 229, 0.1)'
        },
        lineStyle: {
          color: '#4f46e5',
          width: 2
        },
        itemStyle: {
          color: '#4f46e5'
        }
      }
    ]
  }
})

function formatMinutes(minutes) {
  if (!minutes) return '0分钟'
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  if (hours > 0) {
    return `${hours}小时${mins}分钟`
  }
  return `${mins}分钟`
}

function getSentimentClass(score) {
  if (score > 0.1) return 'text-success'
  if (score < -0.1) return 'text-danger'
  return 'text-secondary'
}

function formatSentiment(score) {
  if (score > 0.1) return '积极'
  if (score < -0.1) return '消极'
  return '中性'
}

async function fetchAllData() {
  try {
    const [heatmapRes, speedRes, statsRes, themesRes, patternsRes] = await Promise.all([
      analyticsApi.getHeatmap(),
      analyticsApi.getReadingSpeed(),
      analyticsApi.getStatistics(),
      readingStore.fetchThemes(),
      readingStore.fetchPatterns()
    ])
    
    heatmapData.value = heatmapRes.data
    readingSpeedData.value = speedRes.data
    statistics.value = statsRes.data
    themes.value = readingStore.themes
    patterns.value = readingStore.patterns

    // 获取每本书的阅读进度
    for (const book of readingStore.books) {
      try {
        const progressRes = await analyticsApi.getProgress(book.id)
        booksProgress.value[book.id] = progressRes.data
      } catch (e) {
        console.error(`获取书籍 ${book.id} 进度失败:`, e)
      }
    }
  } catch (error) {
    console.error('获取数据失败:', error)
  }
}

onMounted(() => {
  readingStore.fetchBooks()
  readingStore.fetchSessions()
  fetchAllData()
})
</script>

<style scoped>
.chart {
  width: 100%;
  height: 100%;
}

.stat-box {
  text-align: center;
  padding: 1rem;
  background-color: var(--background-color);
  border-radius: var(--radius-md);
}

.stat-box-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.25rem;
}

.stat-box-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.theme-card {
  padding: 1rem;
  background-color: var(--background-color);
  border-radius: var(--radius-md);
}

.sentiment-box {
  padding: 0.75rem;
  background-color: var(--background-color);
  border-radius: var(--radius-md);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.sentiment-box.active {
  opacity: 1;
}

.sentiment-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.sentiment-label {
  font-size: 0.75rem;
}

.text-success {
  color: var(--success-color);
}

.text-danger {
  color: var(--danger-color);
}
</style>
