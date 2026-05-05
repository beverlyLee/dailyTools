<template>
  <div class="stats-view">
    <div class="stats-card card">
      <div class="stats-header">
        <h2>统计分析</h2>
        <div class="backup-controls">
          <button class="btn btn-secondary" @click="handleBackup">
            📁 备份数据
          </button>
          <button class="btn btn-secondary" @click="handleRestore">
            🔄 恢复数据
          </button>
        </div>
      </div>
      
      <div class="stats-summary">
        <div class="summary-item">
          <div class="summary-value">{{ todayStats.total_pomodoros }}</div>
          <div class="summary-label">今日番茄</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ todayStats.total_minutes }}</div>
          <div class="summary-label">专注分钟</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ todayStats.completed_tasks }}</div>
          <div class="summary-label">完成任务</div>
        </div>
      </div>
      
      <div class="chart-section">
        <h3>本周统计</h3>
        <div class="chart-container">
          <canvas ref="weeklyChartRef"></canvas>
        </div>
      </div>
      
      <div class="date-range-controls">
        <label>查看日期：</label>
        <input type="date" v-model="selectedDate" @change="loadTodayStats" class="input" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Chart, registerables, ChartConfiguration } from 'chart.js'
import { api, DailyStat } from '@/api'
import { open, save } from '@tauri-apps/api/dialog'

Chart.register(...registerables)

const selectedDate = ref(new Date().toISOString().split('T')[0])
const todayStats = ref<DailyStat>({
  date: '',
  total_pomodoros: 0,
  total_minutes: 0,
  completed_tasks: 0
})
const weeklyStats = ref<DailyStat[]>([])
const weeklyChartRef = ref<HTMLCanvasElement | null>(null)
let weeklyChart: Chart | null = null

function getWeekDates(): { start: string; end: string } {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  }
}

async function loadTodayStats() {
  todayStats.value = await api.getDailyStats(selectedDate.value)
}

async function loadWeeklyStats() {
  const { start, end } = getWeekDates()
  weeklyStats.value = await api.getWeeklyStats(start, end)
  await renderWeeklyChart()
}

async function renderWeeklyChart() {
  if (!weeklyChartRef.value) return
  
  await nextTick()
  
  if (weeklyChart) {
    weeklyChart.destroy()
  }
  
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const data = new Array(7).fill(0)
  
  const { start } = getWeekDates()
  const startDate = new Date(start)
  
  weeklyStats.value.forEach(stat => {
    const statDate = new Date(stat.date)
    const dayDiff = Math.floor((statDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (dayDiff >= 0 && dayDiff < 7) {
      data[dayDiff] = stat.total_pomodoros
    }
  })
  
  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '番茄数',
          data,
          backgroundColor: 'rgba(102, 126, 234, 0.7)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  }
  
  weeklyChart = new Chart(weeklyChartRef.value, config)
}

async function handleBackup() {
  try {
    const backupPath = await save({
      title: '备份数据',
      defaultPath: `pomodoro-backup-${new Date().toISOString().split('T')[0]}.db`,
      filters: [
        {
          name: 'SQLite Database',
          extensions: ['db']
        }
      ]
    })
    
    if (backupPath) {
      await api.backupDatabase(backupPath as string)
      alert('数据备份成功！')
    }
  } catch (error) {
    alert(`备份失败: ${error}`)
  }
}

async function handleRestore() {
  try {
    const selectedPath = await open({
      title: '选择备份文件',
      multiple: false,
      filters: [
        {
          name: 'SQLite Database',
          extensions: ['db']
        }
      ]
    })
    
    if (selectedPath) {
      if (confirm('恢复数据将覆盖当前所有数据，确定继续吗？')) {
        await api.restoreDatabase(selectedPath as string)
        alert('数据恢复成功！请重启应用以查看更新后的数据。')
        await loadTodayStats()
        await loadWeeklyStats()
      }
    }
  } catch (error) {
    alert(`恢复失败: ${error}`)
  }
}

onMounted(async () => {
  await loadTodayStats()
  await loadWeeklyStats()
})

onUnmounted(() => {
  if (weeklyChart) {
    weeklyChart.destroy()
  }
})
</script>

<style scoped>
.stats-view {
  width: 100%;
  max-width: 800px;
}

.stats-card {
  width: 100%;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.stats-header h2 {
  margin: 0;
  color: #333;
}

.backup-controls {
  display: flex;
  gap: 0.75rem;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-item {
  text-align: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 1rem;
}

.summary-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 0.25rem;
}

.summary-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.chart-section {
  margin-bottom: 2rem;
}

.chart-section h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.1rem;
}

.chart-container {
  height: 300px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 0.75rem;
  padding: 1rem;
}

.date-range-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.date-range-controls label {
  font-weight: 500;
  color: #666;
}

.date-range-controls .input {
  max-width: 200px;
}
</style>
