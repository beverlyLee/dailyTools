<template>
  <div id="app">
    <header class="header">
      <div class="container">
        <h1 class="header-title">📚 个人阅读习惯分析</h1>
        <p class="header-subtitle">跟踪和分析您的阅读数据</p>
      </div>
    </header>

    <nav class="nav">
      <div class="container">
        <div class="tabs">
          <div 
            class="tab" 
            :class="{ active: activeTab === 'dashboard' }"
            @click="activeTab = 'dashboard'"
          >
            仪表板
          </div>
          <div 
            class="tab" 
            :class="{ active: activeTab === 'books' }"
            @click="activeTab = 'books'"
          >
            书籍管理
          </div>
          <div 
            class="tab" 
            :class="{ active: activeTab === 'sessions' }"
            @click="activeTab = 'sessions'"
          >
            阅读记录
          </div>
          <div 
            class="tab" 
            :class="{ active: activeTab === 'notes' }"
            @click="activeTab = 'notes'"
          >
            阅读笔记
          </div>
          <div 
            class="tab" 
            :class="{ active: activeTab === 'analytics' }"
            @click="activeTab = 'analytics'"
          >
            数据分析
          </div>
          <div 
            class="tab" 
            :class="{ active: activeTab === 'sync' }"
            @click="activeTab = 'sync'"
          >
            数据同步
          </div>
        </div>
      </div>
    </nav>

    <main class="main">
      <div class="container">
        <Dashboard v-if="activeTab === 'dashboard'" />
        <BookList v-if="activeTab === 'books'" />
        <SessionList v-if="activeTab === 'sessions'" />
        <NoteList v-if="activeTab === 'notes'" />
        <Analytics v-if="activeTab === 'analytics'" />
        <DataSync v-if="activeTab === 'sync'" />
      </div>
    </main>

    <footer class="footer">
      <div class="container">
        <p class="text-center text-secondary text-sm">
          个人阅读习惯分析应用 &copy; 2024
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Dashboard from './components/Dashboard.vue'
import BookList from './components/BookList.vue'
import SessionList from './components/SessionList.vue'
import NoteList from './components/NoteList.vue'
import Analytics from './components/Analytics.vue'
import DataSync from './components/DataSync.vue'

const activeTab = ref('dashboard')
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
  padding: 2rem 0;
  margin-bottom: 1.5rem;
}

.header-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.header-subtitle {
  font-size: 1rem;
  opacity: 0.9;
}

.nav {
  margin-bottom: 1.5rem;
  background-color: var(--card-background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 0 1rem;
}

.main {
  min-height: calc(100vh - 400px);
}

.footer {
  margin-top: 3rem;
  padding: 2rem 0;
  border-top: 1px solid var(--border-color);
}
</style>
