<script setup lang="ts">
import ChairModel from './components/ChairModel.vue'
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="title">榫卯椅 · 拆装教学</div>
      <div class="hint">拖动椅腿、扶手等部件靠近其正确位置即可自动「咔哒」归位 · 右键旋转视角 · 滚轮缩放</div>
    </header>
    <ChairModel />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.topbar {
  padding: 10px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.45);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  z-index: 10;
}
.title { font-size: 16px; font-weight: 600; letter-spacing: 1px; }
.hint { font-size: 12px; color: #aaa; }
</style>
