<template>
  <div class="fire-system">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content fire">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#F56C6C'"><Fire /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ fireStats.smokeDetectors }}</div>
              <div class="stat-label">烟感探测器</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content water">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#409EFF'"><WaterTank /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ fireStats.sprinklers }}</div>
              <div class="stat-label">喷淋系统</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content hydrant">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#E6A23C'"><Connection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ fireStats.hydrants }}</div>
              <div class="stat-label">消防栓</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card alarm">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#F56C6C'"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ fireStats.activeAlarms }}</div>
              <div class="stat-label">活动告警</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="18">
        <el-card class="map-card">
          <template #header>
            <div class="card-header">
              <span>消防设备分布图</span>
              <div class="layer-controls">
                <el-checkbox-group v-model="selectedLayers">
                  <el-checkbox label="smoke">烟感探测器</el-checkbox>
                  <el-checkbox label="sprinkler">喷淋系统</el-checkbox>
                  <el-checkbox label="hydrant">消防栓</el-checkbox>
                  <el-checkbox label="alarm">告警点位</el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
          </template>
          <div class="map-container" ref="mapRef">
            <div class="map-placeholder">
              <el-icon :size="60" color="#909399"><MapLocation /></el-icon>
              <span>消防设备分布图</span>
              <div class="map-legend">
                <div class="legend-item">
                  <span class="dot smoke"></span>
                  <span>烟感探测器</span>
                </div>
                <div class="legend-item">
                  <span class="dot sprinkler"></span>
                  <span>喷淋系统</span>
                </div>
                <div class="legend-item">
                  <span class="dot hydrant"></span>
                  <span>消防栓</span>
                </div>
                <div class="legend-item">
                  <span class="dot alarm"></span>
                  <span>告警点位</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="alarm-list-card">
          <template #header>
            <span>实时告警</span>
          </template>
          <div class="alarm-list">
            <div 
              v-for="alarm in fireAlarms" 
              :key="alarm.id" 
              class="alarm-item"
              :class="alarm.level"
              @click="handleAlarmClick(alarm)"
            >
              <div class="alarm-header">
                <span class="alarm-type">{{ alarm.type }}</span>
                <el-tag :type="alarm.level === 'high' ? 'danger' : alarm.level === 'medium' ? 'warning' : 'info'" size="small">
                  {{ alarm.level === 'high' ? '高' : alarm.level === 'medium' ? '中' : '低' }}
                </el-tag>
              </div>
              <div class="alarm-content">
                <div class="alarm-location">
                  <el-icon><Location /></el-icon>
                  {{ alarm.location }}
                </div>
                <div class="alarm-time">
                  <el-icon><Timer /></el-icon>
                  {{ alarm.time }}
                </div>
              </div>
              <div class="alarm-actions">
                <el-button size="small" type="primary" @click.stop="handleAlarm(alarm)">
                  处置
                </el-button>
                <el-button size="small" type="warning" @click.stop="viewAlarmDetail(alarm)">
                  详情
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="device-status-card">
          <template #header>
            <span>设备状态监控</span>
          </template>
          <el-table :data="fireDevices" stripe style="width: 100%">
            <el-table-column prop="deviceId" label="设备编号" width="120" />
            <el-table-column prop="type" label="设备类型" width="120">
              <template #default="scope">
                <el-tag :type="getDeviceTagType(scope.row.type)" size="small">
                  {{ getDeviceTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="location" label="位置" />
            <el-table-column prop="floor" label="楼层" width="80" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'normal' ? 'success' : scope.row.status === 'fault' ? 'danger' : 'warning'" size="small">
                  {{ scope.row.status === 'normal' ? '正常' : scope.row.status === 'fault' ? '故障' : '告警' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastCheck" label="最后检测" width="150" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="text" size="small" @click="testDevice(scope.row)">
                  测试
                </el-button>
                <el-button type="text" size="small" @click="viewDeviceDetail(scope.row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { 
  Fire, 
  WaterTank, 
  Connection, 
  Warning, 
  MapLocation, 
  Location, 
  Timer 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const mapRef = ref(null)
const selectedLayers = ref(['smoke', 'sprinkler', 'hydrant', 'alarm'])

const fireStats = ref({
  smokeDetectors: 86,
  sprinklers: 120,
  hydrants: 45,
  activeAlarms: 2
})

const fireAlarms = ref([
  { id: 1, type: '烟感告警', level: 'high', location: 'A栋1层101室', time: '10:32:15', status: 'pending' },
  { id: 2, type: '温度异常', level: 'medium', location: 'B栋3层机房', time: '10:28:42', status: 'pending' }
])

const fireDevices = ref([
  { deviceId: 'FD-001', type: 'smoke', location: 'A栋1层大厅', floor: '1F', status: 'normal', lastCheck: '2024-05-05 08:00' },
  { deviceId: 'FD-002', type: 'smoke', location: 'A栋1层101室', floor: '1F', status: 'alarm', lastCheck: '2024-05-05 10:32' },
  { deviceId: 'FD-003', type: 'sprinkler', location: 'A栋2层走廊', floor: '2F', status: 'normal', lastCheck: '2024-05-05 08:00' },
  { deviceId: 'FD-004', type: 'hydrant', location: '园区北门', floor: '-', status: 'normal', lastCheck: '2024-05-01 10:00' },
  { deviceId: 'FD-005', type: 'smoke', location: 'B栋3层机房', floor: '3F', status: 'alarm', lastCheck: '2024-05-05 10:28' }
])

const getDeviceTagType = (type) => {
  const types = {
    smoke: 'danger',
    sprinkler: 'primary',
    hydrant: 'warning'
  }
  return types[type] || 'info'
}

const getDeviceTypeName = (type) => {
  const names = {
    smoke: '烟感探测器',
    sprinkler: '喷淋系统',
    hydrant: '消防栓'
  }
  return names[type] || type
}

const handleAlarmClick = (alarm) => {
  ElMessage.info(`定位告警: ${alarm.location}`)
}

const handleAlarm = (alarm) => {
  ElMessage.success('告警已处置')
}

const viewAlarmDetail = (alarm) => {
  ElMessage.info(`查看告警详情: ${alarm.type}`)
}

const testDevice = (device) => {
  ElMessage.success(`设备测试: ${device.deviceId}`)
}

const viewDeviceDetail = (device) => {
  ElMessage.info(`查看设备详情: ${device.deviceId}`)
}
</script>

<style scoped>
.fire-system {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layer-controls {
  display: flex;
  gap: 10px;
}

.stat-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-card.alarm {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(245, 108, 108, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0); }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 108, 108, 0.1);
  border-radius: 50%;
}

.stat-content.fire .stat-icon { background: rgba(245, 108, 108, 0.1); }
.stat-content.water .stat-icon { background: rgba(64, 158, 255, 0.1); }
.stat-content.hydrant .stat-icon { background: rgba(230, 162, 60, 0.1); }

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.map-card, .alarm-list-card, .device-status-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.map-container {
  width: 100%;
  height: 400px;
  background: #f5f7fa;
  border-radius: 4px;
  position: relative;
}

.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.map-legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0;
  font-size: 12px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.smoke { background: #F56C6C; }
.dot.sprinkler { background: #409EFF; }
.dot.hydrant { background: #E6A23C; }
.dot.alarm { background: #F56C6C; animation: blink 1s infinite; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.alarm-list {
  max-height: 400px;
  overflow-y: auto;
}

.alarm-item {
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.alarm-item:hover {
  border-color: #409EFF;
}

.alarm-item.high {
  border-left: 4px solid #F56C6C;
  background: rgba(245, 108, 108, 0.05);
}

.alarm-item.medium {
  border-left: 4px solid #E6A23C;
  background: rgba(230, 162, 60, 0.05);
}

.alarm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.alarm-type {
  font-weight: bold;
  color: #303133;
}

.alarm-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
  color: #606266;
}

.alarm-location, .alarm-time {
  display: flex;
  align-items: center;
  gap: 5px;
}

.alarm-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}
</style>
