<template>
  <el-config-provider :locale="zhCn">
    <div class="app-container">
      <el-container>
        <el-aside width="220px" class="sidebar">
          <div class="logo">
            <el-icon :size="24" color="#409EFF"><Monitor /></el-icon>
            <span class="logo-text">稳态监视器</span>
          </div>
          <el-menu
            :default-active="activeMenu"
            class="sidebar-menu"
            background-color="#1f2937"
            text-color="#9ca3af"
            active-text-color="#409EFF"
            router
          >
            <el-menu-item index="/dashboard">
              <el-icon><Odometer /></el-icon>
              <span>监控仪表盘</span>
            </el-menu-item>
            <el-menu-item index="/thresholds">
              <el-icon><Setting /></el-icon>
              <span>阈值配置</span>
            </el-menu-item>
            <el-menu-item index="/checks">
              <el-icon><Check /></el-icon>
              <span>稳态检查</span>
            </el-menu-item>
            <el-menu-item index="/circuit-breaker">
              <el-icon><Warning /></el-icon>
              <span>熔断管理</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { Monitor, Odometer, Setting, Check, Warning } from '@element-plus/icons-vue'

const route = useRoute()

const activeMenu = computed(() => route.path)
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  background-color: #f5f7fa;
}

.sidebar {
  background-color: #1f2937;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #374151;
}

.logo-text {
  margin-left: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.sidebar-menu {
  border-right: none;
}

.main-content {
  margin-left: 220px;
  padding: 20px;
  min-height: 100vh;
}
</style>
