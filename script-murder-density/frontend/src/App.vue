<template>
  <div class="app-container">
    <header class="app-header">
      <div class="app-title">🎭 剧本杀城市娱乐热度分析</div>
      <div class="city-selector">
        <button
          v-for="c in cities"
          :key="c"
          :class="['city-btn', { active: selectedCity === c }]"
          @click="selectCity(c)"
        >{{ c }}</button>
      </div>
    </header>
    <div class="main-content">
      <aside class="left-panel">
        <div class="shop-list">
          <div class="section-title">区域画像</div>
          <div v-if="loading" class="loading-overlay">加载中...</div>
          <div v-else-if="districts.length === 0" class="empty-state">
            <div class="empty-icon">🏘️</div>
            <div>请选择城市</div>
          </div>
          <div
            v-else
            v-for="d in districts"
            :key="d.district"
            :class="['district-card', { active: selectedDistrict === d.district }]"
            @click="selectDistrict(d)"
          >
            <div class="district-name">
              {{ d.district }}
              <span
                class="style-badge"
                :style="{ background: d.dominant_color + '33', color: d.dominant_color }"
              >{{ d.dominant_style }}</span>
            </div>
            <div class="district-stats">
              <span class="stat-item">🏪 {{ d.shop_count }}家</span>
              <span class="stat-item">💰 ¥{{ d.avg_price }}</span>
              <span class="stat-item">⭐ {{ d.avg_rating }}</span>
              <span class="stat-item">💬 {{ d.total_reviews }}评</span>
            </div>
          </div>
          <template v-if="selectedDistrictData">
            <div class="section-title" style="margin-top: 16px;">
              {{ selectedDistrict }} · 商户列表
            </div>
            <div
              v-for="shop in selectedDistrictData.shops"
              :key="shop.id"
              class="shop-item"
            >
              <div class="shop-name">{{ shop.name }}</div>
              <div class="shop-tags">
                <span
                  v-for="tag in shop.tags"
                  :key="tag"
                  class="tag-pill"
                  :style="{ background: getClusterColor(shop.cluster_id) + '22', color: getClusterColor(shop.cluster_id) }"
                >{{ tag }}</span>
              </div>
              <div class="shop-meta">
                <span>💰 ¥{{ shop.avg_price }}/人</span>
                <span>⭐ {{ shop.rating }}</span>
                <span>💬 {{ shop.review_count }}评</span>
              </div>
            </div>
          </template>
        </div>
      </aside>
      <div class="right-panel">
        <div class="legend-bar">
          <div v-for="(label, id) in clusterLabels" :key="id" class="legend-item">
            <span class="legend-dot" :style="{ background: clusterColors[id] }"></span>
            {{ label }}
          </div>
        </div>
        <div class="map-container" ref="mapContainer">
          <canvas ref="mapCanvas" data-testid="map-canvas" @click="onMapClick"></canvas>
        </div>
        <div class="radar-section">
          <div class="radar-title">
            {{ selectedDistrict || selectedCity || '城市' }} · 娱乐偏好雷达
          </div>
          <div class="radar-chart" ref="radarChart" data-testid="radar-chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

const CLUSTER_LABELS = {
  0: '硬核推理区',
  1: '恐怖惊悚区',
  2: '欢乐机制区',
  3: '情感沉浸区',
  4: '阵营对抗区',
}

const CLUSTER_COLORS = {
  0: '#e74c3c',
  1: '#8e44ad',
  2: '#f39c12',
  3: '#3498db',
  4: '#2ecc71',
}

const CITY_CENTERS = {
  '北京': { lat: 39.90, lng: 116.41 },
  '上海': { lat: 31.23, lng: 121.47 },
  '成都': { lat: 30.66, lng: 104.07 },
  '广州': { lat: 23.13, lng: 113.27 },
  '武汉': { lat: 30.55, lng: 114.35 },
}

export default {
  name: 'App',
  data() {
    return {
      cities: ['北京', '上海', '成都', '广州', '武汉'],
      selectedCity: '北京',
      selectedDistrict: '',
      districts: [],
      shops: [],
      radarData: null,
      loading: false,
      clusterLabels: CLUSTER_LABELS,
      clusterColors: CLUSTER_COLORS,
      radarChart: null,
      gaodeJsKey: '',
      resizeObserver: null,
      radarResizeObserver: null,
      mapAnimFrame: null,
    }
  },
  computed: {
    selectedDistrictData() {
      if (!this.selectedDistrict) return null
      return this.districts.find(d => d.district === this.selectedDistrict)
    },
  },
  mounted() {
    this.setupResizeObservers()
    this.fetchConfig()
    this.selectCity('北京')
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.radarResizeObserver) {
      this.radarResizeObserver.disconnect()
      this.radarResizeObserver = null
    }
    if (this.radarChart) {
      this.radarChart.dispose()
      this.radarChart = null
    }
    if (this.mapAnimFrame) cancelAnimationFrame(this.mapAnimFrame)
  },
  methods: {
    setupResizeObservers() {
      const mapContainer = this.$refs.mapContainer
      if (mapContainer) {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
              this.drawMap()
            }
          }
        })
        this.resizeObserver.observe(mapContainer)
      }

      const radarContainer = this.$refs.radarChart
      if (radarContainer) {
        this.radarResizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
              if (this.radarChart) {
                this.radarChart.resize()
              } else {
                this.drawRadar()
              }
            }
          }
        })
        this.radarResizeObserver.observe(radarContainer)
      }
    },
    async fetchConfig() {
      try {
        const resp = await fetch('/api/config')
        const json = await resp.json()
        if (json.success && json.data) {
          this.gaodeJsKey = json.data.gaode_js_key || ''
        }
      } catch (e) {
        console.warn('Failed to load config:', e)
      }
    },
    async selectCity(city) {
      this.selectedCity = city
      this.selectedDistrict = ''
      this.loading = true
      try {
        const resp = await fetch(`/api/districts?city=${city}`)
        const json = await resp.json()
        if (json.success) {
          this.districts = Object.values(json.data.districts)
          this.shops = this.districts.flatMap(d => d.shops || [])
          this.radarData = json.data.summary?.radar_data || null
          this.$nextTick(() => {
            requestAnimationFrame(() => {
              this.drawMap()
              this.drawRadar()
            })
          })
        }
      } catch (e) {
        console.error('Failed to load city data:', e)
      } finally {
        this.loading = false
      }
    },
    async selectDistrict(d) {
      this.selectedDistrict = d.district
      try {
        const resp = await fetch(`/api/radar/${this.selectedCity}/${d.district}`)
        const json = await resp.json()
        if (json.success) {
          this.radarData = json.data
          this.$nextTick(() => {
            requestAnimationFrame(() => {
              this.drawRadar()
              this.drawMap()
            })
          })
        }
      } catch (e) {
        console.error('Failed to load radar data:', e)
      }
    },
    getClusterColor(id) {
      return CLUSTER_COLORS[id] || '#6366f1'
    },
    drawMap() {
      const canvas = this.$refs.mapCanvas
      const container = this.$refs.mapContainer
      if (!canvas || !container) return

      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return

      canvas.width = w * window.devicePixelRatio
      canvas.height = h * window.devicePixelRatio
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

      ctx.fillStyle = '#0a0e27'
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)'
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      if (!this.shops.length) return

      const allShops = this.shops
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
      allShops.forEach(s => {
        if (s.lat) minLat = Math.min(minLat, s.lat)
        if (s.lat) maxLat = Math.max(maxLat, s.lat)
        if (s.lng) minLng = Math.min(minLng, s.lng)
        if (s.lng) maxLng = Math.max(maxLng, s.lng)
      })

      const latRange = (maxLat - minLat) || 0.1
      const lngRange = (maxLng - minLng) || 0.1
      const padding = 60
      const mapW = w - padding * 2
      const mapH = h - padding * 2

      const toScreen = (lat, lng) => {
        const x = padding + ((lng - minLng) / lngRange) * mapW
        const y = padding + ((maxLat - lat) / latRange) * mapH
        return { x, y }
      }

      const districtGroups = {}
      allShops.forEach(s => {
        const d = s.district || '未知'
        if (!districtGroups[d]) districtGroups[d] = []
        districtGroups[d].push(s)
      })

      Object.entries(districtGroups).forEach(([district, dShops]) => {
        const isSelected = district === this.selectedDistrict
        const avgLat = dShops.reduce((a, s) => a + (s.lat || 0), 0) / dShops.length
        const avgLng = dShops.reduce((a, s) => a + (s.lng || 0), 0) / dShops.length
        const centerPos = toScreen(avgLat, avgLng)

        if (isSelected) {
          ctx.beginPath()
          ctx.arc(centerPos.x, centerPos.y, 60, 0, Math.PI * 2)
          const gradient = ctx.createRadialGradient(centerPos.x, centerPos.y, 0, centerPos.x, centerPos.y, 60)
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.15)')
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)')
          ctx.fillStyle = gradient
          ctx.fill()
        }

        ctx.font = isSelected ? 'bold 13px sans-serif' : '11px sans-serif'
        ctx.fillStyle = isSelected ? '#e0e6ed' : '#64748b'
        ctx.textAlign = 'center'
        ctx.fillText(district, centerPos.x, centerPos.y - 20)
      })

      allShops.forEach(s => {
        if (!s.lat || !s.lng) return
        const pos = toScreen(s.lat, s.lng)
        const isSelectedDistrict = s.district === this.selectedDistrict
        const color = CLUSTER_COLORS[s.cluster_id] || '#6366f1'
        const radius = isSelectedDistrict ? 7 : 5

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2)
        ctx.fillStyle = color + '22'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = color + (isSelectedDistrict ? 'dd' : '88')
        ctx.fill()

        if (isSelectedDistrict) {
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, radius - 2, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff44'
          ctx.fill()
        }
      })

      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#475569'
      ctx.textAlign = 'left'
      ctx.fillText(`${this.selectedCity} · ${allShops.length}家商户`, padding, h - 20)
    },
    drawRadar() {
      const el = this.$refs.radarChart
      if (!el) return

      const width = el.clientWidth
      const height = el.clientHeight
      if (width === 0 || height === 0) return

      if (!this.radarChart) {
        this.radarChart = echarts.init(el, null, { renderer: 'canvas' })
      }

      const data = this.radarData
      if (!data || !data.dimensions) {
        this.radarChart.clear()
        return
      }

      const splitNumber = 4
      const indicatorMax = 100

      const option = {
        backgroundColor: 'transparent',
        radar: {
          indicator: data.dimensions.map(d => ({ name: d, max: indicatorMax })),
          shape: 'polygon',
          splitNumber: splitNumber,
          alignTicks: false,
          axisName: {
            color: '#a5b4fc',
            fontSize: 12,
          },
          splitLine: {
            lineStyle: { color: 'rgba(99, 102, 241, 0.2)' },
          },
          splitArea: {
            areaStyle: {
              color: ['rgba(99, 102, 241, 0.02)', 'rgba(99, 102, 241, 0.05)'],
            },
          },
          axisLine: {
            lineStyle: { color: 'rgba(99, 102, 241, 0.2)' },
          },
        },
        series: [
          {
            type: 'radar',
            data: [
              {
                value: data.values,
                name: this.selectedDistrict || this.selectedCity,
                lineStyle: {
                  color: '#818cf8',
                  width: 2,
                },
                areaStyle: {
                  color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                    { offset: 0, color: 'rgba(129, 140, 248, 0.4)' },
                    { offset: 1, color: 'rgba(129, 140, 248, 0.05)' },
                  ]),
                },
                symbol: 'circle',
                symbolSize: 6,
                itemStyle: {
                  color: '#818cf8',
                  borderColor: '#fff',
                  borderWidth: 1,
                },
              },
            ],
          },
        ],
      }

      this.radarChart.setOption(option, true)
    },
    onMapClick(e) {
      const canvas = this.$refs.mapCanvas
      if (!canvas || !this.shops.length) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const allShops = this.shops
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
      allShops.forEach(s => {
        if (s.lat) minLat = Math.min(minLat, s.lat)
        if (s.lat) maxLat = Math.max(maxLat, s.lat)
        if (s.lng) minLng = Math.min(minLng, s.lng)
        if (s.lng) maxLng = Math.max(maxLng, s.lng)
      })

      const latRange = (maxLat - minLat) || 0.1
      const lngRange = (maxLng - minLng) || 0.1
      const padding = 60
      const mapW = rect.width - padding * 2
      const mapH = rect.height - padding * 2

      const toScreen = (lat, lng) => {
        const sx = padding + ((lng - minLng) / lngRange) * mapW
        const sy = padding + ((maxLat - lat) / latRange) * mapH
        return { x: sx, y: sy }
      }

      let closest = null
      let minDist = Infinity
      allShops.forEach(s => {
        if (!s.lat || !s.lng) return
        const pos = toScreen(s.lat, s.lng)
        const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2)
        if (dist < 30 && dist < minDist) {
          minDist = dist
          closest = s
        }
      })

      if (closest && closest.district) {
        const dData = this.districts.find(d => d.district === closest.district)
        if (dData) this.selectDistrict(dData)
      }
    },
    handleResize() {
      this.drawMap()
      if (this.radarChart) this.radarChart.resize()
    },
  },
}
</script>
