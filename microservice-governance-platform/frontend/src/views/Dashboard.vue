<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2>系统概览</h2>
    </div>
    
    <div class="card-container">
      <a-card class="status-card">
        <div class="status-value status-success">{{ servicesCount }}</div>
        <div class="status-label">服务总数</div>
      </a-card>
      
      <a-card class="status-card">
        <div class="status-value status-success">{{ healthyCount }}</div>
        <div class="status-label">健康服务</div>
      </a-card>
      
      <a-card class="status-card">
        <div class="status-value status-warning">{{ warningCount }}</div>
        <div class="status-label">警告服务</div>
      </a-card>
      
      <a-card class="status-card">
        <div class="status-value status-error">{{ errorCount }}</div>
        <div class="status-label">异常服务</div>
      </a-card>
      
      <a-card class="status-card">
        <div class="status-value status-info">{{ qps }} req/s</div>
        <div class="status-label">系统 QPS</div>
      </a-card>
      
      <a-card class="status-card">
        <div class="status-value status-info">{{ errorRate }}%</div>
        <div class="status-label">系统错误率</div>
      </a-card>
    </div>
    
    <a-row :gutter="24" style="margin-bottom: 24px;">
      <a-col :span="12">
        <a-card title="服务状态分布">
          <div ref="statusChart" class="chart-container"></div>
        </a-card>
      </a-col>
      
      <a-col :span="12">
        <a-card title="流量趋势">
          <div ref="trafficChart" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>
    
    <a-card title="最近部署记录">
      <a-table :columns="deployColumns" :data-source="deployList" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'success' ? 'green' : record.status === 'failed' ? 'red' : 'orange'">
              {{ record.status === 'success' ? '成功' : record.status === 'failed' ? '失败' : '进行中' }}
            </a-tag>
          </template>
          
          <template v-else-if="column.key === 'type'">
            <a-tag color="blue">{{ record.type === 'canary' ? '金丝雀发布' : '蓝绿部署' }}</a-tag>
          </template>
          
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="viewDeploy(record)">查看详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { topologyApi } from '../api'

const servicesCount = ref(12)
const healthyCount = ref(10)
const warningCount = ref(1)
const errorCount = ref(1)
const qps = ref(1250)
const errorRate = ref(0.2)

const statusChart = ref(null)
const trafficChart = ref(null)
let statusChartInstance = null
let trafficChartInstance = null

const deployColumns = [
  { title: '服务名称', dataIndex: 'serviceName', key: 'serviceName' },
  { title: '版本', dataIndex: 'version', key: 'version' },
  { title: '类型', key: 'type' },
  { title: '状态', key: 'status' },
  { title: '时间', dataIndex: 'time', key: 'time' },
  { title: '操作', key: 'action' }
]

const deployList = ref([
  { id: 1, serviceName: 'user-service', version: 'v2.0.1', type: 'canary', status: 'success', time: '2026-05-05 14:30:00' },
  { id: 2, serviceName: 'order-service', version: 'v1.5.0', type: 'bluegreen', status: 'running', time: '2026-05-05 15:00:00' },
  { id: 3, serviceName: 'payment-service', version: 'v3.2.0', type: 'canary', status: 'failed', time: '2026-05-05 13:45:00' }
])

const viewDeploy = (record) => {
  console.log('查看部署详情:', record)
}

const initStatusChart = () => {
  statusChartInstance = echarts.init(statusChart.value)
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '服务状态',
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
          { value: 10, name: '健康', itemStyle: { color: '#52c41a' } },
          { value: 1, name: '警告', itemStyle: { color: '#faad14' } },
          { value: 1, name: '异常', itemStyle: { color: '#ff4d4f' } }
        ]
      }
    ]
  }
  
  statusChartInstance.setOption(option)
}

const initTrafficChart = () => {
  trafficChartInstance = echarts.init(trafficChart.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['QPS', '延迟']
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
        name: 'QPS',
        position: 'left'
      },
      {
        type: 'value',
        name: '延迟(ms)',
        position: 'right'
      }
    ],
    series: [
      {
        name: 'QPS',
        type: 'line',
        smooth: true,
        data: [800, 500, 1200, 1500, 1800, 1600, 1200],
        yAxisIndex: 0
      },
      {
        name: '延迟',
        type: 'line',
        smooth: true,
        data: [20, 15, 30, 35, 40, 38, 32],
        yAxisIndex: 1
      }
    ]
  }
  
  trafficChartInstance.setOption(option)
}

const handleResize = () => {
  statusChartInstance && statusChartInstance.resize()
  trafficChartInstance && trafficChartInstance.resize()
}

onMounted(() => {
  initStatusChart()
  initTrafficChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  statusChartInstance && statusChartInstance.dispose()
  trafficChartInstance && trafficChartInstance.dispose()
})
</script>

<style scoped>
.dashboard-page {
  width: 100%;
}
</style>
