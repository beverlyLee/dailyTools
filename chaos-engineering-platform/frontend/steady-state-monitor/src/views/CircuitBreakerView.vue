<template>
  <div class="circuit-breaker-view">
    <div class="page-header">
      <h2>熔断管理</h2>
      <div class="header-right">
        <el-select v-model="selectedExperiment" placeholder="选择实验" clearable style="width: 200px">
          <el-option
            v-for="exp in experiments"
            :key="exp.id"
            :label="exp.name"
            :value="exp.id"
          />
        </el-select>
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="status-card" :class="circuitBreakerStatus.class">
          <div class="status-icon">
            <el-icon :size="48" :color="circuitBreakerStatus.color">
              <component :is="circuitBreakerStatus.icon" />
            </el-icon>
          </div>
          <div class="status-info">
            <div class="status-label">熔断器状态</div>
            <div class="status-value" :style="{ color: circuitBreakerStatus.color }">
              {{ circuitBreakerStatus.label }}
            </div>
          </div>
          <div class="status-detail">
            <p>最近检查: {{ lastCheckTime }}</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="status-card">
          <div class="status-icon">
            <el-icon :size="48" color="#409EFF"><Monitor /></el-icon>
          </div>
          <div class="status-info">
            <div class="status-label">监控指标数</div>
            <div class="status-value" style="color: #409EFF">{{ metricsCount }}</div>
          </div>
          <div class="status-detail">
            <p>其中告警指标: <span class="danger">{{ alarmingCount }}</span></p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="status-card">
          <div class="status-icon">
            <el-icon :size="48" color="#67C23A"><Clock /></el-icon>
          </div>
          <div class="status-info">
            <div class="status-label">熔断次数</div>
            <div class="status-value" style="color: #67C23A">{{ circuitBreakerCount }}</div>
          </div>
          <div class="status-detail">
            <p>今日熔断: <span class="warning">{{ todayCount }}</span></p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>熔断事件日志</span>
              <el-select v-model="eventTypeFilter" placeholder="事件类型" clearable style="width: 120px">
                <el-option label="全部" value="" />
                <el-option label="触发熔断" value="triggered" />
                <el-option label="恢复正常" value="recovered" />
                <el-option label="开始回滚" value="rollback_start" />
                <el-option label="回滚完成" value="rollback_complete" />
              </el-select>
            </div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="(event, index) in filteredEvents"
              :key="event.id"
              :timestamp="formatDate(event.timestamp)"
              placement="top"
              :type="getEventTimelineType(event.eventType)"
              :color="getEventColor(event.eventType)"
              :icon="getEventIcon(event.eventType)"
            >
              <el-card shadow="hover" class="event-card">
                <div class="event-header">
                  <el-tag :type="getEventTagType(event.eventType)" size="small">
                    {{ getEventLabel(event.eventType) }}
                  </el-tag>
                  <span class="event-experiment">{{ event.experimentName }}</span>
                </div>
                <div class="event-reason">
                  <strong>原因:</strong> {{ event.reason }}
                </div>
                <div class="event-actions" v-if="event.eventType === 'triggered'">
                  <el-button type="primary" size="small" @click="triggerRollback(event)">
                    <el-icon><Operation /></el-icon>
                    手动回滚
                  </el-button>
                  <el-button type="warning" size="small" @click="ignoreEvent(event)">
                    <el-icon><CircleClose /></el-icon>
                    忽略
                  </el-button>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="filteredEvents.length === 0" description="暂无熔断事件" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>实验熔断统计</span>
            </div>
          </template>
          <el-table
            :data="experimentStats"
            style="width: 100%"
            row-key="experimentId"
          >
            <el-table-column prop="experimentName" label="实验名称" min-width="120">
              <template #default="scope">
                <span>{{ scope.row.experimentName }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="triggerCount" label="熔断次数" width="100">
              <template #default="scope">
                <el-tag
                  :type="scope.row.triggerCount > 0 ? 'danger' : 'info'"
                  size="small"
                >
                  {{ scope.row.triggerCount }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="rollbackCount" label="回滚次数" width="100">
              <template #default="scope">
                <el-tag
                  :type="scope.row.rollbackCount > 0 ? 'warning' : 'info'"
                  size="small"
                >
                  {{ scope.row.rollbackCount }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastEvent" label="最后事件" width="160">
              <template #default="scope">
                <span v-if="scope.row.lastEvent">
                  {{ formatDate(scope.row.lastEvent) }}
                </span>
                <span v-else style="color: #909399">-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh, Monitor, Clock, Warning, CheckCircle, Operation, CircleClose,
  Connection
} from '@element-plus/icons-vue'
import type { CircuitBreakerEvent } from '@/types'
import { formatDate, generateId } from '@/utils/helpers'

const selectedExperiment = ref<string>('')
const eventTypeFilter = ref<string>('')
const lastCheckTime = ref<string>('--')

const experiments = ref<{ id: string; name: string }[]>([
  { id: 'exp-1', name: 'Pod 删除实验' },
  { id: 'exp-2', name: '网络延迟实验' },
  { id: 'exp-3', name: 'CPU 压力测试' }
])

const metricsCount = ref(8)
const alarmingCount = ref(2)
const circuitBreakerCount = ref(5)
const todayCount = ref(2)

const circuitBreakerStatus = computed(() => {
  if (alarmingCount.value > 0) {
    return {
      label: '告警中',
      class: 'warning',
      color: '#E6A23C',
      icon: Warning
    }
  }
  return {
    label: '正常',
    class: 'normal',
    color: '#67C23A',
    icon: CheckCircle
  }
})

const events = ref<CircuitBreakerEvent[]>([
  {
    id: generateId(),
    experimentId: 'exp-1',
    experimentName: 'Pod 删除实验',
    eventType: 'triggered',
    reason: 'QPS 低于阈值 1000 req/s，当前值: 450 req/s',
    timestamp: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: generateId(),
    experimentId: 'exp-2',
    experimentName: '网络延迟实验',
    eventType: 'rollback_start',
    reason: 'P99 响应时间超过阈值 200ms，当前值: 580ms，自动启动回滚',
    timestamp: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: generateId(),
    experimentId: 'exp-2',
    experimentName: '网络延迟实验',
    eventType: 'rollback_complete',
    reason: '故障回滚完成，网络延迟已恢复正常',
    timestamp: new Date(Date.now() - 1500000).toISOString()
  },
  {
    id: generateId(),
    experimentId: 'exp-3',
    experimentName: 'CPU 压力测试',
    eventType: 'recovered',
    reason: 'CPU 使用率已恢复到阈值以下',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
])

const filteredEvents = computed(() => {
  if (!eventTypeFilter.value) return events.value
  return events.value.filter(e => e.eventType === eventTypeFilter.value)
})

const experimentStats = computed(() => {
  const stats: Record<string, {
    experimentId: string
    experimentName: string
    triggerCount: number
    rollbackCount: number
    lastEvent?: string
  }> = {}
  
  events.value.forEach(event => {
    if (!stats[event.experimentId]) {
      stats[event.experimentId] = {
        experimentId: event.experimentId,
        experimentName: event.experimentName,
        triggerCount: 0,
        rollbackCount: 0
      }
    }
    
    if (event.eventType === 'triggered') {
      stats[event.experimentId].triggerCount++
    }
    if (['rollback_start', 'rollback_complete'].includes(event.eventType)) {
      stats[event.experimentId].rollbackCount++
    }
    stats[event.experimentId].lastEvent = event.timestamp
  })
  
  experiments.value.forEach(exp => {
    if (!stats[exp.id]) {
      stats[exp.id] = {
        experimentId: exp.id,
        experimentName: exp.name,
        triggerCount: 0,
        rollbackCount: 0
      }
    }
  })
  
  return Object.values(stats)
})

function getEventTimelineType(eventType: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    triggered: 'danger',
    recovered: 'success',
    rollback_start: 'warning',
    rollback_complete: 'success'
  }
  return map[eventType] || 'info'
}

function getEventColor(eventType: string): string {
  const map: Record<string, string> = {
    triggered: '#F56C6C',
    recovered: '#67C23A',
    rollback_start: '#E6A23C',
    rollback_complete: '#67C23A'
  }
  return map[eventType] || '#909399'
}

function getEventTagType(eventType: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    triggered: 'danger',
    recovered: 'success',
    rollback_start: 'warning',
    rollback_complete: 'success'
  }
  return map[eventType] || 'info'
}

function getEventLabel(eventType: string): string {
  const map: Record<string, string> = {
    triggered: '触发熔断',
    recovered: '恢复正常',
    rollback_start: '开始回滚',
    rollback_complete: '回滚完成'
  }
  return map[eventType] || eventType
}

function getEventIcon(eventType: string): any {
  const map: Record<string, any> = {
    triggered: Warning,
    recovered: CheckCircle,
    rollback_start: Connection,
    rollback_complete: CheckCircle
  }
  return map[eventType] || Connection
}

async function refreshData() {
  try {
    lastCheckTime.value = formatDate(new Date())
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

async function triggerRollback(event: CircuitBreakerEvent) {
  try {
    const newEvent: CircuitBreakerEvent = {
      id: generateId(),
      experimentId: event.experimentId,
      experimentName: event.experimentName,
      eventType: 'rollback_start',
      reason: `手动触发回滚，原因为: ${event.reason}`,
      timestamp: new Date().toISOString()
    }
    events.value.unshift(newEvent)
    ElMessage.success('已开始回滚操作')
    
    setTimeout(() => {
      const completeEvent: CircuitBreakerEvent = {
        id: generateId(),
        experimentId: event.experimentId,
        experimentName: event.experimentName,
        eventType: 'rollback_complete',
        reason: '手动回滚完成',
        timestamp: new Date().toISOString()
      }
      events.value.unshift(completeEvent)
      ElMessage.success('回滚完成')
    }, 2000)
  } catch (error) {
    ElMessage.error('回滚失败')
  }
}

async function ignoreEvent(event: CircuitBreakerEvent) {
  try {
    ElMessage.success('已忽略该事件')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

onMounted(() => {
  lastCheckTime.value = formatDate(new Date())
})
</script>

<style scoped>
.circuit-breaker-view {
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

.header-right {
  display: flex;
  gap: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-card {
  padding: 16px;
  transition: all 0.3s;
}

.status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.status-card.warning {
  border-left: 4px solid #e6a23c;
}

.status-card.normal {
  border-left: 4px solid #67c23a;
}

.status-icon {
  margin-bottom: 12px;
}

.status-info {
  margin-bottom: 12px;
}

.status-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.status-value {
  font-size: 28px;
  font-weight: 600;
}

.status-detail {
  font-size: 12px;
  color: #909399;
}

.status-detail .danger {
  color: #f56c6c;
  font-weight: 500;
}

.status-detail .warning {
  color: #e6a23c;
  font-weight: 500;
}

.event-card {
  margin-bottom: 8px;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.event-experiment {
  font-size: 13px;
  color: #606266;
}

.event-reason {
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
}

.event-actions {
  display: flex;
  gap: 8px;
}
</style>
