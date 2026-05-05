<template>
  <div class="traffic-page">
    <div class="page-header">
      <h2>金丝雀发布</h2>
    </div>
    
    <div class="toolbar" style="margin-bottom: 16px;">
      <a-button type="primary" @click="showCreateModal = true">
        <plus-outlined /> 新建规则
      </a-button>
    </div>
    
    <a-card>
      <a-table :columns="columns" :data-source="canaryRules" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'enabled' ? 'green' : 'default'">
              {{ record.status === 'enabled' ? '已启用' : '已禁用' }}
            </a-tag>
          </template>
          
          <template v-else-if="column.key === 'weight'">
            <a-progress :percent="record.weight" :status="record.weight > 50 ? 'active' : 'normal'" />
          </template>
          
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="toggleStatus(record)">
                {{ record.status === 'enabled' ? '禁用' : '启用' }}
              </a-button>
              <a-button type="link" size="small" @click="editRule(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="deleteRule(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
    
    <a-modal
      v-model:open="showCreateModal"
      title="新建金丝雀发布规则"
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
        
        <a-form-item label="灰度版本">
          <a-input v-model:value="formData.canaryVersion" placeholder="例如: v2.0.0" />
        </a-form-item>
        
        <a-form-item label="稳定版本">
          <a-input v-model:value="formData.stableVersion" placeholder="例如: v1.0.0" />
        </a-form-item>
        
        <a-form-item label="流量权重">
          <a-slider v-model:value="formData.weight" :min="0" :max="100" />
          <span style="margin-left: 8px;">{{ formData.weight }}%</span>
        </a-form-item>
        
        <a-form-item label="灰度规则">
          <a-radio-group v-model:value="formData.ruleType">
            <a-radio value="weight">按权重</a-radio>
            <a-radio value="header">按请求头</a-radio>
            <a-radio value="cookie">按 Cookie</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item v-if="formData.ruleType !== 'weight'" label="匹配条件">
          <a-input v-model:value="formData.matchCondition" placeholder="例如: x-version=canary" />
        </a-form-item>
        
        <a-form-item label="描述">
          <a-textarea v-model:value="formData.description" :rows="3" placeholder="规则描述" />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <a-modal
      v-model:open="showEditModal"
      title="编辑金丝雀发布规则"
      :width="800"
      @ok="handleEdit"
      @cancel="showEditModal = false"
    >
      <a-form :model="editFormData" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-form-item label="服务名称">
          <a-select v-model:value="editFormData.serviceName" style="width: 100%;">
            <a-select-option value="user-service">user-service</a-select-option>
            <a-select-option value="order-service">order-service</a-select-option>
            <a-select-option value="payment-service">payment-service</a-select-option>
            <a-select-option value="product-service">product-service</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="灰度版本">
          <a-input v-model:value="editFormData.canaryVersion" placeholder="例如: v2.0.0" />
        </a-form-item>
        
        <a-form-item label="稳定版本">
          <a-input v-model:value="editFormData.stableVersion" placeholder="例如: v1.0.0" />
        </a-form-item>
        
        <a-form-item label="流量权重">
          <a-slider v-model:value="editFormData.weight" :min="0" :max="100" />
          <span style="margin-left: 8px;">{{ editFormData.weight }}%</span>
        </a-form-item>
        
        <a-form-item label="灰度规则">
          <a-radio-group v-model:value="editFormData.ruleType">
            <a-radio value="weight">按权重</a-radio>
            <a-radio value="header">按请求头</a-radio>
            <a-radio value="cookie">按 Cookie</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item v-if="editFormData.ruleType !== 'weight'" label="匹配条件">
          <a-input v-model:value="editFormData.matchCondition" placeholder="例如: x-version=canary" />
        </a-form-item>
        
        <a-form-item label="描述">
          <a-textarea v-model:value="editFormData.description" :rows="3" placeholder="规则描述" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { trafficApi } from '../api'

const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingRule = ref(null)

const columns = [
  { title: '服务名称', dataIndex: 'serviceName', key: 'serviceName' },
  { title: '灰度版本', dataIndex: 'canaryVersion', key: 'canaryVersion' },
  { title: '稳定版本', dataIndex: 'stableVersion', key: 'stableVersion' },
  { title: '流量权重', key: 'weight' },
  { title: '规则类型', dataIndex: 'ruleType', key: 'ruleType', render: (type) => {
    const types = { weight: '按权重', header: '按请求头', cookie: '按 Cookie' }
    return types[type] || type
  }},
  { title: '状态', key: 'status' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', key: 'action', width: 200 }
]

const canaryRules = ref([
  {
    id: 1,
    serviceName: 'user-service',
    canaryVersion: 'v2.0.0',
    stableVersion: 'v1.0.0',
    weight: 10,
    ruleType: 'weight',
    matchCondition: '',
    status: 'enabled',
    description: '用户服务灰度发布测试',
    createTime: '2026-05-01 10:00:00'
  },
  {
    id: 2,
    serviceName: 'order-service',
    canaryVersion: 'v1.5.0',
    stableVersion: 'v1.4.0',
    weight: 20,
    ruleType: 'header',
    matchCondition: 'x-version=canary',
    status: 'enabled',
    description: '订单服务按请求头灰度',
    createTime: '2026-05-03 14:30:00'
  },
  {
    id: 3,
    serviceName: 'payment-service',
    canaryVersion: 'v3.2.0',
    stableVersion: 'v3.1.0',
    weight: 0,
    ruleType: 'weight',
    matchCondition: '',
    status: 'disabled',
    description: '支付服务灰度发布（待测试）',
    createTime: '2026-05-05 09:00:00'
  }
])

const formData = ref({
  serviceName: '',
  canaryVersion: '',
  stableVersion: '',
  weight: 10,
  ruleType: 'weight',
  matchCondition: '',
  description: ''
})

const editFormData = ref({
  id: '',
  serviceName: '',
  canaryVersion: '',
  stableVersion: '',
  weight: 10,
  ruleType: 'weight',
  matchCondition: '',
  description: ''
})

const handleCreate = () => {
  // 模拟创建规则
  const newRule = {
    id: Date.now(),
    ...formData.value,
    status: 'disabled',
    createTime: new Date().toLocaleString()
  }
  canaryRules.value.unshift(newRule)
  showCreateModal.value = false
  
  // 重置表单
  formData.value = {
    serviceName: '',
    canaryVersion: '',
    stableVersion: '',
    weight: 10,
    ruleType: 'weight',
    matchCondition: '',
    description: ''
  }
}

const toggleStatus = (record) => {
  record.status = record.status === 'enabled' ? 'disabled' : 'enabled'
}

const editRule = (record) => {
  editingRule.value = record
  editFormData.value = { ...record }
  showEditModal.value = true
}

const handleEdit = () => {
  // 模拟编辑规则
  const index = canaryRules.value.findIndex(r => r.id === editFormData.value.id)
  if (index !== -1) {
    canaryRules.value[index] = { ...editFormData.value }
  }
  showEditModal.value = false
}

const deleteRule = (record) => {
  // 模拟删除规则
  const index = canaryRules.value.findIndex(r => r.id === record.id)
  if (index !== -1) {
    canaryRules.value.splice(index, 1)
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
