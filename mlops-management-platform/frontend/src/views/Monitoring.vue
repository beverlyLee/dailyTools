<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { monitoringApi } from '../api'
import { useMonitoringStore } from '../store'

const router = useRouter()
const store = useMonitoringStore()

const loading = ref(false)
const services = ref([])
const metrics = ref([])
const refreshInterval = ref(null)
const autoRefresh = ref(true)
const newServiceName = ref('')
const registerDialogVisible = ref(false)

const fetchServices = async () => {
  try {
    const response = await monitoringApi.listServices()
    services.value = response.data.services || []
    store.setServices(services.value)
  } catch (error) {
    console.error('Failed to fetch services:', error)
  }
}

const fetchAllMetrics = async () => {
  loading.value = true
  try {
    const response = await monitoringApi.getAllMetrics()
    metrics.value = response.data.metrics || []
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
  } finally {
    loading.value = false
  }
}

const viewServiceDetails = (serviceName) => {
  store.setCurrentService(serviceName)
  router.push(`/monitoring/${serviceName}`)
}

const registerService = async () => {
  if (!newServiceName.value.trim()) {
    ElMessage.warning('请输入服务名称')
    return
  }

  try {
    await monitoringApi.registerService(newServiceName.value.trim())
    ElMessage.success('服务注册成功')
    registerDialogVisible.value = false
    newServiceName.value = ''
    fetchServices()
    fetchAllMetrics()
  } catch (error) {
    console.error('Failed to register service:', error)
    ElMessage.error('服务注册失败')
  }
}

const unregisterService = async (serviceName) => {
  try {
    await ElMessageBox.confirm(
      `确定要注销服务 "${serviceName}" 吗？`,
      '确认注销',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await monitoringApi.unregisterService(serviceName)
    ElMessage.success('服务已注销')
    fetchServices()
    fetchAllMetrics()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to unregister service:', error)
      ElMessage.error('服务注销失败')
    }
  }
}

const simulateRequest = async (serviceName) => {
  try {
    await monitoringApi.simulateRequest(serviceName)
    ElMessage.success('模拟请求已发送')
    fetchAllMetrics()
  } catch (error) {
    console.error('Failed to simulate request:', error)
    ElMessage.error('模拟请求失败')
  }
}

const startAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  if (autoRefresh.value) {
    refreshInterval.value = setInterval(() => {
      fetchAllMetrics()
    }, 5000)
  }
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  store.toggleAutoRefresh()
  startAutoRefresh()
}

onMounted(() => {
  fetchServices()
  fetchAllMetrics()
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<template>
  <div>
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0;">服务监控</h2>
      <div style="display: flex; gap: 8px;">
        <el-switch 
          v-model="autoRefresh" 
          @change="toggleAutoRefresh"
          active-text="自动刷新"
        />
        <el-button type="primary" @click="registerDialogVisible = true">
          <el-icon><Plus /></el-icon>
          注册服务
        </el-button>
        <el-button @click="fetchAllMetrics" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ services.length }}</div>
          <div class="stat-label">已注册服务</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value" style="color: #67c23a;">
            {{ metrics.filter(m => m.drift_detected === false).length }}
          </div>
          <div class="stat-label">正常服务</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value" style="color: #e6a23c;">
            {{ metrics.filter(m => m.drift_detected === true).length }}
          </div>
          <div class="stat-label">漂移警告</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value" style="color: #f56c6c;">0</div>
          <div class="stat-label">异常服务</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-loading="loading">
      <el-table :data="metrics" stripe>
        <el-table-column prop="service_name" label="服务名称" min-width="180">
          <template #default="{ row }">
            <el-link type="primary" @click="viewServiceDetails(row.service_name)">
              {{ row.service_name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.drift_detected" type="warning">漂移</el-tag>
            <el-tag v-else type="success">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="QPS" width="120">
          <template #default="{ row }">
            <el-tag type="primary">
              {{ (row.qps?.current || 0).toFixed(2) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="平均延迟 (ms)" width="140">
          <template #default="{ row }">
            <el-tag :type="(row.latency?.average || 0) > 100 ? 'warning' : 'info'">
              {{ (row.latency?.average || 0).toFixed(2) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="P95 延迟 (ms)" width="140">
          <template #default="{ row }">
            <el-tag :type="(row.latency?.p95 || 0) > 200 ? 'warning' : 'info'">
              {{ (row.latency?.p95 || 0).toFixed(2) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="GPU 利用率 (%)" width="140">
          <template #default="{ row }">
            <el-progress 
              :percentage="Math.round(row.gpu_utilization?.current || 0)"
              :color="(row.gpu_utilization?.current || 0) > 80 ? '#e6a23c' : '#67c23a'"
              :stroke-width="16"
              style="width: 100px;"
            />
          </template>
        </el-table-column>
        <el-table-column label="漂移分数" width="120">
          <template #default="{ row }">
            <el-tag :type="row.drift_score > 0.5 ? 'warning' : 'info'">
              {{ (row.drift_score || 0).toFixed(4) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预测分布" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag 
                v-for="(count, prediction) in row.prediction_distribution" 
                :key="prediction"
                size="small"
                type="info"
              >
                {{ prediction }}: {{ count }}
              </el-tag>
            </div>
            <span v-if="!row.prediction_distribution || Object.keys(row.prediction_distribution).length === 0">
              -
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" link @click="viewServiceDetails(row.service_name)">
                详情
              </el-button>
              <el-button type="success" link @click="simulateRequest(row.service_name)">
                模拟请求
              </el-button>
              <el-button type="danger" link @click="unregisterService(row.service_name)">
                注销
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="metrics.length === 0 && !loading" class="empty-container">
        <el-icon :size="48"><Monitor /></el-icon>
        <p style="margin-top: 16px;">暂无监控的服务</p>
        <p style="color: #909399; margin-top: 8px;">
          点击"注册服务"按钮添加需要监控的服务
        </p>
      </div>
    </el-card>

    <el-dialog v-model="registerDialogVisible" title="注册新服务" width="500px">
      <el-form label-width="100px">
        <el-form-item label="服务名称">
          <el-input 
            v-model="newServiceName" 
            placeholder="请输入服务名称"
            @keyup.enter="registerService"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="registerService">确认注册</el-button>
      </template>
    </el-dialog>
  </div>
</template>
