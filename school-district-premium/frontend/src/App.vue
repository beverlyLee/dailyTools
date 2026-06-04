<template>
  <div class="app-container">
    <header class="app-header">
      <h1>学区溢价空间分布分析</h1>
      <div class="controls">
        <button @click="fetchData" :disabled="loading" class="btn btn-primary">
          {{ loading ? '计算中...' : '重新计算' }}
        </button>
        <button @click="toggleLegend" class="btn btn-secondary">图例</button>
      </div>
    </header>
    <div class="main-content">
      <MapContainer
        :districts="districts"
        :premiums="premiums"
        :loading="loading"
        @district-click="onDistrictClick"
      />
      <aside class="sidebar" :class="{ 'sidebar-open': showSidebar }">
        <div class="sidebar-header">
          <h3>{{ selectedDistrict ? selectedDistrict.school_name : '学区概览' }}</h3>
          <button @click="showSidebar = false" class="btn-close">&times;</button>
        </div>
        <div v-if="selectedDistrict" class="sidebar-content">
          <div class="stat-card">
            <span class="stat-label">平均溢价率</span>
            <span class="stat-value premium" :style="{ color: getPremiumColor(selectedDistrict.avg_premium_pct) }">
              {{ selectedDistrict.avg_premium_pct }}%
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">平均单价</span>
            <span class="stat-value">{{ formatPrice(selectedDistrict.avg_unit_price) }} 元/m²</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">样本数量</span>
            <span class="stat-value">{{ selectedDistrict.sample_count }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">所属区域</span>
            <span class="stat-value">{{ selectedDistrict.district }}</span>
          </div>
          <h4 style="margin-top: 16px;">周边小区</h4>
          <ul class="community-list">
            <li v-for="p in getDistrictPremiums(selectedDistrict.school_name)" :key="p.community">
              <span class="community-name">{{ p.community }}</span>
              <span class="community-price">{{ formatPrice(p.unit_price) }} 元/m²</span>
              <span class="community-premium" :style="{ color: getPremiumColor(p.premium_pct) }">
                {{ p.premium_pct > 0 ? '+' : '' }}{{ p.premium_pct }}%
              </span>
            </li>
          </ul>
        </div>
        <div v-else class="sidebar-content">
          <p class="hint">点击地图上的学区区域查看详情</p>
          <div class="district-list">
            <div
              v-for="d in districts"
              :key="d.school_name"
              class="district-item"
              @click="onDistrictClick(d)"
            >
              <span class="district-name">{{ d.school_name }}</span>
              <span class="district-premium" :style="{ color: getPremiumColor(d.avg_premium_pct) }">
                {{ d.avg_premium_pct }}%
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
    <div v-if="showLegend" class="legend">
      <h4>溢价率图例</h4>
      <div class="legend-bar">
        <div class="legend-gradient"></div>
        <div class="legend-labels">
          <span>0%</span>
          <span>10%</span>
          <span>20%</span>
          <span>30%+</span>
        </div>
      </div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-dot" style="background: rgba(255,80,80,0.7); width: 14px; height: 14px;"></span>
          <span>高溢价 (>25%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: rgba(255,180,0,0.7); width: 12px; height: 12px;"></span>
          <span>中溢价 (15-25%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: rgba(80,180,255,0.7); width: 10px; height: 10px;"></span>
          <span>低溢价 (<15%)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import MapContainer from './components/MapContainer.vue'

export default {
  name: 'App',
  components: { MapContainer },
  setup() {
    const districts = ref([])
    const premiums = ref([])
    const loading = ref(false)
    const showLegend = ref(true)
    const showSidebar = ref(false)
    const selectedDistrict = ref(null)

    async function fetchData() {
      loading.value = true
      try {
        const [statsRes, premRes] = await Promise.all([
          axios.get('/api/district-stats'),
          axios.get('/api/premium'),
        ])
        districts.value = statsRes.data.districts || []
        premiums.value = premRes.data.premiums || []
      } catch (e) {
        console.error('Failed to fetch data:', e)
        const { generateDemoData } = await import('./assets/demo_data.js')
        const demo = generateDemoData()
        districts.value = demo.districts
        premiums.value = demo.premiums
      } finally {
        loading.value = false
      }
    }

    function onDistrictClick(district) {
      selectedDistrict.value = district
      showSidebar.value = true
    }

    function toggleLegend() {
      showLegend.value = !showLegend.value
    }

    function getPremiumColor(premium) {
      if (premium > 30) return '#d32f2f'
      if (premium > 25) return '#e64a19'
      if (premium > 20) return '#f57c00'
      if (premium > 15) return '#fbc02d'
      if (premium > 10) return '#4fc3f7'
      return '#81c784'
    }

    function formatPrice(price) {
      return price ? Math.round(price).toLocaleString() : '-'
    }

    function getDistrictPremiums(schoolName) {
      return premiums.value.filter(p => p.school_name === schoolName)
    }

    onMounted(() => {
      fetchData()
    })

    return {
      districts, premiums, loading, showLegend, showSidebar,
      selectedDistrict, fetchData, onDistrictClick, toggleLegend,
      getPremiumColor, formatPrice, getDistrictPremiums,
    }
  },
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #e0e0e0; }

.app-container { height: 100vh; display: flex; flex-direction: column; }

.app-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: #16213e; border-bottom: 1px solid #0f3460;
  z-index: 100;
}
.app-header h1 { font-size: 20px; font-weight: 600; color: #e94560; }
.controls { display: flex; gap: 8px; }

.btn {
  padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;
  font-size: 14px; transition: all 0.2s;
}
.btn-primary { background: #e94560; color: white; }
.btn-primary:hover { background: #c73651; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #0f3460; color: #e0e0e0; }
.btn-secondary:hover { background: #1a4a8a; }

.main-content { flex: 1; display: flex; position: relative; overflow: hidden; }

.sidebar {
  width: 320px; background: #16213e; border-left: 1px solid #0f3460;
  overflow-y: auto; transition: transform 0.3s;
  position: absolute; right: 0; top: 0; bottom: 0; z-index: 50;
  transform: translateX(100%);
}
.sidebar-open { transform: translateX(0); }

.sidebar-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px; border-bottom: 1px solid #0f3460;
}
.sidebar-header h3 { font-size: 16px; color: #e94560; }
.btn-close { background: none; border: none; color: #aaa; font-size: 20px; cursor: pointer; }

.sidebar-content { padding: 16px; }

.stat-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px; margin-bottom: 8px; background: #1a1a2e; border-radius: 8px;
}
.stat-label { color: #888; font-size: 13px; }
.stat-value { font-size: 18px; font-weight: 600; }
.stat-value.premium { font-size: 24px; }

.community-list { list-style: none; }
.community-list li {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 4px; border-bottom: 1px solid #1a1a2e; font-size: 13px;
}
.community-name { flex: 1; }
.community-price { margin: 0 8px; color: #4fc3f7; }
.community-premium { font-weight: 600; }

.hint { color: #666; text-align: center; padding: 24px; }

.district-item {
  display: flex; justify-content: space-between; padding: 10px 8px;
  border-bottom: 1px solid #1a1a2e; cursor: pointer; transition: background 0.2s;
}
.district-item:hover { background: #1a1a2e; }
.district-name { font-size: 14px; }
.district-premium { font-weight: 600; font-size: 14px; }

.legend {
  position: absolute; bottom: 20px; left: 20px; z-index: 60;
  background: rgba(22, 33, 62, 0.95); border-radius: 10px; padding: 16px;
  border: 1px solid #0f3460; min-width: 200px;
}
.legend h4 { margin-bottom: 10px; font-size: 14px; color: #e94560; }

.legend-gradient {
  height: 12px; border-radius: 6px; margin-bottom: 4px;
  background: linear-gradient(to right, #81c784, #4fc3f7, #fbc02d, #f57c00, #d32f2f);
}
.legend-labels { display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 10px; }

.legend-items { display: flex; flex-direction: column; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.legend-dot { border-radius: 50%; display: inline-block; }
</style>
