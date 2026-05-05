<template>
  <div class="scheduler">
    <a-card title="任务调度">
      <a-space style="margin-bottom: 16px">
        <a-button type="primary" @click="showCreateModal = true">
          <PlusOutlined /> 新建调度任务
        </a-button>
        <a-button @click="refreshSchedules">
          <ReloadOutlined /> 刷新
        </a-button>
      </a-space>

      <a-table
        :columns="scheduleColumns"
        :data-source="schedules"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-switch
              v-model:checked="record.enabled"
              @change="toggleSchedule(record)"
            />
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag :color="record.type === 'UI' ? 'blue' : 'purple'">
              {{ record.type }} 测试
            </a-tag>
          </template>
          <template v-else-if="column.key === 'lastStatus'">
            <a-tag :color="getLastStatusColor(record.lastStatus)">
              {{ record.lastStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="runNow(record)">立即执行</a-button>
              <a-button type="link" size="small" @click="editSchedule(record)">编辑</a-button>
              <a-popconfirm
                title="确定要删除这个调度任务吗？"
                @confirm="deleteSchedule(record)"
              >
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="showCreateModal"
      title="新建调度任务"
      @ok="createSchedule"
      width="700px"
    >
      <a-form layout="vertical">
        <a-form-item label="任务名称" required>
          <a-input v-model:value="newSchedule.name" placeholder="请输入任务名称" />
        </a-form-item>
        <a-form-item label="测试类型" required>
          <a-radio-group v-model:value="newSchedule.type">
            <a-radio-button value="UI">UI 测试</a-radio-button>
            <a-radio-button value="API">API 测试</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="测试用例选择">
          <a-select
            v-model:value="newSchedule.testCases"
            mode="multiple"
            placeholder="选择要执行的测试用例"
            style="width: 100%"
            :options="testCaseOptions"
          />
        </a-form-item>
        <a-form-item label="执行环境">
          <a-select v-model:value="newSchedule.environment" :options="environmentOptions" />
        </a-form-item>
        <a-form-item label="调度方式">
          <a-radio-group v-model:value="newSchedule.scheduleType">
            <a-radio value="once">立即执行</a-radio>
            <a-radio value="cron">定时执行</a-radio>
            <a-radio value="interval">周期性执行</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="newSchedule.scheduleType === 'cron'" label="Cron 表达式">
          <a-input v-model:value="newSchedule.cronExpression" placeholder="例如: 0 0 * * *" />
          <a-text type="secondary">每天凌晨执行</a-text>
        </a-form-item>
        <a-form-item v-if="newSchedule.scheduleType === 'interval'" label="执行间隔">
          <a-input-number v-model:value="newSchedule.interval" :min="1" />
          <a-select v-model:value="newSchedule.intervalUnit" style="width: 100px; margin-left: 8px">
            <a-select-option value="minutes">分钟</a-select-option>
            <a-select-option value="hours">小时</a-select-option>
            <a-select-option value="days">天</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="通知设置">
          <a-checkbox v-model:value="newSchedule.notifyOnSuccess">执行成功时通知</a-checkbox>
          <a-checkbox v-model:value="newSchedule.notifyOnFailure" style="margin-left: 16px">执行失败时通知</a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'

const showCreateModal = ref(false)

const scheduleColumns = [
  { title: '任务名称', dataIndex: 'name', key: 'name' },
  { title: '类型', key: 'type' },
  { title: 'Cron 表达式', dataIndex: 'cron', key: 'cron' },
  { title: '状态', key: 'status' },
  { title: '上次执行', dataIndex: 'lastRun', key: 'lastRun' },
  { title: '上次结果', key: 'lastStatus' },
  { title: '操作', key: 'action' }
]

const schedules = ref([
  {
    key: '1',
    name: '每日回归测试',
    type: 'UI',
    cron: '0 0 * * *',
    enabled: true,
    lastRun: '昨天 00:00',
    lastStatus: '通过'
  },
  {
    key: '2',
    name: 'API 健康检查',
    type: 'API',
    cron: '*/30 * * * *',
    enabled: true,
    lastRun: '15分钟前',
    lastStatus: '通过'
  },
  {
    key: '3',
    name: '性能测试',
    type: 'UI',
    cron: '0 2 * * 6',
    enabled: false,
    lastRun: '上周六 02:00',
    lastStatus: '失败'
  }
])

const newSchedule = reactive({
  name: '',
  type: 'UI',
  testCases: [],
  environment: 'test',
  scheduleType: 'once',
  cronExpression: '',
  interval: 1,
  intervalUnit: 'hours',
  notifyOnSuccess: false,
  notifyOnFailure: true
})

const testCaseOptions = [
  { value: 'tc1', label: '用户登录测试' },
  { value: 'tc2', label: '商品列表测试' },
  { value: 'tc3', label: '购物车功能测试' },
  { value: 'tc4', label: '订单创建测试' },
  { value: 'tc5', label: '支付流程测试' }
]

const environmentOptions = [
  { value: 'dev', label: '开发环境 (Dev)' },
  { value: 'test', label: '测试环境 (Test)' },
  { value: 'prod', label: '生产环境 (Prod)' }
]

const getLastStatusColor = (status) => {
  const colors = {
    '通过': 'green',
    '失败': 'red',
    '未执行': 'default'
  }
  return colors[status] || 'default'
}

const toggleSchedule = (record) => {
  message.success(`调度任务已${record.enabled ? '启用' : '禁用'}`)
}

const runNow = (record) => {
  message.info(`立即执行: ${record.name}`)
}

const editSchedule = (record) => {
  message.info(`编辑调度任务: ${record.name}`)
}

const deleteSchedule = (record) => {
  const index = schedules.value.findIndex(s => s.key === record.key)
  if (index > -1) {
    schedules.value.splice(index, 1)
  }
  message.success('调度任务已删除')
}

const refreshSchedules = () => {
  message.success('已刷新调度任务列表')
}

const createSchedule = () => {
  if (!newSchedule.name) {
    message.warning('请输入任务名称')
    return
  }
  const newItem = {
    key: Date.now().toString(),
    name: newSchedule.name,
    type: newSchedule.type,
    cron: newSchedule.cronExpression || '手动执行',
    enabled: true,
    lastRun: '-',
    lastStatus: '未执行'
  }
  schedules.value.unshift(newItem)
  showCreateModal.value = false
  message.success('调度任务创建成功')
}
</script>

<style scoped>
.scheduler {
  width: 100%;
}
</style>
