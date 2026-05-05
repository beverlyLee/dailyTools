<template>
  <div class="reports">
    <a-card title="测试报告中心">
      <a-row :gutter="16" style="margin-bottom: 16px">
        <a-col :span="6">
          <a-card size="small">
            <a-statistic
              title="总执行次数"
              :value="1256"
              :value-style="{ color: '#1890ff' }"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small">
            <a-statistic
              title="成功率"
              :value="94.2"
              :precision="1"
              :value-style="{ color: '#52c41a' }"
              suffix="%"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small">
            <a-statistic
              title="平均执行时间"
              :value="2.3"
              :precision="1"
              suffix="分钟"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small">
            <a-statistic
              title="本周新增失败"
              :value="3"
              :value-style="{ color: '#ff4d4f' }"
            />
          </a-card>
        </a-col>
      </a-row>

      <a-card title="测试报告列表" size="small">
        <a-table
          :columns="reportColumns"
          :data-source="reports"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="record.type === 'UI' ? 'blue' : 'purple'">
                {{ record.type }} 测试
              </a-tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-progress
                :percent="record.passRate"
                :status="record.passRate === 100 ? 'success' : record.passRate < 80 ? 'exception' : 'normal'"
              />
            </template>
            <template v-else-if="column.key === 'environment'">
              <a-tag :color="getEnvColor(record.environment)">
                {{ record.environment }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="viewReport(record)">查看详情</a-button>
                <a-button type="link" size="small" @click="downloadReport(record)">下载报告</a-button>
                <a-button type="link" size="small" @click="compareReport(record)">对比分析</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </a-card>

    <a-modal
      v-model:open="showReportDetail"
      title="测试报告详情"
      width="900px"
      :footer="null"
    >
      <a-descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
        <a-descriptions-item label="测试名称">{{ currentReport.name }}</a-descriptions-item>
        <a-descriptions-item label="执行时间">{{ currentReport.executeTime }}</a-descriptions-item>
        <a-descriptions-item label="执行环境">{{ currentReport.environment }}</a-descriptions-item>
        <a-descriptions-item label="总测试数">{{ currentReport.total }}</a-descriptions-item>
        <a-descriptions-item label="通过数" labelStyle="{ color: '#52c41a' }">{{ currentReport.passed }}</a-descriptions-item>
        <a-descriptions-item label="失败数" labelStyle="{ color: '#ff4d4f' }">{{ currentReport.failed }}</a-descriptions-item>
      </a-descriptions>

      <a-tabs defaultActiveKey="1">
        <a-tab-pane key="1" tab="执行概览">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-card title="测试结果统计" size="small">
                <a-list>
                  <a-list-item>
                    <a-list-item-meta title="成功用例" :description="`${currentReport.passed} 个`" />
                    <a-tag color="green">{{ ((currentReport.passed / currentReport.total) * 100).toFixed(1) }}%</a-tag>
                  </a-list-item>
                  <a-list-item>
                    <a-list-item-meta title="失败用例" :description="`${currentReport.failed} 个`" />
                    <a-tag color="red">{{ ((currentReport.failed / currentReport.total) * 100).toFixed(1) }}%</a-tag>
                  </a-list-item>
                  <a-list-item>
                    <a-list-item-meta title="跳过用例" :description="`${currentReport.skipped} 个`" />
                    <a-tag color="orange">{{ ((currentReport.skipped / currentReport.total) * 100).toFixed(1) }}%</a-tag>
                  </a-list-item>
                </a-list>
              </a-card>
            </a-col>
            <a-col :span="12">
              <a-card title="执行耗时统计" size="small">
                <a-descriptions :column="1" size="small">
                  <a-descriptions-item label="总执行时间">{{ currentReport.duration }}</a-descriptions-item>
                  <a-descriptions-item label="平均每个用例">{{ (parseFloat(currentReport.duration.split(' ')[0]) / currentReport.total).toFixed(2) }} 秒</a-descriptions-item>
                  <a-descriptions-item label="最慢用例">{{ currentReport.slowestCase }}</a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>

        <a-tab-pane key="2" tab="失败详情">
          <a-table
            :columns="failureColumns"
            :data-source="currentReport.failures || []"
            :pagination="{ pageSize: 5 }"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'error'">
                <a-text type="danger">{{ record.error }}</a-text>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="3" tab="环境信息">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="测试环境">{{ currentReport.environment }}</a-descriptions-item>
            <a-descriptions-item label="Base URL">{{ currentReport.baseUrl }}</a-descriptions-item>
            <a-descriptions-item label="浏览器/客户端">{{ currentReport.browser }}</a-descriptions-item>
            <a-descriptions-item label="操作系统">{{ currentReport.os }}</a-descriptions-item>
            <a-descriptions-item label="测试框架版本">{{ currentReport.frameworkVersion }}</a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>
      </a-tabs>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'

const showReportDetail = ref(false)

const currentReport = reactive({
  name: '',
  executeTime: '',
  environment: '',
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: '',
  slowestCase: '',
  baseUrl: '',
  browser: '',
  os: '',
  frameworkVersion: '',
  failures: []
})

const reportColumns = [
  { title: '报告名称', dataIndex: 'name', key: 'name' },
  { title: '类型', key: 'type' },
  { title: '执行时间', dataIndex: 'executeTime', key: 'executeTime' },
  { title: '环境', key: 'environment' },
  { title: '通过率', key: 'status' },
  { title: '操作', key: 'action' }
]

const reports = ref([
  {
    key: '1',
    name: '每日回归测试 - 2024-01-15',
    type: 'UI',
    executeTime: '2024-01-15 00:00:00',
    environment: 'Test',
    passRate: 95,
    total: 45,
    passed: 43,
    failed: 2,
    skipped: 0
  },
  {
    key: '2',
    name: 'API 健康检查 - 2024-01-15',
    type: 'API',
    executeTime: '2024-01-15 08:30:00',
    environment: 'Test',
    passRate: 100,
    total: 83,
    passed: 83,
    failed: 0,
    skipped: 0
  },
  {
    key: '3',
    name: '性能测试 - 2024-01-14',
    type: 'UI',
    executeTime: '2024-01-14 02:00:00',
    environment: 'Dev',
    passRate: 75,
    total: 20,
    passed: 15,
    failed: 5,
    skipped: 0
  }
])

const failureColumns = [
  { title: '用例名称', dataIndex: 'name', key: 'name' },
  { title: '步骤', dataIndex: 'step', key: 'step' },
  { title: '错误信息', key: 'error' },
  { title: '截图', dataIndex: 'screenshot', key: 'screenshot' }
]

const getEnvColor = (env) => {
  const colors = {
    'Dev': 'blue',
    'Test': 'green',
    'Prod': 'red'
  }
  return colors[env] || 'default'
}

const viewReport = (record) => {
  Object.assign(currentReport, {
    name: record.name,
    executeTime: record.executeTime,
    environment: record.environment,
    total: record.total,
    passed: record.passed,
    failed: record.failed,
    skipped: record.skipped,
    duration: '125 秒',
    slowestCase: '用户登录流程测试 (15.2秒)',
    baseUrl: 'http://test.example.com',
    browser: 'Chrome 120.0',
    os: 'Linux x86_64',
    frameworkVersion: 'Playwright 1.40.0',
    failures: record.failed > 0 ? [
      { name: '购物车功能测试', step: '点击结算按钮', error: '元素未找到: #checkout-button', screenshot: '有' },
      { name: '订单创建测试', step: '提交订单', error: '响应超时 (30秒)', screenshot: '有' }
    ] : []
  })
  showReportDetail.value = true
}

const downloadReport = (record) => {
  message.success(`正在下载报告: ${record.name}`)
}

const compareReport = (record) => {
  message.info(`打开对比分析: ${record.name}`)
}
</script>

<style scoped>
.reports {
  width: 100%;
}
</style>
