<template>
  <div class="self-healing">
    <h2 class="page-title">故障自愈编排</h2>

    <div class="grid grid-4">
      <div class="stat-card blue">
        <div class="stat-value">{{ faultScenarios.length }}</div>
        <div class="stat-label">故障场景</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value">{{ Object.keys(repairScripts).length }}</div>
        <div class="stat-label">修复脚本</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-value">{{ faultRecords.length }}</div>
        <div class="stat-label">故障记录</div>
      </div>
      <div class="stat-card red" v-if="approvalQueue.length > 0">
        <div class="stat-value">{{ approvalQueue.length }}</div>
        <div class="stat-label">待审批</div>
      </div>
      <div class="stat-card" v-else>
        <div class="stat-value">0</div>
        <div class="stat-label">待审批</div>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">系统配置</div>
      <div class="config-grid">
        <div class="config-item">
          <label>
            <input type="checkbox" v-model="config.grayscaleEnabled">
            <span>灰度自愈模式</span>
          </label>
          <p class="config-desc">仅在部分实例上执行自愈操作，降低风险</p>
        </div>
        <div class="config-item">
          <label>
            <input type="checkbox" v-model="config.approvalRequired">
            <span>人工审批</span>
          </label>
          <p class="config-desc">自愈操作需要人工审批后才能执行</p>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">审批队列</div>
      <table class="table" v-if="approvalQueue.length > 0">
        <thead>
          <tr>
            <th>请求 ID</th>
            <th>故障场景</th>
            <th>申请时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="request in approvalQueue" :key="request.id">
            <td><code>{{ request.id }}</code></td>
            <td>{{ getScenarioName(request.scenario_id) }}</td>
            <td>{{ request.timestamp }}</td>
            <td>
              <span :class="getRequestStatusBadge(request.status)">
                {{ request.status }}
              </span>
            </td>
            <td v-if="request.status === 'pending'">
              <button class="btn btn-success btn-sm" @click="approveRequest(request.id)">
                批准
              </button>
              <button class="btn btn-danger btn-sm" style="margin-left: 0.5rem;" @click="rejectRequest(request.id)">
                拒绝
              </button>
            </td>
            <td v-else>-</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <p>暂无待审批的自愈请求</p>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top: 2rem;">
      <div class="card">
        <div class="card-header">故障场景定义</div>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>阈值</th>
              <th>严重程度</th>
              <th>关联脚本</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="scenario in faultScenarios" :key="scenario.id">
              <td><code>{{ scenario.id }}</code></td>
              <td>{{ scenario.name }}</td>
              <td>{{ scenario.threshold }}%</td>
              <td>
                <span :class="getSeverityBadge(scenario.severity)">
                  {{ scenario.severity }}
                </span>
              </td>
              <td>{{ getScriptName(scenario.script_id) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header">修复脚本</div>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>类型</th>
              <th>超时</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="script in repairScriptsList" :key="script.id">
              <td><code>{{ script.id }}</code></td>
              <td>{{ script.name }}</td>
              <td><span class="badge badge-info">{{ script.type }}</span></td>
              <td>{{ script.timeout }}s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">故障处理记录</div>
      <table class="table" v-if="faultRecords.length > 0">
        <thead>
          <tr>
            <th>记录 ID</th>
            <th>故障场景</th>
            <th>时间</th>
            <th>严重程度</th>
            <th>状态</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in faultRecords" :key="record.id">
            <td><code>{{ record.id }}</code></td>
            <td>{{ getScenarioName(record.scenario_id) }}</td>
            <td>{{ record.timestamp }}</td>
            <td>
              <span :class="getSeverityBadge(record.severity)">
                {{ record.severity }}
              </span>
            </td>
            <td>
              <span :class="getRecordStatusBadge(record.status)">
                {{ record.status }}
              </span>
            </td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
              {{ record.details }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <p>暂无故障处理记录</p>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">自愈流程说明</div>
      <div class="flow-info">
        <div class="flow-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>故障检测</h4>
            <p>系统通过监控探针实时检测故障场景（CPU 飙高、服务宕机等）</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>场景匹配</h4>
            <p>根据故障类型匹配预设的故障场景和对应的修复脚本</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>审批流程</h4>
            <p>如果启用人工审批，自愈请求会进入审批队列等待处理</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h4>脚本执行</h4>
            <p>执行关联的 Shell 或 Python 修复脚本，记录执行过程</p>
          </div>
        </div>
        <div class="flow-step">
          <div class="step-number">5</div>
          <div class="step-content">
            <h4>结果验证</h4>
            <p>执行完成后验证修复效果，更新故障记录状态</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { selfHealingApi, type FaultScenario, type RepairScript, type FaultRecord, type ApprovalRequest } from '../lib/api'

const config = ref({
  grayscaleEnabled: false,
  approvalRequired: true
})

const faultScenarios = ref<FaultScenario[]>([
  { id: 'cpu-high', name: 'CPU飙高', description: 'CPU使用率超过阈值', threshold: 80, script_id: 'restart-service', severity: 'high' },
  { id: 'memory-high', name: '内存飙高', description: '内存使用率超过阈值', threshold: 85, script_id: 'clear-cache', severity: 'medium' },
  { id: 'service-down', name: '服务宕机', description: '服务状态异常', threshold: 0, script_id: 'restart-service', severity: 'critical' },
  { id: 'http-probe-failed', name: 'HTTP探测失败', description: 'HTTP黑盒探测失败', threshold: 0, script_id: 'check-network', severity: 'high' },
  { id: 'tcp-probe-failed', name: 'TCP探测失败', description: 'TCP黑盒探测失败', threshold: 0, script_id: 'check-network', severity: 'high' }
])

const repairScripts = ref<Record<string, RepairScript>>({
  'restart-service': { id: 'restart-service', name: '重启服务', type: 'shell', path: './scripts/restart-service.sh', timeout: 60 },
  'clear-cache': { id: 'clear-cache', name: '清理缓存', type: 'shell', path: './scripts/clear-cache.sh', timeout: 30 },
  'check-network': { id: 'check-network', name: '检查网络', type: 'python', path: './scripts/check-network.py', timeout: 30 }
})

const faultRecords = ref<FaultRecord[]>([
  {
    id: 'fault-1705300000000',
    scenario_id: 'cpu-high',
    timestamp: '2024-01-15 10:10:00',
    severity: 'high',
    status: 'completed',
    details: 'CPU使用率: 92.5% - 修复成功'
  },
  {
    id: 'fault-1705290000000',
    scenario_id: 'service-down',
    timestamp: '2024-01-15 08:30:00',
    severity: 'critical',
    status: 'completed',
    details: '服务 order-service 状态异常: failed - 重启成功'
  }
])

const approvalQueue = ref<ApprovalRequest[]>([
  {
    id: 'approval-1705310000000',
    fault_id: 'fault-1705310000000',
    scenario_id: 'memory-high',
    timestamp: '2024-01-15 10:30:00',
    status: 'pending',
    approver: ''
  }
])

const repairScriptsList = computed(() => Object.values(repairScripts.value))

const getScenarioName = (id: string) => {
  const scenario = faultScenarios.value.find(s => s.id === id)
  return scenario ? scenario.name : id
}

const getScriptName = (id: string) => {
  const script = repairScripts.value[id]
  return script ? script.name : id
}

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'badge badge-danger'
    case 'high':
      return 'badge badge-warning'
    case 'medium':
      return 'badge badge-info'
    default:
      return 'badge badge-secondary'
  }
}

const getRequestStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return 'badge badge-warning'
    case 'approved':
      return 'badge badge-success'
    case 'rejected':
      return 'badge badge-danger'
    default:
      return 'badge badge-secondary'
  }
}

const getRecordStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return 'badge badge-success'
    case 'executing':
      return 'badge badge-info'
    case 'pending_approval':
      return 'badge badge-warning'
    case 'failed':
    case 'timeout':
      return 'badge badge-danger'
    default:
      return 'badge badge-secondary'
  }
}

const approveRequest = (id: string) => {
  const request = approvalQueue.value.find(r => r.id === id)
  if (request) {
    request.status = 'approved'
    request.approver = 'admin'
  }
}

const rejectRequest = (id: string) => {
  const request = approvalQueue.value.find(r => r.id === id)
  if (request) {
    request.status = 'rejected'
    request.approver = 'admin'
  }
}
</script>

<style scoped>
.self-healing {
  max-width: 100%;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1f2937;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
}

.config-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.config-item input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.config-desc {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  padding-left: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.flow-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.flow-step {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.step-number {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.step-content h4 {
  color: #374151;
  margin-bottom: 0.25rem;
}

.step-content p {
  color: #6b7280;
  font-size: 0.875rem;
}

table code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}
</style>
