<template>
  <div id="app">
    <el-container>
      <el-header class="header">
        <h1>新零售收银系统</h1>
        <div class="header-info">
          <span>门店：{{ storeInfo.name }}</span>
          <span>员工：{{ currentUser.name }}</span>
        </div>
      </el-header>
      <el-container>
        <el-aside width="200px" class="sidebar">
          <el-menu
            :default-active="activeMenu"
            router
            class="sidebar-menu"
          >
            <el-menu-item index="/cashier">
              <el-icon><Money /></el-icon>
              <span>收银台</span>
            </el-menu-item>
            <el-menu-item index="/inventory">
              <el-icon><Box /></el-icon>
              <span>库存管理</span>
            </el-menu-item>
            <el-menu-item index="/report">
              <el-icon><Document /></el-icon>
              <span>报表统计</span>
            </el-menu-item>
            <el-menu-item index="/setting">
              <el-icon><Setting /></el-icon>
              <span>系统设置</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Money, Box, Document, Setting } from '@element-plus/icons-vue'

const activeMenu = ref('/cashier')
const storeInfo = ref({
  name: '测试门店'
})
const currentUser = ref({
  name: '收银员A'
})
</script>

<style>
#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  margin: 0;
  padding: 0;
}

.el-container {
  height: 100%;
}

.header {
  background-color: #409eff;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
}

.header-info {
  display: flex;
  gap: 20px;
}

.sidebar {
  background-color: #f5f7fa;
}

.sidebar-menu {
  border-right: none;
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
}
</style>
