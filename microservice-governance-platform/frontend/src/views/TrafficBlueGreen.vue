<template>
  <div class="traffic-page">
    <div class="page-header">
      <h2>蓝绿部署</h2>
    </div>
    
    <div class="toolbar" style="margin-bottom: 16px;">
      <a-button type="primary" @click="showCreateModal = true">
        <plus-outlined /> 新建部署
      </a-button>
    </div>
    
    <a-card>
      <a-table :columns="columns" :data-source="blueGreenRules" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'running' ? 'blue' : record.status === 'completed' ? 'green' : 'red'">
              {{ record.status === 'running' ? '进行中' : record.status === 'completed' ? '已完成' : '已回滚' }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'progress'">
            <a-progress :percent="record.progress" :status="record.progress === 100 ? 'success' : 'active'" />
          </template>
          
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button v-if="record.status === 'running'" type="link" size="small" danger @click="rollbackDeploy(record)">
                回滚
              </a-button>
              <a-button v-if="record.status === 'running'" type="link" size="small" @click="completeDeploy(record)">
                完成
              </a-button>
              <a-button type="link" size="small" @click="viewDetail(record)">
                查看详情
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
    
    <a-modal
      v-model:open="showCreateModal"
      title="新建蓝绿部署"
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
        
        <a-form-item label="绿环境版本">
          <a-input v-model:value="formData.greenVersion" placeholder="例如: v2.0.0" />
        </a-form-item>
        
        <a-form-item label="蓝环境版本">
          <a-input v-model:value="formData.blueVersion" placeholder="例如: v1.0.0" />
        </a-form-item>
        
        <a-form-item label="切换策略">
          <a-radio-group v-model:value="formData.switchStrategy">
            <a-radio value="manual">手动切换</a-radio>
            <a-radio value="auto">自动切换（验证通过后）</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item label="验证规则">
          <a-textarea v-model:value="formData.validationRules" :rows="3" placeholder="健康检查、指标阈值等验证规则" />
        </a-form-item>
        
        <a-form-item label="回滚策略">
          <a-radio-group v-model:value="formData.rollbackStrategy">
            <a-radio value="manual">手动回滚</a-radio>
            <a-radio value="auto">自动回滚（验证失败时）</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item label="描述">
          <a-textarea v-model:value="formData.description" :rows="3" placeholder="部署描述" />
        </a-form-item>
      </a-form>
    </a-modal>
    
    <a-modal
      v-model:open="showDetailModal"
      title="部署详情"
      :width="900"
      :footer="null"
    >
      <div v-if="currentDeploy">
        <a-descriptions :column="2" bordered style="margin-bottom: 24px;">
          <a-descriptions-item label="服务名称">{{ currentDeploy.serviceName }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="currentDeploy.status === 'running' ? 'blue' : currentDeploy.status === 'completed' ? 'green' : 'red'">
              {{ currentDeploy.status === 'running' ? '进行中' : currentDeploy.status === 'completed' ? '已完成' : '已回滚' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="绿环境版本">{{ currentDeploy.greenVersion }}</a-descriptions-item>
          <a-descriptions-item label="蓝环境版本">{{ currentDeploy.blueVersion }}</a-descriptions-item>
          <a-descriptions-item label="切换策略">{{ currentDeploy.switchStrategy === 'manual' ? '手动切换' : '自动切换' }}</a-descriptions-item>
          <a-descriptions-item label="回滚策略">{{ currentDeploy.rollbackStrategy === 'manual' ? '手动回滚' : '自动回滚' }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ currentDeploy.createTime }}</a-descriptions-item>
          <a-descriptions-item label="完成时间">{{ currentDeploy.completeTime || '-' }}</a-descriptions-item>
        </a-descriptions>
        
        <h4>部署进度</h4>
        <a-steps :current="currentDeploy.step" direction="vertical">
          <a-step title="准备绿环境" description="实例创建、健康检查" status="finish" />
          <a-step title="流量验证" description="小流量测试" status="process" />
          <a-step title="流量切换" description="全量切换到绿环境" status="wait" />
          <a-step title="清理蓝环境" description="释放旧版本资源" status="wait" />
        </a-steps>
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
const currentDeploy = ref(null)

const columns = [
  { title: '服务名称', dataIndex: 'serviceName', key: 'serviceName' },
  { title: '绿环境版本', dataIndex: 'greenVersion', key: 'greenVersion' },
  { title: '蓝环境版本', dataIndex: 'blueVersion', key: 'blueVersion' },
  { title: '切换策略', dataIndex: 'switchStrategy', key: 'switchStrategy', render: (strategy) => {
    return strategy === 'manual' ? '手动切换' : '自动切换'
  }},
  { title: '进度', key: 'progress' },
  { title: '状态', key: 'status' },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', key: 'action', width: 200 }
]

const blueGreenRules = ref([
  {
    id: 1,
    serviceName: 'order-service',
    greenVersion: 'v1.5.0',
    blueVersion: 'v1.4.0',
    switchStrategy: 'manual',
    rollbackStrategy: 'manual',
    validationRules: '健康检查通过，QPS >= 100，错误率 < 1%',
    status: 'running',
    progress: 50,
    step: 1,
    description: '订单服务蓝绿部署升级',
    createTime: '2026-05-05 14:00:00',
    completeTime: ''
  },
  {
    id: 2,
    serviceName: 'user-service',
    greenVersion: 'v2.0.0',
    blueVersion: 'v1.0.0',
    switchStrategy: 'auto',
    rollbackStrategy: 'auto',
    validationRules: '健康检查通过，QPS >= 200，错误率 < 0.5%',
    status: 'completed',
    progress: 100,
    step: 4,
    description: '用户服务蓝绿部署升级',
    createTime: '2026-05-04 10:00:00',
    completeTime: '2026-05-04 11:30:00'
  },
  {
    id: 3,
    serviceName: 'payment-service',
    greenVersion: 'v3.2.0',
    blueVersion: 'v3.1.0',
    switchStrategy: 'manual',
    rollbackStrategy: 'auto',
    validationRules: '健康检查通过，QPS >= 150，错误率 < 0.1%',
    status: 'rollbacked',
    progress: 30,
    step: 1,
    description: '支付服务蓝绿部署（已回滚）',
    createTime: '2026-05-03 09:00:00',
    completeTime: '2026-05-03 09:30:00'
  }
])

const formData = ref({
  serviceName: '',
  greenVersion: '',
  blueVersion: '',
  switchStrategy: 'manual',
  validationRules: '',
  rollbackStrategy: 'manual',
  description: ''
})

const handleCreate = () => {
  // 模拟创建部署
  const newDeploy = {
    id: Date.now(),
    ...formData.value,
    status: 'running',
    progress: 0,
    step: 0,
    createTime: new Date().toLocaleString(),
    completeTime: ''
  }
  blueGreenRules.value.unshift(newDeploy)
  showCreateModal.value = false
  
  // 重置表单
  formData.value = {
    serviceName: '',
    greenVersion: '',
    blueVersion: '',
    switchStrategy: 'manual',
    validationRules: '',
    rollbackStrategy: 'manual',
    description: ''
  }
}

const rollbackDeploy = (record) => {
  record.status = 'rollbacked'
  record.progress = 100
  record.step = 4
  record.completeTime = new Date().toLocaleString()
}

const completeDeploy = (record) => {
  record.status = 'completed'
  record.progress = 100
  record.step = 4
  record.completeTime = new Date().toLocaleString()
}

const viewDetail = (record) => {
  currentDeploy.value = record
  showDetailModal.value = true
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
