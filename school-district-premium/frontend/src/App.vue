<template>
  <div class="app-container" data-testid="app-container">
    <header class="app-header" data-testid="app-header">
      <h1>学区溢价空间分布分析</h1>
      <div class="controls">
        <button @click="fetchData" :disabled="loading" class="btn btn-primary" data-testid="btn-refresh">
          {{ loading ? '计算中...' : '重新计算' }}
        </button>
        <button @click="toggleLegend" class="btn btn-secondary" data-testid="btn-legend">图例</button>
      </div>
    </header>
    <div class="main-content">
      <MapContainer
        :districts="districts"
        :premiums="premiums"
        :loading="loading"
        @district-click="onDistrictClick"
        @marker-click="onMarkerClick"
        @info-window-opened="onInfoWindowOpened"
      />
      <aside class="sidebar" :class="{ 'sidebar-open': showSidebar }" data-testid="sidebar">
        <div class="sidebar-header">
          <h3 data-testid="sidebar-title">{{ selectedDistrict ? selectedDistrict.school_name : '学区概览' }}</h3>
          <button @click="showSidebar = false" class="btn-close" data-testid="btn-close-sidebar">&times;</button>
        </div>
        <div v-if="selectedDistrict" class="sidebar-content">
          <div class="stat-card" data-testid="stat-premium">
            <span class="stat-label">平均溢价率</span>
            <span class="stat-value premium" :style="{ color: getPremiumColor(selectedDistrict.avg_premium_pct) }" data-testid="stat-premium-value">
              {{ selectedDistrict.avg_premium_pct }}%
            </span>
          </div>
          <div class="stat-card" data-testid="stat-price">
            <span class="stat-label">平均单价</span>
            <span class="stat-value" data-testid="stat-price-value">{{ formatPrice(selectedDistrict.avg_unit_price) }} 元/m²</span>
          </div>
          <div class="stat-card" data-testid="stat-count">
            <span class="stat-label">样本数量</span>
            <span class="stat-value" data-testid="stat-count-value">{{ selectedDistrict.sample_count }}</span>
          </div>
          <div class="stat-card" data-testid="stat-district">
            <span class="stat-label">所属区域</span>
            <span class="stat-value" data-testid="stat-district-value">{{ selectedDistrict.district }}</span>
          </div>
          <h4 style="margin-top: 16px;" data-testid="nearby-communities-title">周边小区</h4>
          <ul class="community-list" data-testid="community-list">
            <li v-for="p in getDistrictPremiums(selectedDistrict.school_name)" :key="p.community" data-testid="community-item">
              <span class="community-name" data-testid="community-name">{{ p.community }}</span>
              <span class="community-price" data-testid="community-price">{{ formatPrice(p.unit_price) }} 元/m²</span>
              <span class="community-premium" :style="{ color: getPremiumColor(p.premium_pct) }" data-testid="community-premium">
                {{ p.premium_pct > 0 ? '+' : '' }}{{ p.premium_pct }}%
              </span>
            </li>
          </ul>
        </div>
        <div v-else class="sidebar-content">
          <p class="hint" data-testid="sidebar-hint">点击地图上的学区区域查看详情</p>
          <div class="district-list" data-testid="district-list">
            <div
              v-for="d in districts"
              :key="d.school_name"
              class="district-item"
              @click="onDistrictClick(d)"
              data-testid="district-item"
              :data-school-name="d.school_name"
            >
              <span class="district-name" data-testid="district-name">{{ d.school_name }}</span>
              <span class="district-premium" :style="{ color: getPremiumColor(d.avg_premium_pct) }" data-testid="district-premium">
                {{ d.avg_premium_pct }}%
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
    <div v-if="showLegend" class="legend" data-testid="legend">
      <h4 data-testid="legend-title">溢价率图例</h4>
      <div class="legend-bar">
        <div class="legend-gradient" data-testid="legend-gradient"></div>
        <div class="legend-labels">
          <span><15%</span>
          <span>15-20%</span>
          <span>20-30%</span>
          <span>30%+</span>
        </div>
      </div>
      <div class="legend-items" data-testid="legend-items">
        <div class="legend-item" data-testid="legend-item-tier1">
          <span class="legend-dot" style="background: rgba(211, 47, 47, 0.55); width: 14px; height: 14px;"></span>
          <span>高溢价 (>30%) 深红</span>
        </div>
        <div class="legend-item" data-testid="legend-item-tier2">
          <span class="legend-dot" style="background: rgba(245, 124, 0, 0.45); width: 13px; height: 13px;"></span>
          <span>中高溢价 (20-30%) 橙黄</span>
        </div>
        <div class="legend-item" data-testid="legend-item-tier3">
          <span class="legend-dot" style="background: rgba(251, 192, 45, 0.40); width: 11px; height: 11px;"></span>
          <span>中溢价 (15-20%) 浅黄</span>
        </div>
        <div class="legend-item" data-testid="legend-item-tier4">
          <span class="legend-dot" style="background: rgba(79, 195, 247, 0.35); width: 9px; height: 9px;"></span>
          <span>低溢价 (<15%) 浅蓝</span>
        </div>
      </div>
      <div class="legend-formula" data-testid="legend-formula">
        <h5>点位半径公式:</h5>
        <code>radius = clamp(单价 / 8000, min=8, max=20)</code>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import MapContainer, { getFillColorByPremium, getStrokeColorByPremium, getMarkerColorByPremium, calculateMarkerRadius, getColorTier, getMarkerColorTier, COLOR_RULES, MARKER_COLOR_RULES } from './components/MapContainer.vue'

export function getPremiumColor(premium) {
  if (premium > 30) return '#d32f2f'
  if (premium > 20) return '#f57c00'
  if (premium > 15) return '#fbc02d'
  return '#4fc3f7'
}

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
    const lastClickedMarker = ref(null)
    const lastOpenedInfoWindow = ref(null)
    const clickHistory = ref([])

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
      clickHistory.value.push({ type: 'district', data: district, timestamp: Date.now() })
      if (typeof window !== 'undefined' && window.__sidebarSpy) {
        window.__sidebarSpy({ type: 'district', district, showSidebar: true })
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sidebar-district-opened', { detail: { district } }))
      }
    }

    function onMarkerClick(markerData) {
      lastClickedMarker.value = markerData
      const matchDistrict = districts.value.find(d => d.school_name === markerData.school_name)
      if (matchDistrict) {
        selectedDistrict.value = matchDistrict
        showSidebar.value = true
      }
      clickHistory.value.push({ type: 'marker', data: markerData, timestamp: Date.now() })
      if (typeof window !== 'undefined' && window.__markerSpy) {
        window.__markerSpy(markerData)
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('marker-clicked', { detail: { marker: markerData } }))
      }
    }

    function onInfoWindowOpened({ data, infoWindow }) {
      lastOpenedInfoWindow.value = { data, infoWindow }
      if (typeof window !== 'undefined' && window.__infoWindowSpy) {
        window.__infoWindowSpy({ data, infoWindow })
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('info-window-opened', { detail: { data } }))
      }
    }

    function toggleLegend() {
      showLegend.value = !showLegend.value
    }

    function formatPrice(price) {
      return price ? Math.round(price).toLocaleString() : '-'
    }

    function getDistrictPremiums(schoolName) {
      return premiums.value.filter(p => p.school_name === schoolName)
    }

    function setupTestHooks() {
      if (typeof window === 'undefined') return
      window.__schoolDistrictAppHooks = {
        getDistricts: () => districts.value,
        getPremiums: () => premiums.value,
        getSelectedDistrict: () => selectedDistrict.value,
        getShowSidebar: () => showSidebar.value,
        getShowLegend: () => showLegend.value,
        getLastClickedMarker: () => lastClickedMarker.value,
        getLastOpenedInfoWindow: () => lastOpenedInfoWindow.value,
        getClickHistory: () => clickHistory.value,
        setSelectedDistrict: (district) => {
          selectedDistrict.value = district
          showSidebar.value = true
        },
        clearSelection: () => {
          selectedDistrict.value = null
          showSidebar.value = false
        },
        getPremiumColor,
        getFillColorByPremium,
        getStrokeColorByPremium,
        getMarkerColorByPremium,
        calculateMarkerRadius,
        getColorTier,
        getMarkerColorTier,
        COLOR_RULES,
        MARKER_COLOR_RULES,
        validateColorRules: validateColorRuleCompliance,
      }
      window.dispatchEvent(new CustomEvent('app-ready', { detail: { ready: true } }))
    }

    function validateColorRuleCompliance() {
      const results = []
      districts.value.forEach(d => {
        const premium = d.avg_premium_pct
        const tier = getColorTier(premium)
        const expectedColor = getFillColorByPremium(premium)
        results.push({
          school_name: d.school_name,
          premium,
          tier,
          tierLabel: COLOR_RULES[tier].label,
          fillColor: expectedColor,
          strokeColor: getStrokeColorByPremium(premium),
          matchesSpec: checkMatchSpec(premium, tier),
        })
      })
      return results
    }

    function checkMatchSpec(premium, tier) {
      if (premium > 30) return tier === 'TIER_1'
      if (premium > 20) return tier === 'TIER_2'
      if (premium > 15) return tier === 'TIER_3'
      return tier === 'TIER_4'
    }

    let mapReadyHandler = null
    onMounted(() => {
      fetchData()
      setupTestHooks()
      mapReadyHandler = (e) => {
        if (typeof window !== 'undefined' && window.__appReadySpy) {
          window.__appReadySpy(e.detail)
        }
      }
      window.addEventListener('map-ready', mapReadyHandler)
    })

    onUnmounted(() => {
      if (mapReadyHandler) {
        window.removeEventListener('map-ready', mapReadyHandler)
      }
    })

    return {
      districts, premiums, loading, showLegend, showSidebar,
      selectedDistrict, fetchData, onDistrictClick, onMarkerClick,
      onInfoWindowOpened, toggleLegend, getPremiumColor, formatPrice,
      getDistrictPremiums,
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
  border: 1px solid #0f3460; min-width: 220px;
}
.legend h4 { margin-bottom: 10px; font-size: 14px; color: #e94560; }

.legend-gradient {
  height: 12px; border-radius: 6px; margin-bottom: 4px;
  background: linear-gradient(to right, #4fc3f7, #fbc02d, #f57c00, #d32f2f);
}
.legend-labels { display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 10px; }

.legend-items { display: flex; flex-direction: column; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.legend-dot { border-radius: 50%; display: inline-block; }

.legend-formula {
  margin-top: 12px; padding-top: 12px; border-top: 1px solid #0f3460;
  font-size: 11px; color: #888;
}
.legend-formula h5 { margin-bottom: 6px; color: #e94560; font-size: 12px; }
.legend-formula code {
  display: block; background: #1a1a2e; padding: 6px; border-radius: 4px;
  font-family: 'SF Mono', Menlo, monospace; color: #4fc3f7;
}
</style>
