<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { experimentsApi } from '../api'
import { useExperimentsStore } from '../store'

const router = useRouter()
const store = useExperimentsStore()

const loading = ref(false)
const experiments = ref([])

const fetchExperiments = async () => {
  loading.value = true
  try {
    const response = await experimentsApi.listExperiments()
    experiments.value = response.data.experiments || []
    store.setExperiments(experiments.value)
  } catch (error) {
    console.error('Failed to fetch experiments:', error)
    ElMessage.error('获取实验列表失败')
  } finally {
    loading.value = false
  }
}

const viewRuns = (experiment) => {
  store.setCurrentExperiment(experiment)
  router.push(`/experiments/${experiment.experiment_id}/runs`)
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchExperiments()
})
</script>

<template>
  <div>
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0;">实验管理</h2>
      <el-button type="primary" @click="fetchExperiments" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <el-card>
      <el-table :data="experiments" v-loading="loading" stripe>
        <el-table-column prop="experiment_id" label="实验ID" width="120" />
        <el-table-column prop="name" label="实验名称" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="viewRuns(row)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="artifact_location" label="存储位置" min-width="250" show-overflow-tooltip />
        <el-table-column prop="lifecycle_stage" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.lifecycle_stage === 'active' ? 'success' : 'info'">
              {{ row.lifecycle_stage === 'active' ? '活跃' : '已归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.last_update_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewRuns(row)">
              查看运行
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="experiments.length === 0 && !loading" class="empty-container">
        <el-icon :size="48"><Box /></el-icon>
        <p style="margin-top: 16px;">暂无实验数据</p>
      </div>
    </el-card>
  </div>
</template>
