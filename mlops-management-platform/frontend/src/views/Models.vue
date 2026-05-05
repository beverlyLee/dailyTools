<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { modelsApi } from '../api'
import { useModelsStore } from '../store'

const router = useRouter()
const store = useModelsStore()

const loading = ref(false)
const models = ref([])

const fetchModels = async () => {
  loading.value = true
  try {
    const response = await modelsApi.listModels()
    models.value = response.data.models || []
    store.setModels(models.value)
  } catch (error) {
    console.error('Failed to fetch models:', error)
    ElMessage.error('获取模型列表失败')
  } finally {
    loading.value = false
  }
}

const viewModelDetails = (model) => {
  store.setCurrentModel(model)
  router.push(`/models/${model.name}`)
}

const getStageType = (stage) => {
  switch (stage) {
    case 'Production': return 'success'
    case 'Staging': return 'warning'
    case 'Archived': return 'info'
    default: return 'info'
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchModels()
})
</script>

<template>
  <div>
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0;">模型管理</h2>
      <el-button type="primary" @click="fetchModels" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <el-card>
      <el-table :data="models" v-loading="loading" stripe>
        <el-table-column prop="name" label="模型名称" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="viewModelDetails(row)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="最新版本" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.latest_versions?.length > 0" type="primary">
              v{{ row.latest_versions[0].version }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="生产版本" width="120">
          <template #default="{ row }">
            <el-tag 
              v-if="row.latest_versions?.find(v => v.stage === 'Production')" 
              type="success"
            >
              v{{ row.latest_versions.find(v => v.stage === 'Production')?.version }}
            </el-tag>
            <span v-else class="tag-info">无</span>
          </template>
        </el-table-column>
        <el-table-column label="所有版本" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag 
                v-for="version in row.latest_versions" 
                :key="version.version"
                :type="getStageType(version.stage)"
                size="small"
              >
                v{{ version.version }} ({{ version.stage }})
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.creation_timestamp) }}
          </template>
        </el-table-column>
        <el-table-column label="最后更新" width="180">
          <template #default="{ row }">
            {{ formatDate(row.last_updated_timestamp) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewModelDetails(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="models.length === 0 && !loading" class="empty-container">
        <el-icon :size="48"><Box /></el-icon>
        <p style="margin-top: 16px;">暂无已注册的模型</p>
        <p style="color: #909399; margin-top: 8px;">
          您可以在实验管理中选择最佳模型进行注册
        </p>
      </div>
    </el-card>
  </div>
</template>
