<template>
  <div class="dashboard">
    <h2 class="page-title">系统仪表盘</h2>

    <div class="grid grid-4">
      <div class="stat-card blue">
        <div class="stat-value">{{ stats.totalServices }}</div>
        <div class="stat-label">监控服务数</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">{{ stats.healthyServices }}</div>
        <div class="stat-label">健康服务</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-value">{{ stats.totalFaults }}</div>
        <div class="stat-label">故障记录</div>
      </div>
      <div class="stat-card red" v-if="stats.pendingApprovals > 0">
        <div class="stat-value">{{ stats.pendingApprovals }}</div>
        <div class="stat-label">待审批</div>
      </div>
      <div class="stat-card" v-else>
        <div class="stat-value">0</div>
        <div class="stat-label">待审批</div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top: 2rem;">
      <div class="card">
        <div class="card-header">系统资源使用率</div>
        <div ref="resourceChart" class="chart-container"></div>
      </div>

      <div class="card">
        <div class="card-header">服务状态分布</div>
        <div ref="serviceChart" class="chart-container"></div>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top: 2rem;">
      <div class="card">
        <div class="card-header">服务列表</div>
        <table class="table">
          <thead>
            <tr>
              <th>服务名称</th>
              <th>状态</th>
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
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header">黑盒探测状态</div>
        <table class="table">
          <thead>
            <tr>
              <th>探测名称</th>
              <th>类型</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="probe in probes" :key="probe.name">
              <td>{{ probe.name }}</td>
              <td><span class="badge badge-info">{{ probe.type }}</span></td>
              <td>
                <span :class="getStatusBadge(probe.status)">
                  {{ probe.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">自愈系统状态</div>
      <div class="grid grid-3">
        <div>
          <strong>灰度自愈：</strong>
          <span :class="selfHealing.grayscale_enabled ? 'badge badge-info' : 'badge badge-secondary'">
            {{ selfHealing.grayscale_enabled ? '已启用' : '未启用' }}
          </span>
        </div>
        <div>
          <strong>人工审批：</strong>
          <span :class="selfHealing.approval_enabled ? 'badge badge-warning' : 'badge badge-secondary'">
            {{ selfHealing.approval_enabled ? '已启用' : '未启用' }}
          </span>
        </div>
        <div>
          <strong>可用脚本：</strong>
          <span class="badge badge-success">{{ selfHealing.repair_scripts }} 个</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { monitoringApi, type MetricsData, type ServiceStatus, type ProbeStatus } from '../lib/api'

const resourceChart = ref<HTMLElement>()
const serviceChart = ref<HTMLElement>()

const metrics = ref<MetricsData>({
  cpu_usage: 45.5,
  memory_usage: 60.2,
  services: [],
  probes: []
})

const services = ref<ServiceStatus[]>([
  { name: 'api-gateway', status: 'healthy' },
  { name: 'user-service', status: 'healthy' },
  { name: 'order-service', status: 'warning' }
])

const probes = ref<ProbeStatus[]>([
  { name: 'example-http', type: 'http', status: 'healthy' },
  { name: 'example-tcp', type: 'tcp', status: 'healthy' }
])

const selfHealing = ref({
  total_faults: 0,
  pending_approvals: 0,
  active_fault_scenarios: 5,
  repair_scripts: 3,
  grayscale_enabled: false,
  approval_enabled: true
})

const stats = computed(() => ({
  totalServices: services.value.length,
  healthyServices: services.value.filter(s => s.status === 'healthy').length,
  totalFaults: selfHealing.value.total_faults,
  pendingApprovals: selfHealing.value.pending_approvals
}))

import { computed } from 'vue'

let resourceChartInstance: echarts.ECharts | null = null
let serviceChartInstance: echarts.ECharts | null = null
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
  if (resourceChart.value) {
    resourceChartInstance = echarts.init(resourceChart.value)
    updateResourceChart()
  }

  if (serviceChart.value) {
    serviceChartInstance = echarts.init(serviceChart.value)
    updateServiceChart()
  }
}

const updateResourceChart = () => {
  if (!resourceChartInstance) return

  resourceChartInstance.setOption({
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['CPU使用率', '内存使用率']
    },
    xAxis: {
      type: 'category',
      data: ['0s', '10s', '20s', '30s', '40s', '50s', '60s']
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
        name: 'CPU使用率',
        type: 'line',
        smooth: true,
        data: [30, 35, 40, 45, 42, 38, metrics.value.cpu_usage],
        areaStyle: {
          opacity: 0.3
        }
      },
      {
        name: '内存使用率',
        type: 'line',
        smooth: true,
        data: [55, 58, 60, 62, 61, 59, metrics.value.memory_usage],
        areaStyle: {
          opacity: 0.3
        }
      }
    ]
  })
}

const updateServiceChart = () => {
  if (!serviceChartInstance) return

  const healthy = services.value.filter(s => s.status === 'healthy').length
  const warning = services.value.filter(s => s.status === 'warning').length
  const critical = services.value.filter(s => s.status === 'critical' || s.status === 'failed').length

  serviceChartInstance.setOption({
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: healthy, name: '健康', itemStyle: { color: '#10b981' } },
          { value: warning, name: '警告', itemStyle: { color: '#f59e0b' } },
          { value: critical, name: '异常', itemStyle: { color: '#ef4444' } }
        ]
      }
    ]
  })
}

const fetchData = async () => {
  try {
    const response = await monitoringApi.getDashboard()
    const data = response.data
    metrics.value = data.metrics
    services.value = data.metrics.services || services.value
    probes.value = data.metrics.probes || probes.value
    selfHealing.value = data.selfHealing

    updateResourceChart()
    updateServiceChart()
  } catch (error) {
    console.log('使用模拟数据')
  }
}

onMounted(() => {
  initCharts()
  fetchData()
  
  updateInterval = window.setInterval(() => {
    fetchData()
  }, 5000)

  const handleResize = () => {
    resourceChartInstance?.resize()
    serviceChartInstance?.resize()
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  resourceChartInstance?.dispose()
  serviceChartInstance?.dispose()
})
</script>

<style scoped>
.dashboard {
  max-width: 100%;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1f2937;
}
</style>
