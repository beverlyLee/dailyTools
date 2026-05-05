<template>
  <div class="app">
    <header class="header">
      <h1>服务监控与自愈系统</h1>
      <nav class="nav">
        <router-link to="/dashboard" class="nav-link">仪表盘</router-link>
        <router-link to="/monitoring" class="nav-link">系统监控</router-link>
        <router-link to="/probes" class="nav-link">黑盒探测</router-link>
        <router-link to="/self-healing" class="nav-link">故障自愈</router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
  color: white;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.nav {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  font-weight: 500;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.main {
  flex: 1;
  padding: 2rem;
  background-color: #f3f4f6;
}
</style>
