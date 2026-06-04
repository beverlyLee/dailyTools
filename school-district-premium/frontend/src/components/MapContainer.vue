<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="loading" class="map-loading">
      <div class="spinner"></div>
      <span>加载学区数据中...</span>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'

export default {
  name: 'MapContainer',
  props: {
    districts: { type: Array, default: () => [] },
    premiums: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['district-click'],
  setup(props, { emit }) {
    const mapContainer = ref(null)
    let map = null
    let AMap = null
    let polygons = []
    let markers = []
    let useFallback = false
    let fallbackCanvas = null

    function getFillColor(premium) {
      if (premium > 30) return 'rgba(211, 47, 47, 0.55)'
      if (premium > 25) return 'rgba(230, 74, 25, 0.50)'
      if (premium > 20) return 'rgba(245, 124, 0, 0.45)'
      if (premium > 15) return 'rgba(251, 192, 45, 0.40)'
      if (premium > 10) return 'rgba(79, 195, 247, 0.35)'
      return 'rgba(129, 199, 132, 0.30)'
    }

    function getStrokeColor(premium) {
      if (premium > 25) return '#d32f2f'
      if (premium > 15) return '#f57c00'
      return '#4fc3f7'
    }

    function clearOverlays() {
      if (map) {
        polygons.forEach(p => map.remove(p))
        markers.forEach(m => map.remove(m))
      }
      polygons = []
      markers = []
    }

    function renderDistricts() {
      if (!map || !AMap) return
      clearOverlays()

      props.districts.forEach(d => {
        const coords = (d.polygon || []).map(c => [c[0], c[1]])
        if (coords.length < 3) return

        const polygon = new AMap.Polygon({
          path: coords,
          fillColor: getFillColor(d.avg_premium_pct),
          fillOpacity: 0.6,
          strokeColor: getStrokeColor(d.avg_premium_pct),
          strokeWeight: 2,
          strokeOpacity: 0.8,
          extData: d,
        })

        polygon.on('click', () => {
          emit('district-click', d)
          map.setZoomAndCenter(14, d.center || coords[0])
        })

        polygon.on('mouseover', () => {
          polygon.setOptions({ fillOpacity: 0.8 })
        })
        polygon.on('mouseout', () => {
          polygon.setOptions({ fillOpacity: 0.6 })
        })

        polygons.push(polygon)

        const labelMarker = new AMap.Text({
          text: `${d.school_name}\n${d.avg_premium_pct}%`,
          position: d.center || coords[0],
          style: {
            'background': 'rgba(22,33,62,0.85)',
            'color': '#e0e0e0',
            'border': `1px solid ${getStrokeColor(d.avg_premium_pct)}`,
            'border-radius': '4px',
            'padding': '4px 8px',
            'font-size': '12px',
            'text-align': 'center',
            'white-space': 'pre',
          },
        })
        markers.push(labelMarker)
      })

      map.add([...polygons, ...markers])

      if (polygons.length > 0) {
        map.setFitView(polygons)
      }
    }

    function renderPremiumMarkers() {
      if (!map || !AMap) return

      props.premiums.forEach(p => {
        if (!p.lng || !p.lat) return
        const size = Math.max(8, Math.min(20, p.unit_price / 8000))
        const color = p.premium_pct > 25 ? '#e94560' : p.premium_pct > 15 ? '#f57c00' : '#4fc3f7'

        const circleMarker = new AMap.CircleMarker({
          center: [p.lng, p.lat],
          radius: size,
          fillColor: color,
          fillOpacity: 0.7,
          strokeColor: '#fff',
          strokeWeight: 1,
          strokeOpacity: 0.5,
          extData: p,
        })

        circleMarker.on('click', () => {
          const info = new AMap.InfoWindow({
            content: `<div style="padding:8px;font-size:13px;color:#333;">
              <b>${p.community}</b><br/>
              单价: ${Math.round(p.unit_price).toLocaleString()} 元/m²<br/>
              溢价率: <span style="color:${color};font-weight:600;">${p.premium_pct > 0 ? '+' : ''}${p.premium_pct}%</span><br/>
              学区: ${p.school_name}<br/>
              面积: ${p.area_sqm} m² | 房龄: ${p.age}年
            </div>`,
            offset: new AMap.Pixel(0, -10),
          })
          info.open(map, [p.lng, p.lat])
        })

        markers.push(circleMarker)
      })

      map.add(markers.filter(m => m.CLASS_NAME === 'AMap.CircleMarker'))
    }

    function renderFallbackMap() {
      if (!mapContainer.value) return

      if (!fallbackCanvas) {
        fallbackCanvas = document.createElement('canvas')
        fallbackCanvas.style.width = '100%'
        fallbackCanvas.style.height = '100%'
        mapContainer.value.innerHTML = ''
        mapContainer.value.appendChild(fallbackCanvas)
      }

      const rect = mapContainer.value.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      fallbackCanvas.width = rect.width * dpr || 1200
      fallbackCanvas.height = rect.height * dpr || 800
      fallbackCanvas.style.width = rect.width + 'px'
      fallbackCanvas.style.height = rect.height + 'px'

      const ctx = fallbackCanvas.getContext('2d')
      ctx.scale(dpr, dpr)
      const canvasW = rect.width
      const canvasH = rect.height

      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvasW, canvasH)

      const lngRange = [116.29, 116.47]
      const latRange = [39.90, 40.01]
      const toX = lng => ((lng - lngRange[0]) / (lngRange[1] - lngRange[0])) * canvasW
      const toY = lat => canvasH - ((lat - latRange[0]) / (latRange[1] - latRange[0])) * canvasH

      props.districts.forEach(d => {
        const coords = d.polygon || []
        if (coords.length < 3) return
        ctx.beginPath()
        ctx.moveTo(toX(coords[0][0]), toY(coords[0][1]))
        for (let i = 1; i < coords.length; i++) {
          ctx.lineTo(toX(coords[i][0]), toY(coords[i][1]))
        }
        ctx.closePath()

        const premium = d.avg_premium_pct || 0
        if (premium > 30) ctx.fillStyle = 'rgba(211, 47, 47, 0.55)'
        else if (premium > 25) ctx.fillStyle = 'rgba(230, 74, 25, 0.50)'
        else if (premium > 20) ctx.fillStyle = 'rgba(245, 124, 0, 0.45)'
        else if (premium > 15) ctx.fillStyle = 'rgba(251, 192, 45, 0.40)'
        else ctx.fillStyle = 'rgba(79, 195, 247, 0.35)'
        ctx.fill()

        ctx.strokeStyle = premium > 25 ? '#d32f2f' : premium > 15 ? '#f57c00' : '#4fc3f7'
        ctx.lineWidth = 2
        ctx.stroke()

        const cx = d.center ? toX(d.center[0]) : toX(coords.reduce((s, c) => s + c[0], 0) / coords.length)
        const cy = d.center ? toY(d.center[1]) : toY(coords.reduce((s, c) => s + c[1], 0) / coords.length)
        ctx.fillStyle = '#e0e0e0'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(d.school_name, cx, cy - 6)
        ctx.fillStyle = '#e94560'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText(`${premium}%`, cx, cy + 10)
      })

      props.premiums.forEach(p => {
        if (!p.lng || !p.lat) return
        const r = Math.max(3, Math.min(8, p.unit_price / 15000))
        const color = p.premium_pct > 25 ? '#e94560' : p.premium_pct > 15 ? '#f57c00' : '#4fc3f7'
        ctx.beginPath()
        ctx.arc(toX(p.lng), toY(p.lat), r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      })
    }

    async function initMap() {
      await nextTick()

      if (!mapContainer.value) {
        console.warn('mapContainer ref not available')
        useFallback = true
        renderFallbackMap()
        return
      }

      try {
        const amapKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GAODE_JS_API_KEY) || '9062eb1582a21d0abf3f69c47dd97c42'
        AMap = await AMapLoader.load({
          key: amapKey,
          version: '2.0',
          plugins: ['AMap.Polygon', 'AMap.Text', 'AMap.CircleMarker', 'AMap.InfoWindow'],
        })

        map = new AMap.Map(mapContainer.value, {
          zoom: 12,
          center: [116.3168, 39.9822],
          mapStyle: 'amap://styles/dark',
          viewMode: '2D',
        })

        useFallback = false
        renderDistricts()
        renderPremiumMarkers()
      } catch (e) {
        console.warn('AMap load failed, using canvas fallback:', e.message)
        useFallback = true
        renderFallbackMap()
      }
    }

    onMounted(() => {
      initMap()
    })

    watch(() => [props.districts, props.premiums], () => {
      nextTick(() => {
        if (useFallback) {
          renderFallbackMap()
        } else if (map && AMap) {
          renderDistricts()
          renderPremiumMarkers()
        }
      })
    }, { deep: true })

    return { mapContainer }
  },
}
</script>

<style scoped>
.map-wrapper { flex: 1; position: relative; }
.map-container { width: 100%; height: 100%; }

.map-loading {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: rgba(22, 33, 62, 0.9); padding: 24px 32px; border-radius: 12px;
  z-index: 10;
}

.spinner {
  width: 36px; height: 36px; border: 3px solid #0f3460;
  border-top-color: #e94560; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
