import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export interface MetricsData {
  cpu_usage: number
  memory_usage: number
  services: ServiceStatus[]
  probes: ProbeStatus[]
}

export interface ServiceStatus {
  name: string
  status: string
}

export interface ProbeStatus {
  name: string
  type: string
  status: string
}

export interface BlackboxTarget {
  name: string
  url: string
  type: string
}

export interface FaultScenario {
  id: string
  name: string
  description: string
  threshold: number
  script_id: string
  severity: string
}

export interface RepairScript {
  id: string
  name: string
  type: string
  path: string
  timeout: number
}

export interface FaultRecord {
  id: string
  scenario_id: string
  timestamp: string
  severity: string
  status: string
  details: string
}

export interface ApprovalRequest {
  id: string
  fault_id: string
  scenario_id: string
  timestamp: string
  status: string
  approver: string
}

export interface DashboardData {
  metrics: MetricsData
  selfHealing: {
    total_faults: number
    pending_approvals: number
    active_fault_scenarios: number
    repair_scripts: number
    grayscale_enabled: boolean
    approval_enabled: boolean
  }
}

export const monitoringApi = {
  getMetrics: () => api.get<MetricsData>('/metrics/data'),
  getBlackboxTargets: () => api.get<{ targets: BlackboxTarget[] }>('/probes'),
  getDashboard: () => api.get<DashboardData>('/dashboard')
}

export const selfHealingApi = {
  getFaultScenarios: () => api.get<{ scenarios: FaultScenario[] }>('/fault-scenarios'),
  getRepairScripts: () => api.get<{ scripts: Record<string, RepairScript> }>('/repair-scripts'),
  getFaultRecords: () => api.get<{ records: FaultRecord[] }>('/fault-records'),
  getApprovalQueue: () => api.get<{ queue: ApprovalRequest[] }>('/approval-queue'),
  approveRequest: (requestId: string, approver: string) => 
    api.post(`/approve/${requestId}`, null, { params: { approver } }),
  rejectRequest: (requestId: string, approver: string) => 
    api.post(`/reject/${requestId}`, null, { params: { approver } })
}

export default api
