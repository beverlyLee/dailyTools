<template>
  <div class="checks-view">
    <div class="page-header">
      <h2>稳态检查</h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建检查
      </el-button>
    </div>

    <el-row :gutter="20">
      <el-col :span="12" v-for="check in checks" :key="check.id">
        <el-card class="check-card" :class="getCheckStatusClass(check.status)">
          <div class="check-header">
            <div class="check-info">
              <h3 class="check-name">{{ check.experimentName }}</h3>
              <span class="check-id">{{ check.id }}</span>
            </div>
            <el-tag :type="getCheckStatusTagType(check.status)" size="large">
              {{ getCheckStatusLabel(check.status) }}
            </el-tag>
          </div>
          
          <div class="check-body">
            <div class="check-stats">
              <div class="stat-item">
                <span class="stat-label">阈值数量</span>
                <span class="stat-value">{{ check.thresholds.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">违规次数</span>
                <span class="stat-value violation">{{ check.violations.length }}</span>
              </div>
              <div class="stat-item" v-if="check.lastCheckAt">
                <span class="stat-label">最后检查</span>
                <span class="stat-value">{{ formatDate(check.lastCheckAt) }}</span>
              </div>
            </div>
            
            <div class="check-thresholds" v-if="check.thresholds.length > 0">
              <div class="section-title">监控阈值</div>
              <div class="threshold-list">
                <div
                  class="threshold-item"
                  v-for="t in check.thresholds"
                  :key="t.id"
                >
                  <el-tag size="small">{{ t.metric.displayName }}</el-tag>
                  <span class="threshold-text">
                    {{ OPERATOR_LABELS[t.operator] }} {{ t.threshold }} {{ t.unit }}
                  </span>
                  <el-switch
                    v-model="t.enabled"
                    active-color="#67C23A"
                    inactive-color="#F56C6C"
                    :disabled="check.status === 'monitoring'"
                  />
                </div>
              </div>
            </div>
            
            <div class="check-violations" v-if="check.violations.length > 0">
              <div class="section-title">
                最近违规
                <el-badge
                  :value="check.violations.filter(v => !v.acknowledged).length"
                  type="danger"
                  :max="99"
                />
              </div>
              <div class="violation-list">
                <div
                  class="violation-item"
                  v-for="v in check.violations.slice(0, 3)"
                  :key="v.id"
                  :class="v.level"
                >
                  <el-icon v-if="v.level === 'critical'" color="#F56C6C"><Warning /></el-icon>
                  <el-icon v-else color="#E6A23C"><InfoFilled /></el-icon>
                  <div class="violation-info">
                    <div class="violation-metric">{{ v.metricName }}</div>
                    <div class="violation-value">
                      实际: {{ v.actualValue }} {{ v.unit }} 
                      <span class="separator">|</span>
                      期望: {{ OPERATOR_LABELS[v.operator] }} {{ v.expectedValue }} {{ v.unit }}
                    </div>
                    <div class="violation-time">{{ formatDate(v.timestamp) }}</div>
                  </div>
                  <el-tag
                    v-if="!v.acknowledged"
                    type="danger"
                    size="small"
                    effect="dark"
                  >
                    未处理
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
          
          <div class="check-footer">
            <el-button
              v-if="check.status === 'idle' || check.status === 'ok'"
              type="primary"
              @click="startCheck(check)"
            >
              <el-icon><VideoPlay /></el-icon>
              启动监控
            </el-button>
            <el-button
              v-if="check.status === 'monitoring'"
              type="warning"
              @click="stopCheck(check)"
            >
              <el-icon><VideoPause /></el-icon>
              停止监控
            </el-button>
            <el-button
              type="primary"
              link
              @click="editCheck(check)"
            >
              配置
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="checks.length === 0" description="暂无稳态检查任务">
      <el-button type="primary" @click="showCreateDialog = true">创建第一个检查任务</el-button>
    </el-empty>

    <el-dialog
      v-model="showCreateDialog"
      :title="isEditMode ? '编辑稳态检查' : '新建稳态检查'"
      width="600px"
    >
      <el-form
        :model="formData"
        :rules="formRules"
        ref="formRef"
        label-width="120px"
      >
        <el-form-item label="关联实验" prop="experimentId">
          <el-select
            v-model="formData.experimentId"
            placeholder="选择关联的实验"
            style="width: 100%"
          >
            <el-option
              v-for="exp in experiments"
              :key="exp.id"
              :label="exp.name"
              :value="exp.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="监控阈值">
          <div class="selected-thresholds">
            <div
              class="threshold-item"
              v-for="(t, index) in formData.thresholds"
              :key="t.id"
            >
              <span>{{ t.name }}</span>
              <el-button type="danger" link size="small" @click="removeThreshold(index)">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
          <el-select
            v-model="selectedThresholdId"
            placeholder="添加阈值"
            style="width: 100%; margin-top: 8px"
            multiple
            @change="addThresholds"
          >
            <el-option
              v-for="t in availableThresholds"
              :key="t.id"
              :label="`${t.name} (${t.metric.displayName})`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="熔断回滚">
          <el-switch
            v-model="formData.rollbackOnFailure"
            active-color="#67C23A"
            inactive-color="#909399"
          />
          <span class="help-text" style="margin-left: 10px">
            触发违规时自动启动故障回滚
          </span>
        </el-form-item>
        <el-form-item label="检查间隔">
          <el-input-number
            v-model="formData.checkInterval"
            :min="5"
            :max="300"
          />
          <span style="margin-left: 8px; color: #909399">秒</span>
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
import {
  Plus, VideoPlay, VideoPause, Close, Warning, InfoFilled
} from '@element-plus/icons-vue'
import type { SteadyStateCheck, MetricThreshold, Violation } from '@/types'
import { METRICS, OPERATOR_LABELS } from '@/types'
import { checkApi } from '@/utils/api'
import { formatDate, generateId } from '@/utils/helpers'

const checks = ref<SteadyStateCheck[]>([])
const showCreateDialog = ref(false)
const isEditMode = ref(false)
const editingCheck = ref<SteadyStateCheck | null>(null)
const formRef = ref<FormInstance>()
const selectedThresholdId = ref<string[]>([])

const experiments = ref<{ id: string; name: string }[]>([
  { id: 'exp-1', name: 'Pod 删除实验' },
  { id: 'exp-2', name: '网络延迟实验' },
  { id: 'exp-3', name: 'CPU 压力测试' }
])

const availableThresholds = computed<MetricThreshold[]>(() => {
  return METRICS.slice(0, 5).map((metric, index) => ({
    id: `threshold-${index}`,
    metricId: metric.id,
    metric: metric,
    name: `${metric.displayName} 阈值`,
    operator: metric.defaultOperator,
    threshold: metric.defaultThreshold,
    unit: metric.unit,
    enabled: true,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))
})

const formData = reactive({
  experimentId: '',
  thresholds: [] as MetricThreshold[],
  rollbackOnFailure: true,
  checkInterval: 10
})

const formRules: FormRules = {
  experimentId: [{ required: true, message: '请选择关联实验', trigger: 'change' }]
}

function getCheckStatusClass(status: string): string {
  const map: Record<string, string> = {
    idle: '',
    monitoring: 'monitoring',
    triggered: 'triggered',
    ok: 'ok'
  }
  return map[status] || ''
}

function getCheckStatusTagType(status: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    idle: 'info',
    monitoring: 'success',
    triggered: 'danger',
    ok: 'success'
  }
  return map[status] || 'info'
}

function getCheckStatusLabel(status: string): string {
  const map: Record<string, string> = {
    idle: '空闲',
    monitoring: '监控中',
    triggered: '已触发',
    ok: '正常'
  }
  return map[status] || status
}

function addThresholds(ids: string[]) {
  ids.forEach(id => {
    const threshold = availableThresholds.value.find(t => t.id === id)
    if (threshold && !formData.thresholds.some(t => t.id === id)) {
      formData.thresholds.push(threshold)
    }
  })
  selectedThresholdId.value = []
}

function removeThreshold(index: number) {
  formData.thresholds.splice(index, 1)
}

function editCheck(check: SteadyStateCheck) {
  isEditMode.value = true
  editingCheck.value = check
  
  formData.experimentId = check.experimentId
  formData.thresholds = [...check.thresholds]
  formData.rollbackOnFailure = true
  formData.checkInterval = 10
  
  showCreateDialog.value = true
}

function resetForm() {
  formData.experimentId = ''
  formData.thresholds = []
  formData.rollbackOnFailure = true
  formData.checkInterval = 10
  isEditMode.value = false
  editingCheck.value = null
  selectedThresholdId.value = []
}

async function loadChecks() {
  try {
    const mockChecks: SteadyStateCheck[] = experiments.value.slice(0, 2).map((exp, index) => {
      const violations: Violation[] = index % 2 === 0 ? [] : [
        {
          id: generateId(),
          checkId: `check-${index}`,
          metricId: METRICS[0].id,
          metricName: METRICS[0].displayName,
          expectedValue: METRICS[0].defaultThreshold,
          actualValue: METRICS[0].defaultThreshold * 0.6,
          operator: METRICS[0].defaultOperator,
          unit: METRICS[0].unit,
          timestamp: new Date().toISOString(),
          level: 'critical',
          acknowledged: false
        }
      ]
      
      return {
        id: `check-${index}`,
        experimentId: exp.id,
        experimentName: exp.name,
        status: index === 0 ? 'monitoring' : (violations.length > 0 ? 'triggered' : 'idle'),
        thresholds: availableThresholds.value.slice(0, 3),
        violations: violations,
        startedAt: index === 0 ? new Date(Date.now() - 3600000).toISOString() : undefined,
        lastCheckAt: index === 0 ? new Date().toISOString() : undefined
      }
    })
    checks.value = mockChecks
  } catch (error) {
    ElMessage.error('加载检查列表失败')
  }
}

async function startCheck(check: SteadyStateCheck) {
  try {
    check.status = 'monitoring'
    check.startedAt = new Date().toISOString()
    ElMessage.success('已启动监控')
  } catch (error) {
    ElMessage.error('启动失败')
  }
}

async function stopCheck(check: SteadyStateCheck) {
  try {
    await ElMessageBox.confirm(
      '确定要停止监控吗？',
      '确认停止',
      {
        confirmButtonText: '停止',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    check.status = 'idle'
    ElMessage.success('已停止监控')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('停止失败')
    }
  }
}

async function submitForm() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const exp = experiments.value.find(e => e.id === formData.experimentId)
        if (!exp) return
        
        if (isEditMode.value && editingCheck.value) {
          const index = checks.value.findIndex(c => c.id === editingCheck.value!.id)
          if (index !== -1) {
            checks.value[index] = {
              ...checks.value[index],
              thresholds: [...formData.thresholds]
            }
          }
          ElMessage.success('更新成功')
        } else {
          const newCheck: SteadyStateCheck = {
            id: generateId(),
            experimentId: formData.experimentId,
            experimentName: exp.name,
            status: 'idle',
            thresholds: [...formData.thresholds],
            violations: []
          }
          checks.value.unshift(newCheck)
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
  loadChecks()
})
</script>

<style scoped>
.checks-view {
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

.check-card {
  transition: all 0.3s;
}

.check-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.check-card.monitoring {
  border-left: 4px solid #67c23a;
}

.check-card.triggered {
  border-left: 4px solid #f56c6c;
}

.check-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.check-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #303133;
}

.check-id {
  font-size: 12px;
  color: #909399;
}

.check-body {
  margin-bottom: 16px;
}

.check-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.stat-value.violation {
  color: #f56c6c;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.threshold-list,
.selected-thresholds {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.threshold-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 6px;
}

.threshold-text {
  margin-left: 8px;
  color: #606266;
}

.violation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.violation-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
}

.violation-item.critical {
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
}

.violation-item.warning {
  background-color: #fdf6ec;
  border: 1px solid #faecd8;
}

.violation-info {
  flex: 1;
}

.violation-metric {
  font-weight: 500;
  color: #303133;
}

.violation-value {
  font-size: 12px;
  color: #606266;
}

.violation-value .separator {
  margin: 0 4px;
  color: #c0c4cc;
}

.violation-time {
  font-size: 11px;
  color: #909399;
}

.check-footer {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.help-text {
  color: #909399;
}
</style>
