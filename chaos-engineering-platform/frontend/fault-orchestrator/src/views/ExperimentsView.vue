<template>
  <div class="experiments-view">
    <div class="page-header">
      <h2>实验列表</h2>
      <el-button type="primary" @click="goToOrchestrator">
        <el-icon><Plus /></el-icon>
        新建实验
      </el-button>
    </div>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>所有实验</span>
          <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 150px">
            <el-option
              v-for="(label, value) in STATUS_LABELS"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </div>
      </template>

      <el-table :data="filteredExperiments" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="实验名称" min-width="180">
          <template #default="scope">
            <router-link :to="`/orchestrator/${scope.row.id}`" class="experiment-name">
              {{ scope.row.name }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="targetNamespace" label="目标命名空间" width="140">
          <template #default="scope">
            <el-tag>{{ scope.row.targetNamespace }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="steps" label="步骤数" width="100">
          <template #default="scope">
            {{ scope.row.steps?.length || 0 }} 步
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ STATUS_LABELS[scope.row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 'draft' || scope.row.status === 'ready'"
              type="primary"
              size="small"
              @click="startExperiment(scope.row.id)"
            >
              启动
            </el-button>
            <el-button
              v-if="scope.row.status === 'running'"
              type="warning"
              size="small"
              @click="pauseExperiment(scope.row.id)"
            >
              暂停
            </el-button>
            <el-button
              v-if="scope.row.status === 'paused'"
              type="success"
              size="small"
              @click="resumeExperiment(scope.row.id)"
            >
              继续
            </el-button>
            <el-button
              v-if="['running', 'paused'].includes(scope.row.status)"
              type="danger"
              size="small"
              @click="abortExperiment(scope.row.id)"
            >
              终止
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click="goToOrchestrator(scope.row.id)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="confirmDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && filteredExperiments.length === 0" description="暂无实验数据">
        <el-button type="primary" @click="goToOrchestrator">创建第一个实验</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { Experiment } from '@/types'
import { experimentApi } from '@/utils/api'
import { STATUS_LABELS, formatDate } from '@/utils/helpers'

const router = useRouter()

const loading = ref(false)
const experiments = ref<Experiment[]>([])
const filterStatus = ref<string>('')

const filteredExperiments = computed(() => {
  if (!filterStatus.value) return experiments.value
  return experiments.value.filter(exp => exp.status === filterStatus.value)
})

function getStatusType(status: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    running: 'success',
    paused: 'warning',
    completed: 'success',
    failed: 'danger',
    aborted: 'danger',
    ready: 'primary',
    draft: 'info'
  }
  return map[status] || 'info'
}

async function loadExperiments() {
  loading.value = true
  try {
    const result = await experimentApi.getList()
    experiments.value = result.data || []
  } catch (error) {
    ElMessage.error('加载实验列表失败')
  } finally {
    loading.value = false
  }
}

function goToOrchestrator(id?: string) {
  if (id) {
    router.push(`/orchestrator/${id}`)
  } else {
    router.push('/orchestrator')
  }
}

async function startExperiment(id: string) {
  try {
    await experimentApi.start(id)
    ElMessage.success('实验已启动')
    await loadExperiments()
  } catch (error) {
    ElMessage.error('启动实验失败')
  }
}

async function pauseExperiment(id: string) {
  try {
    await experimentApi.pause(id)
    ElMessage.success('实验已暂停')
    await loadExperiments()
  } catch (error) {
    ElMessage.error('暂停实验失败')
  }
}

async function resumeExperiment(id: string) {
  try {
    await experimentApi.resume(id)
    ElMessage.success('实验已继续')
    await loadExperiments()
  } catch (error) {
    ElMessage.error('继续实验失败')
  }
}

async function abortExperiment(id: string) {
  try {
    await ElMessageBox.confirm(
      '确定要紧急终止该实验吗？此操作无法撤销。',
      '警告',
      {
        confirmButtonText: '确定终止',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await experimentApi.abort(id)
    ElMessage.success('实验已紧急终止')
    await loadExperiments()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('终止实验失败')
    }
  }
}

async function confirmDelete(row: Experiment) {
  try {
    await ElMessageBox.confirm(
      `确定要删除实验「${row.name}」吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await experimentApi.delete(row.id)
    ElMessage.success('删除成功')
    await loadExperiments()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadExperiments()
})
</script>

<style scoped>
.experiments-view {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.experiment-name {
  color: #409EFF;
  text-decoration: none;
}

.experiment-name:hover {
  text-decoration: underline;
}
</style>
