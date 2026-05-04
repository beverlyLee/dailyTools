<template>
  <div id="app">
    <header class="header">
      <div class="container">
        <h1>
          <span>🎯</span>
          注意力与专注力数据分析
        </h1>
        <p class="subtitle">追踪、分析、优化您的工作效率</p>
      </div>
    </header>

    <main class="main-content">
      <div class="container">
        <Dashboard />
      </div>
    </main>
  </div>
</template>

<script>
import { defineComponent, onMounted } from 'vue'
import { useAnalyticsStore } from './stores/analyticsStore'
import Dashboard from './components/Dashboard.vue'

export default defineComponent({
  name: 'App',
  components: {
    Dashboard
  },
  setup() {
    const store = useAnalyticsStore()

    onMounted(async () => {
      await store.fetchOverview()
      await store.fetchStats()
    })

    return {}
  }
})
</script>
