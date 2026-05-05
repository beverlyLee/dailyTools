<template>
  <div class="metrics-page">
    <div class="page-header">
      <h2>服务指标监控</h2>
    </div>
    
    <div class="filter-bar" style="margin-bottom: 16px;">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-select v-model:value="selectedService" style="width: 100%;" placeholder="选择服务" @change="onServiceChange">
            <a-select-option value="all">全部服务</a-select-option>
            <a-select-option value="api-gateway">api-gateway</a-select-option>
            <a-select-option value="user-service">user-service</a-select-option>
            <a-select-option value="order-service">order-service</a-select-option>
            <a-select-option value="payment-service">payment-service</a-select-option>
            <a-select-option value="product-service">product-service</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select v-model:value="selectedTimeRange" style="width: 100%;" placeholder="时间范围">
            <a-select-option value="1h">最近 1 小时</a-select-option>
            <a-select-option value="6h">最近 6 小时</a-select-option>
            <a-select-option value="24h">最近 24 小时</a-select-option>
            <a-select-option value="7d">最近 7 天</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select v-model:value="refreshInterval" style="width: 100%;" placeholder="刷新间隔">
            <a-select-option value="0">手动刷新</a-select-option>
            <a-select-option value="5">5 秒</a-select-option>
            <a-select-option value="10">10 秒</a-select-option>
            <a-select-option value="30">30 秒</a-select-option>
            <a-select-option value="60">60 秒</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6" style="text-align: right;">
          <a-button type="primary" @click="refreshMetrics">
            <reload-outlined /> 刷新
          </a-button>
        </a-col>
      </a-row>
    </div>
    
    <a-card title="服务性能概览" style="margin-bottom: 24px;">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-statistic title="QPS" :value="metrics.qps" suffix="req/s" :value-style="{ color: '#1890ff' }">
            <template #prefix>
              <arrow-up-outlined />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="6">
          <a-statistic title="平均延迟" :value="metrics.avgLatency" suffix="ms" :value-style="{ color: '#52c41a' }">
            <template #prefix>
              <arrow-down-outlined />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="6">
          <a-statistic title="P99 延迟" :value="metrics.p99Latency" suffix="ms" :value-style="{ color: '#faad14' }">
            <template #prefix>
              <warning-outlined />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="6">
          <a-statistic title="错误率" :value="metrics.errorRate" suffix="%" :value-style="{ color: '#ff4d4f' }">
            <template #prefix>
              <close-circle-outlined />
            </template>
          </a-statistic>
        </a-col>
      </a-row>
    </a-card>
    
    <a-row :gutter="24" style="margin-bottom: 24px;">
      <a-col :span="12">
        <a-card title="QPS 趋势">
          <div ref="qpsChart" class="chart-container"></div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="延迟分布">
          <div ref="latencyChart" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>
    
    <a-card title="服务实例详情">
      <a-table :columns="instanceColumns" :data-source="instanceList" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'healthy' ? 'green' : record.status === 'warning' ? 'orange' : 'red'">
              {{ record.status === 'healthy' ? '健康' : record.status === 'warning' ? '警告' : '异常' }}
            </a-tag>
          </template>
          
          <template v-else-if="column.key === 'cpu'">
            <a-progress :percent="parseInt(record.cpu)" :status="parseInt(record.cpu) > 80 ? 'exception' : parseInt(record.cpu) > 60 ? 'normal' : 'active'" :show-info="true" />
          </template>
          
          <template v-else-if="column.key === 'memory'">
            <a-progress :percent="parseInt(record.memory)" :status="parseInt(record.memory) > 80 ? 'exception' : parseInt(record.memory) > 60 ? 'normal' : 'active'" :show-info="true" />
          </template>
          
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="viewInstanceMetrics(record)">查看指标</a-button>
              <a-button type="link" size="small" @click="viewInstanceLogs(record)">查看日志</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
    
    <a-modal v-model:open="showInstanceMetrics" title="实例详细指标" :width="800">
      <div v-if="currentInstance">
        <a-descriptions :column="2" bordered style="margin-bottom: 24px;">
          <a-descriptions-item label="实例 IP">{{ currentInstance.ip }}</a-descriptions-item>
          <a-descriptions-item label="端口">{{ currentInstance.port }}</a-descriptions-item>
          <a-descriptions-item label="服务名称">{{ currentInstance.serviceName }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="currentInstance.status === 'healthy' ? 'green' : 'red'">
              {{ currentInstance.status === 'healthy' ? '健康' : '异常' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
        
        <div ref="instanceMetricsChart" style="width: 100%; height: 300px;"></div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import {
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  CloseCircleOutlined
} from '@ant-design/icons-vue'
import { topologyApi } from '../api'

const selectedService = ref('all')
const selectedTimeRange = ref('1h')
const refreshInterval = ref('0')
const qpsChart = ref(null)
const latencyChart = ref(null)
const instanceMetricsChart = ref(null)
let qpsChartInstance = null
let latencyChartInstance = null
let instanceMetricsChartInstance = null
let refreshTimer = null

const showInstanceMetrics = ref(false)
const currentInstance = ref(null)

const metrics = ref({
  qps: 1250,
  avgLatency: 25,
  p99Latency: 85,
  errorRate: 0.2
})

const instanceColumns = [
  { title: '实例 IP', dataIndex: 'ip', key: 'ip' },
  { title: '端口', dataIndex: 'port', key: 'port' },
  { title: '服务名称', dataIndex: 'serviceName', key: 'serviceName' },
  { title: '状态', key: 'status' },
  { title: 'QPS', dataIndex: 'qps', key: 'qps' },
  { title: 'CPU', key: 'cpu' },
  { title: '内存', key: 'memory' },
  { title: '操作', key: 'action' }
]

const instanceList = ref([
  { id: 1, ip: '10.0.0.1', port: 8080, serviceName: 'api-gateway', status: 'healthy', qps: 167, cpu: '45%', memory: '60%' },
  { id: 2, ip: '10.0.0.2', port: 8080, serviceName: 'api-gateway', status: 'healthy', qps: 166, cpu: '42%', memory: '58%' },
  { id: 3, ip: '10.0.0.3', port: 8080, serviceName: 'api-gateway', status: 'healthy', qps: 167, cpu: '48%', memory: '62%' },
  { id: 4, ip: '10.0.0.10', port: 8080, serviceName: 'user-service', status: 'healthy', qps: 125, cpu: '35%', memory: '45%' },
  { id: 5, ip: '10.0.0.11', port: 8080, serviceName: 'user-service', status: 'healthy', qps: 125, cpu: '38%', memory: '48%' },
  { id: 6, ip: '10.0.0.12', port: 8080, serviceName: 'user-service', status: 'healthy', qps: 125, cpu: '32%', memory: '42%' },
  { id: 7, ip: '10.0.0.20', port: 8080, serviceName: 'order-service', status: 'warning', qps: 100, cpu: '65%', memory: '78%' },
  { id: 8, ip: '10.0.0.21', port: 8080, serviceName: 'order-service', status: 'healthy', qps: 100, cpu: '68%', memory: '80%' },
  { id: 9, ip: '10.0.0.30', port: 8080, serviceName: 'payment-service', status: 'unhealthy', qps: 0, cpu: '90%', memory: '95%' },
  { id: 10, ip: '10.0.0.31', port: 8080, serviceName: 'payment-service', status: 'healthy', qps: 200, cpu: '85%', memory: '88%' }
])

const initQpsChart = () => {
  qpsChartInstance = echarts.init(qpsChart.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
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
      data: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00']
    },
    yAxis: {
      type: 'value',
      name: 'QPS'
    },
    series: [
      {
        name: 'QPS',
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3
        },
        data: [800, 600, 500, 400, 600, 1000, 1200, 1500, 1800, 1600, 1400, 1000, 800]
      }
    ]
  }
  
  qpsChartInstance.setOption(option)
}

const initLatencyChart = () => {
  latencyChartInstance = echarts.init(latencyChart.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['P50', 'P90', 'P99', 'P999']
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
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
    },
    yAxis: {
      type: 'value',
      name: '延迟(ms)'
    },
    series: [
      {
        name: 'P50',
        type: 'line',
        smooth: true,
        data: [15, 10, 20, 25, 30, 28, 20]
      },
      {
        name: 'P90',
        type: 'line',
        smooth: true,
        data: [25, 20, 35, 45, 55, 50, 35]
      },
      {
        name: 'P99',
        type: 'line',
        smooth: true,
        data: [50, 40, 70, 85, 95, 88, 65]
      },
      {
        name: 'P999',
        type: 'line',
        smooth: true,
        data: [100, 80, 150, 180, 200, 185, 130]
      }
    ]
  }
  
  latencyChartInstance.setOption(option)
}

const initInstanceMetricsChart = () => {
  if (!instanceMetricsChart.value) return
  
  instanceMetricsChartInstance = echarts.init(instanceMetricsChart.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['CPU', '内存', 'QPS']
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
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
    },
    yAxis: [
      {
        type: 'value',
        name: '使用率(%)',
        max: 100
      },
      {
        type: 'value',
        name: 'QPS',
        position: 'right'
      }
    ],
    series: [
      {
        name: 'CPU',
        type: 'line',
        smooth: true,
        data: [40, 35, 50, 60, 70, 65, 50],
        yAxisIndex: 0
      },
      {
        name: '内存',
        type: 'line',
        smooth: true,
        data: [55, 50, 60, 65, 75, 70, 60],
        yAxisIndex: 0
      },
      {
        name: 'QPS',
        type: 'line',
        smooth: true,
        data: [100, 80, 150, 180, 200, 185, 130],
        yAxisIndex: 1
      }
    ]
  }
  
  instanceMetricsChartInstance.setOption(option)
}

const onServiceChange = () => {
  refreshMetrics()
}

const refreshMetrics = () => {
  // 模拟刷新数据
  metrics.value.qps = Math.floor(Math.random() * 500) + 1000
  metrics.value.avgLatency = Math.floor(Math.random() * 20) + 20
  metrics.value.p99Latency = Math.floor(Math.random() * 50) + 70
  metrics.value.errorRate = (Math.random() * 0.5).toFixed(2)
  
  // 刷新图表
  if (qpsChartInstance) {
    qpsChartInstance.dispose()
  }
  if (latencyChartInstance) {
    latencyChartInstance.dispose()
  }
  initQpsChart()
  initLatencyChart()
}

const viewInstanceMetrics = (record) => {
  currentInstance.value = record
  showInstanceMetrics.value = true
  
  setTimeout(() => {
    initInstanceMetricsChart()
  }, 100)
}

const viewInstanceLogs = (record) => {
  console.log('查看实例日志:', record)
}

const startRefreshTimer = () => {
  if (refreshInterval.value !== '0') {
    refreshTimer = setInterval(() => {
      refreshMetrics()
    }, parseInt(refreshInterval.value) * 1000)
  }
}

const stopRefreshTimer = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const handleResize = () => {
  qpsChartInstance && qpsChartInstance.resize()
  latencyChartInstance && latencyChartInstance.resize()
  instanceMetricsChartInstance && instanceMetricsChartInstance.resize()
}

onMounted(() => {
  initQpsChart()
  initLatencyChart()
  window.addEventListener('resize', handleResize)
  
  if (refreshInterval.value !== '0') {
    startRefreshTimer()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  qpsChartInstance && qpsChartInstance.dispose()
  latencyChartInstance && latencyChartInstance.dispose()
  instanceMetricsChartInstance && instanceMetricsChartInstance.dispose()
  stopRefreshTimer()
})
</script>

<style scoped>
.metrics-page {
  width: 100%;
}

.filter-bar {
  padding: 16px;
  background: #f0f2f5;
  border-radius: 4px;
}
</style>
