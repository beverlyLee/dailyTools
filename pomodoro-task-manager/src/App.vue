<template>
  <div class="app-container">
    <nav class="nav-bar">
      <router-link to="/" class="nav-link">番茄钟</router-link>
      <router-link to="/tasks" class="nav-link">任务列表</router-link>
      <router-link to="/stats" class="nav-link">统计分析</router-link>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.nav-bar {
  display: flex;
  justify-content: center;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  gap: 2rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
}

.nav-link.router-link-active {
  background: rgba(255, 255, 255, 0.3);
  font-weight: 600;
}

.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}
</style>
