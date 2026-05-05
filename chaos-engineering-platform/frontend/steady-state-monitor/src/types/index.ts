export interface Metric {
  id: string
  name: string
  displayName: string
  description: string
  unit: string
  category: 'performance' | 'resource' | 'availability' | 'error'
  defaultThreshold: number
  defaultOperator: '>' | '<' | '>=' | '<='
}

export interface MetricThreshold {
  id: string
  metricId: string
  metric: Metric
  name: string
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  threshold: number
  unit: string
  enabled: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface MetricValue {
  metricId: string
  metricName: string
  value: number
  timestamp: string
  unit: string
  labels?: Record<string, string>
}

export interface MetricHistory {
  metricId: string
  data: {
    timestamp: string
    value: number
  }[]
  min: number
  max: number
  avg: number
}

export interface SteadyStateCheck {
  id: string
  experimentId: string
  experimentName: string
  status: 'idle' | 'monitoring' | 'triggered' | 'ok'
  thresholds: MetricThreshold[]
  violations: Violation[]
  startedAt?: string
  lastCheckAt?: string
}

export interface Violation {
  id: string
  checkId: string
  metricId: string
  metricName: string
  expectedValue: number
  actualValue: number
  operator: string
  unit: string
  timestamp: string
  level: 'warning' | 'critical'
  acknowledged: boolean
}

export interface CircuitBreakerEvent {
  id: string
  experimentId: string
  experimentName: string
  eventType: 'triggered' | 'recovered' | 'rollback_start' | 'rollback_complete'
  reason: string
  timestamp: string
  details?: Record<string, any>
}

export const METRICS: Metric[] = [
  {
    id: 'qps',
    name: 'qps',
    displayName: 'QPS (每秒请求数)',
    description: '服务每秒处理的请求数量',
    unit: 'req/s',
    category: 'performance',
    defaultThreshold: 1000,
    defaultOperator: '>'
  },
  {
    id: 'rt_p99',
    name: 'rt_p99',
    displayName: 'P99 响应时间',
    description: '99% 请求的最大响应时间',
    unit: 'ms',
    category: 'performance',
    defaultThreshold: 200,
    defaultOperator: '<'
  },
  {
    id: 'rt_avg',
    name: 'rt_avg',
    displayName: '平均响应时间',
    description: '所有请求的平均响应时间',
    unit: 'ms',
    category: 'performance',
    defaultThreshold: 100,
    defaultOperator: '<'
  },
  {
    id: 'error_rate',
    name: 'error_rate',
    displayName: '错误率',
    description: '错误请求占总请求的比例',
    unit: '%',
    category: 'error',
    defaultThreshold: 1,
    defaultOperator: '<'
  },
  {
    id: 'cpu_usage',
    name: 'cpu_usage',
    displayName: 'CPU 使用率',
    description: '容器 CPU 使用率',
    unit: '%',
    category: 'resource',
    defaultThreshold: 80,
    defaultOperator: '<'
  },
  {
    id: 'memory_usage',
    name: 'memory_usage',
    displayName: '内存使用率',
    description: '容器内存使用率',
    unit: '%',
    category: 'resource',
    defaultThreshold: 85,
    defaultOperator: '<'
  },
  {
    id: 'pod_ready',
    name: 'pod_ready',
    displayName: 'Pod 就绪率',
    description: 'Ready 状态 Pod 占总 Pod 的比例',
    unit: '%',
    category: 'availability',
    defaultThreshold: 100,
    defaultOperator: '>='
  },
  {
    id: 'service_availability',
    name: 'service_availability',
    displayName: '服务可用性',
    description: '服务健康检查通过率',
    unit: '%',
    category: 'availability',
    defaultThreshold: 99.9,
    defaultOperator: '>='
  }
]

export const CATEGORY_LABELS: Record<string, string> = {
  performance: '性能指标',
  resource: '资源指标',
  availability: '可用性指标',
  error: '错误指标'
}

export const CATEGORY_COLORS: Record<string, string> = {
  performance: '#409EFF',
  resource: '#E6A23C',
  availability: '#67C23A',
  error: '#F56C6C'
}

export const OPERATOR_LABELS: Record<string, string> = {
  '>': '大于',
  '<': '小于',
  '>=': '大于等于',
  '<=': '小于等于',
  '==': '等于',
  '!=': '不等于'
}
