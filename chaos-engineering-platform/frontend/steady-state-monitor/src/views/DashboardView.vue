<template>
  <div class="dashboard-view">
    <div class="page-header">
      <h2>监控仪表盘</h2>
      <div class="header-actions">
        <el-select v-model="selectedExperiment" placeholder="选择实验" clearable style="width: 200px">
          <el-option
            v-for="exp in experiments"
            :key="exp.id"
            :label="exp.name"
            :value="exp.id"
          />
        </el-select>
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="6" v-for="(metric, index) in displayMetrics" :key="metric.id">
        <el-card class="metric-card" :class="getMetricCardClass(metric)">
          <div class="metric-header">
            <span class="metric-name">{{ metric.displayName }}</span>
            <el-tag :type="getMetricStatusType(metric)" size="small">
              {{ getMetricStatusLabel(metric) }}
            </el-tag>
          </div>
          <div class="metric-value">
            <span :class="getMetricValueClass(metric)">
              {{ formatMetricValue(metric) }}
            </span>
            <span class="metric-unit">{{ metric.unit }}</span>
          </div>
          <div class="metric-threshold">
            阈值: {{ getOperatorLabel(metric.defaultOperator) }} {{ metric.defaultThreshold }}
            {{ metric.unit }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>性能指标趋势</span>
              <el-select v-model="selectedTimeRange" placeholder="时间范围" style="width: 120px">
                <el-option label="最近 15 分钟" value="15m" />
                <el-option label="最近 30 分钟" value="30m" />
                <el-option label="最近 1 小时" value="1h" />
                <el-option label="最近 6 小时" value="6h" />
              </el-select>
            </div>
          </template>
          <v-chart class="chart" :option="chartOption" autoresize />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>实时告警</span>
              <el-badge :value="unacknowledgedViolations.length" type="danger">
                <el-button type="primary" link @click="refreshViolations">
                  <el-icon><Bell /></el-icon>
                </el-button>
              </el-badge>
            </div>
          </template>
          <div class="violations-list">
            <div
              v-for="violation in violations"
              :key="violation.id"
              class="violation-item"
              :class="violation.level"
            >
              <div class="violation-header">
                <el-icon v-if="violation.level === 'critical'" color="#F56C6C"><Warning /></el-icon>
                <el-icon v-else color="#E6A23C"><InfoFilled /></el-icon>
                <span class="violation-metric">{{ violation.metricName }}</span>
                <el-tag
                  v-if="!violation.acknowledged"
                  type="danger"
                  size="small"
                  effect="dark"
                >
                  未处理
                </el-tag>
              </div>
              <div class="violation-details">
                <span>期望值: {{ getOperatorLabel(violation.operator) }} {{ violation.expectedValue }} {{ violation.unit }}</span>
                <span>实际值: {{ violation.actualValue }} {{ violation.unit }}</span>
              </div>
              <div class="violation-time">
                {{ formatDate(violation.timestamp) }}
              </div>
              <el-button
                v-if="!violation.acknowledged"
                type="primary"
                link
                size="small"
                @click="acknowledgeViolation(violation.id)"
              >
                确认收到
              </el-button>
            </div>
            <el-empty v-if="violations.length === 0" description="暂无告警" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Bell, Warning, InfoFilled } from '@element-plus/icons-vue'
import type { Metric, MetricValue, Violation } from '@/types'
import { METRICS, CATEGORY_COLORS, OPERATOR_LABELS } from '@/types'
import { metricApi, violationApi } from '@/utils/api'
import { formatDate, generateId } from '@/utils/helpers'
import type { EChartsOption } from 'echarts'

const selectedExperiment = ref<string>('')
const selectedTimeRange = ref<string>('15m')
const currentValues = ref<Record<string, number>>({})
const experiments = ref<{ id: string; name: string }[]>([
  { id: 'exp-1', name: 'Pod 删除实验' },
  { id: 'exp-2', name: '网络延迟实验' },
  { id: 'exp-3', name: 'CPU 压力测试' }
])

const displayMetrics = computed(() => {
  return METRICS.map(metric => ({
    ...metric,
    currentValue: currentValues.value[metric.id]
  }))
})

const violations = ref<Violation[]>([])

const unacknowledgedViolations = computed(() => {
  return violations.value.filter(v => !v.acknowledged)
})

const chartData = reactive<Record<string, { time: string; value: number }[]>>({})

const chartOption = computed<EChartsOption>(() => {
  const timeData = Object.keys(chartData).length > 0 
    ? chartData[Object.keys(chartData)[0]]?.map(d => d.time) || []
    : []
  
  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['QPS', 'P99 响应时间', '错误率']
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
      data: timeData
    },
    yAxis: [
      {
        type: 'value',
        name: 'QPS',
        position: 'left'
      },
      {
        type: 'value',
        name: 'ms/%',
        position: 'right'
      }
    ],
    series: [
      {
        name: 'QPS',
        type: 'line',
        smooth: true,
        data: chartData['qps']?.map(d => d.value) || [],
        yAxisIndex: 0,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: 'P99 响应时间',
        type: 'line',
        smooth: true,
        data: chartData['rt_p99']?.map(d => d.value) || [],
        yAxisIndex: 1,
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '错误率',
        type: 'line',
        smooth: true,
        data: chartData['error_rate']?.map(d => d.value) || [],
        yAxisIndex: 1,
        itemStyle: { color: '#F56C6C' }
      }
    ]
  }
})

function getMetricCardClass(metric: Metric & { currentValue?: number }): string {
  if (metric.currentValue === undefined) return ''
  
  const threshold = metric.defaultThreshold
  const operator = metric.defaultOperator
  
  let isHealthy: boolean
  switch (operator) {
    case '>':
      isHealthy = metric.currentValue > threshold
      break
    case '<':
      isHealthy = metric.currentValue < threshold
      break
    case '>=':
      isHealthy = metric.currentValue >= threshold
      break
    case '<=':
      isHealthy = metric.currentValue <= threshold
      break
    default:
      isHealthy = true
  }
  
  return isHealthy ? 'healthy' : 'warning'
}

function getMetricStatusType(metric: Metric & { currentValue?: number }): 'success' | 'warning' | 'info' {
  if (metric.currentValue === undefined) return 'info'
  
  const threshold = metric.defaultThreshold
  const operator = metric.defaultOperator
  
  let isHealthy: boolean
  switch (operator) {
    case '>':
      isHealthy = metric.currentValue > threshold
      break
    case '<':
      isHealthy = metric.currentValue < threshold
      break
    case '>=':
      isHealthy = metric.currentValue >= threshold
      break
    case '<=':
      isHealthy = metric.currentValue <= threshold
      break
    default:
      isHealthy = true
  }
  
  return isHealthy ? 'success' : 'warning'
}

function getMetricStatusLabel(metric: Metric & { currentValue?: number }): string {
  if (metric.currentValue === undefined) return '无数据'
  
  const threshold = metric.defaultThreshold
  const operator = metric.defaultOperator
  
  let isHealthy: boolean
  switch (operator) {
    case '>':
      isHealthy = metric.currentValue > threshold
      break
    case '<':
      isHealthy = metric.currentValue < threshold
      break
    case '>=':
      isHealthy = metric.currentValue >= threshold
      break
    case '<=':
      isHealthy = metric.currentValue <= threshold
      break
    default:
      isHealthy = true
  }
  
  return isHealthy ? '正常' : '告警'
}

function getMetricValueClass(metric: Metric & { currentValue?: number }): string {
  if (metric.currentValue === undefined) return ''
  
  const threshold = metric.defaultThreshold
  const operator = metric.defaultOperator
  
  let isHealthy: boolean
  switch (operator) {
    case '>':
      isHealthy = metric.currentValue > threshold
      break
    case '<':
      isHealthy = metric.currentValue < threshold
      break
    case '>=':
      isHealthy = metric.currentValue >= threshold
      break
    case '<=':
      isHealthy = metric.currentValue <= threshold
      break
    default:
      isHealthy = true
  }
  
  return isHealthy ? 'healthy' : 'warning'
}

function formatMetricValue(metric: Metric & { currentValue?: number }): string {
  if (metric.currentValue === undefined) return '--'
  return metric.currentValue.toFixed(2)
}

function getOperatorLabel(operator: string): string {
  return OPERATOR_LABELS[operator] || operator
}

async function refreshData() {
  try {
    METRICS.forEach(metric => {
      const baseValue = metric.defaultThreshold
      const variation = (Math.random() - 0.5) * 0.4
      currentValues.value[metric.id] = baseValue * (1 + variation)
    })
    
    const now = new Date()
    for (let i = 14; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000)
      const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      
      if (!chartData['qps']) chartData['qps'] = []
      if (!chartData['rt_p99']) chartData['rt_p99'] = []
      if (!chartData['error_rate']) chartData['error_rate'] = []
      
      chartData['qps'].push({ time: timeStr, value: 800 + Math.random() * 600 })
      chartData['rt_p99'].push({ time: timeStr, value: 100 + Math.random() * 200 })
      chartData['error_rate'].push({ time: timeStr, value: Math.random() * 2 })
      
      if (chartData['qps'].length > 15) chartData['qps'].shift()
      if (chartData['rt_p99'].length > 15) chartData['rt_p99'].shift()
      if (chartData['error_rate'].length > 15) chartData['error_rate'].shift()
    }
  } catch (error) {
    console.error('刷新数据失败:', error)
  }
}

async function refreshViolations() {
  try {
    if (Math.random() > 0.7) {
      const randomMetric = METRICS[Math.floor(Math.random() * METRICS.length)]
      const newViolation: Violation = {
        id: generateId(),
        checkId: 'check-1',
        metricId: randomMetric.id,
        metricName: randomMetric.displayName,
        expectedValue: randomMetric.defaultThreshold,
        actualValue: randomMetric.defaultThreshold * (randomMetric.defaultOperator.includes('>') ? 0.5 : 1.5),
        operator: randomMetric.defaultOperator,
        unit: randomMetric.unit,
        timestamp: new Date().toISOString(),
        level: Math.random() > 0.5 ? 'critical' : 'warning',
        acknowledged: false
      }
      violations.value.unshift(newViolation)
    }
  } catch (error) {
    console.error('刷新告警失败:', error)
  }
}

async function acknowledgeViolation(id: string) {
  try {
    const index = violations.value.findIndex(v => v.id === id)
    if (index !== -1) {
      violations.value[index].acknowledged = true
    }
    ElMessage.success('已确认收到告警')
  } catch (error) {
    ElMessage.error('确认失败')
  }
}

let refreshInterval: ReturnType<typeof setInterval>

onMounted(() => {
  refreshData()
  refreshViolations()
  
  refreshInterval = setInterval(() => {
    refreshData()
    refreshViolations()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.dashboard-view {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-card {
  transition: all 0.3s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-card.healthy {
  border-left: 4px solid #67c23a;
}

.metric-card.warning {
  border-left: 4px solid #e6a23c;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.metric-name {
  font-size: 14px;
  color: #909399;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.metric-value span:first-child {
  font-size: 32px;
  font-weight: 600;
}

.metric-value .healthy {
  color: #67c23a;
}

.metric-value .warning {
  color: #e6a23c;
}

.metric-unit {
  font-size: 14px;
  color: #909399;
}

.metric-threshold {
  font-size: 12px;
  color: #c0c4cc;
}

.chart {
  height: 350px;
}

.violations-list {
  max-height: 400px;
  overflow-y: auto;
}

.violation-item {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #ebeef5;
}

.violation-item.warning {
  background-color: #fdf6ec;
  border-color: #faecd8;
}

.violation-item.critical {
  background-color: #fef0f0;
  border-color: #fde2e2;
}

.violation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.violation-metric {
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.violation-details {
  font-size: 13px;
  color: #606266;
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
}

.violation-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}
</style>
