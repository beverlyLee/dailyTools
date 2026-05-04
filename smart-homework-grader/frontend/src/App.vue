<template>
  <div class="app-container">
    <el-container>
      <el-aside width="200px" class="sidebar">
        <div class="logo">
          <h3>智能作文批改</h3>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/">
            <el-icon><Edit /></el-icon>
            <span>作文提交</span>
          </el-menu-item>
          <el-menu-item index="/essays">
            <el-icon><Document /></el-icon>
            <span>我的作文</span>
          </el-menu-item>
          <el-menu-item index="/classes">
            <el-icon><OfficeBuilding /></el-icon>
            <span>班级管理</span>
          </el-menu-item>
          <el-menu-item index="/analysis">
            <el-icon><DataAnalysis /></el-icon>
            <span>学情分析</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="header">
          <div class="user-info">
            <el-avatar :size="40" icon="UserFilled" />
            <span class="username">{{ currentUser }}</span>
          </div>
        </el-header>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const activeMenu = computed(() => route.path)
const currentUser = computed(() => '学生用户')
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  height: 100vh;
}

.el-container {
  height: 100%;
}

.sidebar {
  background-color: #304156;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #263445;
}

.logo h3 {
  color: #fff;
  font-size: 18px;
  font-weight: 500;
}

.el-menu {
  border-right: none;
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-size: 14px;
  color: #606266;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>
