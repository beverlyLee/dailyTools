<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-left">
        <el-icon :size="30" color="#409EFF">
          <Document />
        </el-icon>
        <span class="title">智能简历解析与评分系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        mode="horizontal"
        :router="true"
        background-color="transparent"
        text-color="#303133"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          首页
        </el-menu-item>
        <el-menu-item index="/resume">
          <el-icon><UploadFilled /></el-icon>
          简历解析
        </el-menu-item>
        <el-menu-item index="/job">
          <el-icon><OfficeBuilding /></el-icon>
          岗位管理
        </el-menu-item>
        <el-menu-item index="/match">
          <el-icon><DataAnalysis /></el-icon>
          匹配分析
        </el-menu-item>
        <el-menu-item index="/talent">
          <el-icon><UserFilled /></el-icon>
          人才库
        </el-menu-item>
      </el-menu>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Document, HomeFilled, UploadFilled, 
  OfficeBuilding, DataAnalysis, UserFilled 
} from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 0 40px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.app-main {
  padding: 20px 40px;
  background-color: #f5f7fa;
}

.el-menu--horizontal {
  border-bottom: none;
}

.el-menu--horizontal > .el-menu-item {
  border-bottom: 2px solid transparent;
}

.el-menu--horizontal > .el-menu-item.is-active {
  border-bottom: 2px solid #409EFF;
}
</style>
