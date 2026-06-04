<template>
  <div class="map-wrapper" data-testid="map-wrapper">
    <div ref="mapContainer" class="map-container" data-testid="map-container"></div>
    <div v-if="loading" class="map-loading" data-testid="map-loading">
      <div class="spinner"></div>
      <span>加载学区数据中...</span>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'

export const COLOR_RULES = {
  TIER_1: { min: 30, color: 'rgba(211, 47, 47, 0.55)', stroke: '#d32f2f', label: '深红', desc: '高溢价 (>30%)' },
  TIER_2: { min: 20, color: 'rgba(245, 124, 0, 0.45)', stroke: '#f57c00', label: '橙黄', desc: '中高溢价 (20-30%)' },
  TIER_3: { min: 15, color: 'rgba(251, 192, 45, 0.40)', stroke: '#fbc02d', label: '浅黄', desc: '中溢价 (15-20%)' },
  TIER_4: { min: 0, color: 'rgba(79, 195, 247, 0.35)', stroke: '#4fc3f7', label: '浅蓝', desc: '低溢价 (<15%)' },
}

export const MARKER_COLOR_RULES = {
  TIER_1: { min: 25, color: '#e94560', desc: '高溢价 (>25%)' },
  TIER_2: { min: 15, color: '#f57c00', desc: '中溢价 (15-25%)' },
  TIER_3: { min: 0, color: '#4fc3f7', desc: '低溢价 (<15%)' },
}

export function getFillColorByPremium(premium) {
  if (premium > 30) return COLOR_RULES.TIER_1.color
  if (premium > 20) return COLOR_RULES.TIER_2.color
  if (premium > 15) return COLOR_RULES.TIER_3.color
  return COLOR_RULES.TIER_4.color
}

export function getStrokeColorByPremium(premium) {
  if (premium > 30) return COLOR_RULES.TIER_1.stroke
  if (premium > 20) return COLOR_RULES.TIER_2.stroke
  if (premium > 15) return COLOR_RULES.TIER_3.stroke
  return COLOR_RULES.TIER_4.stroke
}

export function getMarkerColorByPremium(premium) {
  if (premium > 25) return MARKER_COLOR_RULES.TIER_1.color
  if (premium > 15) return MARKER_COLOR_RULES.TIER_2.color
  return MARKER_COLOR_RULES.TIER_3.color
}

export function calculateMarkerRadius(unitPrice) {
  return Math.max(8, Math.min(20, unitPrice / 8000))
}

export function getColorTier(premium) {
  if (premium > 30) return 'TIER_1'
  if (premium > 20) return 'TIER_2'
  if (premium > 15) return 'TIER_3'
  return 'TIER_4'
}

export function getMarkerColorTier(premium) {
  if (premium > 25) return 'TIER_1'
  if (premium > 15) return 'TIER_2'
  return 'TIER_3'
}

export default {
  name: 'MapContainer',
  props: {
    districts: { type: Array, default: () => [] },
    premiums: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['district-click', 'marker-click', 'info-window-opened'],
  setup(props, { emit }) {
    const mapContainer = ref(null)
    let map = null
    let AMap = null
    let polygons = []
    let markers = []
    let infoWindows = []
    let useFallback = false
    let fallbackCanvas = null

    function getFillColor(premium) {
      return getFillColorByPremium(premium)
    }

    function getStrokeColor(premium) {
      return getStrokeColorByPremium(premium)
    }

    function clearOverlays() {
      if (map) {
        polygons.forEach(p => map.remove(p))
        markers.forEach(m => map.remove(m))
        infoWindows.forEach(w => w.close())
      }
      polygons = []
      markers = []
      infoWindows = []
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

        polygon.on('click', (e) => {
          const target = e.target
          const data = target.getExtData()
          emit('district-click', data)
          if (typeof window !== 'undefined' && window.__districtClickSpy) {
            window.__districtClickSpy(data)
          }
          map.setZoomAndCenter(14, d.center || coords[0])
        })

        polygon.on('mouseover', () => {
          polygon.setOptions({ fillOpacity: 0.8 })
        })
        polygon.on('mouseout', () => {
          polygon.setOptions({ fillOpacity: 0.6 })
        })

        polygon.setExtData({
          ...d,
          _colorTier: getColorTier(d.avg_premium_pct),
          _fillColor: getFillColor(d.avg_premium_pct),
          _strokeColor: getStrokeColor(d.avg_premium_pct),
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
          extData: { type: 'label', school_name: d.school_name },
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
        const size = calculateMarkerRadius(p.unit_price)
        const color = getMarkerColorByPremium(p.premium_pct)

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

        circleMarker.on('click', (e) => {
          const target = e.target
          const data = target.getExtData()
          emit('marker-click', data)
          if (typeof window !== 'undefined' && window.__markerClickSpy) {
            window.__markerClickSpy(data)
          }

          infoWindows.forEach(w => w.close())

          const info = new AMap.InfoWindow({
            content: `<div data-testid="info-window" style="padding:8px;font-size:13px;color:#333;">
              <b>${p.community}</b><br/>
              单价: ${Math.round(p.unit_price).toLocaleString()} 元/m²<br/>
              溢价率: <span style="color:${color};font-weight:600;">${p.premium_pct > 0 ? '+' : ''}${p.premium_pct}%</span><br/>
              学区: ${p.school_name}<br/>
              面积: ${p.area_sqm} m² | 房龄: ${p.age}年
            </div>`,
            offset: new AMap.Pixel(0, -10),
          })

          info.open(map, [p.lng, p.lat])
          infoWindows.push(info)
          emit('info-window-opened', { data, infoWindow: info })
          if (typeof window !== 'undefined' && window.__infoWindowSpy) {
            window.__infoWindowSpy({ data, infoWindow: info })
          }
        })

        circleMarker.setExtData({
          ...p,
          _colorTier: getMarkerColorTier(p.premium_pct),
          _color: color,
          _radius: size,
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
        fallbackCanvas.setAttribute('data-testid', 'fallback-canvas')
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

      const fallbackPolygons = []
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
        ctx.fillStyle = getFillColor(premium)
        ctx.fill()

        ctx.strokeStyle = getStrokeColor(premium)
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

        fallbackPolygons.push({
          data: d,
          coords: coords.map(c => [toX(c[0]), toY(c[1])]),
          center: [cx, cy],
        })
      })

      const fallbackMarkers = []
      props.premiums.forEach(p => {
        if (!p.lng || !p.lat) return
        const r = calculateMarkerRadius(p.unit_price)
        const color = getMarkerColorByPremium(p.premium_pct)
        const x = toX(p.lng)
        const y = toY(p.lat)
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        fallbackMarkers.push({
          data: p,
          center: [x, y],
          radius: r,
          color: color,
        })
      })

      fallbackCanvas.addEventListener('click', (e) => {
        const rect = fallbackCanvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        for (let i = fallbackMarkers.length - 1; i >= 0; i--) {
          const m = fallbackMarkers[i]
          const dx = x - m.center[0]
          const dy = y - m.center[1]
          if (dx * dx + dy * dy <= m.radius * m.radius) {
            emit('marker-click', m.data)
            if (typeof window !== 'undefined' && window.__markerClickSpy) {
              window.__markerClickSpy(m.data)
            }
            return
          }
        }

        for (let i = fallbackPolygons.length - 1; i >= 0; i--) {
          const poly = fallbackPolygons[i]
          if (isPointInPolygon(x, y, poly.coords)) {
            emit('district-click', poly.data)
            if (typeof window !== 'undefined' && window.__districtClickSpy) {
              window.__districtClickSpy(poly.data)
            }
            return
          }
        }
      })

      if (typeof window !== 'undefined') {
        window.__fallbackPolygons = fallbackPolygons
        window.__fallbackMarkers = fallbackMarkers
      }
    }

    function isPointInPolygon(x, y, coords) {
      let inside = false
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i][0], yi = coords[i][1]
        const xj = coords[j][0], yj = coords[j][1]
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        if (intersect) inside = !inside
      }
      return inside
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

      if (typeof window !== 'undefined') {
        window.__schoolDistrictTestHooks = {
          getPolygons: () => polygons.map(p => p.getExtData()),
          getMarkers: () => markers.filter(m => m.CLASS_NAME === 'AMap.CircleMarker').map(m => m.getExtData()),
          getMap: () => map,
          getAMap: () => AMap,
          isFallback: () => useFallback,
          COLOR_RULES,
          MARKER_COLOR_RULES,
          getFillColorByPremium,
          getStrokeColorByPremium,
          getMarkerColorByPremium,
          calculateMarkerRadius,
          getColorTier,
          getMarkerColorTier,
        }
        window.dispatchEvent(new CustomEvent('map-ready', { detail: { ready: true, useFallback } }))
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
