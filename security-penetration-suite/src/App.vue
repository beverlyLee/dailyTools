<template>
  <el-container class="main-container">
    <el-header class="header">
      <div class="logo">
        <el-icon size="24"><Shield /></el-icon>
        <span class="title">安全渗透测试工具箱</span>
      </div>
      <div class="header-info">
        <span class="version">v1.0.0</span>
      </div>
    </el-header>
    <el-container>
      <el-aside width="220px" class="aside">
        <el-menu
          :default-active="activeMenu"
          router
          class="aside-menu"
          background-color="#1a1a2e"
          text-color="#eee"
          active-text-color="#1890ff"
        >
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/vuln-scanner">
            <el-icon><Search /></el-icon>
            <span>漏洞扫描器</span>
          </el-menu-item>
          <el-menu-item index="/asset-analyzer">
            <el-icon><Monitor /></el-icon>
            <span>资产分析器</span>
          </el-menu-item>
          <el-menu-item index="/reports">
            <el-icon><Document /></el-icon>
            <span>报告管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const activeMenu = computed(() => route.path);
</script>

<style scoped>
.main-container {
  height: 100vh;
}

.header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}

.title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 1px;
}

.header-info {
  color: #aaa;
  font-size: 14px;
}

.version {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.aside {
  background-color: #1a1a2e;
}

.aside-menu {
  border-right: none;
  height: 100%;
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
}
</style>
