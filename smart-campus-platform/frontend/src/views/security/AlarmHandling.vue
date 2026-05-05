<template>
  <div class="alarm-handling">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: rgba(245, 108, 108, 0.1);">
              <el-icon :size="40" :color="'#F56C6C'"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ alarmStats.total }}</div>
              <div class="stat-label">今日告警总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card pending">
          <div class="stat-content">
            <div class="stat-icon" style="background: rgba(230, 162, 60, 0.1);">
              <el-icon :size="40" :color="'#E6A23C'"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ alarmStats.pending }}</div>
              <div class="stat-label">待处置</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: rgba(103, 194, 58, 0.1);">
              <el-icon :size="40" :color="'#67C23A'"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ alarmStats.handled }}</div>
              <div class="stat-label">已处置</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: rgba(144, 147, 153, 0.1);">
              <el-icon :size="40" :color="'#909399'"><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ alarmStats.falseAlarm }}</div>
              <div class="stat-label">误报</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="alarm-list-card">
          <template #header>
            <div class="card-header">
              <span>告警列表</span>
              <div class="filters">
                <el-select v-model="filterType" placeholder="告警类型" size="small" clearable style="width: 130px;">
                  <el-option label="全部" value="" />
                  <el-option label="视频告警" value="video" />
                  <el-option label="门禁告警" value="access" />
                  <el-option label="消防告警" value="fire" />
                  <el-option label="入侵告警" value="intrusion" />
                </el-select>
                <el-select v-model="filterLevel" placeholder="告警级别" size="small" clearable style="width: 120px; margin-left: 10px;">
                  <el-option label="全部" value="" />
                  <el-option label="高" value="high" />
                  <el-option label="中" value="medium" />
                  <el-option label="低" value="low" />
                </el-select>
                <el-select v-model="filterStatus" placeholder="处置状态" size="small" clearable style="width: 120px; margin-left: 10px;">
                  <el-option label="全部" value="" />
                  <el-option label="待处置" value="pending" />
                  <el-option label="处置中" value="handling" />
                  <el-option label="已处置" value="handled" />
                  <el-option label="误报" value="false" />
                </el-select>
                <el-date-picker
                  v-model="dateRange"
                  type="datetimerange"
                  range-separator="至"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  size="small"
                  style="width: 320px; margin-left: 10px;"
                />
                <el-button type="primary" size="small" @click="searchAlarms">
                  <el-icon><Search /></el-icon> 搜索
                </el-button>
              </div>
            </div>
          </template>
          
          <el-table :data="alarmList" stripe style="width: 100%" @row-click="handleRowClick">
            <el-table-column type="selection" width="50" />
            <el-table-column prop="alarmNo" label="告警编号" width="140" />
            <el-table-column prop="alarmType" label="告警类型" width="100">
              <template #default="scope">
                <el-tag :type="getAlarmTypeTag(scope.row.alarmType)" size="small">
                  {{ getAlarmTypeName(scope.row.alarmType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="alarmLevel" label="级别" width="80">
              <template #default="scope">
                <el-tag :type="getLevelTag(scope.row.alarmLevel)" size="small" effect="dark">
                  {{ getLevelName(scope.row.alarmLevel) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="location" label="告警位置" />
            <el-table-column prop="occurTime" label="发生时间" width="160" />
            <el-table-column prop="status" label="处置状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTag(scope.row.status)" size="small">
                  {{ getStatusName(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="handler" label="处置人" width="100" />
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="scope">
                <template v-if="scope.row.status === 'pending'">
                  <el-button type="primary" size="small" @click.stop="startHandle(scope.row)">
                    开始处置
                  </el-button>
                  <el-button type="info" size="small" @click.stop="markFalseAlarm(scope.row)">
                    标记误报
                  </el-button>
                </template>
                <template v-else-if="scope.row.status === 'handling'">
                  <el-button type="success" size="small" @click.stop="completeHandle(scope.row)">
                    完成处置
                  </el-button>
                </template>
                <el-button type="text" size="small" @click.stop="viewDetail(scope.row)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-wrapper">
            <el-pagination
              background
              layout="total, sizes, prev, pager, next, jumper"
              :page-sizes="[10, 20, 50, 100]"
              :page-size="10"
              :total="100"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="detailVisible"
      title="告警详情"
      width="800px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="告警编号">{{ selectedAlarm?.alarmNo }}</el-descriptions-item>
        <el-descriptions-item label="告警类型">{{ getAlarmTypeName(selectedAlarm?.alarmType) }}</el-descriptions-item>
        <el-descriptions-item label="告警级别">
          <el-tag :type="getLevelTag(selectedAlarm?.alarmLevel)" size="small" effect="dark">
            {{ getLevelName(selectedAlarm?.alarmLevel) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="处置状态">
          <el-tag :type="getStatusTag(selectedAlarm?.status)" size="small">
            {{ getStatusName(selectedAlarm?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="告警位置" :span="2">{{ selectedAlarm?.location }}</el-descriptions-item>
        <el-descriptions-item label="发生时间">{{ selectedAlarm?.occurTime }}</el-descriptions-item>
        <el-descriptions-item label="接收时间">{{ selectedAlarm?.receiveTime }}</el-descriptions-item>
        <el-descriptions-item label="处置人">{{ selectedAlarm?.handler || '未分配' }}</el-descriptions-item>
        <el-descriptions-item label="处置时间">{{ selectedAlarm?.handleTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="告警描述" :span="2">{{ selectedAlarm?.description }}</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">相关视频</el-divider>
      <div class="video-preview">
        <div class="video-item" v-for="i in 2" :key="i">
          <div class="video-thumbnail">
            <el-icon :size="40"><VideoCamera /></el-icon>
            <span>相关视频 {{ i }}</span>
          </div>
          <div class="video-info">
            <span>CAM-00{{ i }}</span>
            <el-button type="text" size="small">播放</el-button>
          </div>
        </div>
      </div>

      <el-divider content-position="left">处置记录</el-divider>
      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in handleRecords"
          :key="index"
          :timestamp="item.time"
          placement="top"
        >
          <el-card>
            <h4>{{ item.action }}</h4>
            <p>{{ item.operator }}</p>
            <p v-if="item.remark">{{ item.remark }}</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <template #footer>
        <template v-if="selectedAlarm?.status === 'pending'">
          <el-button type="primary" @click="startHandle(selectedAlarm)">开始处置</el-button>
          <el-button type="info" @click="markFalseAlarm(selectedAlarm)">标记误报</el-button>
        </template>
        <template v-else-if="selectedAlarm?.status === 'handling'">
          <el-button type="success" @click="completeHandle(selectedAlarm)">完成处置</el-button>
        </template>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="handleDialogVisible"
      title="处置告警"
      width="500px"
    >
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="处置方式">
          <el-select v-model="handleForm.action" placeholder="请选择处置方式">
            <el-option label="远程干预" value="remote" />
            <el-option label="现场处理" value="onsite" />
            <el-option label="通知安保" value="notify" />
            <el-option label="忽略" value="ignore" />
          </el-select>
        </el-form-item>
        <el-form-item label="处置备注">
          <el-input
            v-model="handleForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入处置备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandle">确认处置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { 
  Warning, 
  Clock, 
  CircleCheck, 
  CircleClose, 
  Search, 
  VideoCamera 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const alarmStats = ref({
  total: 56,
  pending: 8,
  handled: 45,
  falseAlarm: 3
})

const filterType = ref('')
const filterLevel = ref('')
const filterStatus = ref('')
const dateRange = ref(null)
const detailVisible = ref(false)
const handleDialogVisible = ref(false)
const selectedAlarm = ref(null)

const handleForm = reactive({
  action: '',
  remark: ''
})

const alarmList = ref([
  {
    alarmNo: 'ALM-20240505-0001',
    alarmType: 'fire',
    alarmLevel: 'high',
    location: 'A栋1层101室',
    occurTime: '2024-05-05 10:32:15',
    receiveTime: '2024-05-05 10:32:16',
    status: 'pending',
    handler: '',
    handleTime: '',
    description: '烟感探测器检测到烟雾浓度超标，触发告警'
  },
  {
    alarmNo: 'ALM-20240505-0002',
    alarmType: 'access',
    alarmLevel: 'medium',
    location: '北门入口',
    occurTime: '2024-05-05 10:28:42',
    receiveTime: '2024-05-05 10:28:43',
    status: 'handling',
    handler: '张三',
    handleTime: '2024-05-05 10:30:00',
    description: '门禁系统检测到非法闯入尝试'
  },
  {
    alarmNo: 'ALM-20240505-0003',
    alarmType: 'video',
    alarmLevel: 'low',
    location: '停车场区域',
    occurTime: '2024-05-05 10:15:33',
    receiveTime: '2024-05-05 10:15:34',
    status: 'handled',
    handler: '李四',
    handleTime: '2024-05-05 10:20:00',
    description: '视频分析检测到有人员逗留超过30分钟'
  },
  {
    alarmNo: 'ALM-20240505-0004',
    alarmType: 'intrusion',
    alarmLevel: 'high',
    location: '园区围墙西南角',
    occurTime: '2024-05-05 09:45:20',
    receiveTime: '2024-05-05 09:45:21',
    status: 'false',
    handler: '王五',
    handleTime: '2024-05-05 09:50:00',
    description: '电子围栏触发，检测到有物体翻越'
  }
])

const handleRecords = ref([
  { time: '2024-05-05 10:32:15', action: '系统检测到告警', operator: '系统', remark: '烟感浓度超标' },
  { time: '2024-05-05 10:32:16', action: '告警自动上报', operator: '系统', remark: '已通知值班人员' },
  { time: '2024-05-05 10:35:00', action: '值班人员确认告警', operator: '张三', remark: '已收到告警通知' }
])

const getAlarmTypeTag = (type) => {
  const types = {
    video: 'primary',
    access: 'warning',
    fire: 'danger',
    intrusion: 'danger'
  }
  return types[type] || 'info'
}

const getAlarmTypeName = (type) => {
  const names = {
    video: '视频告警',
    access: '门禁告警',
    fire: '消防告警',
    intrusion: '入侵告警'
  }
  return names[type] || type
}

const getLevelTag = (level) => {
  const levels = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return levels[level] || 'info'
}

const getLevelName = (level) => {
  const names = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return names[level] || level
}

const getStatusTag = (status) => {
  const statuses = {
    pending: 'warning',
    handling: 'primary',
    handled: 'success',
    false: 'info'
  }
  return statuses[status] || 'info'
}

const getStatusName = (status) => {
  const names = {
    pending: '待处置',
    handling: '处置中',
    handled: '已处置',
    false: '误报'
  }
  return names[status] || status
}

const handleRowClick = (row) => {
  selectedAlarm.value = row
  detailVisible.value = true
}

const viewDetail = (row) => {
  selectedAlarm.value = row
  detailVisible.value = true
}

const startHandle = (row) => {
  ElMessageBox.confirm('确认开始处置该告警？', '确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    row.status = 'handling'
    row.handler = '当前用户'
    row.handleTime = new Date().toLocaleString('zh-CN')
    ElMessage.success('已开始处置')
    if (detailVisible.value) {
      detailVisible.value = false
    }
  }).catch(() => {
    ElMessage.info('已取消')
  })
}

const completeHandle = (row) => {
  selectedAlarm.value = row
  handleDialogVisible.value = true
}

const markFalseAlarm = (row) => {
  ElMessageBox.prompt('请输入误报原因', '标记误报', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '请输入原因'
  }).then(({ value }) => {
    row.status = 'false'
    row.handler = '当前用户'
    row.handleTime = new Date().toLocaleString('zh-CN')
    ElMessage.success('已标记为误报')
    if (detailVisible.value) {
      detailVisible.value = false
    }
  }).catch(() => {
    ElMessage.info('已取消')
  })
}

const submitHandle = () => {
  if (!handleForm.action) {
    ElMessage.warning('请选择处置方式')
    return
  }
  if (selectedAlarm.value) {
    selectedAlarm.value.status = 'handled'
    selectedAlarm.value.handleTime = new Date().toLocaleString('zh-CN')
  }
  ElMessage.success('处置完成')
  handleDialogVisible.value = false
  detailVisible.value = false
}

const searchAlarms = () => {
  ElMessage.info('搜索告警')
}

const handleSizeChange = (val) => {
  console.log('每页数量:', val)
}

const handleCurrentChange = (val) => {
  console.log('当前页:', val)
}
</script>

<style scoped>
.alarm-handling {
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
  gap: 10px;
}

.stat-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-card.pending {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(230, 162, 60, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(230, 162, 60, 0); }
  100% { box-shadow: 0 0 0 0 rgba(230, 162, 60, 0); }
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
}

.alarm-list-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.video-preview {
  display: flex;
  gap: 20px;
}

.video-item {
  width: 200px;
}

.video-thumbnail {
  width: 200px;
  height: 120px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.video-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
}
</style>
