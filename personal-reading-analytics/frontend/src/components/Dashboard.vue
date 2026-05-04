<template>
  <div class="dashboard">
    <div v-if="loading" class="text-center p-4">
      <div class="spinner" style="margin: 0 auto;"></div>
      <p class="text-secondary mt-2">加载中...</p>
    </div>

    <div v-else class="dashboard-content">
      <div class="grid grid-4 mb-6">
        <div class="card stat-card">
          <div class="stat-value">{{ readingStore.totalBooks }}</div>
          <div class="stat-label">已添加书籍</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">{{ readingStore.totalSessions }}</div>
          <div class="stat-label">阅读会话</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">{{ readingStore.totalNotes }}</div>
          <div class="stat-label">阅读笔记</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">{{ formatSpeed(statistics?.averageSpeed) }}</div>
          <div class="stat-label">平均阅读速度 (页/分钟)</div>
        </div>
      </div>

      <div class="grid grid-2 mb-6">
        <div class="card">
          <div class="card-header">
            <h3>阅读统计</h3>
          </div>
          <div class="card-body">
            <div v-if="statistics" class="statistics-list">
              <div class="stat-item">
                <span class="stat-item-label">总阅读页数：</span>
                <span class="stat-item-value">{{ statistics.totalPages }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-item-label">总阅读时间：</span>
                <span class="stat-item-value">{{ formatMinutes(statistics.totalMinutes) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-item-label">最喜欢阅读时间：</span>
                <span class="stat-item-value">{{ statistics.favoriteReadingTime || '暂无数据' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-item-label">阅读最多类型：</span>
                <span class="stat-item-value">{{ statistics.mostReadGenre || '暂无数据' }}</span>
              </div>
            </div>
            <div v-else class="empty-state">
              <div class="empty-state-icon">📊</div>
              <div class="empty-state-title">暂无统计数据</div>
              <div class="empty-state-description">添加一些阅读记录后即可查看统计</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>阅读速度趋势</h3>
          </div>
          <div class="card-body">
            <div v-if="readingSpeed?.session_speeds?.length > 0" class="chart-container-large">
              <v-chart class="chart" :option="speedChartOption" autoresize />
            </div>
            <div v-else class="empty-state">
              <div class="empty-state-icon">📈</div>
              <div class="empty-state-title">暂无速度数据</div>
              <div class="empty-state-description">完成一些阅读会话后即可查看速度趋势</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-6">
        <div class="card-header">
          <h3>最近的阅读会话</h3>
        </div>
        <div class="card-body">
          <table v-if="recentSessions.length > 0" class="table">
            <thead>
              <tr>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>阅读页数</th>
                <th>阅读速度</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in recentSessions" :key="session.id">
                <td>{{ formatDateTime(session.start_time) }}</td>
                <td>{{ formatDateTime(session.end_time) }}</td>
                <td>{{ session.end_page - session.start_page }} 页</td>
                <td>{{ formatSpeed(calculateSessionSpeed(session)) }} 页/分钟</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty-state">
            <div class="empty-state-icon">📖</div>
            <div class="empty-state-title">暂无阅读记录</div>
            <div class="empty-state-description">开始记录您的阅读会话吧</div>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header">
            <h3>阅读主题分析</h3>
          </div>
          <div class="card-body">
            <div v-if="themes.length > 0" class="themes-list">
              <div v-for="(theme, index) in themes" :key="index" class="theme-item">
                <span class="theme-rank">#{{ index + 1 }}</span>
                <span class="theme-name">{{ theme.theme }}</span>
                <span class="badge badge-primary">{{ theme.strength }} 次出现</span>
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
              <div class="pattern-item">
                <span class="pattern-label">平均会话时长：</span>
                <span class="pattern-value">{{ formatMinutes(patterns.averageSessionLength) }}</span>
              </div>
              <div class="pattern-item">
                <span class="pattern-label">偏好阅读时间：</span>
                <span class="pattern-value">{{ patterns.preferredReadingTime?.formatted || '暂无' }}</span>
              </div>
              <div class="pattern-item">
                <span class="pattern-label">记笔记频率：</span>
                <span class="pattern-value">{{ patterns.noteTakingFrequency.toFixed(2) }} 笔记/会话</span>
              </div>
              <div class="pattern-item" v-if="patterns.sentiment">
                <span class="pattern-label">整体情感倾向：</span>
                <span class="pattern-value" :class="getSentimentClass(patterns.sentiment.overall)">
                  {{ formatSentiment(patterns.sentiment.overall) }}
                </span>
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
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useReadingStore } from '../stores/readingStore'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent
])

const readingStore = useReadingStore()

const loading = computed(() => readingStore.loading)
const statistics = computed(() => readingStore.statistics)
const readingSpeed = computed(() => readingStore.readingSpeed)
const themes = computed(() => readingStore.themes)
const patterns = computed(() => readingStore.patterns)
const sessions = computed(() => readingStore.sessions)

const recentSessions = computed(() => {
  return sessions.value
    .filter(s => s.end_time)
    .slice(0, 5)
})

const speedChartOption = computed(() => {
  if (!readingSpeed.value?.session_speeds?.length) {
    return {}
  }

  const sortedSessions = [...readingSpeed.value.session_speeds].sort((a, b) => 
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
      data: sortedSessions.map((_, index) => `会话 ${index + 1}`),
      axisLabel: {
        rotate: 45
      }
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
          color: '#4f46e5'
        },
        itemStyle: {
          color: '#4f46e5'
        }
      }
    ]
  }
})

function formatSpeed(speed) {
  if (!speed) return '0.00'
  return speed.toFixed(2)
}

function formatMinutes(minutes) {
  if (!minutes) return '0分钟'
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  if (hours > 0) {
    return `${hours}小时${mins}分钟`
  }
  return `${mins}分钟`
}

function formatDateTime(dateTime) {
  if (!dateTime) return '-'
  const date = new Date(dateTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function calculateSessionSpeed(session) {
  if (!session.start_time || !session.end_time || 
      session.start_page === undefined || session.end_page === undefined) {
    return 0
  }
  const pagesRead = session.end_page - session.start_page
  const minutes = (new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60)
  return minutes > 0 ? pagesRead / minutes : 0
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

onMounted(() => {
  readingStore.fetchBooks()
  readingStore.fetchSessions()
  readingStore.fetchNotes()
  readingStore.fetchStatistics()
  readingStore.fetchReadingSpeed()
  readingStore.fetchThemes()
  readingStore.fetchPatterns()
})
</script>

<style scoped>
.statistics-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-item-label {
  color: var(--text-secondary);
}

.stat-item-value {
  font-weight: 600;
}

.chart {
  width: 100%;
  height: 100%;
}

.themes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theme-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: var(--background-color);
  border-radius: var(--radius-md);
}

.theme-rank {
  font-weight: 700;
  color: var(--primary-color);
  font-size: 0.875rem;
}

.theme-name {
  flex: 1;
  font-weight: 500;
}

.patterns-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pattern-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.pattern-item:last-child {
  border-bottom: none;
}

.pattern-label {
  color: var(--text-secondary);
}

.pattern-value {
  font-weight: 600;
}

.text-success {
  color: var(--success-color);
}

.text-danger {
  color: var(--danger-color);
}
</style>
