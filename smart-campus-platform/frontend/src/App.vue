<template>
  <div class="app-container">
    <el-container>
      <el-header class="app-header">
        <div class="logo">智慧园区综合管理平台</div>
        <div class="header-info">
          <span>{{ currentTime }}</span>
          <el-button type="text" @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-container>
        <el-aside width="200px" class="app-aside">
          <el-menu
            :default-active="activeMenu"
            router
            background-color="#304156"
            text-color="#bfcbd9"
            active-text-color="#409EFF"
          >
            <el-menu-item index="/">
              <el-icon><Monitor /></el-icon>
              <span>首页概览</span>
            </el-menu-item>
            <el-sub-menu index="security">
              <template #title>
                <el-icon><VideoCamera /></el-icon>
                <span>综合安防态势</span>
              </template>
              <el-menu-item index="/security/video">视频监控</el-menu-item>
              <el-menu-item index="/security/access">门禁管理</el-menu-item>
              <el-menu-item index="/security/fire">消防系统</el-menu-item>
              <el-menu-item index="/security/alarm">告警处置</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="energy">
              <template #title>
                <el-icon><Lightning /></el-icon>
                <span>能源能耗分析</span>
              </template>
              <el-menu-item index="/energy/dashboard">能耗概览</el-menu-item>
              <el-menu-item index="/energy/peak">峰谷平分析</el-menu-item>
              <el-menu-item index="/energy/ranking">能耗排名</el-menu-item>
              <el-menu-item index="/energy/report">优化建议</el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>
        <el-main class="app-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Monitor, VideoCamera, Lightning } from '@element-plus/icons-vue'

const route = useRoute()
const currentTime = ref('')
let timeInterval = null

const activeMenu = computed(() => {
  return route.path
})

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN')
}

const logout = () => {
  console.log('用户退出登录')
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
}

.app-container {
  height: 100%;
  width: 100%;
}

.app-header {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.logo {
  font-size: 20px;
  font-weight: bold;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 14px;
}

.header-info .el-button {
  color: #bfcbd9;
}

.header-info .el-button:hover {
  color: #409EFF;
}

.app-aside {
  background-color: #304156;
}

.app-aside .el-menu {
  border-right: none;
}

.app-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow: auto;
}
</style>
