<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header style="background: #001529; padding: 0 24px">
      <div style="display: flex; align-items: center; height: 100%">
        <h1 style="color: white; margin: 0; font-size: 20px">
          方程求解与数据预测系统
        </h1>
        <a-menu
          theme="dark"
          mode="horizontal"
          :selected-keys="[route.path]"
          style="margin-left: 40px; border: none"
        >
          <a-menu-item key="/">
            <router-link to="/">首页</router-link>
          </a-menu-item>
          <a-menu-item key="/ode-solver">
            <router-link to="/ode-solver">ODE 求解器</router-link>
          </a-menu-item>
          <a-menu-item key="/housing-predictor">
            <router-link to="/housing-predictor">房价预测器</router-link>
          </a-menu-item>
        </a-menu>
      </div>
    </a-layout-header>
    <a-layout-content style="padding: 24px; background: #f0f2f5">
      <router-view />
    </a-layout-content>
    <a-layout-footer style="text-align: center; background: #001529; color: white">
      方程求解与数据预测系统 ©2024
    </a-layout-footer>
  </a-layout>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  width: 100%;
  height: 100vh;
}

.ant-menu-horizontal {
  line-height: 64px;
}
</style>
