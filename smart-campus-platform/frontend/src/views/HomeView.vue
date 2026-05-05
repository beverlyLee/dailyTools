<template>
  <div class="home-view">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#409EFF'"><VideoCamera /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.cameras }}</div>
              <div class="stat-label">监控摄像头</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#67C23A'"><Key /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.accessPoints }}</div>
              <div class="stat-label">门禁点位</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#E6A23C'"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.activeAlarms }}</div>
              <div class="stat-label">活跃告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#F56C6C'"><Lightning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalEnergy }} kWh</div>
              <div class="stat-label">今日能耗</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card class="map-card">
          <template #header>
            <span>园区地图概览</span>
          </template>
          <div class="map-container" ref="mapRef"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="alarm-card">
          <template #header>
            <span>实时告警</span>
          </template>
          <el-table :data="alarms" stripe style="width: 100%">
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="location" label="位置" width="100" />
            <el-table-column prop="time" label="时间" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { VideoCamera, Key, Warning, Lightning } from '@element-plus/icons-vue'
import { dashboardApi } from '../api'

const mapRef = ref(null)
const mapInstance = ref(null)
const markers = ref([])

const stats = ref({
  cameras: 0,
  accessPoints: 0,
  activeAlarms: 0,
  totalEnergy: 0
})

const alarms = ref([])
const mapMarkers = ref([])
const loading = ref(false)

const loadStats = async () => {
  try {
    const data = await dashboardApi.getStats()
    stats.value = data
  } catch (error) {
    console.error('加载统计数据失败:', error)
    stats.value = {
      cameras: 128,
      accessPoints: 56,
      activeAlarms: 3,
      totalEnergy: 2458.5
    }
  }
}

const loadAlarms = async () => {
  try {
    const data = await dashboardApi.getRecentAlarms()
    alarms.value = data
  } catch (error) {
    console.error('加载告警数据失败:', error)
    alarms.value = [
      { type: '消防', location: 'A栋1层', time: '10:32:15' },
      { type: '门禁', location: '北门', time: '10:28:42' },
      { type: '视频', location: '停车场', time: '10:15:33' }
    ]
  }
}

const loadMapMarkers = async () => {
  try {
    const data = await dashboardApi.getMapMarkers()
    mapMarkers.value = data
    addMarkersToMap()
  } catch (error) {
    console.error('加载地图标记失败:', error)
  }
}

const initMap = () => {
  if (typeof window !== 'undefined' && window.BMapGL) {
    mapInstance.value = new BMapGL.Map(mapRef.value)
    const point = new BMapGL.Point(116.404, 39.915)
    mapInstance.value.centerAndZoom(point, 15)
    mapInstance.value.enableScrollWheelZoom(true)
    
    const centerMarker = new BMapGL.Marker(point)
    mapInstance.value.addOverlay(centerMarker)
    
    const infoWindow = new BMapGL.InfoWindow('智慧园区中心', {
      width: 200,
      height: 100
    })
    centerMarker.addEventListener('click', function() {
      mapInstance.value.openInfoWindow(infoWindow, point)
    })
    
    loadMapMarkers()
  }
}

const addMarkersToMap = () => {
  if (!mapInstance.value || mapMarkers.value.length === 0) return
  
  markers.value.forEach(marker => {
    mapInstance.value.removeOverlay(marker)
  })
  markers.value = []
  
  mapMarkers.value.forEach(data => {
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
      mapInstance.value.openInfoWindow(infoWindow, point)
    })
    
    mapInstance.value.addOverlay(marker)
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

onMounted(() => {
  initMap()
  loadStats()
  loadAlarms()
})
</script>

<style scoped>
.home-view {
  height: 100%;
}

.stat-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 50%;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.map-card, .alarm-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 500px;
}

.map-container {
  width: 100%;
  height: 450px;
  background: #f0f0f0;
}
</style>
