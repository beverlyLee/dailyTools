<template>
  <div class="access-control">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="stat-card">
          <template #header>
            <span>门禁设备统计</span>
          </template>
          <div class="stat-list">
            <div class="stat-item">
              <div class="stat-icon" style="background: rgba(64, 158, 255, 0.1);">
                <el-icon :size="24" :color="'#409EFF'"><Key /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ accessStats.total }}</div>
                <div class="stat-label">门禁总数</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon" style="background: rgba(103, 194, 58, 0.1);">
                <el-icon :size="24" :color="'#67C23A'"><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ accessStats.online }}</div>
                <div class="stat-label">在线设备</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon" style="background: rgba(144, 147, 153, 0.1);">
                <el-icon :size="24" :color="'#909399'"><CircleClose /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ accessStats.offline }}</div>
                <div class="stat-label">离线设备</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon" style="background: rgba(230, 162, 60, 0.1);">
                <el-icon :size="24" :color="'#E6A23C'"><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ accessStats.todayAccess }}</div>
                <div class="stat-label">今日通行</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card class="access-list-card">
          <template #header>
            <div class="card-header">
              <span>门禁设备列表</span>
              <el-button type="primary" size="small" @click="openAddDialog">
                <el-icon><Plus /></el-icon> 添加设备
              </el-button>
            </div>
          </template>
          <el-table :data="accessDevices" stripe style="width: 100%">
            <el-table-column prop="deviceId" label="设备编号" width="120" />
            <el-table-column prop="name" label="设备名称" width="150" />
            <el-table-column prop="location" label="位置" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'online' ? 'success' : 'danger'">
                  {{ scope.row.status === 'online' ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastAccess" label="最后通行" width="150" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button size="small" type="primary" @click="openDoor(scope.row)">
                  远程开门
                </el-button>
                <el-button size="small" type="warning" @click="viewDetail(scope.row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="access-record-card">
          <template #header>
            <div class="card-header">
              <span>通行记录</span>
              <div class="filters">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  size="small"
                  style="width: 280px;"
                />
                <el-select v-model="filterType" placeholder="选择类型" size="small" clearable style="width: 120px; margin-left: 10px;">
                  <el-option label="全部" value="" />
                  <el-option label="刷卡" value="card" />
                  <el-option label="人脸" value="face" />
                  <el-option label="密码" value="password" />
                </el-select>
                <el-select v-model="filterResult" placeholder="选择结果" size="small" clearable style="width: 120px; margin-left: 10px;">
                  <el-option label="全部" value="" />
                  <el-option label="成功" value="success" />
                  <el-option label="失败" value="fail" />
                </el-select>
              </div>
            </div>
          </template>
          <el-table :data="accessRecords" stripe style="width: 100%">
            <el-table-column prop="time" label="时间" width="180" />
            <el-table-column prop="deviceName" label="设备名称" width="150" />
            <el-table-column prop="personName" label="人员姓名" width="100" />
            <el-table-column prop="personId" label="工号/卡号" width="120" />
            <el-table-column prop="accessType" label="通行方式" width="100">
              <template #default="scope">
                <el-tag v-if="scope.row.accessType === 'card'" size="small">刷卡</el-tag>
                <el-tag v-else-if="scope.row.accessType === 'face'" size="small" type="primary">人脸</el-tag>
                <el-tag v-else size="small" type="warning">密码</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="direction" label="方向" width="80">
              <template #default="scope">
                {{ scope.row.direction === 'in' ? '进入' : '外出' }}
              </template>
            </el-table-column>
            <el-table-column prop="result" label="结果" width="80">
              <template #default="scope">
                <el-tag :type="scope.row.result === 'success' ? 'success' : 'danger'" size="small">
                  {{ scope.row.result === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="photo" label="抓拍照片" width="100">
              <template #default="scope">
                <el-button type="text" size="small" @click="viewPhoto(scope.row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper">
            <el-pagination
              background
              layout="prev, pager, next"
              :total="100"
              @current-change="handlePageChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="detailVisible"
      title="门禁详情"
      width="600px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="设备编号">{{ selectedDevice?.deviceId }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ selectedDevice?.name }}</el-descriptions-item>
        <el-descriptions-item label="位置">{{ selectedDevice?.location }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="selectedDevice?.status === 'online' ? 'success' : 'danger'">
            {{ selectedDevice?.status === 'online' ? '在线' : '离线' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="安装时间">2024-01-15</el-descriptions-item>
        <el-descriptions-item label="最后维护">2024-03-20</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Key, CircleCheck, CircleClose, User, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const accessStats = ref({
  total: 56,
  online: 52,
  offline: 4,
  todayAccess: 1286
})

const accessDevices = ref([
  { deviceId: 'ACS-001', name: '北门门禁', location: '园区北门入口', status: 'online', lastAccess: '10:30:25' },
  { deviceId: 'ACS-002', name: '南门门禁', location: '园区南门入口', status: 'online', lastAccess: '10:28:15' },
  { deviceId: 'ACS-003', name: 'A栋1层门禁', location: 'A栋1层大厅', status: 'online', lastAccess: '10:25:30' },
  { deviceId: 'ACS-004', name: 'A栋2层门禁', location: 'A栋2层走廊', status: 'offline', lastAccess: '09:45:20' },
  { deviceId: 'ACS-005', name: 'B栋1层门禁', location: 'B栋1层大厅', status: 'online', lastAccess: '10:20:10' }
])

const accessRecords = ref([
  { time: '2024-05-05 10:30:25', deviceName: '北门门禁', personName: '张三', personId: 'EMP001', accessType: 'card', direction: 'in', result: 'success', photo: '' },
  { time: '2024-05-05 10:28:15', deviceName: '南门门禁', personName: '李四', personId: 'EMP002', accessType: 'face', direction: 'out', result: 'success', photo: '' },
  { time: '2024-05-05 10:25:30', deviceName: 'A栋1层门禁', personName: '王五', personId: 'EMP003', accessType: 'password', direction: 'in', result: 'fail', photo: '' },
  { time: '2024-05-05 10:20:10', deviceName: 'B栋1层门禁', personName: '赵六', personId: 'EMP004', accessType: 'card', direction: 'in', result: 'success', photo: '' }
])

const dateRange = ref(null)
const filterType = ref('')
const filterResult = ref('')
const detailVisible = ref(false)
const selectedDevice = ref(null)

const openDoor = (row) => {
  ElMessageBox.confirm(`确认远程开启门禁: ${row.name}`, '确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('远程开门成功')
  }).catch(() => {
    ElMessage.info('已取消')
  })
}

const viewDetail = (row) => {
  selectedDevice.value = row
  detailVisible.value = true
}

const openAddDialog = () => {
  ElMessage.info('添加门禁设备功能')
}

const viewPhoto = (row) => {
  ElMessage.info('查看抓拍照片功能')
}

const handlePageChange = (val) => {
  console.log('当前页:', val)
}
</script>

<style scoped>
.access-control {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filters {
  display: flex;
  align-items: center;
}

.stat-card, .access-list-card, .access-record-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
