<template>
  <div class="orchestrator-view">
    <div class="page-header">
      <div class="header-left">
        <el-button link @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2>{{ isEditing ? '编辑实验' : '新建实验' }}</h2>
      </div>
      <div class="header-right">
        <el-button @click="saveExperiment" :disabled="!experiment.name">
          <el-icon><Save /></el-icon>
          保存
        </el-button>
        <el-button
          type="primary"
          @click="startExperiment"
          :disabled="!isValidExperiment || ['running', 'paused'].includes(experiment.status)"
        >
          <el-icon><VideoPlay /></el-icon>
          启动实验
        </el-button>
        <el-button
          v-if="experiment.status === 'running'"
          type="warning"
          @click="pauseExperiment"
        >
          <el-icon><VideoPause /></el-icon>
          暂停
        </el-button>
        <el-button
          v-if="experiment.status === 'paused'"
          type="success"
          @click="resumeExperiment"
        >
          <el-icon><VideoPlay /></el-icon>
          继续
        </el-button>
        <el-button
          v-if="['running', 'paused'].includes(experiment.status)"
          type="danger"
          @click="abortExperiment"
        >
          <el-icon><Warning /></el-icon>
          紧急停止
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="fault-type-panel">
          <template #header>
            <span>故障类型</span>
          </template>
          
          <div class="category-group" v-for="(faults, category) in groupedFaultTypes" :key="category">
            <div class="category-title" :style="{ color: CATEGORY_COLORS[category] }">
              {{ CATEGORY_LABELS[category] }}
            </div>
            <div
              class="fault-item"
              v-for="fault in faults"
              :key="fault.id"
              draggable="true"
              @dragstart="handleDragStart($event, fault)"
            >
              <el-icon class="fault-icon" :color="CATEGORY_COLORS[category]">
                <component :is="getIconComponent(fault.icon)" />
              </el-icon>
              <span class="fault-name">{{ fault.name }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>实验流程</span>
              <el-tag :type="getStatusType(experiment.status)" size="small">
                {{ STATUS_LABELS[experiment.status] }}
              </el-tag>
            </div>
          </template>

          <el-form :model="experiment" label-width="100px">
            <el-form-item label="实验名称" required>
              <el-input v-model="experiment.name" placeholder="请输入实验名称" />
            </el-form-item>
            <el-form-item label="描述">
              <el-input
                v-model="experiment.description"
                type="textarea"
                placeholder="请输入实验描述"
                :rows="2"
              />
            </el-form-item>
            <el-form-item label="目标命名空间">
              <el-select v-model="experiment.targetNamespace" placeholder="选择命名空间" style="width: 100%">
                <el-option
                  v-for="ns in namespaces"
                  :key="ns"
                  :label="ns"
                  :value="ns"
                />
              </el-select>
            </el-form-item>
          </el-form>

          <div
            class="canvas-area"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            :class="{ 'drag-over': isDragOver }"
          >
            <div
              v-if="experiment.steps.length === 0"
              class="empty-hint"
            >
              <el-icon :size="48" color="#909399"><Upload /></el-icon>
              <p>从左侧拖拽故障类型到此处创建实验步骤</p>
            </div>

            <div
              v-else
              class="steps-container"
            >
              <div
                class="step-item"
                v-for="(step, index) in experiment.steps"
                :key="step.id"
                :class="{ active: currentStepIndex === index }"
              >
                <div class="step-header">
                  <div class="step-number">{{ index + 1 }}</div>
                  <div class="step-info">
                    <div class="step-name">{{ step.name }}</div>
                    <div class="step-type">{{ step.type.name }}</div>
                  </div>
                  <div class="step-status">
                    <el-tag
                      :type="getStepStatusType(step.status)"
                      size="small"
                      v-if="step.status !== 'pending'"
                    >
                      {{ STEP_STATUS_LABELS[step.status] }}
                    </el-tag>
                  </div>
                  <div class="step-actions">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="editStep(index)"
                    >
                      配置
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click="removeStep(index)"
                    >
                      删除
                    </el-button>
                    <el-button
                      v-if="index > 0"
                      type="primary"
                      link
                      size="small"
                      @click="moveStep(index, -1)"
                    >
                      <el-icon><Top /></el-icon>
                    </el-button>
                    <el-button
                      v-if="index < experiment.steps.length - 1"
                      type="primary"
                      link
                      size="small"
                      @click="moveStep(index, 1)"
                    >
                      <el-icon><Bottom /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card v-if="experimentId" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>实验日志</span>
              <el-button
                type="primary"
                link
                size="small"
                @click="loadLogs"
              >
                刷新
              </el-button>
            </div>
          </template>
          <div class="log-container">
            <div
              v-for="log in logs"
              :key="log.id"
              class="log-item"
              :class="log.level"
            >
              <span class="log-time">{{ formatDate(log.timestamp) }}</span>
              <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <el-empty v-if="logs.length === 0" description="暂无日志" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="showStepDialog"
      :title="editingStepIndex !== null ? '编辑步骤' : '配置步骤'"
      width="600px"
    >
      <el-form
        v-if="currentStep"
        :model="currentStep.config"
        label-width="120px"
      >
        <el-form-item label="步骤名称">
          <el-input v-model="currentStep.name" />
        </el-form-item>
        <el-form-item label="持续时间">
          <el-input-number
            v-model="currentStep.duration"
            :min="1"
            :max="3600"
          />
          <span class="unit-text">秒</span>
        </el-form-item>
        <el-divider>故障配置</el-divider>
        <template v-if="currentStep.type.id === 'pod-delete'">
          <el-form-item label="命名空间">
            <el-input v-model="currentStep.config.namespace" />
          </el-form-item>
          <el-form-item label="标签选择器">
            <el-input v-model="currentStep.config.labelSelector" placeholder="例如: app=nginx" />
          </el-form-item>
          <el-form-item label="Pod 数量">
            <el-input-number
              v-model="currentStep.config.count"
              :min="1"
            />
          </el-form-item>
        </template>
        <template v-else-if="currentStep.type.id === 'network-delay'">
          <el-form-item label="命名空间">
            <el-input v-model="currentStep.config.namespace" />
          </el-form-item>
          <el-form-item label="延迟">
            <el-input-number
              v-model="currentStep.config.delay"
              :min="0"
            />
            <span class="unit-text">毫秒</span>
          </el-form-item>
          <el-form-item label="抖动">
            <el-input-number
              v-model="currentStep.config.jitter"
              :min="0"
            />
            <span class="unit-text">毫秒</span>
          </el-form-item>
          <el-form-item label="持续时间">
            <el-input-number
              v-model="currentStep.config.duration"
              :min="1"
            />
            <span class="unit-text">秒</span>
          </el-form-item>
        </template>
        <template v-else-if="['network-loss'].includes(currentStep.type.id)">
          <el-form-item label="命名空间">
            <el-input v-model="currentStep.config.namespace" />
          </el-form-item>
          <el-form-item label="丢包率">
            <el-input-number
              v-model="currentStep.config.percentage"
              :min="0"
              :max="100"
            />
            <span class="unit-text">%</span>
          </el-form-item>
          <el-form-item label="持续时间">
            <el-input-number
              v-model="currentStep.config.duration"
              :min="1"
            />
            <span class="unit-text">秒</span>
          </el-form-item>
        </template>
        <template v-else-if="['cpu-stress', 'memory-stress'].includes(currentStep.type.id)">
          <el-form-item label="命名空间">
            <el-input v-model="currentStep.config.namespace" />
          </el-form-item>
          <el-form-item label="占用率">
            <el-input-number
              v-model="currentStep.config.percentage"
              :min="1"
              :max="100"
            />
            <span class="unit-text">%</span>
          </el-form-item>
          <el-form-item v-if="currentStep.type.id === 'cpu-stress'" label="核心数">
            <el-input-number
              v-model="currentStep.config.cores"
              :min="1"
            />
          </el-form-item>
          <el-form-item label="持续时间">
            <el-input-number
              v-model="currentStep.config.duration"
              :min="1"
            />
            <span class="unit-text">秒</span>
          </el-form-item>
        </template>
        <template v-else>
          <el-alert
            title="该故障类型需要更多配置"
            type="info"
            :closable="false"
          />
        </template>
      </el-form>
      <template #footer>
        <el-button @click="showStepDialog = false">取消</el-button>
        <el-button type="primary" @click="saveStep">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  ArrowLeft, Save, VideoPlay, VideoPause, Warning, Upload, Top, Bottom,
  Delete, Timer, Connection, Cpu, Coin, DataLine, Clock
} from '@element-plus/icons-vue'
import type { Experiment, ExperimentStep, FaultType } from '@/types'
import { FAULT_TYPES, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'
import { experimentApi } from '@/utils/api'
import {
  STATUS_LABELS, STEP_STATUS_LABELS, formatDate, generateId, deepClone
} from '@/utils/helpers'

const router = useRouter()
const route = useRoute()

const experimentId = computed(() => route.params.id as string)
const isEditing = computed(() => !!experimentId.value)

const isDragOver = ref(false)
const showStepDialog = ref(false)
const editingStepIndex = ref<number | null>(null)
const loading = ref(false)
const logs = ref<any[]>([])
const namespaces = ref<string[]>(['default', 'kube-system', 'production', 'staging'])

const experiment = reactive<Partial<Experiment>>({
  name: '',
  description: '',
  steps: [],
  status: 'draft',
  targetNamespace: 'default',
  steadyStateCheck: {
    enabled: true,
    checkInterval: 10,
    metrics: [],
    rollbackOnFailure: true
  }
})

const currentStep = ref<ExperimentStep | null>(null)

const groupedFaultTypes = computed(() => {
  const groups: Record<string, FaultType[]> = {}
  FAULT_TYPES.forEach(fault => {
    if (!groups[fault.category]) {
      groups[fault.category] = []
    }
    groups[fault.category].push(fault)
  })
  return groups
})

const isValidExperiment = computed(() => {
  return experiment.name && experiment.steps && experiment.steps.length > 0
})

const currentStepIndex = computed(() => {
  if (!experiment.steps) return -1
  return experiment.steps.findIndex(step => step.status === 'running')
})

const iconMap: Record<string, any> = {
  Delete, Timer, Connection, Cpu, Coin, DataLine, Clock
}

function getIconComponent(iconName: string) {
  return iconMap[iconName] || Delete
}

function getStatusType(status: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    running: 'success',
    paused: 'warning',
    completed: 'success',
    failed: 'danger',
    aborted: 'danger',
    ready: 'info',
    draft: 'info'
  }
  return map[status] || 'info'
}

function getStepStatusType(status: string): 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    running: 'success',
    paused: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return map[status] || 'info'
}

function goBack() {
  router.push('/experiments')
}

function handleDragStart(event: DragEvent, fault: FaultType) {
  event.dataTransfer?.setData('text/plain', JSON.stringify(fault))
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  
  const faultData = event.dataTransfer?.getData('text/plain')
  if (faultData) {
    try {
      const faultType: FaultType = JSON.parse(faultData)
      addStep(faultType)
    } catch (e) {
      console.error('解析拖拽数据失败:', e)
    }
  }
}

function addStep(faultType: FaultType) {
  const newStep: ExperimentStep = {
    id: generateId(),
    type: faultType,
    name: faultType.name,
    config: {
      namespace: experiment.targetNamespace || 'default',
      ...Object.fromEntries(
        Object.entries(faultType.configSchema).map(([key, schema]: [string, any]) => [
          key,
          schema.default
        ])
      )
    },
    duration: 60,
    status: 'pending'
  }
  
  if (!experiment.steps) {
    experiment.steps = []
  }
  experiment.steps.push(newStep)
  
  editingStepIndex.value = experiment.steps.length - 1
  currentStep.value = deepClone(newStep)
  showStepDialog.value = true
}

function editStep(index: number) {
  if (!experiment.steps) return
  editingStepIndex.value = index
  currentStep.value = deepClone(experiment.steps[index])
  showStepDialog.value = true
}

function saveStep() {
  if (editingStepIndex.value !== null && currentStep.value && experiment.steps) {
    experiment.steps[editingStepIndex.value] = currentStep.value
  }
  showStepDialog.value = false
  editingStepIndex.value = null
  currentStep.value = null
}

function removeStep(index: number) {
  if (!experiment.steps) return
  experiment.steps.splice(index, 1)
}

function moveStep(index: number, direction: number) {
  if (!experiment.steps) return
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= experiment.steps.length) return
  
  const [step] = experiment.steps.splice(index, 1)
  experiment.steps.splice(newIndex, 0, step)
}

async function loadExperiment() {
  if (!experimentId.value) return
  
  loading.value = true
  try {
    const result = await experimentApi.getById(experimentId.value)
    Object.assign(experiment, result.data)
  } catch (error) {
    ElMessage.error('加载实验失败')
  } finally {
    loading.value = false
  }
}

async function saveExperiment() {
  try {
    if (isEditing.value) {
      await experimentApi.update(experimentId.value, experiment)
    } else {
      const result = await experimentApi.create(experiment)
      if (result.data?.id) {
        router.push(`/orchestrator/${result.data.id}`)
      }
    }
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

async function startExperiment() {
  try {
    if (!experimentId.value) {
      await saveExperiment()
    }
    const id = experimentId.value || experiment.id
    if (id) {
      await experimentApi.start(id)
      ElMessage.success('实验已启动')
      if (experimentId.value) {
        await loadExperiment()
      }
    }
  } catch (error) {
    ElMessage.error('启动实验失败')
  }
}

async function pauseExperiment() {
  if (!experimentId.value) return
  try {
    await experimentApi.pause(experimentId.value)
    ElMessage.success('实验已暂停')
    await loadExperiment()
  } catch (error) {
    ElMessage.error('暂停实验失败')
  }
}

async function resumeExperiment() {
  if (!experimentId.value) return
  try {
    await experimentApi.resume(experimentId.value)
    ElMessage.success('实验已继续')
    await loadExperiment()
  } catch (error) {
    ElMessage.error('继续实验失败')
  }
}

async function abortExperiment() {
  if (!experimentId.value) return
  try {
    await ElMessageBox.confirm(
      '确定要紧急终止该实验吗？系统将尝试回滚所有故障注入。',
      '紧急停止',
      {
        confirmButtonText: '确定终止',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await experimentApi.abort(experimentId.value)
    ElMessage.success('实验已紧急终止')
    await loadExperiment()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('终止实验失败')
    }
  }
}

async function loadLogs() {
  if (!experimentId.value) return
  try {
    const result = await experimentApi.getLogs(experimentId.value)
    logs.value = result.data || []
  } catch (error) {
    console.error('加载日志失败:', error)
  }
}

watch(showStepDialog, (val) => {
  if (!val) {
    editingStepIndex.value = null
    currentStep.value = null
  }
})

onMounted(() => {
  if (isEditing.value) {
    loadExperiment()
    loadLogs()
  }
})
</script>

<style scoped>
.orchestrator-view {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fault-type-panel {
  height: calc(100vh - 140px);
  overflow-y: auto;
}

.category-group {
  margin-bottom: 16px;
}

.category-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  padding: 0 8px;
}

.fault-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin: 4px 0;
  background-color: #f5f7fa;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
}

.fault-item:hover {
  background-color: #ecf5ff;
  transform: translateX(4px);
}

.fault-icon {
  margin-right: 10px;
}

.fault-name {
  font-size: 14px;
  color: #303133;
}

.canvas-area {
  min-height: 300px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  transition: all 0.2s;
}

.canvas-area.drag-over {
  border-color: #409EFF;
  background-color: #ecf5ff;
}

.empty-hint {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-item {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.step-item:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.step-item.active {
  border-color: #67c23a;
  background-color: #f0f9eb;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #409EFF;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-info {
  flex: 1;
}

.step-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.step-type {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.step-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}

.log-item {
  padding: 6px 8px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}

.log-time {
  color: #909399;
  white-space: nowrap;
}

.log-level {
  font-weight: 600;
}

.log-item.info .log-level { color: #409EFF; }
.log-item.warn .log-level { color: #e6a23c; }
.log-item.error .log-level { color: #f56c6c; }
.log-item.debug .log-level { color: #909399; }

.log-message {
  color: #303133;
  flex: 1;
}

.unit-text {
  margin-left: 8px;
  color: #909399;
}
</style>
