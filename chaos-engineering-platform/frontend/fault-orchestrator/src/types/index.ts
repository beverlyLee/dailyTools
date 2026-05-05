export interface FaultType {
  id: string
  name: string
  category: 'network' | 'resource' | 'container' | 'application'
  icon: string
  description: string
  configSchema: Record<string, any>
}

export interface ExperimentStep {
  id: string
  type: FaultType
  name: string
  config: Record<string, any>
  duration: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  startedAt?: string
  completedAt?: string
}

export interface Experiment {
  id: string
  name: string
  description: string
  steps: ExperimentStep[]
  status: 'draft' | 'ready' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted'
  targetNamespace: string
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  steadyStateCheck: SteadyStateCheckConfig
}

export interface SteadyStateCheckConfig {
  enabled: boolean
  checkInterval: number
  metrics: MetricThreshold[]
  rollbackOnFailure: boolean
}

export interface MetricThreshold {
  id: string
  name: string
  metric: string
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  threshold: number
  unit: string
}

export interface ExperimentLog {
  id: string
  experimentId: string
  stepId?: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}

export const FAULT_TYPES: FaultType[] = [
  {
    id: 'pod-delete',
    name: 'Pod 删除',
    category: 'container',
    icon: 'Delete',
    description: '删除指定 Pod，模拟容器故障',
    configSchema: {
      namespace: { type: 'string', required: true, default: 'default' },
      labelSelector: { type: 'string', required: false },
      podName: { type: 'string', required: false },
      count: { type: 'number', required: true, default: 1, min: 1 }
    }
  },
  {
    id: 'network-delay',
    name: '网络延迟',
    category: 'network',
    icon: 'Timer',
    description: '在指定容器中注入网络延迟',
    configSchema: {
      namespace: { type: 'string', required: true, default: 'default' },
      labelSelector: { type: 'string', required: false },
      delay: { type: 'number', required: true, default: 500, unit: 'ms', min: 0 },
      jitter: { type: 'number', required: false, default: 0, unit: 'ms', min: 0 },
      duration: { type: 'number', required: true, default: 60, unit: 's', min: 1 }
    }
  },
  {
    id: 'network-loss',
    name: '网络丢包',
    category: 'network',
    icon: 'Connection',
    description: '在指定容器中模拟网络丢包',
    configSchema: {
      namespace: { type: 'string', required: true, default: 'default' },
      labelSelector: { type: 'string', required: false },
      percentage: { type: 'number', required: true, default: 20, unit: '%', min: 0, max: 100 },
      duration: { type: 'number', required: true, default: 60, unit: 's', min: 1 }
    }
  },
  {
    id: 'cpu-stress',
    name: 'CPU 满负荷',
    category: 'resource',
    icon: 'Cpu',
    description: '在指定容器中使 CPU 达到满负荷',
    configSchema: {
      namespace: { type: 'string', required: true, default: 'default' },
      labelSelector: { type: 'string', required: false },
      percentage: { type: 'number', required: true, default: 100, unit: '%', min: 1, max: 100 },
      cores: { type: 'number', required: false, default: 1, min: 1 },
      duration: { type: 'number', required: true, default: 60, unit: 's', min: 1 }
    }
  },
  {
    id: 'memory-stress',
    name: '内存压力',
    category: 'resource',
    icon: 'Coin',
    description: '在指定容器中消耗内存资源',
    configSchema: {
      namespace: { type: 'string', required: true, default: 'default' },
      labelSelector: { type: 'string', required: false },
      percentage: { type: 'number', required: true, default: 80, unit: '%', min: 1, max: 100 },
      duration: { type: 'number', required: true, default: 60, unit: 's', min: 1 }
    }
  },
  {
    id: 'disk-io-stress',
    name: '磁盘 IO 压力',
    category: 'resource',
    icon: 'DataLine',
    description: '在指定容器中产生磁盘 IO 压力',
    configSchema: {
      namespace: { type: 'string', required: true, default: 'default' },
      labelSelector: { type: 'string', required: false },
      mode: { type: 'string', required: true, default: 'read', enum: ['read', 'write', 'readwrite'] },
      blockSize: { type: 'number', required: false, default: 4, unit: 'KB', min: 1 },
      duration: { type: 'number', required: true, default: 60, unit: 's', min: 1 }
    }
  },
  {
    id: 'process-kill',
    name: '进程终止',
    category: 'application',
    icon: 'Warning',
    description: '终止指定容器中的特定进程',
    configSchema: {
      namespace: { type: 'string', required: true, default: 'default' },
      labelSelector: { type: 'string', required: false },
      processName: { type: 'string', required: true },
      signal: { type: 'string', required: false, default: 'SIGTERM', enum: ['SIGTERM', 'SIGKILL', 'SIGINT'] },
      count: { type: 'number', required: true, default: 1, min: 1 }
    }
  },
  {
    id: 'latency-injection',
    name: '服务延迟',
    category: 'application',
    icon: 'Clock',
    description: '在服务调用中注入延迟',
    configSchema: {
      namespace: { type: 'string', required: true, default: 'default' },
      labelSelector: { type: 'string', required: false },
      serviceName: { type: 'string', required: true },
      endpoint: { type: 'string', required: true },
      delay: { type: 'number', required: true, default: 1000, unit: 'ms', min: 0 },
      duration: { type: 'number', required: true, default: 60, unit: 's', min: 1 }
    }
  }
]

export const CATEGORY_LABELS: Record<string, string> = {
  network: '网络故障',
  resource: '资源压力',
  container: '容器故障',
  application: '应用故障'
}

export const CATEGORY_COLORS: Record<string, string> = {
  network: '#409EFF',
  resource: '#E6A23C',
  container: '#F56C6C',
  application: '#67C23A'
}
