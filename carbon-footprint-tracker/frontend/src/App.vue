<template>
  <div id="app">
    <header>
      <h1>个人碳足迹追踪器</h1>
      <p>记录您的日常活动，追踪碳排放，为环保贡献力量</p>
    </header>
    
    <main>
      <div class="dashboard">
        <div class="summary-card">
          <h3>今日碳排放</h3>
          <p class="carbon-value">{{ totalCarbon }} kg CO₂</p>
        </div>
        
        <div class="summary-card">
          <h3>本月碳排放</h3>
          <p class="carbon-value">{{ monthlyCarbon }} kg CO₂</p>
        </div>
        
        <div class="summary-card">
          <h3>累计碳排放</h3>
          <p class="carbon-value">{{ totalAllTime }} kg CO₂</p>
        </div>
      </div>
      
      <div class="main-content">
        <div class="left-panel">
          <DataEntry @recordAdded="fetchRecords" />
          <RecordsList :records="records" @recordDeleted="fetchRecords" />
        </div>
        
        <div class="right-panel">
          <CarbonCharts :records="records" />
        </div>
      </div>
    </main>
    
    <footer>
      <p>保护环境，从记录每一次碳排放开始</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCarbonStore } from './stores/carbonStore'
import DataEntry from './components/DataEntry.vue'
import RecordsList from './components/RecordsList.vue'
import CarbonCharts from './components/CarbonCharts.vue'

const store = useCarbonStore()
const records = ref([])

const totalCarbon = computed(() => store.todayCarbon)
const monthlyCarbon = computed(() => store.monthlyCarbon)
const totalAllTime = computed(() => store.totalCarbon)

const fetchRecords = async () => {
  await store.fetchRecords()
  records.value = store.records
}

onMounted(() => {
  fetchRecords()
})
</script>

<style>
#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  min-height: 100vh;
  background-color: #f5f7fa;
  color: #333;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 600;
}

header p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

main {
  max-width: 1400px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.summary-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.summary-card h3 {
  margin: 0 0 1rem 0;
  color: #667eea;
  font-size: 1rem;
  font-weight: 500;
}

.carbon-value {
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  color: #333;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.left-panel, .right-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

footer {
  text-align: center;
  padding: 2rem;
  color: #666;
  margin-top: 2rem;
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
</style>
