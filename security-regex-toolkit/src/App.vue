<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <span class="app-title">🛡️ 安全工具箱</span>
      </div>
      <nav class="header-nav">
        <router-link 
          v-for="item in navItems" 
          :key="item.path" 
          :to="item.path"
          :class="['nav-link', { active: $route.path === item.path }]"
        >
          {{ item.icon }} {{ item.label }}
        </router-link>
      </nav>
    </header>
    
    <main class="app-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
const navItems = [
  { path: '/password-manager', label: '密码管理器', icon: '🔐' },
  { path: '/regex-tester', label: '正则测试器', icon: '🔍' },
]
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #4ade80;
}

.header-nav {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-link.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.app-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .header-nav {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .app-content {
    padding: 1rem;
  }
}
</style>
