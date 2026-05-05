<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="总测试用例数"
            :value="128"
            :value-style="{ color: '#3f8600' }"
            prefix={<TrophyOutlined />}
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="UI 测试用例"
            :value="45"
            :value-style="{ color: '#1890ff' }"
            prefix={<BugOutlined />}
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="API 测试用例"
            :value="83"
            :value-style="{ color: '#722ed1' }"
            prefix={<ApiOutlined />}
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="今日执行成功率"
            :value="94.5"
            :precision="2"
            :value-style="{ color: '#52c41a' }"
            suffix="%"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="12">
        <a-card title="最近执行任务">
          <a-table
            :columns="executionColumns"
            :data-source="executionData"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="getStatusColor(record.status)">
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small">查看报告</a-button>
                  <a-button type="link" size="small">重新执行</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="环境状态">
          <a-list>
            <a-list-item>
              <a-list-item-meta
                title="开发环境 (Dev)"
                description="http://dev.example.com"
              />
              <a-tag color="green">正常</a-tag>
            </a-list-item>
            <a-list-item>
              <a-list-item-meta
                title="测试环境 (Test)"
                description="http://test.example.com"
              />
              <a-tag color="green">正常</a-tag>
            </a-list-item>
            <a-list-item>
              <a-list-item-meta
                title="生产环境 (Prod)"
                description="http://prod.example.com"
              />
              <a-tag color="orange">维护中</a-tag>
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="24">
        <a-card title="快捷操作">
          <a-space wrap>
            <a-button type="primary" @click="goToUIDesigner">
              <BugOutlined /> UI 测试设计
            </a-button>
            <a-button type="primary" @click="goToAPITest">
              <ApiOutlined /> API 测试矩阵
            </a-button>
            <a-button @click="goToScheduler">
              <ScheduleOutlined /> 新建调度任务
            </a-button>
            <a-button @click="goToReports">
              <FileTextOutlined /> 查看测试报告
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { h } from 'vue'
import { useRouter } from 'vue-router'
import {
  TrophyOutlined,
  BugOutlined,
  ApiOutlined,
  ScheduleOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'

const router = useRouter()

const executionColumns = [
  { title: '任务名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '状态', key: 'status' },
  { title: '执行时间', dataIndex: 'time', key: 'time' },
  { title: '操作', key: 'action' }
]

const executionData = [
  { key: '1', name: '用户登录流程测试', type: 'UI测试', status: '通过', time: '2分钟前' },
  { key: '2', name: '商品列表API', type: 'API测试', status: '通过', time: '5分钟前' },
  { key: '3', name: '购物车功能测试', type: 'UI测试', status: '失败', time: '10分钟前' },
  { key: '4', name: '用户信息查询API', type: 'API测试', status: '通过', time: '15分钟前' },
  { key: '5', name: '订单创建流程', type: 'UI测试', status: '进行中', time: '执行中' }
]

const getStatusColor = (status) => {
  const colors = {
    '通过': 'green',
    '失败': 'red',
    '进行中': 'blue',
    '待执行': 'default'
  }
  return colors[status] || 'default'
}

const goToUIDesigner = () => router.push('/ui-designer')
const goToAPITest = () => router.push('/api-test')
const goToScheduler = () => router.push('/scheduler')
const goToReports = () => router.push('/reports')
</script>

<style scoped>
.dashboard {
  width: 100%;
}
</style>
