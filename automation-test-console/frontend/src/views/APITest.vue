<template>
  <div class="api-test">
    <a-card title="API 自动化测试矩阵">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-card title="测试环境选择" size="small">
            <a-radio-group v-model:value="selectedEnvironment" button-style="solid">
              <a-radio-button value="dev">开发环境 (Dev)</a-radio-button>
              <a-radio-button value="test">测试环境 (Test)</a-radio-button>
              <a-radio-button value="prod">生产环境 (Prod)</a-radio-button>
            </a-radio-group>
            <a-divider />
            <a-descriptions :column="1" size="small">
              <a-descriptions-item label="Base URL">
                {{ environmentConfig[selectedEnvironment].baseUrl }}
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="environmentConfig[selectedEnvironment].status === '正常' ? 'green' : 'orange'">
                  {{ environmentConfig[selectedEnvironment].status }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>

        <a-col :span="16">
          <a-card title="OpenAPI 文档导入" size="small">
            <a-space style="margin-bottom: 16px">
              <a-input
                v-model:value="openapiUrl"
                placeholder="输入 OpenAPI/Swagger 文档 URL"
                style="width: 400px"
              />
              <a-button type="primary" @click="importOpenAPI">导入文档</a-button>
              <a-upload :before-upload="beforeUpload" :show-upload-list="false">
                <a-button>上传 JSON 文件</a-button>
              </a-upload>
            </a-space>

            <a-alert
              v-if="importedCount > 0"
              message="导入成功"
              :description="`已成功导入 ${importedCount} 个 API 接口`"
              type="success"
              show-icon
              style="margin-bottom: 16px"
            />
          </a-card>
        </a-col>
      </a-row>

      <a-divider />

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="test-cases" tab="测试用例">
          <a-space style="margin-bottom: 16px">
            <a-button type="primary" @click="generateTestCases">生成测试用例</a-button>
            <a-button @click="runSelectedTests">执行选中用例</a-button>
            <a-button @click="runAllTests">全部执行</a-button>
          </a-space>

          <a-table
            :columns="testCaseColumns"
            :data-source="testCases"
            :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
            :pagination="{ pageSize: 10 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'method'">
                <a-tag :color="getMethodColor(record.method)">
                  {{ record.method }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getTestStatusColor(record.status)">
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small">编辑</a-button>
                  <a-button type="link" size="small" @click="runSingleTest(record)">执行</a-button>
                  <a-button type="link" size="small">查看报告</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="data-driven" tab="数据驱动测试 (DDT)">
          <a-card title="测试数据集配置" size="small" style="margin-bottom: 16px">
            <a-form layout="vertical">
              <a-form-item label="数据文件">
                <a-upload :before-upload="beforeDataUpload" :show-upload-list="true">
                  <a-button>上传 CSV/Excel 文件</a-button>
                </a-upload>
              </a-form-item>
              <a-form-item label="数据预览">
                <a-table
                  :columns="dataColumns"
                  :data-source="testData"
                  :pagination="false"
                  size="small"
                  bordered
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" @click="runDDT">执行数据驱动测试</a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </a-tab-pane>

        <a-tab-pane key="reports" tab="Allure 风格报告">
          <a-card title="测试报告概览" size="small">
            <a-row :gutter="16">
              <a-col :span="6">
                <a-statistic title="总测试数" :value="83" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="通过" :value="76" :value-style="{ color: '#52c41a' }" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="失败" :value="5" :value-style="{ color: '#ff4d4f' }" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="跳过" :value="2" :value-style="{ color: '#faad14' }" />
              </a-col>
            </a-row>

            <a-divider />

            <a-card title="详细测试结果" size="small">
              <a-table
                :columns="reportColumns"
                :data-source="reportData"
                :pagination="{ pageSize: 10 }"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="getTestStatusColor(record.status)">
                      {{ record.status }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </a-card>
          </a-card>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'

const activeTab = ref('test-cases')
const selectedEnvironment = ref('test')
const openapiUrl = ref('')
const importedCount = ref(0)
const selectedRowKeys = ref([])

const environmentConfig = {
  dev: { baseUrl: 'http://dev.example.com/api', status: '正常' },
  test: { baseUrl: 'http://test.example.com/api', status: '正常' },
  prod: { baseUrl: 'http://prod.example.com/api', status: '维护中' }
}

const testCaseColumns = [
  { title: '接口名称', dataIndex: 'name', key: 'name' },
  { title: '方法', key: 'method' },
  { title: '路径', dataIndex: 'path', key: 'path' },
  { title: '状态', key: 'status' },
  { title: '最后执行', dataIndex: 'lastRun', key: 'lastRun' },
  { title: '操作', key: 'action' }
]

const testCases = ref([
  { key: '1', name: '获取用户列表', method: 'GET', path: '/users', status: '通过', lastRun: '2分钟前' },
  { key: '2', name: '创建用户', method: 'POST', path: '/users', status: '失败', lastRun: '5分钟前' },
  { key: '3', name: '更新用户信息', method: 'PUT', path: '/users/:id', status: '通过', lastRun: '10分钟前' },
  { key: '4', name: '删除用户', method: 'DELETE', path: '/users/:id', status: '未执行', lastRun: '-' },
  { key: '5', name: '获取商品列表', method: 'GET', path: '/products', status: '通过', lastRun: '15分钟前' }
])

const dataColumns = [
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '密码', dataIndex: 'password', key: 'password' },
  { title: '预期结果', dataIndex: 'expected', key: 'expected' }
]

const testData = ref([
  { key: '1', username: 'admin', password: 'admin123', expected: '登录成功' },
  { key: '2', username: 'user1', password: 'wrongpass', expected: '登录失败' },
  { key: '3', username: '', password: '', expected: '参数错误' }
])

const reportColumns = [
  { title: '测试套件', dataIndex: 'suite', key: 'suite' },
  { title: '测试用例', dataIndex: 'name', key: 'name' },
  { title: '状态', key: 'status' },
  { title: '执行时间', dataIndex: 'duration', key: 'duration' },
  { title: '错误信息', dataIndex: 'error', key: 'error' }
]

const reportData = ref([
  { key: '1', suite: '用户管理', name: '获取用户列表', status: '通过', duration: '0.12s', error: '-' },
  { key: '2', suite: '用户管理', name: '创建用户', status: '失败', duration: '0.35s', error: '响应状态码应为 201，但实际为 400' },
  { key: '3', suite: '商品管理', name: '获取商品列表', status: '通过', duration: '0.08s', error: '-' },
  { key: '4', suite: '订单管理', name: '创建订单', status: '跳过', duration: '-', error: '依赖测试未通过' }
])

const getMethodColor = (method) => {
  const colors = {
    'GET': 'green',
    'POST': 'blue',
    'PUT': 'orange',
    'DELETE': 'red',
    'PATCH': 'purple'
  }
  return colors[method] || 'default'
}

const getTestStatusColor = (status) => {
  const colors = {
    '通过': 'green',
    '失败': 'red',
    '进行中': 'blue',
    '未执行': 'default',
    '跳过': 'orange'
  }
  return colors[status] || 'default'
}

const onSelectChange = (keys) => {
  selectedRowKeys.value = keys
}

const importOpenAPI = () => {
  if (!openapiUrl.value) {
    message.warning('请输入 OpenAPI 文档 URL')
    return
  }
  importedCount.value = 25
  message.success('OpenAPI 文档导入成功')
}

const beforeUpload = () => {
  importedCount.value = 15
  message.success('JSON 文件导入成功')
  return false
}

const beforeDataUpload = () => {
  message.success('数据文件上传成功')
  return false
}

const generateTestCases = () => {
  message.success('测试用例已生成')
}

const runSelectedTests = () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请选择要执行的测试用例')
    return
  }
  message.info(`正在执行 ${selectedRowKeys.value.length} 个测试用例...`)
}

const runAllTests = () => {
  message.info('正在执行所有测试用例...')
}

const runSingleTest = (record) => {
  message.info(`正在执行: ${record.name}`)
}

const runDDT = () => {
  message.info('正在执行数据驱动测试...')
}
</script>

<style scoped>
.api-test {
  width: 100%;
}
</style>
