<template>
  <div class="traffic-page">
    <div class="page-header">
      <h2>熔断降级</h2>
    </div>
    
    <div class="toolbar" style="margin-bottom: 16px;">
      <a-button type="primary" @click="showCreateModal = true">
        <plus-outlined /> 新建规则
      </a-button>
    </div>
    
    <a-card>
      <a-table :columns="columns" :data-source="circuitRules" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'enabled' ? 'green' : 'default'">
              {{ record.status === 'enabled' ? '已启用' : '已禁用' }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'circuitStatus'">
            <a-tag :color="record.circuitStatus === 'closed' ? 'green' : record.circuitStatus === 'open' ? 'red' : 'orange'">
              {{ record.circuitStatus === 'closed' ? '闭合' : record.circuitStatus === 'open' ? '打开' : '半打开' }}
            </a-tag>
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
      title="新建熔断降级规则"
      :width="800"
      @ok="handleCreate"
      @cancel="showCreateModal = false"
    >
      <a-form :model="formData" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="服务名称">
          <a-select v-model:value="formData.serviceName" style="width: 100%;">
            <a-select-option value="user-service">user-service</a-select-option>
            <a-select-option value="order-service">order-service</a-select-option>
            <a-select-option value="payment-service">payment-service</a-select-option>
            <a-select-option value="product-service">product-service</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="熔断类型">
          <a-radio-group v-model:value="formData.circuitType">
            <a-radio value="error_rate">错误率</a-radio>
            <a-radio value="slow_call">慢调用</a-radio>
            <a-radio value="error_count">错误数</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item label="触发阈值">
          <a-input-number v-model:value="formData.threshold" style="width: 200px;" />
          <span v-if="formData.circuitType === 'error_rate'" style="margin-left: 8px;">%</span>
          <span v-else-if="formData.circuitType === 'slow_call'" style="margin-left: 8px;">秒</span>
          <span v-else-if="formData.circuitType === 'error_count'" style="margin-left: 8px;">次</span>
        </a-form-item>
        
        <a-form-item label="统计窗口">
          <a-input-number v-model:value="formData.windowSize" style="width: 200px;" />
          <span style="margin-left: 8px;">秒</span>
        </a-form-item>
        
        <a-form-item label="最小请求数">
          <a-input-number v-model:value="formData.minRequests" style="width: 200px;" />
          <span style="margin-left: 8px;">次</span>
        </a-form-item>
        
        <a-form-item label="熔断时长">
          <a-input-number v-model:value="formData.circuitDuration" style="width: 200px;" />
          <span style="margin-left: 8px;">秒</span>
        </a-form-item>
        
        <a-form-item label="半打开探测次数">
          <a-input-number v-model:value="formData.halfOpenRequests" style="width: 200px;" />
          <span style="margin-left: 8px;">次</span>
        </a-form-item>
        
        <a-form-item label="降级策略">
          <a-radio-group v-model:value="formData.fallbackStrategy">
            <a-radio value="return_default">返回默认值</a-radio>
            <a-radio value="redirect">重定向</a-radio>
            <a-radio value="custom">自定义处理</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item v-if="formData.fallbackStrategy === 'return_default'" label="默认返回值">
          <a-textarea v-model:value="formData.fallbackValue" :rows="3" placeholder="默认返回的 JSON 数据" />
        </a-form-item>
        
        <a-form-item v-if="formData.fallbackStrategy === 'redirect'" label="重定向地址">
          <a-input v-model:value="formData.redirectUrl" placeholder="例如: /api/fallback" />
        </a-form-item>
        
        <a-form-item label="描述">
          <a-textarea v-model:value="formData.description" :rows="3" placeholder="规则描述" />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <a-modal
      v-model:open="showDetailModal"
      title="熔断规则详情"
      :width="900"
      :footer="null"
    >
      <div v-if="currentRule">
        <a-descriptions :column="2" bordered style="margin-bottom: 24px;">
          <a-descriptions-item label="服务名称">{{ currentRule.serviceName }}</a-descriptions-item>
          <a-descriptions-item label="熔断状态">
            <a-tag :color="currentRule.circuitStatus === 'closed' ? 'green' : currentRule.circuitStatus === 'open' ? 'red' : 'orange'">
              {{ currentRule.circuitStatus === 'closed' ? '闭合' : currentRule.circuitStatus === 'open' ? '打开' : '半打开' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="熔断类型">
            {{ currentRule.circuitType === 'error_rate' ? '错误率' : currentRule.circuitType === 'slow_call' ? '慢调用' : '错误数' }}
          </a-descriptions-item>
          <a-descriptions-item label="触发阈值">
            {{ currentRule.threshold }}{{ currentRule.circuitType === 'error_rate' ? '%' : currentRule.circuitType === 'slow_call' ? '秒' : '次' }}
          </a-descriptions-item>
          <a-descriptions-item label="统计窗口">{{ currentRule.windowSize }} 秒</a-descriptions-item>
          <a-descriptions-item label="熔断时长">{{ currentRule.circuitDuration }} 秒</a-descriptions-item>
          <a-descriptions-item label="最小请求数">{{ currentRule.minRequests }} 次</a-descriptions-item>
          <a-descriptions-item label="半打开探测次数">{{ currentRule.halfOpenRequests }} 次</a-descriptions-item>
          <a-descriptions-item label="降级策略">
            {{ currentRule.fallbackStrategy === 'return_default' ? '返回默认值' : currentRule.fallbackStrategy === 'redirect' ? '重定向' : '自定义处理' }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ currentRule.createTime }}</a-descriptions-item>
        </a-descriptions>
        
        <h4>熔断统计</h4>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="总请求数" :value="currentRule.stats.totalRequests" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="成功请求" :value="currentRule.stats.successRequests" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="失败请求" :value="currentRule.stats.failedRequests" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="熔断次数" :value="currentRule.stats.circuitOpenCount" />
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
  { title: '服务名称', dataIndex: 'serviceName', key: 'serviceName' },
  { title: '熔断类型', dataIndex: 'circuitType', key: 'circuitType', render: (type) => {
    const types = { error_rate: '错误率', slow_call: '慢调用', error_count: '错误数' }
    return types[type] || type
  }},
  { title: '触发阈值', dataIndex: 'threshold', key: 'threshold', render: (value, record) => {
    const unit = record.circuitType === 'error_rate' ? '%' : record.circuitType === 'slow_call' ? '秒' : '次'
    return `${value}${unit}`
  }},
  { title: '熔断状态', key: 'circuitStatus' },
  { title: '状态', key: 'status' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', key: 'action', width: 200 }
]

const circuitRules = ref([
  {
    id: 1,
    serviceName: 'order-service',
    circuitType: 'error_rate',
    threshold: 50,
    windowSize: 60,
    minRequests: 10,
    circuitDuration: 30,
    halfOpenRequests: 5,
    fallbackStrategy: 'return_default',
    fallbackValue: '{"code": 503, "message": "服务暂时不可用"}',
    redirectUrl: '',
    status: 'enabled',
    circuitStatus: 'closed',
    description: '订单服务错误率超过50%时熔断',
    createTime: '2026-05-01 10:00:00',
    stats: {
      totalRequests: 15000,
      successRequests: 14250,
      failedRequests: 750,
      circuitOpenCount: 3
    }
  },
  {
    id: 2,
    serviceName: 'payment-service',
    circuitType: 'slow_call',
    threshold: 3,
    windowSize: 60,
    minRequests: 10,
    circuitDuration: 60,
    halfOpenRequests: 3,
    fallbackStrategy: 'redirect',
    fallbackValue: '',
    redirectUrl: '/api/payment-fallback',
    status: 'enabled',
    circuitStatus: 'open',
    description: '支付服务慢调用超过3秒时熔断',
    createTime: '2026-05-03 14:30:00',
    stats: {
      totalRequests: 8000,
      successRequests: 7200,
      failedRequests: 800,
      circuitOpenCount: 5
    }
  },
  {
    id: 3,
    serviceName: 'user-service',
    circuitType: 'error_count',
    threshold: 20,
    windowSize: 120,
    minRequests: 20,
    circuitDuration: 45,
    halfOpenRequests: 5,
    fallbackStrategy: 'custom',
    fallbackValue: '',
    redirectUrl: '',
    status: 'disabled',
    circuitStatus: 'closed',
    description: '用户服务错误数超过20时熔断',
    createTime: '2026-05-05 09:00:00',
    stats: {
      totalRequests: 20000,
      successRequests: 19800,
      failedRequests: 200,
      circuitOpenCount: 1
    }
  }
])

const formData = ref({
  serviceName: '',
  circuitType: 'error_rate',
  threshold: 50,
  windowSize: 60,
  minRequests: 10,
  circuitDuration: 30,
  halfOpenRequests: 5,
  fallbackStrategy: 'return_default',
  fallbackValue: '',
  redirectUrl: '',
  description: ''
})

const handleCreate = () => {
  // 模拟创建规则
  const newRule = {
    id: Date.now(),
    ...formData.value,
    status: 'disabled',
    circuitStatus: 'closed',
    createTime: new Date().toLocaleString(),
    stats: {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0
    }
  }
  circuitRules.value.unshift(newRule)
  showCreateModal.value = false
  
  // 重置表单
  formData.value = {
    serviceName: '',
    circuitType: 'error_rate',
    threshold: 50,
    windowSize: 60,
    minRequests: 10,
    circuitDuration: 30,
    halfOpenRequests: 5,
    fallbackStrategy: 'return_default',
    fallbackValue: '',
    redirectUrl: '',
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
  const index = circuitRules.value.findIndex(r => r.id === record.id)
  if (index !== -1) {
    circuitRules.value.splice(index, 1)
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
