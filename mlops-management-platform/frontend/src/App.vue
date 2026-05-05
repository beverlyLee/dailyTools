<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from './store'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const isCollapse = computed(() => appStore.sidebarCollapsed)

const menuItems = [
  {
    index: 'experiments',
    title: '实验管理',
    icon: 'DataAnalysis',
    path: '/experiments'
  },
  {
    index: 'models',
    title: '模型管理',
    icon: 'Box',
    path: '/models'
  },
  {
    index: 'monitoring',
    title: '服务监控',
    icon: 'Monitor',
    path: '/monitoring'
  }
]

const handleSelect = (index) => {
  const item = menuItems.find(m => m.index === index)
  if (item) {
    router.push(item.path)
  }
}

const toggleSidebar = () => {
  appStore.toggleSidebar()
}

const activeMenu = computed(() => {
  if (route.path.startsWith('/experiments')) return 'experiments'
  if (route.path.startsWith('/models')) return 'models'
  if (route.path.startsWith('/monitoring')) return 'monitoring'
  return 'experiments'
})
</script>

<template>
  <el-container class="el-container">
    <el-header>
      <div style="display: flex; align-items: center; gap: 16px;">
        <el-icon 
          :size="20" 
          style="cursor: pointer;" 
          @click="toggleSidebar"
        >
          <component :is="isCollapse ? 'Expand' : 'Fold'" />
        </el-icon>
        <h2 style="margin: 0;">MLOps 运维平台</h2>
      </div>
      <div style="display: flex; align-items: center; gap: 16px;">
        <el-tag type="info">v1.0.0</el-tag>
      </div>
    </el-header>
    <el-container>
      <el-aside :width="isCollapse ? '64px' : '200px'">
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
          @select="handleSelect"
        >
          <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
