<template>
  <div class="ui-designer">
    <a-card title="Web UI 自动化设计器">
      <a-descriptions :column="3" bordered>
        <a-descriptions-item label="项目名称">电商平台</a-descriptions-item>
        <a-descriptions-item label="录制状态">
          <a-tag :color="recording ? 'red' : 'default'">
            {{ recording ? '录制中' : '空闲' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="测试环境">测试环境 (Test)</a-descriptions-item>
      </a-descriptions>

      <a-divider />

      <a-space style="margin-bottom: 16px">
        <a-button
          type="primary"
          :danger="recording"
          @click="toggleRecording"
        >
          {{ recording ? '停止录制' : '开始录制' }}
        </a-button>
        <a-button @click="playbackTest">回放测试</a-button>
        <a-button @click="saveTestCase">保存测试用例</a-button>
        <a-button @click="generateScript">生成 Playwright 脚本</a-button>
      </a-space>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-card title="录制步骤" size="small">
            <a-table
              :columns="stepColumns"
              :data-source="recordedSteps"
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'action'">
                  <a-space>
                    <a-button type="link" size="small" @click="editStep(index)">编辑</a-button>
                    <a-button type="link" size="small" danger @click="deleteStep(index)">删除</a-button>
                  </a-space>
                </template>
                <template v-else-if="column.key === 'assertion'">
                  <a-select
                    v-model:value="record.assertion"
                    style="width: 120px"
                    :options="assertionOptions"
                    @change="() => {}"
                  />
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>

        <a-col :span="12">
          <a-card title="元素定位校验" size="small">
            <a-form layout="vertical">
              <a-form-item label="目标 URL">
                <a-input v-model:value="targetUrl" placeholder="请输入测试页面 URL" />
              </a-form-item>
              <a-form-item label="元素定位方式">
                <a-select v-model:value="locatorType" :options="locatorTypeOptions" />
              </a-form-item>
              <a-form-item label="定位器值">
                <a-input v-model:value="locatorValue" placeholder="例如: #login-button" />
              </a-form-item>
              <a-form-item>
                <a-space>
                  <a-button type="primary" @click="validateLocator">验证定位器</a-button>
                  <a-button @click="addAssertion">添加断言</a-button>
                </a-space>
              </a-form-item>
            </a-form>

            <a-divider />

            <a-card title="断言配置" size="small" v-if="assertions.length > 0">
              <a-list>
                <a-list-item v-for="(assertion, index) in assertions" :key="index">
                  <a-list-item-meta
                    :title="assertion.type"
                    :description="assertion.description"
                  />
                  <a-button type="link" size="small" danger @click="removeAssertion(index)">移除</a-button>
                </a-list-item>
              </a-list>
            </a-card>
          </a-card>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'

const recording = ref(false)
const targetUrl = ref('http://test.example.com')
const locatorType = ref('css')
const locatorValue = ref('')

const stepColumns = [
  { title: '步骤', dataIndex: 'step', key: 'step' },
  { title: '操作', dataIndex: 'action', key: 'actionType' },
  { title: '元素', dataIndex: 'element', key: 'element' },
  { title: '断言', key: 'assertion' },
  { title: '操作', key: 'action' }
]

const recordedSteps = ref([
  { step: 1, actionType: '导航', action: 'goto', element: 'http://test.example.com', assertion: null },
  { step: 2, actionType: '点击', action: 'click', element: '#login-button', assertion: 'visible' },
  { step: 3, actionType: '输入', action: 'fill', element: '#username', assertion: null }
])

const assertions = ref([
  { type: '元素可见性', description: '验证登录按钮可见' },
  { type: '文本内容', description: '验证页面标题包含"登录"' }
])

const locatorTypeOptions = [
  { value: 'css', label: 'CSS 选择器' },
  { value: 'xpath', label: 'XPath' },
  { value: 'text', label: '文本内容' },
  { value: 'role', label: 'ARIA 角色' }
]

const assertionOptions = [
  { value: 'visible', label: '可见' },
  { value: 'hidden', label: '隐藏' },
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' },
  { value: 'text', label: '文本匹配' }
]

const toggleRecording = () => {
  recording.value = !recording.value
  message.success(recording.value ? '开始录制...' : '录制已停止')
}

const playbackTest = () => {
  message.info('开始回放测试...')
}

const saveTestCase = () => {
  message.success('测试用例已保存')
}

const generateScript = () => {
  message.success('Playwright 脚本已生成')
}

const validateLocator = () => {
  if (!locatorValue.value) {
    message.warning('请输入定位器值')
    return
  }
  message.success('定位器验证成功')
}

const addAssertion = () => {
  assertions.value.push({
    type: '新断言',
    description: `验证 ${locatorType.value} 定位器: ${locatorValue.value}`
  })
  message.success('断言已添加')
}

const editStep = (index) => {
  message.info(`编辑步骤 ${index + 1}')
}

const deleteStep = (index) => {
  recordedSteps.value.splice(index, 1)
  message.success('步骤已删除')
}

const removeAssertion = (index) => {
  assertions.value.splice(index, 1)
}
</script>

<style scoped>
.ui-designer {
  width: 100%;
}
</style>
