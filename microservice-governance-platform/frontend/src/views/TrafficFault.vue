<template>
  <div class="traffic-page">
    <div class="page-header">
      <h2>故障注入</h2>
    </div>
    
    <div class="toolbar" style="margin-bottom: 16px;">
      <a-button type="primary" @click="showCreateModal = true">
        <plus-outlined /> 新建故障注入
      </a-button>
    </div>
    
    <a-card>
      <a-table :columns="columns" :data-source="faultRules" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'active' ? 'red' : 'default'">
              {{ record.status === 'active' ? '活跃' : '已停止' }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'duration'">
            <a-progress :percent="getDurationPercent(record)" status="active" />
          </template>
          
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button v-if="record.status === 'active'" type="link" size="small" danger @click="stopFault(record)">
                停止
              </a-button>
              <a-button v-else type="link" size="small" @click="startFault(record)">
                启动
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
      title="新建故障注入规则"
      :width="800"
      @ok="handleCreate"
      @cancel="showCreateModal = false"
    >
      <a-form :model="formData" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="目标服务">
          <a-select v-model:value="formData.targetService" style="width: 100%;">
            <a-select-option value="user-service">user-service</a-select-option>
            <a-select-option value="order-service">order-service</a-select-option>
            <a-select-option value="payment-service">payment-service</a-select-option>
            <a-select-option value="product-service">product-service</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="故障类型">
          <a-radio-group v-model:value="formData.faultType">
            <a-radio value="delay">延迟注入</a-radio>
            <a-radio value="abort">中断注入</a-radio>
            <a-radio value="error">错误注入</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item v-if="formData.faultType === 'delay'" label="延迟时间">
          <a-input-number v-model:value="formData.delayDuration" style="width: 200px;" />
          <span style="margin-left: 8px;">毫秒</span>
        </a-form-item>
        
        <a-form-item v-if="formData.faultType === 'abort'" label="HTTP 状态码">
          <a-select v-model:value="formData.abortStatus" style="width: 200px;">
            <a-select-option :value="500">500 - Internal Server Error</a-select-option>
            <a-select-option :value="503">503 - Service Unavailable</a-select-option>
            <a-select-option :value="400">400 - Bad Request</a-select-option>
            <a-select-option :value="401">401 - Unauthorized</a-select-option>
            <a-select-option :value="403">403 - Forbidden</a-select-option>
            <a-select-option :value="404">404 - Not Found</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item v-if="formData.faultType === 'error'" label="错误消息">
          <a-input v-model:value="formData.errorMessage" placeholder="错误消息内容" />
        </a-form-item>
        
        <a-form-item label="注入比例">
          <a-slider v-model:value="formData.injectionPercent" :min="0" :max="100" />
          <span style="margin-left: 8px;">{{ formData.injectionPercent }}%</span>
        </a-form-item>
        
        <a-form-item label="注入范围">
          <a-radio-group v-model:value="formData.injectionScope">
            <a-radio value="all">所有实例</a-radio>
            <a-radio value="specific">指定实例</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item v-if="formData.injectionScope === 'specific'" label="指定实例">
          <a-textarea v-model:value="formData.specificInstances" :rows="3" placeholder="指定实例列表，每行一个 IP:Port" />
        </a-form-item>
        
        <a-form-item label="持续时间">
          <a-input-number v-model:value="formData.duration" style="width: 200px;" />
          <span style="margin-left: 8px;">秒 (0 表示持续直到手动停止)</span>
        </a-form-item>
        
        <a-form-item label="描述">
          <a-textarea v-model:value="formData.description" :rows="3" placeholder="故障注入描述" />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <a-modal
      v-model:open="showDetailModal"
      title="故障注入详情"
      :width="900"
      :footer="null"
    >
      <div v-if="currentRule">
        <a-descriptions :column="2" bordered style="margin-bottom: 24px;">
          <a-descriptions-item label="目标服务">{{ currentRule.targetService }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="currentRule.status === 'active' ? 'red' : 'default'">
              {{ currentRule.status === 'active' ? '活跃' : '已停止' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="故障类型">
            {{ currentRule.faultType === 'delay' ? '延迟注入' : currentRule.faultType === 'abort' ? '中断注入' : '错误注入' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="currentRule.faultType === 'delay'" label="延迟时间">
            {{ currentRule.delayDuration }} 毫秒
          </a-descriptions-item>
          <a-descriptions-item v-if="currentRule.faultType === 'abort'" label="HTTP 状态码">
            {{ currentRule.abortStatus }}
          </a-descriptions-item>
          <a-descriptions-item v-if="currentRule.faultType === 'error'" label="错误消息">
            {{ currentRule.errorMessage }}
          </a-descriptions-item>
          <a-descriptions-item label="注入比例">
            <a-progress :percent="currentRule.injectionPercent" status="active" />
          </a-descriptions-item>
          <a-descriptions-item label="注入范围">
            {{ currentRule.injectionScope === 'all' ? '所有实例' : '指定实例' }}
          </a-descriptions-item>
          <a-descriptions-item label="持续时间">
            {{ currentRule.duration === 0 ? '持续直到手动停止' : `${currentRule.duration} 秒` }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ currentRule.createTime }}</a-descriptions-item>
        </a-descriptions>
        
        <h4>故障注入统计</h4>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="总请求数" :value="currentRule.stats.totalRequests" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="已注入" :value="currentRule.stats.injectedRequests" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="成功注入" :value="currentRule.stats.successInjections" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="失败注入" :value="currentRule.stats.failedInjections" />
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
  { title: '目标服务', dataIndex: 'targetService', key: 'targetService' },
  { title: '故障类型', dataIndex: 'faultType', key: 'faultType' },
  { title: '注入比例', dataIndex: 'injectionPercent', key: 'injectionPercent' },
  { title: '持续时间', key: 'duration' },
  { title: '状态', key: 'status' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', key: 'action', width: 200 }
]

const faultRules = ref([
  {
    id: 1,
    targetService: 'order-service',
    faultType: 'delay',
    delayDuration: 500,
    abortStatus: 500,
    errorMessage: '',
    injectionPercent: 30,
    injectionScope: 'all',
    specificInstances: '',
    duration: 600,
    status: 'active',
    startTime: Date.now() - 300000,
    description: '订单服务延迟注入测试',
    createTime: '2026-05-05 14:00:00',
    stats: {
      totalRequests: 15000,
      injectedRequests: 4500,
      successInjections: 4450,
      failedInjections: 50
    }
  },
  {
    id: 2,
    targetService: 'payment-service',
    faultType: 'abort',
    delayDuration: 0,
    abortStatus: 503,
    errorMessage: '',
    injectionPercent: 10,
    injectionScope: 'specific',
    specificInstances: '10.0.0.30:8080',
    duration: 0,
    status: 'stopped',
    startTime: null,
    description: '支付服务中断注入测试',
    createTime: '2026-05-04 10:00:00',
    stats: {
      totalRequests: 8000,
      injectedRequests: 800,
      successInjections: 780,
      failedInjections: 20
    }
  },
  {
    id: 3,
    targetService: 'user-service',
    faultType: 'error',
    delayDuration: 0,
    abortStatus: 500,
    errorMessage: 'Service temporarily unavailable',
    injectionPercent: 5,
    injectionScope: 'all',
    specificInstances: '',
    duration: 300,
    status: 'stopped',
    startTime: null,
    description: '用户服务错误注入测试',
    createTime: '2026-05-03 15:00:00',
    stats: {
      totalRequests: 5000,
      injectedRequests: 250,
      successInjections: 245,
      failedInjections: 5
    }
  }
])

const formData = ref({
  targetService: '',
  faultType: 'delay',
  delayDuration: 500,
  abortStatus: 500,
  errorMessage: '',
  injectionPercent: 10,
  injectionScope: 'all',
  specificInstances: '',
  duration: 0,
  description: ''
})

const getDurationPercent = (record) => {
  if (record.duration === 0) return 100
  if (!record.startTime) return 0
  const elapsed = (Date.now() - record.startTime) / 1000
  return Math.min(Math.floor((elapsed / record.duration) * 100), 100)
}

const handleCreate = () => {
  // 模拟创建规则
  const newRule = {
    id: Date.now(),
    ...formData.value,
    status: 'stopped',
    startTime: null,
    createTime: new Date().toLocaleString(),
    stats: {
      totalRequests: 0,
      injectedRequests: 0,
      successInjections: 0,
      failedInjections: 0
    }
  }
  faultRules.value.unshift(newRule)
  showCreateModal.value = false
  
  // 重置表单
  formData.value = {
    targetService: '',
    faultType: 'delay',
    delayDuration: 500,
    abortStatus: 500,
    errorMessage: '',
    injectionPercent: 10,
    injectionScope: 'all',
    specificInstances: '',
    duration: 0,
    description: ''
  }
}

const startFault = (record) => {
  record.status = 'active'
  record.startTime = Date.now()
}

const stopFault = (record) => {
  record.status = 'stopped'
  record.startTime = null
}

const viewDetail = (record) => {
  currentRule.value = record
  showDetailModal.value = true
}

const deleteRule = (record) => {
  // 模拟删除规则
  const index = faultRules.value.findIndex(r => r.id === record.id)
  if (index !== -1) {
    faultRules.value.splice(index, 1)
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
