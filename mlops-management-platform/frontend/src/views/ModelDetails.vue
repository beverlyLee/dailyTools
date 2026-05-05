<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { modelsApi } from '../api'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const modelDetails = ref(null)

const modelName = computed(() => route.params.modelName)

const fetchModelDetails = async () => {
  loading.value = true
  try {
    const response = await modelsApi.getModelDetails(modelName.value)
    modelDetails.value = response.data.model
  } catch (error) {
    console.error('Failed to fetch model details:', error)
    ElMessage.error('获取模型详情失败')
  } finally {
    loading.value = false
  }
}

const transitionStage = async (version, currentStage) => {
  const stages = ['None', 'Staging', 'Production', 'Archived']
  const currentIndex = stages.indexOf(currentStage)
  
  try {
    const { value: targetStage } = await ElMessageBox.prompt(
      '请选择目标阶段',
      '切换模型阶段',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputType: 'select',
        inputValidator: (value) => {
          if (!value) {
            return '请选择目标阶段'
          }
          return true
        },
        inputOptions: stages.reduce((acc, stage) => {
          acc[stage] = stage
          return acc
        }, {}),
        inputValue: currentStage
      }
    )
    
    if (targetStage) {
      await modelsApi.transitionStage(modelName.value, version.version, targetStage)
      ElMessage.success('模型阶段切换成功')
      fetchModelDetails()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to transition stage:', error)
      ElMessage.error('切换模型阶段失败')
    }
  }
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
  fetchModelDetails()
})

watch(modelName, () => {
  fetchModelDetails()
})
</script>

<template>
  <div v-loading="loading">
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <el-button @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 style="margin: 0;">模型详情 - {{ modelName }}</h2>
      </div>
      <el-button @click="fetchModelDetails" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <div v-if="modelDetails">
      <el-card class="metric-card">
        <template #header>
          <span>基本信息</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="模型名称">
            <el-tag type="primary" size="large">{{ modelDetails.name }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="版本数量">
            <el-tag type="info">{{ modelDetails.versions?.length || 0 }} 个版本</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述">
            {{ modelDetails.description || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(modelDetails.creation_timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatDate(modelDetails.last_updated_timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="生产版本">
            <template v-if="modelDetails.versions?.find(v => v.stage === 'Production')">
              <el-tag type="success">
                v{{ modelDetails.versions.find(v => v.stage === 'Production')?.version }}
              </el-tag>
            </template>
            <span v-else class="tag-info">无</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card>
        <template #header>
          <span>版本列表</span>
        </template>
        <el-table :data="modelDetails.versions || []" stripe>
          <el-table-column prop="version" label="版本号" width="100">
            <template #default="{ row }">
              <el-tag type="primary">v{{ row.version }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="stage" label="阶段" width="120">
            <template #default="{ row }">
              <el-tag :type="getStageType(row.stage)">
                {{ row.stage }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'READY' ? 'success' : 'warning'">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="run_id" label="来源运行" min-width="200">
            <template #default="{ row }">
              <code>{{ row.run_id || '-' }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="source" label="存储路径" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <code style="font-size: 12px;">{{ row.source || '-' }}</code>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.creation_timestamp) }}
            </template>
          </el-table-column>
          <el-table-column label="标签" min-width="200">
            <template #default="{ row }">
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                <el-tag 
                  v-for="(value, key) in row.tags" 
                  :key="key" 
                  size="small" 
                  type="info"
                >
                  {{ key }}: {{ value }}
                </el-tag>
              </div>
              <span v-if="!row.tags || Object.keys(row.tags).length === 0">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button 
                type="primary" 
                link 
                @click="transitionStage(row, row.stage)"
              >
                切换阶段
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card v-if="modelDetails.tags && Object.keys(modelDetails.tags).length > 0" style="margin-top: 20px;">
        <template #header>
          <span>模型标签</span>
        </template>
        <el-table :data="Object.entries(modelDetails.tags)" stripe size="small">
          <el-table-column label="标签名" prop="0" width="200" />
          <el-table-column label="标签值" prop="1" />
        </el-table>
      </el-card>
    </div>
  </div>
</template>
