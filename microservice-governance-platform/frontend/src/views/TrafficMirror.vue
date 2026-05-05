<template>
  <div class="traffic-page">
    <div class="page-header">
      <h2>流量镜像</h2>
    </div>
    
    <div class="toolbar" style="margin-bottom: 16px;">
      <a-button type="primary" @click="showCreateModal = true">
        <plus-outlined /> 新建规则
      </a-button>
    </div>
    
    <a-card>
      <a-table :columns="columns" :data-source="mirrorRules" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'enabled' ? 'green' : 'default'">
              {{ record.status === 'enabled' ? '已启用' : '已禁用' }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'mirrorPercent'">
            <a-progress :percent="record.mirrorPercent" status="active" />
          </template>
          
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="toggleStatus(record)">
                {{ record.status === 'enabled' ? '禁用' : '启用' }}
              </a-button>
              <a-button type="link" size="small" @click="viewDetail(record)">查看详情</a-button>
              <a-button type="link" size="small" danger @click="deleteRule(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
    
    <a-modal
      v-model:open="showCreateModal"
      title="新建流量镜像规则"
      :width="800"
      @ok="handleCreate"
      @cancel="showCreateModal = false"
    >
      <a-form :model="formData" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="源服务">
          <a-select v-model:value="formData.sourceService" style="width: 100%;">
            <a-select-option value="api-gateway">api-gateway</a-select-option>
            <a-select-option value="user-service">user-service</a-select-option>
            <a-select-option value="order-service">order-service</a-select-option>
            <a-select-option value="payment-service">payment-service</a-select-option>
            <a-select-option value="product-service">product-service</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="目标服务">
          <a-select v-model:value="formData.targetService" style="width: 100%;">
            <a-select-option value="user-service-v2">user-service-v2</a-select-option>
            <a-select-option value="order-service-v2">order-service-v2</a-select-option>
            <a-select-option value="payment-service-v2">payment-service-v2</a-select-option>
            <a-select-option value="product-service-v2">product-service-v2</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="镜像比例">
          <a-slider v-model:value="formData.mirrorPercent" :min="0" :max="100" />
          <span style="margin-left: 8px;">{{ formData.mirrorPercent }}%</span>
        </a-form-item>
        
        <a-form-item label="镜像类型">
          <a-radio-group v-model:value="formData.mirrorType">
            <a-radio value="all">全部请求</a-radio>
            <a-radio value="path">按路径匹配</a-radio>
            <a-radio value="header">按请求头匹配</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item v-if="formData.mirrorType === 'path'" label="路径匹配">
          <a-input v-model:value="formData.pathPattern" placeholder="例如: /api/v1/* 或 /api/v2/.*" />
        </a-form-item>
        
        <a-form-item v-if="formData.mirrorType === 'header'" label="请求头匹配">
          <a-input v-model:value="formData.headerPattern" placeholder="例如: x-test=true" />
        </a-form-item>
        
        <a-form-item label="超时设置">
          <a-input-number v-model:value="formData.timeout" style="width: 200px;" />
          <span style="margin-left: 8px;">毫秒</span>
        </a-form-item>
        
        <a-form-item label="是否异步">
          <a-switch v-model:checked="formData.async" />
          <span style="margin-left: 8px;">异步镜像不等待目标响应</span>
        </a-form-item>
        
        <a-form-item label="描述">
          <a-textarea v-model:value="formData.description" :rows="3" placeholder="规则描述" />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <a-modal
      v-model:open="showDetailModal"
      title="流量镜像规则详情"
      :width="900"
      :footer="null"
    >
      <div v-if="currentRule">
        <a-descriptions :column="2" bordered style="margin-bottom: 24px;">
          <a-descriptions-item label="源服务">{{ currentRule.sourceService }}</a-descriptions-item>
          <a-descriptions-item label="目标服务">{{ currentRule.targetService }}</a-descriptions-item>
          <a-descriptions-item label="镜像比例">
            <a-progress :percent="currentRule.mirrorPercent" status="active" />
          </a-descriptions-item>
          <a-descriptions-item label="镜像类型">
            {{ currentRule.mirrorType === 'all' ? '全部请求' : currentRule.mirrorType === 'path' ? '按路径匹配' : '按请求头匹配' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="currentRule.mirrorType === 'path'" label="路径匹配">
            {{ currentRule.pathPattern }}
          </a-descriptions-item>
          <a-descriptions-item v-if="currentRule.mirrorType === 'header'" label="请求头匹配">
            {{ currentRule.headerPattern }}
          </a-descriptions-item>
          <a-descriptions-item label="超时设置">{{ currentRule.timeout }} 毫秒</a-descriptions-item>
          <a-descriptions-item label="是否异步">
            <a-tag :color="currentRule.async ? 'blue' : 'default'">
              {{ currentRule.async ? '是' : '否' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="currentRule.status === 'enabled' ? 'green' : 'default'">
              {{ currentRule.status === 'enabled' ? '已启用' : '已禁用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ currentRule.createTime }}</a-descriptions-item>
        </a-descriptions>
        
        <h4>镜像统计</h4>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="总请求数" :value="currentRule.stats.totalRequests" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="已镜像" :value="currentRule.stats.mirroredRequests" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="成功响应" :value="currentRule.stats.successResponses" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="失败响应" :value="currentRule.stats.failedResponses" />
          </a-col>
        </a-row>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { trafficApi } from '../api'

const showCreateModal = ref(false)
const showDetailModal = ref(false)
const currentRule = ref(null)

const columns = [
  { title: '源服务', dataIndex: 'sourceService', key: 'sourceService' },
  { title: '目标服务', dataIndex: 'targetService', key: 'targetService' },
  { title: '镜像比例', key: 'mirrorPercent' },
  { title: '镜像类型', dataIndex: 'mirrorType', key: 'mirrorType', render: (type) => {
    const types = { all: '全部请求', path: '按路径匹配', header: '按请求头匹配' }
    return types[type] || type
  }},
  { title: '状态', key: 'status' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', key: 'action', width: 200 }
]

const mirrorRules = ref([
  {
    id: 1,
    sourceService: 'api-gateway',
    targetService: 'user-service-v2',
    mirrorPercent: 10,
    mirrorType: 'all',
    pathPattern: '',
    headerPattern: '',
    timeout: 500,
    async: true,
    status: 'enabled',
    description: '用户服务新版本流量镜像测试',
    createTime: '2026-05-01 10:00:00',
    stats: {
      totalRequests: 50000,
      mirroredRequests: 5000,
      successResponses: 4800,
      failedResponses: 200
    }
  },
  {
    id: 2,
    sourceService: 'order-service',
    targetService: 'order-service-v2',
    mirrorPercent: 20,
    mirrorType: 'path',
    pathPattern: '/api/v1/orders/*',
    headerPattern: '',
    timeout: 1000,
    async: false,
    status: 'enabled',
    description: '订单服务按路径流量镜像',
    createTime: '2026-05-03 14:30:00',
    stats: {
      totalRequests: 30000,
      mirroredRequests: 6000,
      successResponses: 5900,
      failedResponses: 100
    }
  },
  {
    id: 3,
    sourceService: 'payment-service',
    targetService: 'payment-service-v2',
    mirrorPercent: 5,
    mirrorType: 'header',
    pathPattern: '',
    headerPattern: 'x-test=true',
    timeout: 2000,
    async: true,
    status: 'disabled',
    description: '支付服务按请求头流量镜像',
    createTime: '2026-05-05 09:00:00',
    stats: {
      totalRequests: 10000,
      mirroredRequests: 500,
      successResponses: 480,
      failedResponses: 20
    }
  }
])

const formData = ref({
  sourceService: '',
  targetService: '',
  mirrorPercent: 10,
  mirrorType: 'all',
  pathPattern: '',
  headerPattern: '',
  timeout: 500,
  async: true,
  description: ''
})

const handleCreate = () => {
  // 模拟创建规则
  const newRule = {
    id: Date.now(),
    ...formData.value,
    status: 'disabled',
    createTime: new Date().toLocaleString(),
    stats: {
      totalRequests: 0,
      mirroredRequests: 0,
      successResponses: 0,
      failedResponses: 0
    }
  }
  mirrorRules.value.unshift(newRule)
  showCreateModal.value = false
  
  // 重置表单
  formData.value = {
    sourceService: '',
    targetService: '',
    mirrorPercent: 10,
    mirrorType: 'all',
    pathPattern: '',
    headerPattern: '',
    timeout: 500,
    async: true,
    description: ''
  }
}

const toggleStatus = (record) => {
  record.status = record.status === 'enabled' ? 'disabled' : 'enabled'
}

const viewDetail = (record) => {
  currentRule.value = record
  showDetailModal.value = true
}

const deleteRule = (record) => {
  // 模拟删除规则
  const index = mirrorRules.value.findIndex(r => r.id === record.id)
  if (index !== -1) {
    mirrorRules.value.splice(index, 1)
  }
}
</script>

<style scoped>
.traffic-page {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}
</style>
