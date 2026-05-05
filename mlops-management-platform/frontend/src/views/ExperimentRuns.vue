<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { experimentsApi } from '../api'
import { useExperimentsStore } from '../store'

const route = useRoute()
const router = useRouter()
const store = useExperimentsStore()

const loading = ref(false)
const runs = ref([])
const selectedRuns = ref([])
const compareDialogVisible = ref(false)
const rankingDialogVisible = ref(false)
const registerDialogVisible = ref(false)
const rankingData = ref([])
const comparisonData = ref(null)
const metricName = ref('accuracy')
const higherIsBetter = ref(true)
const modelName = ref('')

const experimentId = computed(() => route.params.experimentId)

const fetchRuns = async () => {
  loading.value = true
  try {
    const response = await experimentsApi.getExperimentRuns(experimentId.value)
    runs.value = response.data.runs || []
    store.setRuns(runs.value)
  } catch (error) {
    console.error('Failed to fetch runs:', error)
    ElMessage.error('获取运行列表失败')
  } finally {
    loading.value = false
  }
}

const viewRunDetails = (runId) => {
  router.push(`/runs/${runId}`)
}

const handleSelectionChange = (selection) => {
  selectedRuns.value = selection
}

const compareSelectedRuns = async () => {
  if (selectedRuns.value.length < 2) {
    ElMessage.warning('请至少选择 2 个运行进行比较')
    return
  }

  try {
    const runIds = selectedRuns.value.map(r => r.run_id)
    const response = await experimentsApi.compareRuns(runIds)
    comparisonData.value = response.data.comparison
    compareDialogVisible.value = true
  } catch (error) {
    console.error('Failed to compare runs:', error)
    ElMessage.error('比较运行失败')
  }
}

const showRanking = async () => {
  try {
    const response = await experimentsApi.getModelRanking(
      experimentId.value,
      metricName.value,
      higherIsBetter.value
    )
    rankingData.value = response.data.ranking || []
    rankingDialogVisible.value = true
  } catch (error) {
    console.error('Failed to get ranking:', error)
    ElMessage.error('获取排名失败')
  }
}

const showRegisterDialog = () => {
  if (rankingData.value.length === 0) {
    ElMessage.warning('请先获取模型排名')
    return
  }
  modelName.value = `model_${Date.now()}`
  registerDialogVisible.value = true
}

const registerBestModel = async () => {
  if (!modelName.value.trim()) {
    ElMessage.warning('请输入模型名称')
    return
  }

  try {
    await experimentsApi.registerBestModel(
      experimentId.value,
      modelName.value,
      metricName.value,
      higherIsBetter.value
    )
    ElMessage.success('模型注册成功')
    registerDialogVisible.value = false
  } catch (error) {
    console.error('Failed to register model:', error)
    ElMessage.error('模型注册失败')
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '-'
  const duration = endTime - startTime
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

onMounted(() => {
  fetchRuns()
})

watch(experimentId, () => {
  fetchRuns()
})
</script>

<template>
  <div>
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <el-button @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 style="margin: 0;">实验运行 - ID: {{ experimentId }}</h2>
      </div>
      <div style="display: flex; gap: 8px;">
        <el-select v-model="metricName" placeholder="选择指标" style="width: 150px;">
          <el-option label="Accuracy" value="accuracy" />
          <el-option label="Loss" value="loss" />
          <el-option label="F1 Score" value="f1_score" />
        </el-select>
        <el-select v-model="higherIsBetter" placeholder="排序方式" style="width: 120px;">
          <el-option label="越高越好" :value="true" />
          <el-option label="越低越好" :value="false" />
        </el-select>
        <el-button type="primary" @click="showRanking">
          <el-icon><Trophy /></el-icon>
          性能排行
        </el-button>
        <el-button type="success" @click="compareSelectedRuns" :disabled="selectedRuns.length < 2">
          <el-icon><Comparison /></el-icon>
          比较选中 ({{ selectedRuns.length }})
        </el-button>
        <el-button @click="fetchRuns" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-card>
      <el-table 
        :data="runs" 
        v-loading="loading" 
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="run_id" label="运行ID" width="100" show-overflow-tooltip />
        <el-table-column label="名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="viewRunDetails(row.run_id)">
              {{ row.tags?.['mlflow.runName'] || `Run ${row.run_id.slice(0, 8)}` }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'FINISHED' ? 'success' : row.status === 'RUNNING' ? 'warning' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="超参数" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag v-for="(value, key) in row.params" :key="key" size="small" type="info">
                {{ key }}: {{ value }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="指标" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag v-for="(value, key) in row.metrics" :key="key" size="small" type="success">
                {{ key }}: {{ Number(value).toFixed(4) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="120">
          <template #default="{ row }">
            {{ formatDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="开始时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewRunDetails(row.run_id)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="runs.length === 0 && !loading" class="empty-container">
        <el-icon :size="48"><Document /></el-icon>
        <p style="margin-top: 16px;">暂无运行数据</p>
      </div>
    </el-card>

    <el-dialog v-model="compareDialogVisible" title="运行对比" width="90%" top="5vh">
      <div v-if="comparisonData" class="compare-dialog">
        <el-tabs>
          <el-tab-pane label="超参数对比" name="params">
            <el-table :data="Object.entries(comparisonData.params_comparison || {})" stripe>
              <el-table-column label="参数名" prop="0" width="150" />
              <el-table-column 
                v-for="run in comparisonData.runs" 
                :key="run.run_id" 
                :label="run.run_id.slice(0, 8)"
                width="150"
              >
                <template #default="{ row }">
                  {{ row[1][run.run_id] ?? '-' }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="指标对比" name="metrics">
            <el-table :data="Object.entries(comparisonData.metrics_comparison || {})" stripe>
              <el-table-column label="指标名" prop="0" width="150" />
              <el-table-column 
                v-for="run in comparisonData.runs" 
                :key="run.run_id" 
                :label="run.run_id.slice(0, 8)"
                width="150"
              >
                <template #default="{ row }">
                  <span :class="{
                    'tag-success': row[1][run.run_id] === Math.max(...Object.values(row[1]).filter(v => v !== null))
                  }">
                    {{ row[1][run.run_id] ? Number(row[1][run.run_id]).toFixed(4) : '-' }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <el-dialog v-model="rankingDialogVisible" title="模型性能排行" width="70%">
      <div style="margin-bottom: 16px;">
        <el-tag type="info">按 {{ metricName }} 排序 ({{ higherIsBetter ? '越高越好' : '越低越好' }})</el-tag>
      </div>
      <el-table :data="rankingData" stripe>
        <el-table-column prop="rank" label="排名" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.rank === 1" type="warning" effect="dark">🥇 第1名</el-tag>
            <el-tag v-else-if="row.rank === 2" type="info">🥈 第2名</el-tag>
            <el-tag v-else-if="row.rank === 3" type="danger">🥉 第3名</el-tag>
            <span v-else>第{{ row.rank }}名</span>
          </template>
        </el-table-column>
        <el-table-column prop="run_name" label="运行名称" min-width="200" />
        <el-table-column :label="metricName" width="120">
          <template #default="{ row }">
            <el-tag :type="row.rank === 1 ? 'success' : 'info'">
              {{ Number(row[metricName]).toFixed(4) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="超参数" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <el-tag v-for="(value, key) in row.params" :key="key" size="small" type="info">
                {{ key }}: {{ value }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'FINISHED' ? 'success' : 'info'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="rankingDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="showRegisterDialog">
          <el-icon><Upload /></el-icon>
          注册最佳模型
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="registerDialogVisible" title="注册最佳模型" width="500px">
      <el-form label-width="100px">
        <el-form-item label="模型名称">
          <el-input v-model="modelName" placeholder="请输入模型名称" />
        </el-form-item>
        <el-form-item label="排序指标">
          <el-tag>{{ metricName }}</el-tag>
        </el-form-item>
        <el-form-item label="最佳模型">
          <div v-if="rankingData.length > 0">
            <p><strong>运行:</strong> {{ rankingData[0]?.run_name }}</p>
            <p><strong>{{ metricName }}:</strong> {{ Number(rankingData[0]?.[metricName]).toFixed(4) }}</p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="registerBestModel" :loading="loading">
          确认注册
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
