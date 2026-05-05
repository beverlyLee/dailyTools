<template>
  <div class="topology-page">
    <div class="page-header">
      <h2>服务拓扑视图</h2>
    </div>
    
    <div class="topology-toolbar" style="margin-bottom: 16px;">
      <a-space>
        <a-select v-model:value="selectedNamespace" style="width: 200px;" placeholder="选择命名空间">
          <a-select-option value="default">default</a-select-option>
          <a-select-option value="prod">prod</a-select-option>
          <a-select-option value="test">test</a-select-option>
        </a-select>
        
        <a-select v-model:value="selectedTimeRange" style="width: 150px;" placeholder="时间范围">
          <a-select-option value="1h">最近 1 小时</a-select-option>
          <a-select-option value="6h">最近 6 小时</a-select-option>
          <a-select-option value="24h">最近 24 小时</a-select-option>
        </a-select>
        
        <a-button type="primary" @click="refreshTopology">
          <reload-outlined /> 刷新
        </a-button>
      </a-space>
    </div>
    
    <div class="topology-container" style="height: 600px;">
      <div ref="topologyChart" style="width: 100%; height: 100%;"></div>
    </div>
    
    <a-modal
      v-model:open="showServiceDetail"
      title="服务详情"
      :width="800"
      :footer="null"
    >
      <div v-if="selectedService" class="service-detail">
        <a-descriptions :column="3" bordered>
          <a-descriptions-item label="服务名称">{{ selectedService.name }}</a-descriptions-item>
          <a-descriptions-item label="命名空间">{{ selectedService.namespace }}</a-descriptions-item>
          <a-descriptions-item label="版本">{{ selectedService.version }}</a-descriptions-item>
          <a-descriptions-item label="实例数">{{ selectedService.instances }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="selectedService.status === 'healthy' ? 'green' : selectedService.status === 'warning' ? 'orange' : 'red'">
              {{ selectedService.status === 'healthy' ? '健康' : selectedService.status === 'warning' ? '警告' : '异常' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ selectedService.updateTime }}</a-descriptions-item>
        </a-descriptions>
        
        <a-tabs v-model:activeKey="activeDetailTab" style="margin-top: 24px;">
          <a-tab-pane key="metrics" tab="服务指标">
            <div ref="metricsChart" style="width: 100%; height: 300px;"></div>
          </a-tab-pane>
          <a-tab-pane key="dependencies" tab="依赖关系">
            <a-row :gutter="16">
              <a-col :span="12">
                <h4>上游服务</h4>
                <a-table :columns="upstreamColumns" :data-source="selectedService.upstream" :pagination="false" size="small" />
              </a-col>
              <a-col :span="12">
                <h4>下游服务</h4>
                <a-table :columns="downstreamColumns" :data-source="selectedService.downstream" :pagination="false" size="small" />
              </a-col>
            </a-row>
          </a-tab-pane>
          <a-tab-pane key="instances" tab="实例列表">
            <a-table :columns="instanceColumns" :data-source="selectedService.instanceList" :pagination="false" />
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { topologyApi } from '../api'

const selectedNamespace = ref('default')
const selectedTimeRange = ref('1h')
const topologyChart = ref(null)
const metricsChart = ref(null)
let topologyChartInstance = null
let metricsChartInstance = null

const showServiceDetail = ref(false)
const selectedService = ref(null)
const activeDetailTab = ref('metrics')

const upstreamColumns = [
  { title: '服务名称', dataIndex: 'name', key: 'name' },
  { title: 'QPS', dataIndex: 'qps', key: 'qps' },
  { title: '错误率', dataIndex: 'errorRate', key: 'errorRate' },
  { title: '延迟(ms)', dataIndex: 'latency', key: 'latency' }
]

const downstreamColumns = [
  { title: '服务名称', dataIndex: 'name', key: 'name' },
  { title: 'QPS', dataIndex: 'qps', key: 'qps' },
  { title: '错误率', dataIndex: 'errorRate', key: 'errorRate' },
  { title: '延迟(ms)', dataIndex: 'latency', key: 'latency' }
]

const instanceColumns = [
  { title: '实例 IP', dataIndex: 'ip', key: 'ip' },
  { title: '端口', dataIndex: 'port', key: 'port' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: 'QPS', dataIndex: 'qps', key: 'qps' },
  { title: 'CPU', dataIndex: 'cpu', key: 'cpu' },
  { title: '内存', dataIndex: 'memory', key: 'memory' }
]

// 模拟的服务拓扑数据
const getMockTopologyData = () => {
  return {
    nodes: [
      { id: 'gateway', name: 'api-gateway', status: 'healthy', category: 'gateway' },
      { id: 'user', name: 'user-service', status: 'healthy', category: 'service' },
      { id: 'order', name: 'order-service', status: 'warning', category: 'service' },
      { id: 'payment', name: 'payment-service', status: 'unhealthy', category: 'service' },
      { id: 'product', name: 'product-service', status: 'healthy', category: 'service' },
      { id: 'user-db', name: 'user-db', status: 'healthy', category: 'db' },
      { id: 'order-db', name: 'order-db', status: 'healthy', category: 'db' }
    ],
    edges: [
      { source: 'gateway', target: 'user', latency: 15, qps: 500 },
      { source: 'gateway', target: 'order', latency: 25, qps: 300 },
      { source: 'gateway', target: 'product', latency: 10, qps: 400 },
      { source: 'user', target: 'user-db', latency: 5, qps: 500 },
      { source: 'order', target: 'payment', latency: 30, qps: 200 },
      { source: 'order', target: 'order-db', latency: 8, qps: 300 },
      { source: 'payment', target: 'order-db', latency: 12, qps: 200 }
    ]
  }
}

const getServiceDetail = (serviceId) => {
  const details = {
    gateway: {
      name: 'api-gateway',
      namespace: 'default',
      version: 'v1.0.0',
      instances: 3,
      status: 'healthy',
      updateTime: '2026-05-05 15:30:00',
      upstream: [],
      downstream: [
        { name: 'user-service', qps: 500, errorRate: '0.1%', latency: 15 },
        { name: 'order-service', qps: 300, errorRate: '1.2%', latency: 25 },
        { name: 'product-service', qps: 400, errorRate: '0.05%', latency: 10 }
      ],
      instanceList: [
        { ip: '10.0.0.1', port: 8080, status: 'healthy', qps: 167, cpu: '45%', memory: '512MB' },
        { ip: '10.0.0.2', port: 8080, status: 'healthy', qps: 166, cpu: '42%', memory: '498MB' },
        { ip: '10.0.0.3', port: 8080, status: 'healthy', qps: 167, cpu: '48%', memory: '520MB' }
      ]
    },
    user: {
      name: 'user-service',
      namespace: 'default',
      version: 'v2.0.1',
      instances: 4,
      status: 'healthy',
      updateTime: '2026-05-05 14:30:00',
      upstream: [
        { name: 'api-gateway', qps: 500, errorRate: '0.1%', latency: 15 }
      ],
      downstream: [
        { name: 'user-db', qps: 500, errorRate: '0.01%', latency: 5 }
      ],
      instanceList: [
        { ip: '10.0.0.10', port: 8080, status: 'healthy', qps: 125, cpu: '35%', memory: '384MB' },
        { ip: '10.0.0.11', port: 8080, status: 'healthy', qps: 125, cpu: '38%', memory: '398MB' },
        { ip: '10.0.0.12', port: 8080, status: 'healthy', qps: 125, cpu: '32%', memory: '372MB' },
        { ip: '10.0.0.13', port: 8080, status: 'healthy', qps: 125, cpu: '36%', memory: '390MB' }
      ]
    },
    order: {
      name: 'order-service',
      namespace: 'default',
      version: 'v1.5.0',
      instances: 3,
      status: 'warning',
      updateTime: '2026-05-05 15:00:00',
      upstream: [
        { name: 'api-gateway', qps: 300, errorRate: '1.2%', latency: 25 }
      ],
      downstream: [
        { name: 'payment-service', qps: 200, errorRate: '5.0%', latency: 30 },
        { name: 'order-db', qps: 300, errorRate: '0.02%', latency: 8 }
      ],
      instanceList: [
        { ip: '10.0.0.20', port: 8080, status: 'healthy', qps: 100, cpu: '65%', memory: '768MB' },
        { ip: '10.0.0.21', port: 8080, status: 'healthy', qps: 100, cpu: '68%', memory: '780MB' },
        { ip: '10.0.0.22', port: 8080, status: 'healthy', qps: 100, cpu: '62%', memory: '752MB' }
      ]
    },
    payment: {
      name: 'payment-service',
      namespace: 'default',
      version: 'v3.2.0',
      instances: 2,
      status: 'unhealthy',
      updateTime: '2026-05-05 13:45:00',
      upstream: [
        { name: 'order-service', qps: 200, errorRate: '5.0%', latency: 30 }
      ],
      downstream: [
        { name: 'order-db', qps: 200, errorRate: '3.5%', latency: 12 }
      ],
      instanceList: [
        { ip: '10.0.0.30', port: 8080, status: 'unhealthy', qps: 0, cpu: '90%', memory: '1GB' },
        { ip: '10.0.0.31', port: 8080, status: 'healthy', qps: 200, cpu: '85%', memory: '980MB' }
      ]
    },
    product: {
      name: 'product-service',
      namespace: 'default',
      version: 'v1.0.0',
      instances: 3,
      status: 'healthy',
      updateTime: '2026-05-05 12:00:00',
      upstream: [
        { name: 'api-gateway', qps: 400, errorRate: '0.05%', latency: 10 }
      ],
      downstream: [],
      instanceList: [
        { ip: '10.0.0.40', port: 8080, status: 'healthy', qps: 134, cpu: '25%', memory: '256MB' },
        { ip: '10.0.0.41', port: 8080, status: 'healthy', qps: 133, cpu: '28%', memory: '260MB' },
        { ip: '10.0.0.42', port: 8080, status: 'healthy', qps: 133, cpu: '26%', memory: '258MB' }
      ]
    },
    'user-db': {
      name: 'user-db',
      namespace: 'default',
      version: 'MySQL 8.0',
      instances: 2,
      status: 'healthy',
      updateTime: '2026-05-05 15:30:00',
      upstream: [
        { name: 'user-service', qps: 500, errorRate: '0.01%', latency: 5 }
      ],
      downstream: [],
      instanceList: [
        { ip: '10.0.0.50', port: 3306, status: 'healthy', qps: 250, cpu: '40%', memory: '4GB' },
        { ip: '10.0.0.51', port: 3306, status: 'healthy', qps: 250, cpu: '38%', memory: '3.8GB' }
      ]
    },
    'order-db': {
      name: 'order-db',
      namespace: 'default',
      version: 'PostgreSQL 14',
      instances: 3,
      status: 'healthy',
      updateTime: '2026-05-05 15:30:00',
      upstream: [
        { name: 'order-service', qps: 300, errorRate: '0.02%', latency: 8 },
        { name: 'payment-service', qps: 200, errorRate: '3.5%', latency: 12 }
      ],
      downstream: [],
      instanceList: [
        { ip: '10.0.0.60', port: 5432, status: 'healthy', qps: 167, cpu: '45%', memory: '6GB' },
        { ip: '10.0.0.61', port: 5432, status: 'healthy', qps: 166, cpu: '42%', memory: '5.8GB' },
        { ip: '10.0.0.62', port: 5432, status: 'healthy', qps: 167, cpu: '48%', memory: '5.9GB' }
      ]
    }
  }
  
  return details[serviceId]
}

const initTopologyChart = () => {
  topologyChartInstance = echarts.init(topologyChart.value)
  
  const data = getMockTopologyData()
  
  const categories = [
    { name: 'gateway' },
    { name: 'service' },
    { name: 'db' }
  ]
  
  const nodes = data.nodes.map(node => ({
    id: node.id,
    name: node.name,
    category: categories.findIndex(c => c.name === node.category),
    symbolSize: 40,
    itemStyle: {
      color: node.status === 'healthy' ? '#52c41a' : node.status === 'warning' ? '#faad14' : '#ff4d4f'
    },
    label: {
      show: true,
      formatter: node.name
    }
  }))
  
  const edges = data.edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    value: edge.latency,
    lineStyle: {
      width: Math.min(edge.qps / 100, 10)
    },
    label: {
      show: true,
      formatter: `${edge.latency}ms`
    }
  }))
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.dataType === 'edge') {
          return `
            来源: ${params.data.source}<br/>
            目标: ${params.data.target}<br/>
            延迟: ${params.data.value}ms<br/>
            QPS: ${params.data.lineStyle.width * 100}
          `
        }
        return `
          服务: ${params.data.name}<br/>
          状态: ${params.data.itemStyle.color === '#52c41a' ? '健康' : params.data.itemStyle.color === '#faad14' ? '警告' : '异常'}
        `
      }
    },
    legend: {
      data: ['gateway', 'service', 'db'],
      formatter: (name) => {
        const names = { gateway: '网关', service: '服务', db: '数据库' }
        return names[name]
      }
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        animation: true,
        label: {
          position: 'bottom',
          fontSize: 12
        },
        draggable: true,
        data: nodes,
        categories: categories,
        force: {
          edgeLength: 120,
          repulsion: 400,
          gravity: 0.1
        },
        edges: edges,
        lineStyle: {
          opacity: 0.9,
          curveness: 0.2
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 5
          }
        }
      }
    ]
  }
  
  topologyChartInstance.setOption(option)
  
  topologyChartInstance.on('click', (params) => {
    if (params.dataType === 'node') {
      showServiceDetailModal(params.data.id)
    }
  })
}

const showServiceDetailModal = (serviceId) => {
  selectedService.value = getServiceDetail(serviceId)
  showServiceDetail.value = true
  
  setTimeout(() => {
    initMetricsChart()
  }, 100)
}

const initMetricsChart = () => {
  if (!metricsChart.value) return
  
  metricsChartInstance = echarts.init(metricsChart.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['QPS', '错误率', '延迟']
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
        name: '错误率(%)',
        position: 'right',
        max: 10
      },
      {
        type: 'value',
        name: '延迟(ms)',
        position: 'right',
        offset: 60
      }
    ],
    series: [
      {
        name: 'QPS',
        type: 'line',
        smooth: true,
        data: [400, 300, 500, 600, 700, 650, 500],
        yAxisIndex: 0
      },
      {
        name: '错误率',
        type: 'line',
        smooth: true,
        data: [0.1, 0.05, 0.2, 0.15, 0.3, 0.25, 0.1],
        yAxisIndex: 1
      },
      {
        name: '延迟',
        type: 'line',
        smooth: true,
        data: [15, 10, 20, 25, 30, 28, 20],
        yAxisIndex: 2
      }
    ]
  }
  
  metricsChartInstance.setOption(option)
}

const refreshTopology = () => {
  // 重新加载拓扑图
  if (topologyChartInstance) {
    topologyChartInstance.dispose()
  }
  initTopologyChart()
}

const handleResize = () => {
  topologyChartInstance && topologyChartInstance.resize()
  metricsChartInstance && metricsChartInstance.resize()
}

onMounted(() => {
  initTopologyChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  topologyChartInstance && topologyChartInstance.dispose()
  metricsChartInstance && metricsChartInstance.dispose()
})
</script>

<style scoped>
.topology-page {
  width: 100%;
}

.topology-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
