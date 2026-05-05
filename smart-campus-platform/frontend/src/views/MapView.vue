<template>
  <div class="map-view">
    <el-card class="map-card">
      <template #header>
        <div class="card-header">
          <span>园区GIS地图</span>
          <div class="map-controls">
            <el-button-group>
              <el-button size="small" @click="zoomIn">放大</el-button>
              <el-button size="small" @click="zoomOut">缩小</el-button>
              <el-button size="small" @click="resetView">重置</el-button>
            </el-button-group>
            <el-select v-model="selectedLayer" size="small" placeholder="选择图层" style="width: 120px; margin-left: 10px;">
              <el-option label="全部" value="all" />
              <el-option label="摄像头" value="camera" />
              <el-option label="门禁" value="access" />
              <el-option label="消防" value="fire" />
              <el-option label="告警" value="alarm" />
            </el-select>
          </div>
        </div>
      </template>
      <div class="map-container" ref="mapRef"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { dashboardApi } from '../api'

const mapRef = ref(null)
const map = ref(null)
const selectedLayer = ref('all')
const markers = ref([])
const markerData = ref([])
const loading = ref(false)

const loadMapMarkers = async () => {
  loading.value = true
  try {
    const data = await dashboardApi.getMapMarkers()
    markerData.value = data
    addMarkers()
  } catch (error) {
    console.error('加载地图标记失败:', error)
    markerData.value = [
      { type: 'camera', lng: 116.404, lat: 39.915, title: '摄像头 A1' },
      { type: 'camera', lng: 116.405, lat: 39.916, title: '摄像头 A2' },
      { type: 'access', lng: 116.406, lat: 39.915, title: '门禁 北门' },
      { type: 'access', lng: 116.403, lat: 39.914, title: '门禁 南门' },
      { type: 'fire', lng: 116.405, lat: 39.914, title: '消防栓 B1' },
      { type: 'alarm', lng: 116.406, lat: 39.916, title: '告警 消防' }
    ]
    addMarkers()
  } finally {
    loading.value = false
  }
}

const initMap = () => {
  if (typeof window !== 'undefined' && window.BMapGL) {
    map.value = new BMapGL.Map(mapRef.value)
    const point = new BMapGL.Point(116.404, 39.915)
    map.value.centerAndZoom(point, 16)
    map.value.enableScrollWheelZoom(true)
    
    const scaleControl = new BMapGL.ScaleControl()
    map.value.addControl(scaleControl)
    
    const zoomControl = new BMapGL.ZoomControl()
    map.value.addControl(zoomControl)
    
    loadMapMarkers()
  }
}

const addMarkers = () => {
  if (!map.value) return
  
  markers.value.forEach(marker => {
    map.value.removeOverlay(marker)
  })
  markers.value = []
  
  const filteredData = selectedLayer.value === 'all' 
    ? markerData.value 
    : markerData.value.filter(m => m.type === selectedLayer.value)
  
  filteredData.forEach(data => {
    const point = new BMapGL.Point(data.lng, data.lat)
    const marker = new BMapGL.Marker(point)
    
    const iconStyle = getIconStyle(data.type)
    const icon = new BMapGL.Icon(iconStyle.url, new BMapGL.Size(32, 32))
    marker.setIcon(icon)
    
    const infoWindow = new BMapGL.InfoWindow(`<div style="padding: 10px;">
      <h4 style="margin: 0 0 5px 0;">${data.title}</h4>
      <p style="margin: 0; color: #666;">类型: ${getTypeLabel(data.type)}</p>
    </div>`, {
      width: 200,
      height: 80
    })
    
    marker.addEventListener('click', function() {
      map.value.openInfoWindow(infoWindow, point)
    })
    
    map.value.addOverlay(marker)
    markers.value.push(marker)
  })
}

const getIconStyle = (type) => {
  const icons = {
    camera: { url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNGRkZGRkYiIHJ4PSI0Ii8+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiBmaWxsPSIjNDA5RUZGIiByeD0iNCIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjYiIGZpbGw9IiNGRkZGRkYiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIzIiBmaWxsPSIjNDA5RUZGIi8+PC9zdmc+' },
    access: { url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNGRkZGRkYiIHJ4PSI0Ii8+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiBmaWxsPSIjNjdDMjNBIiByeD0iNCIvPjxyZWN0IHg9IjEwIiB5PSI4IiB3aWR0aD0iMTIiIGhlaWdodD0iMTYiIGZpbGw9IiNGRkZGRkYiIHJ4PSIyIi8+PHJlY3QgeD0iMTQiIHk9IjEyIiB3aWR0aD0iNCIgaGVpZ2h0PSI4IiBmaWxsPSIjNjdDMjNBIiByeD0iMSIvPjwvcz4=' },
    fire: { url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNGRkZGRkYiIHJ4PSI0Ii8+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiBmaWxsPSIjRTZBMjNDIiByeD0iNCIvPjxwYXRoIGQ9Ik0xNiA4TDE4IDE0SDI0TDE5LjUgMTcuNUwyMSAyNEwxNiAyMC41TDExIDI0TDEyLjUgMTcuNUw4IDE0SDE0WiIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==' },
    alarm: { url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNGRkZGRkYiIHJ4PSI0Ii8+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiBmaWxsPSIjRjU2QzZDIiByeD0iNCIvPjxwYXRoIGQ9Ik0xNiA3TDE0IDE0SDlMMTIgMTdMMTEgMjRIMTZIMTdMMTYgMTdMMTkgMTRIMTRaIiBmaWxsPSIjRkZGRkZGIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIyMSIgcj0iMSIgZmlsbD0iI0Y1NkM2QyIi8+PC9zdmc+' }
  }
  return icons[type] || icons.camera
}

const getTypeLabel = (type) => {
  const labels = {
    camera: '摄像头',
    access: '门禁',
    fire: '消防',
    alarm: '告警'
  }
  return labels[type] || '未知'
}

const zoomIn = () => {
  if (map.value) {
    map.value.setZoom(map.value.getZoom() + 1)
  }
}

const zoomOut = () => {
  if (map.value) {
    map.value.setZoom(map.value.getZoom() - 1)
  }
}

const resetView = () => {
  if (map.value) {
    const point = new BMapGL.Point(116.404, 39.915)
    map.value.centerAndZoom(point, 16)
  }
}

watch(selectedLayer, () => {
  addMarkers()
})

onMounted(() => {
  initMap()
})
</script>

<style scoped>
.map-view {
  height: 100%;
}

.map-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.map-controls {
  display: flex;
  align-items: center;
}

.map-container {
  width: 100%;
  height: 600px;
  background: #f0f0f0;
}
</style>
