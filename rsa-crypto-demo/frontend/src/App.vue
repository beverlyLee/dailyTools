<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          <el-icon><Lock /></el-icon>
          RSA 密码学算法演示应用
        </h1>
        <div class="header-nav">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/key-generation" class="nav-link">密钥生成向导</router-link>
          <router-link to="/calculator" class="nav-link">大整数计算器</router-link>
          <router-link to="/crypto" class="nav-link">加密解密</router-link>
          <router-link to="/history" class="nav-link">历史记录</router-link>
        </div>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
    <el-footer class="app-footer">
      <p>RSA 密码学算法演示应用 v1.0.0 | 用于教学演示</p>
    </el-footer>
  </el-container>
</template>

<script setup>
import { Lock } from '@element-plus/icons-vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f7fa;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.app-title {
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-nav {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
}

.router-link-active {
  background-color: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: 500;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 20px;
  width: 100%;
}

.app-footer {
  background-color: #2c3e50;
  color: #ecf0f1;
  text-align: center;
  padding: 20px;
  font-size: 0.9rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 3px solid #667eea;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 24px;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e6ed;
}

.form-item {
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.result-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.result-title {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 10px;
}

.result-content {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.9rem;
  color: #2d3748;
  word-break: break-all;
  line-height: 1.6;
}

.steps-container {
  margin-top: 20px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;
}

.step-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 16px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
}

.step-description {
  color: #718096;
  font-size: 0.9rem;
  line-height: 1.5;
}

.info-box {
  background-color: #ebf8ff;
  border-left: 4px solid #4299e1;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.info-box p {
  margin: 0;
  color: #2b6cb0;
  line-height: 1.6;
}

.warning-box {
  background-color: #fffaf0;
  border-left: 4px solid #ed8936;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.warning-box p {
  margin: 0;
  color: #c05621;
  line-height: 1.6;
}

.success-box {
  background-color: #f0fff4;
  border-left: 4px solid #48bb78;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.success-box p {
  margin: 0;
  color: #276749;
  line-height: 1.6;
}
</style>
