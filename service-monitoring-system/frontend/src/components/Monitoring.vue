<template>
  <div class="monitoring">
    <h2 class="page-title">系统监控</h2>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">CPU 使用率趋势</div>
        <div ref="cpuChart" class="chart-container"></div>
      </div>

      <div class="card">
        <div class="card-header">内存使用率趋势</div>
        <div ref="memoryChart" class="chart-container"></div>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">服务状态详情</div>
      <table class="table">
        <thead>
          <tr>
            <th>服务名称</th>
            <th>状态</th>
            <th>最后检查时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="service in services" :key="service.name">
            <td>{{ service.name }}</td>
            <td>
              <span :class="getStatusBadge(service.status)">
                {{ service.status }}
              </span>
            </td>
            <td>{{ service.lastCheck }}</td>
            <td>
              <button class="btn btn-outline btn-sm" @click="checkService(service.name)">
                检查
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">Prometheus 指标</div>
      <div class="metrics-info">
        <p><strong>指标端点：</strong><code>/metrics</code></p>
        <p><strong>采集频率：</strong>30 秒</p>
        <div class="metrics-list">
          <div class="metric-item">
            <code>system_cpu_usage_percent</code> - 当前 CPU 使用率百分比
          </div>
          <div class="metric-item">
            <code>system_memory_usage_percent</code> - 当前内存使用率百分比
          </div>
          <div class="metric-item">
            <code>service_status</code> - 监控服务的状态
          </div>
          <div class="metric-item">
            <code>http_probe_status</code> - HTTP 黑盒探测状态
          </div>
          <div class="metric-item">
            <code>tcp_probe_status</code> - TCP 黑盒探测状态
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ServiceStatus } from '../lib/api'

interface ServiceDetail extends ServiceStatus {
  lastCheck: string
}

const cpuChart = ref<HTMLElement>()
const memoryChart = ref<HTMLElement>()

const services = ref<ServiceDetail[]>([
  { name: 'api-gateway', status: 'healthy', lastCheck: '2024-01-15 10:30:00' },
  { name: 'user-service', status: 'healthy', lastCheck: '2024-01-15 10:30:00' },
  { name: 'order-service', status: 'warning', lastCheck: '2024-01-15 10:30:00' },
  { name: 'payment-service', status: 'healthy', lastCheck: '2024-01-15 10:30:00' },
  { name: 'notification-service', status: 'healthy', lastCheck: '2024-01-15 10:30:00' }
])

let cpuChartInstance: echarts.ECharts | null = null
let memoryChartInstance: echarts.ECharts | null = null
let updateInterval: number | null = null

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'badge badge-success'
    case 'warning':
      return 'badge badge-warning'
    case 'critical':
    case 'failed':
      return 'badge badge-danger'
    default:
      return 'badge badge-secondary'
  }
}

const initCharts = () => {
  if (cpuChart.value) {
    cpuChartInstance = echarts.init(cpuChart.value)
    cpuChartInstance.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30']
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: [25, 30, 35, 40, 45, 42, 45.5],
          areaStyle: {
            opacity: 0.3
          },
          itemStyle: {
            color: '#3b82f6'
          }
        }
      ],
      markLine: {
        data: [{ yAxis: 80, name: '警戒线' }]
      }
    })
  }

  if (memoryChart.value) {
    memoryChartInstance = echarts.init(memoryChart.value)
    memoryChartInstance.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30']
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: [55, 57, 59, 61, 60, 58, 60.2],
          areaStyle: {
            opacity: 0.3
          },
          itemStyle: {
            color: '#10b981'
          }
        }
      ]
    })
  }
}

const checkService = (name: string) => {
  const now = new Date().toLocaleString('zh-CN')
  const service = services.value.find(s => s.name === name)
  if (service) {
    service.lastCheck = now
    service.status = Math.random() > 0.2 ? 'healthy' : 'warning'
  }
}

const updateCharts = () => {
  if (!cpuChartInstance || !memoryChartInstance) return

  const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  
  const cpuOption = cpuChartInstance.getOption()
  const cpuData = cpuOption.series[0].data.slice(1)
  cpuData.push(Math.floor(Math.random() * 30) + 35)
  
  const xData = cpuOption.xAxis[0].data.slice(1)
  xData.push(now)

  cpuChartInstance.setOption({
    xAxis: [{ data: xData }],
    series: [{ data: cpuData }]
  })

  const memoryOption = memoryChartInstance.getOption()
  const memoryData = memoryOption.series[0].data.slice(1)
  memoryData.push(Math.floor(Math.random() * 20) + 50)

  memoryChartInstance.setOption({
    xAxis: [{ data: xData }],
    series: [{ data: memoryData }]
  })
}

onMounted(() => {
  initCharts()
  
  updateInterval = window.setInterval(() => {
    updateCharts()
  }, 5000)

  const handleResize = () => {
    cpuChartInstance?.resize()
    memoryChartInstance?.resize()
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  cpuChartInstance?.dispose()
  memoryChartInstance?.dispose()
})
</script>

<style scoped>
.monitoring {
  max-width: 100%;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1f2937;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.metrics-info {
  line-height: 1.8;
}

.metrics-info code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.metrics-list {
  margin-top: 1rem;
  padding-left: 1rem;
}

.metric-item {
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
  border-left: 3px solid #3b82f6;
}
</style>
