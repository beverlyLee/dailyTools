<template>
  <div class="video-monitor">
    <el-row :gutter="20">
      <el-col :span="18">
        <el-card class="video-wall-card">
          <template #header>
            <div class="card-header">
              <span>视频监控墙</span>
              <div class="controls">
                <el-button-group>
                  <el-button size="small" @click="layout = 1">1画面</el-button>
                  <el-button size="small" @click="layout = 4">4画面</el-button>
                  <el-button size="small" @click="layout = 9">9画面</el-button>
                  <el-button size="small" @click="layout = 16">16画面</el-button>
                </el-button-group>
              </div>
            </div>
          </template>
          <div class="video-wall" :class="'layout-' + layout">
            <div 
              v-for="i in layout" 
              :key="i" 
              class="video-window"
              @click="openVideoDetail(i)"
            >
              <div class="video-placeholder">
                <el-icon :size="40"><VideoCamera /></el-icon>
                <span>摄像头 {{ i }}</span>
                <span class="status online">在线</span>
              </div>
              <div class="video-info">
                <span class="camera-name">CAM-{{ String(i).padStart(3, '0') }}</span>
                <span class="recording-icon" title="正在录制">●</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="camera-list-card">
          <template #header>
            <span>摄像头列表</span>
          </template>
          <el-tree
            :data="cameraTree"
            :props="treeProps"
            default-expand-all
            @node-click="handleCameraClick"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <span v-if="data.type === 'building'">
                  <el-icon><OfficeBuilding /></el-icon>
                </span>
                <span v-else>
                  <el-icon><VideoCamera /></el-icon>
                </span>
                <span class="node-label">{{ node.label }}</span>
                <span v-if="data.type === 'camera'" class="status-tag" :class="data.status">
                  {{ data.status === 'online' ? '在线' : '离线' }}
                </span>
              </div>
            </template>
          </el-tree>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="videoDetailVisible"
      :title="selectedCamera?.name"
      width="900px"
      :before-close="closeVideoDetail"
    >
      <div class="video-detail-content">
        <div class="large-video">
          <div class="video-placeholder">
            <el-icon :size="80"><VideoCamera /></el-icon>
            <span>实时视频</span>
          </div>
          <div class="video-overlay-info">
            <span>{{ selectedCamera?.name }}</span>
            <span>{{ currentTime }}</span>
          </div>
        </div>
        <div class="video-controls">
          <el-button-group>
            <el-button size="small" @click="captureSnapshot">
              <el-icon><Camera /></el-icon> 抓拍
            </el-button>
            <el-button size="small" @click="startRecord">
              <el-icon><VideoPlay /></el-icon> 录像
            </el-button>
            <el-button size="small" @click="openAudio">
              <el-icon><Microphone /></el-icon> 音频
            </el-button>
            <el-button size="small" @click="fullScreen">
              <el-icon><FullScreen /></el-icon> 全屏
            </el-button>
          </el-button-group>
          <el-select v-model="ptzPreset" size="small" placeholder="预置点" style="width: 120px;">
            <el-option label="预置点1" value="preset1" />
            <el-option label="预置点2" value="preset2" />
            <el-option label="预置点3" value="preset3" />
          </el-select>
        </div>
        <div class="ptz-control">
          <div class="ptz-pad">
            <div class="ptz-btn up" @click="ptzMove('up')">▲</div>
            <div class="ptz-row">
              <div class="ptz-btn left" @click="ptzMove('left')">◀</div>
              <div class="ptz-btn center" @click="ptzMove('home')">●</div>
              <div class="ptz-btn right" @click="ptzMove('right')">▶</div>
            </div>
            <div class="ptz-btn down" @click="ptzMove('down')">▼</div>
          </div>
          <div class="ptz-zoom">
            <el-button size="small" circle @click="ptzZoom('in')">+</el-button>
            <span>变焦</span>
            <el-button size="small" circle @click="ptzZoom('out')">-</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  VideoCamera, 
  OfficeBuilding, 
  Camera, 
  VideoPlay, 
  Microphone, 
  FullScreen 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { securityApi } from '../../api'

const layout = ref(4)
const videoDetailVisible = ref(false)
const selectedCamera = ref(null)
const ptzPreset = ref('')
const currentTime = ref('')
const loading = ref(false)
const cameras = ref([])

const treeProps = {
  children: 'children',
  label: 'label'
}

const cameraTree = ref([])

const loadCameras = async () => {
  loading.value = true
  try {
    const data = await securityApi.getCameras()
    cameras.value = data
    
    const buildings = {}
    data.forEach(cam => {
      const loc = cam.location || '其他'
      const building = loc.substring(0, 2)
      if (!buildings[building]) {
        buildings[building] = {
          id: Object.keys(buildings).length + 1,
          label: building,
          type: 'building',
          children: []
        }
      }
      buildings[building].children.push({
        id: cam.id,
        label: cam.name,
        type: 'camera',
        name: cam.name,
        status: cam.status
      })
    })
    
    cameraTree.value = Object.values(buildings)
    
    if (cameraTree.value.length === 0) {
      cameraTree.value = [
        {
          id: 1,
          label: 'A栋',
          type: 'building',
          children: [
            { id: 101, label: 'CAM-001', type: 'camera', name: 'A栋1层大厅', status: 'online' },
            { id: 102, label: 'CAM-002', type: 'camera', name: 'A栋1层走廊', status: 'online' },
            { id: 103, label: 'CAM-003', type: 'camera', name: 'A栋2层办公室', status: 'offline' }
          ]
        },
        {
          id: 2,
          label: 'B栋',
          type: 'building',
          children: [
            { id: 201, label: 'CAM-004', type: 'camera', name: 'B栋1层大厅', status: 'online' },
            { id: 202, label: 'CAM-005', type: 'camera', name: 'B栋停车场入口', status: 'online' }
          ]
        },
        {
          id: 3,
          label: '园区周界',
          type: 'building',
          children: [
            { id: 301, label: 'CAM-006', type: 'camera', name: '北门入口', status: 'online' },
            { id: 302, label: 'CAM-007', type: 'camera', name: '南门入口', status: 'online' }
          ]
        }
      ]
    }
  } catch (error) {
    console.error('加载摄像头列表失败:', error)
    cameraTree.value = [
      {
        id: 1,
        label: 'A栋',
        type: 'building',
        children: [
          { id: 101, label: 'CAM-001', type: 'camera', name: 'A栋1层大厅', status: 'online' },
          { id: 102, label: 'CAM-002', type: 'camera', name: 'A栋1层走廊', status: 'online' }
        ]
      }
    ]
  } finally {
    loading.value = false
  }
}

let timeInterval = null

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN')
}

const handleCameraClick = (data) => {
  if (data.type === 'camera') {
    selectedCamera.value = data
    videoDetailVisible.value = true
  }
}

const openVideoDetail = (index) => {
  selectedCamera.value = { name: `摄像头 ${index}` }
  videoDetailVisible.value = true
}

const closeVideoDetail = (done) => {
  videoDetailVisible.value = false
  done()
}

const captureSnapshot = () => {
  ElMessage.success('抓拍成功')
}

const startRecord = () => {
  ElMessage.success('开始录像')
}

const openAudio = () => {
  ElMessage.info('音频已开启')
}

const fullScreen = () => {
  ElMessage.info('全屏模式')
}

const ptzMove = (direction) => {
  ElMessage.info(`云台移动: ${direction}`)
}

const ptzZoom = (type) => {
  ElMessage.info(`变焦: ${type === 'in' ? '放大' : '缩小'}`)
}

onMounted(async () => {
  await loadCameras()
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.video-monitor {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.video-wall-card, .camera-list-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 140px);
}

.video-wall {
  display: grid;
  gap: 10px;
  height: 100%;
  min-height: 500px;
}

.layout-1 {
  grid-template-columns: 1fr;
}

.layout-4 {
  grid-template-columns: repeat(2, 1fr);
}

.layout-9 {
  grid-template-columns: repeat(3, 1fr);
}

.layout-16 {
  grid-template-columns: repeat(4, 1fr);
}

.video-window {
  position: relative;
  background: #000;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  min-height: 120px;
}

.video-window:hover {
  border: 2px solid #409EFF;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.video-placeholder .status {
  font-size: 12px;
  margin-top: 5px;
}

.video-placeholder .status.online {
  color: #67C23A;
}

.video-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-size: 12px;
}

.recording-icon {
  color: #F56C6C;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 5px;
}

.node-label {
  flex: 1;
}

.status-tag {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-tag.online {
  background: #67C23A;
  color: #fff;
}

.status-tag.offline {
  background: #909399;
  color: #fff;
}

.video-detail-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.large-video {
  position: relative;
  height: 400px;
  background: #000;
  border-radius: 4px;
}

.large-video .video-placeholder {
  color: #444;
}

.video-overlay-info {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  color: #fff;
  font-size: 14px;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.video-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ptz-control {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.ptz-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.ptz-row {
  display: flex;
  gap: 5px;
}

.ptz-btn {
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.ptz-btn:hover {
  background: #ecf5ff;
  border-color: #409EFF;
  color: #409EFF;
}

.ptz-zoom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
</style>
