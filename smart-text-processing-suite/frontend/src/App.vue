<template>
  <el-config-provider :locale="zhCn">
    <div class="app-container">
      <el-container>
        <el-aside width="200px" class="sidebar">
          <div class="logo">
            <h3>智能文本处理系统</h3>
          </div>
          <el-menu :default-active="activeMenu" router class="menu">
            <el-menu-item index="/essay">
              <el-icon><EditPen /></el-icon>
              <span>作文批改</span>
            </el-menu-item>
            <el-menu-item index="/document">
              <el-icon><Document /></el-icon>
              <span>公文校对</span>
            </el-menu-item>
            <el-menu-item index="/history">
              <el-icon><Clock /></el-icon>
              <span>历史记录</span>
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

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  height: 100vh;
  width: 100%;
}

.sidebar {
  background-color: #304156;
  color: #bfcbd9;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #3a4a5c;
}

.logo h3 {
  color: #fff;
  font-size: 16px;
  margin: 0;
}

.menu {
  border-right: none;
  background-color: #304156;
}

.menu .el-menu-item {
  color: #bfcbd9;
}

.menu .el-menu-item:hover {
  background-color: #263445;
}

.menu .el-menu-item.is-active {
  color: #409eff;
}

.main-content {
  padding: 20px;
  background-color: #f0f2f5;
}
</style>
