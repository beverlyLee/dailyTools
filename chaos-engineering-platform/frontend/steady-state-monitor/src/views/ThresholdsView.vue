<template>
  <div class="thresholds-view">
    <div class="page-header">
      <h2>阈值配置</h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建阈值
      </el-button>
    </div>

    <el-tabs v-model="activeCategory">
      <el-tab-pane
        v-for="(label, category) in CATEGORY_LABELS"
        :key="category"
        :label="label"
        :name="category"
      >
        <el-table
          :data="filteredThresholds"
          v-loading="loading"
          style="width: 100%"
          row-key="id"
        >
          <el-table-column prop="name" label="阈值名称" min-width="180">
            <template #default="scope">
              <div class="threshold-name">
                <el-tag :type="getCategoryType(scope.row.metric.category)" size="small">
                  {{ CATEGORY_LABELS[scope.row.metric.category] }}
                </el-tag>
                <span>{{ scope.row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="metric" label="指标" min-width="180">
            <template #default="scope">
              <span>{{ scope.row.metric.displayName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="threshold" label="阈值条件" min-width="200">
            <template #default="scope">
              <span class="threshold-condition">
                <span class="operator">{{ OPERATOR_LABELS[scope.row.operator] }}</span>
                <span class="value">{{ scope.row.threshold }}</span>
                <span class="unit">{{ scope.row.unit }}</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="enabled" label="状态" width="100">
            <template #default="scope">
              <el-switch
                v-model="scope.row.enabled"
                active-color="#67C23A"
                inactive-color="#F56C6C"
                @change="toggleThreshold(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button type="primary" link size="small" @click="editThreshold(scope.row)">
                编辑
              </el-button>
              <el-button type="danger" link size="small" @click="confirmDelete(scope.row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="showCreateDialog"
      :title="isEditMode ? '编辑阈值' : '新建阈值'"
      width="500px"
    >
      <el-form
        :model="formData"
        :rules="formRules"
        ref="formRef"
        label-width="100px"
      >
        <el-form-item label="阈值名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入阈值名称" />
        </el-form-item>
        <el-form-item label="指标" prop="metricId">
          <el-select
            v-model="formData.metricId"
            placeholder="选择指标"
            style="width: 100%"
            @change="handleMetricChange"
          >
            <el-option-group
              v-for="(metrics, category) in groupedMetrics"
              :key="category"
              :label="CATEGORY_LABELS[category]"
            >
              <el-option
                v-for="metric in metrics"
                :key="metric.id"
                :label="metric.displayName"
                :value="metric.id"
              >
                <span class="metric-option-label">{{ metric.displayName }}</span>
                <el-tag type="info" size="small" effect="plain">{{ metric.unit }}</el-tag>
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="条件" prop="operator">
          <el-select v-model="formData.operator" placeholder="选择比较运算符" style="width: 120px">
            <el-option
              v-for="(label, op) in OPERATOR_LABELS"
              :key="op"
              :label="label"
              :value="op"
            />
          </el-select>
          <el-input-number
            v-model="formData.threshold"
            :min="0"
            :step="0.1"
            style="margin-left: 10px; width: 150px"
          />
          <span class="unit-text" v-if="selectedMetric">
            {{ selectedMetric.unit }}
          </span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="formData.enabled" active-color="#67C23A" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { MetricThreshold, Metric } from '@/types'
import { METRICS, CATEGORY_LABELS, OPERATOR_LABELS } from '@/types'
import { thresholdApi } from '@/utils/api'
import { formatDate, generateId } from '@/utils/helpers'

const activeCategory = ref<string>('performance')
const loading = ref(false)
const showCreateDialog = ref(false)
const isEditMode = ref(false)
const editingThreshold = ref<MetricThreshold | null>(null)
const formRef = ref<FormInstance>()

const thresholds = ref<MetricThreshold[]>([])

const filteredThresholds = computed(() => {
  return thresholds.value.filter(t => t.metric.category === activeCategory.value)
})

const groupedMetrics = computed(() => {
  const groups: Record<string, Metric[]> = {}
  METRICS.forEach(metric => {
    if (!groups[metric.category]) {
      groups[metric.category] = []
    }
    groups[metric.category].push(metric)
  })
  return groups
})

const selectedMetric = computed(() => {
  if (!formData.metricId) return null
  return METRICS.find(m => m.id === formData.metricId)
})

const formData = reactive({
  name: '',
  metricId: '',
  operator: '>' as const,
  threshold: 0,
  enabled: true,
  unit: ''
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入阈值名称', trigger: 'blur' }],
  metricId: [{ required: true, message: '请选择指标', trigger: 'change' }],
  operator: [{ required: true, message: '请选择运算符', trigger: 'change' }],
  threshold: [{ required: true, message: '请输入阈值', trigger: 'blur' }]
}

function getCategoryType(category: string): 'primary' | 'success' | 'warning' | 'danger' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
    performance: 'primary',
    resource: 'warning',
    availability: 'success',
    error: 'danger'
  }
  return map[category] || 'primary'
}

function handleMetricChange(metricId: string) {
  const metric = METRICS.find(m => m.id === metricId)
  if (metric) {
    formData.operator = metric.defaultOperator
    formData.threshold = metric.defaultThreshold
    formData.unit = metric.unit
    if (!isEditMode.value) {
      formData.name = `${metric.displayName} 阈值`
    }
  }
}

function editThreshold(threshold: MetricThreshold) {
  isEditMode.value = true
  editingThreshold.value = threshold
  
  formData.name = threshold.name
  formData.metricId = threshold.metricId
  formData.operator = threshold.operator
  formData.threshold = threshold.threshold
  formData.enabled = threshold.enabled
  formData.unit = threshold.unit
  
  showCreateDialog.value = true
}

function resetForm() {
  formData.name = ''
  formData.metricId = ''
  formData.operator = '>'
  formData.threshold = 0
  formData.enabled = true
  formData.unit = ''
  isEditMode.value = false
  editingThreshold.value = null
}

async function loadThresholds() {
  loading.value = true
  try {
    const mockThresholds: MetricThreshold[] = METRICS.slice(0, 4).map((metric, index) => ({
      id: generateId(),
      metricId: metric.id,
      metric: metric,
      name: `${metric.displayName} 阈值`,
      operator: metric.defaultOperator,
      threshold: metric.defaultThreshold,
      unit: metric.unit,
      enabled: index % 2 === 0,
      createdBy: 'admin',
      createdAt: new Date(Date.now() - index * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - index * 86400000).toISOString()
    }))
    thresholds.value = mockThresholds
  } catch (error) {
    ElMessage.error('加载阈值列表失败')
  } finally {
    loading.value = false
  }
}

async function toggleThreshold(threshold: MetricThreshold) {
  try {
    ElMessage.success(threshold.enabled ? '已启用阈值' : '已禁用阈值')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

async function confirmDelete(threshold: MetricThreshold) {
  try {
    await ElMessageBox.confirm(
      `确定要删除阈值「${threshold.name}」吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const index = thresholds.value.findIndex(t => t.id === threshold.id)
    if (index !== -1) {
      thresholds.value.splice(index, 1)
    }
    ElMessage.success('删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

async function submitForm() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const metric = METRICS.find(m => m.id === formData.metricId)
        if (!metric) return
        
        if (isEditMode.value && editingThreshold.value) {
          const index = thresholds.value.findIndex(t => t.id === editingThreshold.value!.id)
          if (index !== -1) {
            thresholds.value[index] = {
              ...thresholds.value[index],
              name: formData.name,
              operator: formData.operator,
              threshold: formData.threshold,
              enabled: formData.enabled,
              updatedAt: new Date().toISOString()
            }
          }
          ElMessage.success('更新成功')
        } else {
          const newThreshold: MetricThreshold = {
            id: generateId(),
            metricId: formData.metricId,
            metric: metric,
            name: formData.name,
            operator: formData.operator,
            threshold: formData.threshold,
            unit: formData.unit || metric.unit,
            enabled: formData.enabled,
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          thresholds.value.unshift(newThreshold)
          ElMessage.success('创建成功')
        }
        
        showCreateDialog.value = false
        resetForm()
      } catch (error) {
        ElMessage.error(isEditMode.value ? '更新失败' : '创建失败')
      }
    }
  })
}

onMounted(() => {
  loadThresholds()
})
</script>

<style scoped>
.thresholds-view {
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

.threshold-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.threshold-condition {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.threshold-condition .operator {
  color: #409EFF;
  font-weight: 500;
}

.threshold-condition .value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.threshold-condition .unit {
  color: #909399;
  font-size: 12px;
}

.metric-option-label {
  margin-right: 8px;
}

.unit-text {
  margin-left: 8px;
  color: #909399;
}
</style>
