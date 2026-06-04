<template>
  <div class="app-container">
    <div class="map-container" id="mapContainer"></div>
    
    <div class="control-panel">
      <div class="panel-header">
        <h1 class="panel-title">🍱 LunchDrift</h1>
        <p class="panel-subtitle">白领午休流动规律分析系统</p>
      </div>

      <div class="form-group">
        <label class="form-label">选择写字楼</label>
        <select v-model="selectedBuilding" class="form-select" @change="onBuildingChange">
          <option v-for="b in buildings" :key="b.name" :value="b">
            {{ b.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">搜索关键词</label>
        <input 
          v-model="keywordsInput" 
          type="text" 
          class="form-input" 
          placeholder="快餐,简餐,小吃"
        />
      </div>

      <div class="form-group">
        <label class="form-label">搜索半径 (米)</label>
        <input 
          v-model.number="radius" 
          type="number" 
          class="form-input" 
          min="500" 
          max="3000"
          step="100"
        />
      </div>

      <button 
        class="btn btn-primary" 
        :disabled="loading"
        @click="runAnalysis"
      >
        <span v-if="loading" class="loading"></span>
        {{ loading ? '分析中...' : '开始分析' }}
      </button>

      <div v-if="analysisData" class="stats-panel">
        <h3 class="stats-title">📊 分析结果</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ analysisData.total_restaurants }}</div>
            <div class="stat-label">总商户数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ analysisData.dine_in_friendly.length }}</div>
            <div class="stat-label">堂食友好</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ analysisData.delivery_only.length }}</div>
            <div class="stat-label">仅外卖</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ analysisData.out_of_range.length }}</div>
            <div class="stat-label">超出范围</div>
          </div>
        </div>
      </div>

      <div v-if="statistics" class="stats-panel">
        <h3 class="stats-title">⏱️ 时间统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ Math.round(statistics.avg_walk_time_one_way / 60) }}分钟</div>
            <div class="stat-label">平均步行</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ Math.round(statistics.min_walk_time / 60) }}分钟</div>
            <div class="stat-label">最近</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ Math.round(statistics.max_walk_time / 60) }}分钟</div>
            <div class="stat-label">最远</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ statistics.within_10min }}</div>
            <div class="stat-label">10分钟内</div>
          </div>
        </div>
      </div>

      <div class="legend">
        <h3 class="legend-title">📍 图例说明</h3>
        <div class="legend-item">
          <span class="legend-color green"></span>
          <span>堂食友好（往返≤25分钟，适合堂食）</span>
        </div>
        <div class="legend-item">
          <span class="legend-color orange"></span>
          <span>仅外卖推荐（往返≤25分钟，外卖为主）</span>
        </div>
        <div class="legend-item">
          <span class="legend-color red"></span>
          <span>超出午休范围（往返>25分钟）</span>
        </div>
        <div class="legend-item">
          <span class="legend-color blue"></span>
          <span>堂食步行路径（蓝色虚线）</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #FF9800; border: 2px dashed #FF9800;"></span>
          <span>外卖步行路径（橙色虚线）</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #f44336; border: 2px dashed #f44336;"></span>
          <span>超出范围路径（红色虚线）</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: rgba(76, 175, 80, 0.2); border: 2px solid #4CAF50;"></span>
          <span>绿色等时线：25分钟往返可达</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: rgba(244, 67, 54, 0.1); border: 2px solid #f44336;"></span>
          <span>红色等时线：超出步行范围区域</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { getConfig, getBuildings, analyzeLunchDrift, getStatistics } from './api'

const map = ref(null)
const buildings = ref([])
const selectedBuilding = ref(null)
const keywordsInput = ref('快餐,简餐,小吃')
const radius = ref(1000)
const loading = ref(false)
const analysisData = ref(null)
const statistics = ref(null)
const markers = ref([])
const polylines = ref([])
const circles = ref([])

let amapInstance = null
let infoWindow = null

onMounted(async () => {
  await initMap()
  await loadBuildings()
  if (selectedBuilding.value) {
    runAnalysis()
  }
})

const initMap = async () => {
  try {
    const config = await getConfig()
    window._AMapSecurityConfig = {
      securityJsCode: config.gaode_js_api_key,
    }

    await AMapLoader.load({
      key: config.gaode_js_api_key,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.InfoWindow'],
    })

    amapInstance = new AMap.Map('mapContainer', {
      zoom: config.default_zoom,
      center: config.default_center,
      mapStyle: 'amap://styles/light',
      viewMode: '2D',
      pitch: 0,
    })

    amapInstance.addControl(new AMap.Scale())
    amapInstance.addControl(new AMap.ToolBar({ position: 'RB' }))

    const canvas = document.querySelector('#mapContainer canvas')
    if (canvas) {
      canvas.getContext('2d', { willReadFrequently: true })
    }
  } catch (e) {
    console.error('Map init error:', e)
    initMockMap()
  }
}

const initMockMap = () => {
  amapInstance = {
    setCenter: () => {},
    setZoom: () => {},
    add: () => {},
    remove: () => {},
    clearMap: () => {},
    _mock: true,
  }
  alert('高德地图API Key未配置，将显示模拟数据')
}

const loadBuildings = async () => {
  try {
    const res = await getBuildings()
    buildings.value = res.data
    if (buildings.value.length > 0) {
      selectedBuilding.value = buildings.value[0]
    }
  } catch (e) {
    console.error('Load buildings error:', e)
  }
}

const onBuildingChange = () => {
  if (selectedBuilding.value && amapInstance && !amapInstance._mock) {
    amapInstance.setCenter([selectedBuilding.value.longitude, selectedBuilding.value.latitude])
    amapInstance.setZoom(16)
  }
}

const clearMapOverlays = () => {
  if (amapInstance && !amapInstance._mock) {
    markers.value.forEach(m => amapInstance.remove(m))
    polylines.value.forEach(p => amapInstance.remove(p))
    circles.value.forEach(c => amapInstance.remove(c))
  }
  markers.value = []
  polylines.value = []
  circles.value = []
}

const createMarker = (restaurant, type, routeInfo) => {
  if (!amapInstance || amapInstance._mock) return null

  const colors = {
    dine_in: '#4CAF50',
    delivery: '#FF9800',
    out_of_range: '#f44336',
  }

  const content = `
    <div style="
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${colors[type]};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.2)'" 
       onmouseout="this.style.transform='scale(1)'"></div>
  `

  const marker = new AMap.Marker({
    position: [restaurant.longitude, restaurant.latitude],
    content: content,
    offset: new AMap.Pixel(-10, -10),
    zIndex: 100,
  })

  const infoContent = `
    <div class="info-window">
      <div class="info-title">${restaurant.name}</div>
      <div class="info-row">
        <span>人均消费</span>
        <span class="info-price">¥${restaurant.avg_price || '--'}</span>
      </div>
      <div class="info-row">
        <span>步行时间</span>
        <span>${Math.round(routeInfo?.duration / 60) || '--'}分钟</span>
      </div>
      <div class="info-row">
        <span>距离</span>
        <span>${Math.round(routeInfo?.distance) || '--'}米</span>
      </div>
      <div class="info-row">
        <span>评分</span>
        <span>⭐ ${restaurant.rating || '--'}</span>
      </div>
      <div class="info-row">
        <span>评论数</span>
        <span>${restaurant.review_count || '--'}</span>
      </div>
      <div style="margin-top: 8px;">
        <span class="info-tag">${restaurant.cuisine || '美食'}</span>
        ${restaurant.has_delivery ? '<span class="info-tag">支持外卖</span>' : '<span class="info-tag" style="background:#ffebee;color:#e53935;">仅堂食</span>'}
      </div>
      <div style="margin-top:6px;font-size:11px;color:#999;">
        📍 ${restaurant.address}
      </div>
    </div>
  `

  marker.on('click', () => {
    if (infoWindow) {
      infoWindow.close()
    }
    infoWindow = new AMap.InfoWindow({
      content: infoContent,
      offset: new AMap.Pixel(0, -20),
    })
    infoWindow.open(amapInstance, [restaurant.longitude, restaurant.latitude])
  })

  return marker
}

const createPolyline = (route, color = '#1E88E5', simplify = false) => {
  if (!amapInstance || amapInstance._mock || !route.polyline) return null

  let path = route.polyline.split(';').map(p => {
    const [lng, lat] = p.split(',')
    return [parseFloat(lng), parseFloat(lat)]
  })

  if (simplify && path.length > 4) {
    const step = Math.ceil(path.length / 4)
    const simplified = []
    for (let i = 0; i < path.length; i += step) {
      simplified.push(path[i])
    }
    if (simplified[simplified.length - 1] !== path[path.length - 1]) {
      simplified.push(path[path.length - 1])
    }
    path = simplified
  }

  const polyline = new AMap.Polyline({
    path: path,
    strokeColor: color,
    strokeWeight: 5,
    strokeOpacity: 0.85,
    strokeStyle: 'dashed',
    lineJoin: 'round',
    lineCap: 'round',
    zIndex: 10,
  })

  return polyline
}

const batchAddOverlays = async (overlays, batchSize = 10) => {
  for (let i = 0; i < overlays.length; i += batchSize) {
    const batch = overlays.slice(i, i + batchSize)
    if (amapInstance && !amapInstance._mock) {
      amapInstance.add(batch)
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

const createCircle = (center, radius, strokeColor, fillColor, fillOpacity = 0.1) => {
  if (!amapInstance || amapInstance._mock) return null

  return new AMap.Circle({
    center: center,
    radius: radius,
    strokeColor: strokeColor,
    strokeWeight: 2,
    strokeOpacity: 0.5,
    fillColor: fillColor,
    fillOpacity: fillOpacity,
  })
}

const runAnalysis = async () => {
  if (!selectedBuilding.value) return

  loading.value = true
  clearMapOverlays()
  analysisData.value = null
  statistics.value = null

  try {
    const keywords = keywordsInput.value.split(',').map(k => k.trim()).filter(k => k)
    
    const res = await analyzeLunchDrift({
      building_name: selectedBuilding.value.name,
      building_address: selectedBuilding.value.address,
      longitude: selectedBuilding.value.longitude,
      latitude: selectedBuilding.value.latitude,
      keywords: keywords,
      radius: radius.value,
      use_mock: true,
    })

    analysisData.value = res.data

    const statsRes = await getStatistics(selectedBuilding.value.name)
    statistics.value = statsRes.data

    const center = [selectedBuilding.value.longitude, selectedBuilding.value.latitude]
    const maxWalkTime = res.data.max_walk_time
    const walkSpeed = 80.0
    const maxRadius = (walkSpeed / 60) * (maxWalkTime / 2)

    const outOfRangeCircle = createCircle(center, radius.value, '#f44336', '#f44336', 0.08)
    if (outOfRangeCircle) {
      circles.value.push(outOfRangeCircle)
    }

    const reachableCircle = createCircle(center, maxRadius, '#4CAF50', '#4CAF50', 0.06)
    if (reachableCircle) {
      circles.value.push(reachableCircle)
    }

    if (amapInstance && !amapInstance._mock) {
      amapInstance.add(circles.value)
    }

    const routeMap = {}
    res.data.routes.forEach(r => {
      routeMap[r.restaurant_id] = r
    })

    const newMarkers = []
    const newPolylines = []

    res.data.dine_in_friendly.forEach(r => {
      const route = routeMap[r.id]
      const marker = createMarker(r, 'dine_in', route)
      if (marker) {
        newMarkers.push(marker)
      }
      if (route && route.duration <= 600) {
        const polyline = createPolyline(route, '#1E88E5', false)
        if (polyline) {
          newPolylines.push(polyline)
        }
      }
    })

    res.data.delivery_only.forEach(r => {
      const route = routeMap[r.id]
      const marker = createMarker(r, 'delivery', route)
      if (marker) {
        newMarkers.push(marker)
      }
      if (route && route.duration <= 900) {
        const polyline = createPolyline(route, '#FF9800', false)
        if (polyline) {
          newPolylines.push(polyline)
        }
      }
    })

    res.data.out_of_range.forEach(r => {
      const route = routeMap[r.id]
      const marker = createMarker(r, 'out_of_range', route)
      if (marker) {
        newMarkers.push(marker)
      }
      if (route) {
        const polyline = createPolyline(route, '#f44336', true)
        if (polyline) {
          newPolylines.push(polyline)
        }
      }
    })

    const centerMarker = new AMap.Marker({
      position: center,
      content: `
        <div style="
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #2196F3, #1976D2);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: bold;
        ">🏢</div>
      `,
      offset: new AMap.Pixel(-15, -15),
      zIndex: 200,
    })
    newMarkers.push(centerMarker)

    markers.value = newMarkers
    polylines.value = newPolylines

    await batchAddOverlays(newMarkers, 15)
    await batchAddOverlays(newPolylines, 10)

  } catch (e) {
    console.error('Analysis error:', e)
    alert('分析失败: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>
