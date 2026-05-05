<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { monitoringApi } from '../api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const serviceMetrics = ref(null)
const rollbackHistory = ref([])
const refreshInterval = ref(null)
const autoRefresh = ref(true)
const rollbackDialogVisible = ref(false)
const rollbackFromVersion = ref('')
const rollbackToVersion = ref('')
const rollbackReason = ref('')

const serviceName = computed(() => route.params.serviceName)

const qpsChartData = computed(() => {
  if (!serviceMetrics.value?.qps?.history) return null
  
  const history = serviceMetrics.value.qps.history
  return {
    labels: history.map((_, i) => `Point ${i + 1}`),
    datasets: [{
      label: 'QPS',
      data: history.map(h => h.value),
      borderColor: '#409eff',
      backgroundColor: 'rgba(64, 158, 255, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }
})

const latencyChartData = computed(() => {
  if (!serviceMetrics.value?.latency?.history) return null
  
  const history = serviceMetrics.value.latency.history
  return {
    labels: history.map((_, i) => `Point ${i + 1}`),
    datasets: [{
      label: '延迟 (ms)',
      data: history.map(h => h.value),
      borderColor: '#e6a23c',
      backgroundColor: 'rgba(230, 162, 60, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }
})

const gpuChartData = computed(() => {
  if (!serviceMetrics.value?.gpu_utilization?.history) return null
  
  const history = serviceMetrics.value.gpu_utilization.history
  return {
    labels: history.map((_, i) => `Point ${i + 1}`),
    datasets: [{
      label: 'GPU 利用率 (%)',
      data: history.map(h => h.value),
      borderColor: '#67c23a',
      backgroundColor: 'rgba(103, 194, 58, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }
})

const predictionChartData = computed(() => {
  if (!serviceMetrics.value?.prediction_distribution) return null
  
  const dist = serviceMetrics.value.prediction_distribution
  const labels = Object.keys(dist)
  const values = Object.values(dist)
  
  if (labels.length === 0) return null
  
  const colors = [
    '#409eff', '#67c23a', '#e6a23c', '#f56c6c',
    '#909399', '#00d4ff', '#ff6b6b', '#4ecdc4'
  ]
  
  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors.slice(0, labels.length),
      borderColor: '#fff',
      borderWidth: 2
    }]
  }
})

const baselineChartData = computed(() => {
  if (!serviceMetrics.value?.baseline_distribution) return null
  
  const dist = serviceMetrics.value.baseline_distribution
  const labels = Object.keys(dist)
  const values = Object.values(dist).map(v => (v * 100).toFixed(1))
  
  if (labels.length === 0) return null
  
  return {
    labels,
    datasets: [{
      label: '占比 (%)',
      data: values,
      backgroundColor: '#409eff'
    }]
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
      beginAtZero: true
    }
  }
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right'
    }
  }
}

const fetchServiceMetrics = async () => {
  loading.value = true
  try {
    const response = await monitoringApi.getServiceMetrics(serviceName.value)
    serviceMetrics.value = response.data.metrics
  } catch (error) {
    console.error('Failed to fetch service metrics:', error)
  } finally {
    loading.value = false
  }
}

const fetchRollbackHistory = async () => {
  try {
    const response = await monitoringApi.getRollbackHistory(serviceName.value)
    rollbackHistory.value = response.data.rollback_history || []
  } catch (error) {
    console.error('Failed to fetch rollback history:', error)
  }
}

const simulateRequest = async () => {
  try {
    await monitoringApi.simulateRequest(serviceName.value)
    ElMessage.success('模拟请求已发送')
    fetchServiceMetrics()
  } catch (error) {
    console.error('Failed to simulate request:', error)
    ElMessage.error('模拟请求失败')
  }
}

const setBaseline = async () => {
  try {
    const { value: predictionsText } = await ElMessageBox.prompt(
      '请输入预测结果列表（用逗号分隔，如：cat,dog,cat,bird）',
      '设置基线分布',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：cat,dog,cat,bird,fish'
      }
    )
    
    if (predictionsText) {
      const predictions = predictionsText.split(',').map(p => p.trim()).filter(p => p)
      if (predictions.length === 0) {
        ElMessage.warning('请输入至少一个预测结果')
        return
      }
      
      await monitoringApi.setBaseline(serviceName.value, predictions)
      ElMessage.success('基线分布设置成功')
      fetchServiceMetrics()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to set baseline:', error)
      ElMessage.error('设置基线失败')
    }
  }
}

const showRollbackDialog = () => {
  rollbackFromVersion.value = 'v1.0.0'
  rollbackToVersion.value = 'v0.9.0'
  rollbackReason.value = '检测到数据漂移，需要回滚到上一版本'
  rollbackDialogVisible.value = true
}

const performRollback = async () => {
  if (!rollbackFromVersion.value || !rollbackToVersion.value) {
    ElMessage.warning('请填写版本信息')
    return
  }
  
  try {
    await monitoringApi.rollback(
      serviceName.value,
      rollbackFromVersion.value,
      rollbackToVersion.value,
      rollbackReason.value
    )
    ElMessage.success('回滚操作已记录')
    rollbackDialogVisible.value = false
    fetchRollbackHistory()
  } catch (error) {
    console.error('Failed to perform rollback:', error)
    ElMessage.error('回滚操作失败')
  }
}

const startAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  if (autoRefresh.value) {
    refreshInterval.value = setInterval(() => {
      fetchServiceMetrics()
    }, 5000)
  }
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  startAutoRefresh()
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchServiceMetrics()
  fetchRollbackHistory()
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
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
        <h2 style="margin: 0;">服务详情 - {{ serviceName }}</h2>
        <el-tag 
          v-if="serviceMetrics?.drift_detected" 
          type="warning"
          effect="dark"
        >
          ⚠️ 数据漂移
        </el-tag>
        <el-tag v-else type="success" effect="dark">
          ✅ 正常
        </el-tag>
      </div>
      <div style="display: flex; gap: 8px;">
        <el-switch 
          v-model="autoRefresh" 
          @change="toggleAutoRefresh"
          active-text="自动刷新"
        />
        <el-button type="success" @click="simulateRequest">
          <el-icon><Plus /></el-icon>
          模拟请求
        </el-button>
        <el-button type="warning" @click="setBaseline">
          <el-icon><Setting /></el-icon>
          设置基线
        </el-button>
        <el-button type="danger" @click="showRollbackDialog">
          <el-icon><Back /></el-icon>
          一键回滚
        </el-button>
        <el-button @click="fetchServiceMetrics" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <div 
      v-if="serviceMetrics?.drift_detected" 
      class="drift-danger"
    >
      <el-icon :size="20"><Warning /></el-icon>
      <strong style="margin-left: 8px;">数据漂移警告！</strong>
      <span style="margin-left: 8px;">
        漂移分数: {{ serviceMetrics?.drift_score?.toFixed(4) }} 
        (阈值: 0.5)
      </span>
      <span style="margin-left: 16px; color: #909399;">
        建议：检查预测分布变化，考虑是否需要回滚模型
      </span>
    </div>

    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">
            {{ (serviceMetrics?.qps?.current || 0).toFixed(2) }}
          </div>
          <div class="stat-label">当前 QPS</div>
          <div style="margin-top: 8px; font-size: 12px; color: #909399;">
            平均: {{ (serviceMetrics?.qps?.average || 0).toFixed(2) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value" :style="{ color: (serviceMetrics?.latency?.average || 0) > 100 ? '#f56c6c' : '#67c23a' }">
            {{ (serviceMetrics?.latency?.average || 0).toFixed(2) }}ms
          </div>
          <div class="stat-label">平均延迟</div>
          <div style="margin-top: 8px; font-size: 12px; color: #909399;">
            P95: {{ (serviceMetrics?.latency?.p95 || 0).toFixed(2) }}ms
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">
            {{ (serviceMetrics?.gpu_utilization?.current || 0).toFixed(1) }}%
          </div>
          <div class="stat-label">GPU 利用率</div>
          <div style="margin-top: 8px; font-size: 12px; color: #909399;">
            平均: {{ (serviceMetrics?.gpu_utilization?.average || 0).toFixed(1) }}%
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value" :style="{ color: (serviceMetrics?.drift_score || 0) > 0.5 ? '#e6a23c' : '#67c23a' }">
            {{ (serviceMetrics?.drift_score || 0).toFixed(4) }}
          </div>
          <div class="stat-label">漂移分数</div>
          <div style="margin-top: 8px; font-size: 12px; color: #909399;">
            阈值: 0.5
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-tabs>
      <el-tab-pane label="性能监控" name="performance">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card class="metric-card">
              <template #header>
                <span>QPS 趋势</span>
              </template>
              <div class="chart-container" v-if="qpsChartData">
                <Line :data="qpsChartData" :options="chartOptions" />
              </div>
              <div v-else class="empty-container">
                暂无数据
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="metric-card">
              <template #header>
                <span>响应延迟</span>
              </template>
              <div class="chart-container" v-if="latencyChartData">
                <Line :data="latencyChartData" :options="chartOptions" />
              </div>
              <div v-else class="empty-container">
                暂无数据
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="metric-card">
              <template #header>
                <span>GPU 利用率</span>
              </template>
              <div class="chart-container" v-if="gpuChartData">
                <Line :data="gpuChartData" :options="chartOptions" />
              </div>
              <div v-else class="empty-container">
                暂无数据
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="数据分布" name="distribution">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="metric-card">
              <template #header>
                <span>当前预测分布</span>
              </template>
              <div class="chart-container" v-if="predictionChartData">
                <Doughnut :data="predictionChartData" :options="doughnutOptions" />
              </div>
              <div v-else class="empty-container">
                暂无预测数据
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="metric-card">
              <template #header>
                <span>基线分布 (参考)</span>
              </template>
              <div class="chart-container" v-if="baselineChartData">
                <Bar :data="baselineChartData" :options="chartOptions" />
              </div>
              <div v-else class="empty-container">
                <p>尚未设置基线分布</p>
                <p style="margin-top: 8px; color: #909399; font-size: 12px;">
                  点击"设置基线"按钮设置参考分布
                </p>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-card>
          <template #header>
            <span>预测分布详情</span>
          </template>
          <el-table 
            :data="Object.entries(serviceMetrics?.prediction_distribution || {})" 
            stripe
          >
            <el-table-column label="预测结果" prop="0" width="200" />
            <el-table-column label="次数" prop="1" width="150">
              <template #default="{ row }">
                <el-tag type="info">{{ row[1] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="占比">
              <template #default="{ row }">
                <el-progress 
                  :percentage="Math.round((row[1] / Object.values(serviceMetrics?.prediction_distribution || {}).reduce((a, b) => a + b, 0)) * 100)"
                  :stroke-width="20"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="回滚历史" name="rollback">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>回滚操作历史</span>
              <el-button type="danger" @click="showRollbackDialog">
                <el-icon><Back /></el-icon>
                执行回滚
              </el-button>
            </div>
          </template>
          
          <el-timeline v-if="rollbackHistory.length > 0">
            <el-timeline-item
              v-for="(record, index) in rollbackHistory"
              :key="index"
              :timestamp="formatDate(record.timestamp)"
              placement="top"
              type="danger"
            >
              <el-card shadow="never" style="margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <h4 style="margin: 0 0 8px 0;">
                      回滚: 
                      <el-tag type="danger" size="small">{{ record.from_version }}</el-tag>
                      <el-icon style="margin: 0 8px;"><ArrowRight /></el-icon>
                      <el-tag type="success" size="small">{{ record.to_version }}</el-tag>
                    </h4>
                    <p style="margin: 0; color: #909399; font-size: 13px;">
                      原因: {{ record.reason }}
                    </p>
                  </div>
                  <el-tag type="info">已执行</el-tag>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>

          <div v-else class="empty-container">
            <el-icon :size="48"><Clock /></el-icon>
            <p style="margin-top: 16px;">暂无回滚历史</p>
            <p style="color: #909399; margin-top: 8px;">
              当检测到数据漂移或模型性能下降时，可以执行一键回滚
            </p>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="rollbackDialogVisible" title="一键回滚" width="500px">
      <el-form label-width="120px">
        <el-alert 
          title="回滚操作说明" 
          type="warning" 
          :closable="false"
          style="margin-bottom: 20px;"
        >
          <template #default>
            <p>此操作将记录回滚历史，实际回滚操作需要配合模型部署系统执行。</p>
          </template>
        </el-alert>
        <el-form-item label="当前版本">
          <el-input v-model="rollbackFromVersion" placeholder="例如：v1.0.0" />
        </el-form-item>
        <el-form-item label="回滚到版本">
          <el-input v-model="rollbackToVersion" placeholder="例如：v0.9.0" />
        </el-form-item>
        <el-form-item label="回滚原因">
          <el-input 
            v-model="rollbackReason" 
            type="textarea" 
            :rows="3"
            placeholder="请输入回滚原因..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="performRollback">
          <el-icon><Warning /></el-icon>
          确认回滚
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
