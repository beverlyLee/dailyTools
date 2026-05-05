<template>
  <a-layout class="app-layout">
    <a-layout-sider v-model:collapsed="collapsed" collapsible :width="256">
      <div class="logo">
        <h1>微服务治理平台</h1>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        mode="inline"
        theme="dark"
      >
        <a-menu-item key="dashboard">
          <dashboard-outlined />
          <span>概览</span>
        </a-menu-item>
        <a-sub-menu key="topology">
          <template #icon>
            <apartment-outlined />
          </template>
          <template #title>服务拓扑</template>
          <a-menu-item key="topology-graph">
            <line-chart-outlined />
            <span>拓扑视图</span>
          </a-menu-item>
          <a-menu-item key="topology-metrics">
            <bar-chart-outlined />
            <span>服务指标</span>
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="traffic">
          <template #icon>
            <swap-outlined />
          </template>
          <template #title>流量治理</template>
          <a-menu-item key="traffic-canary">
            <experiment-outlined />
            <span>金丝雀发布</span>
          </a-menu-item>
          <a-menu-item key="traffic-bluegreen">
            <branches-outlined />
            <span>蓝绿部署</span>
          </a-menu-item>
          <a-menu-item key="traffic-circuitbreaker">
            <safety-outlined />
            <span>熔断降级</span>
          </a-menu-item>
          <a-menu-item key="traffic-mirror">
            <copy-outlined />
            <span>流量镜像</span>
          </a-menu-item>
          <a-menu-item key="traffic-fault">
            <bug-outlined />
            <span>故障注入</span>
          </a-menu-item>
        </a-sub-menu>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <div class="user-info">
          <a-avatar>管理员</a-avatar>
          <span class="user-name">Admin</span>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  DashboardOutlined,
  ApartmentOutlined,
  LineChartOutlined,
  BarChartOutlined,
  SwapOutlined,
  ExperimentOutlined,
  BranchesOutlined,
  SafetyOutlined,
  CopyOutlined,
  BugOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const selectedKeys = ref(['dashboard'])
const openKeys = ref(['topology'])

onMounted(() => {
  // 根据当前路由设置选中的菜单
  const path = route.path
  if (path.includes('topology')) {
    selectedKeys.value = [path.replace('/', '')]
    openKeys.value = ['topology']
  } else if (path.includes('traffic')) {
    selectedKeys.value = [path.replace('/', '')]
    openKeys.value = ['traffic']
  } else {
    selectedKeys.value = ['dashboard']
  }
})
</script>

<style>
.app-layout {
  min-height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
}

.logo h1 {
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.header {
  background: #fff;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-size: 14px;
  color: #333;
}

.content {
  margin: 24px 16px;
  padding: 24px;
  background: #fff;
  min-height: 280px;
  border-radius: 4px;
}
</style>
