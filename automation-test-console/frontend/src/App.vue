<template>
  <a-layout id="app-layout" style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo">
        <h2>{{ collapsed ? 'ATC' : '自动化测试指挥台' }}</h2>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="inline"
        :items="menuItems"
        @click="handleMenuClick"
      />
    </a-layout-sider>
    <a-layout>
      <a-layout-header style="background: #fff; padding: 0 16px">
        <div class="header-content">
          <span>{{ currentPageTitle }}</span>
          <a-space>
            <a-avatar>Admin</a-avatar>
          </a-space>
        </div>
      </a-layout-header>
      <a-layout-content
        style="margin: 24px 16px; padding: 24px; background: #fff; min-height: 280px"
      >
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  DashboardOutlined,
  BugOutlined,
  ApiOutlined,
  ScheduleOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const selectedKeys = ref([route.path])

const menuItems = [
  {
    key: '/',
    icon: h(DashboardOutlined),
    label: '仪表盘'
  },
  {
    key: '/ui-designer',
    icon: h(BugOutlined),
    label: 'UI 自动化设计器'
  },
  {
    key: '/api-test',
    icon: h(ApiOutlined),
    label: 'API 测试矩阵'
  },
  {
    key: '/scheduler',
    icon: h(ScheduleOutlined),
    label: '任务调度'
  },
  {
    key: '/reports',
    icon: h(FileTextOutlined),
    label: '测试报告'
  }
]

const currentPageTitle = computed(() => {
  const item = menuItems.find(m => m.key === route.path)
  return item ? item.label : '仪表盘'
})

const handleMenuClick = ({ key }) => {
  router.push(key)
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app-layout {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
}

.logo h2 {
  color: white;
  margin: 0;
  font-size: 18px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}
</style>
