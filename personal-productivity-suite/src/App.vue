<template>
  <div class="app-container">
    <nav class="nav-bar">
      <div class="nav-brand">
        <span class="brand-icon">📊</span>
        <span class="brand-name">个人效率工具</span>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-link">
          <span class="link-icon">⏱️</span>
          <span class="link-text">番茄钟</span>
        </router-link>
        <router-link to="/tasks" class="nav-link">
          <span class="link-icon">📋</span>
          <span class="link-text">任务管理</span>
        </router-link>
        <router-link to="/stats" class="nav-link">
          <span class="link-icon">📈</span>
          <span class="link-text">统计分析</span>
        </router-link>
        <router-link to="/notes" class="nav-link">
          <span class="link-icon">📝</span>
          <span class="link-text">知识库</span>
        </router-link>
      </div>
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
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 2rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 1.5rem;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  text-decoration: none;
  font-size: 0.95rem;
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

.link-icon {
  font-size: 1rem;
}

.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
  overflow: auto;
}
</style>
