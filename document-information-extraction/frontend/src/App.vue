<template>
  <el-container style="height: 100vh;">
    <el-header style="background: #003366; color: white; padding: 0 20px; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <el-icon :size="28" style="margin-right: 12px;"><Document /></el-icon>
        <h2 style="margin: 0; font-weight: 500;">增值税发票智能核验系统</h2>
      </div>
    </el-header>
    
    <el-container>
      <el-aside width="220px" style="background: #f5f7fa; border-right: 1px solid #e4e7ed;">
        <el-menu
          :default-active="$route.path"
          class="el-menu-vertical-demo"
          router
          style="border-right: none;"
        >
          <el-menu-item index="/upload">
            <el-icon><Upload /></el-icon>
            <span>票据上传识别</span>
          </el-menu-item>
          <el-menu-item index="/list">
            <el-icon><List /></el-icon>
            <span>票据列表</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <el-main style="background: #f5f7fa; padding: 20px;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { Document, Upload, List } from '@element-plus/icons-vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 220px;
  min-height: 400px;
}

.el-menu-item.is-active {
  background-color: #ecf5ff !important;
  color: #409eff !important;
}
</style>
