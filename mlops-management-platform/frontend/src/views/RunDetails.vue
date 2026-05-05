<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { experimentsApi } from '../api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const runDetails = ref(null)

const runId = computed(() => route.params.runId)

const chartData = computed(() => {
  if (!runDetails.value?.metric_history) return null
  
  const datasets = []
  const labels = []
  
  const histories = runDetails.value.metric_history
  const allSteps = new Set()
  
  for (const metricName in histories) {
    histories[metricName].forEach(point => {
      allSteps.add(point.step)
    })
  }
  
  const sortedSteps = Array.from(allSteps).sort((a, b) => a - b)
  
  for (const metricName in histories) {
    const history = histories[metricName]
    const stepMap = new Map(history.map(p => [p.step, p.value]))
    
    const data = sortedSteps.map(step => stepMap.get(step) ?? null)
    
    datasets.push({
      label: metricName,
      data,
      borderColor: getRandomColor(),
      backgroundColor: getRandomColor() + '20',
      tension: 0.4,
      fill: false
    })
  }
  
  return {
    labels: sortedSteps.map(s => `Step ${s}`),
    datasets
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top'
    }
  },
  scales: {
    y: {
      beginAtZero: false
    }
  },
  interaction: {
    mode: 'index',
    intersect: false
  }
}

function getRandomColor() {
  const colors = [
    '#409eff', '#67c23a', '#e6a23c', '#f56c6c',
    '#909399', '#00d4ff', '#ff6b6b', '#4ecdc4',
    '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

const fetchRunDetails = async () => {
  loading.value = true
  try {
    const response = await experimentsApi.getRunDetails(runId.value)
    runDetails.value = response.data.run
  } catch (error) {
    console.error('Failed to fetch run details:', error)
    ElMessage.error('获取运行详情失败')
  } finally {
    loading.value = false
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '-'
  const duration = endTime - startTime
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

onMounted(() => {
  fetchRunDetails()
})

watch(runId, () => {
  fetchRunDetails()
})
</script>

<template>
  <div v-loading="loading">
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <el-button @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 style="margin: 0;">运行详情</h2>
      </div>
      <el-button @click="fetchRunDetails" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <div v-if="runDetails">
      <el-card class="metric-card">
        <template #header>
          <div class="card-header">
            <span>基本信息</span>
            <el-tag :type="runDetails.status === 'FINISHED' ? 'success' : runDetails.status === 'RUNNING' ? 'warning' : 'danger'">
              {{ runDetails.status }}
            </el-tag>
          </div>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="运行ID">
            <code>{{ runDetails.run_id }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="实验ID">
            <code>{{ runDetails.experiment_id }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="runDetails.status === 'FINISHED' ? 'success' : 'info'">
              {{ runDetails.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">
            {{ formatDate(runDetails.start_time) }}
          </el-descriptions-item>
          <el-descriptions-item label="结束时间">
            {{ formatDate(runDetails.end_time) }}
          </el-descriptions-item>
          <el-descriptions-item label="运行时长">
            {{ formatDuration(runDetails.start_time, runDetails.end_time) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="metric-card">
            <template #header>
              <span>超参数</span>
            </template>
            <el-table :data="Object.entries(runDetails.params || {})" stripe size="small">
              <el-table-column label="参数名" prop="0" width="150" />
              <el-table-column label="参数值" prop="1" />
            </el-table>
            <div v-if="Object.keys(runDetails.params || {}).length === 0" class="empty-container">
              暂无超参数数据
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="metric-card">
            <template #header>
              <span>最终指标</span>
            </template>
            <el-table :data="Object.entries(runDetails.metrics || {})" stripe size="small">
              <el-table-column label="指标名" prop="0" width="150" />
              <el-table-column label="指标值">
                <template #default="{ row }">
                  <el-tag type="success">{{ Number(row[1]).toFixed(6) }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="Object.keys(runDetails.metrics || {}).length === 0" class="empty-container">
              暂无指标数据
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card v-if="chartData && chartData.datasets.length > 0">
        <template #header>
          <span>训练过程曲线</span>
        </template>
        <div class="chart-container" style="height: 400px;">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </el-card>

      <el-card v-else>
        <template #header>
          <span>训练过程曲线</span>
        </template>
        <div class="empty-container">
          <el-icon :size="48"><TrendCharts /></el-icon>
          <p style="margin-top: 16px;">暂无训练过程数据</p>
        </div>
      </el-card>

      <el-card v-if="runDetails.tags && Object.keys(runDetails.tags).length > 0">
        <template #header>
          <span>标签信息</span>
        </template>
        <el-table :data="Object.entries(runDetails.tags)" stripe size="small">
          <el-table-column label="标签名" prop="0" width="200" />
          <el-table-column label="标签值" prop="1" show-overflow-tooltip />
        </el-table>
      </el-card>
    </div>
  </div>
</template>
