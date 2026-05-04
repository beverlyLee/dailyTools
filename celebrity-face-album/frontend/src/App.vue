<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-left">
        <el-icon size="30" color="#409EFF"><Document /></el-icon>
        <h1 class="title">智能简历解析与评分系统</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="goToResume">
          <el-icon><Upload /></el-icon>
          简历解析
        </el-button>
        <el-button type="success" @click="goToJob">
          <el-icon><Edit /></el-icon>
          JD管理
        </el-button>
        <el-button type="warning" @click="goToMatch">
          <el-icon><TrendCharts /></el-icon>
          匹配分析
        </el-button>
        <el-button type="info" @click="goToTalent">
          <el-icon><User /></el-icon>
          人才库
        </el-button>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
    <el-footer class="app-footer">
      <p>© 2024 智能简历解析与评分系统 - Powered by Vue3 + FastAPI</p>
    </el-footer>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Document, Upload, Edit, TrendCharts, User } from '@element-plus/icons-vue'

const router = useRouter()

const goToResume = () => {
  router.push('/resume')
}

const goToJob = () => {
  router.push('/job')
}

const goToMatch = () => {
  router.push('/match')
}

const goToTalent = () => {
  router.push('/talent')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  background-color: #f5f7fa;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 15px;
}

.app-main {
  padding: 30px;
  background-color: #f5f7fa;
}

.app-footer {
  background-color: #303133;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  padding: 20px;
}
</style>
