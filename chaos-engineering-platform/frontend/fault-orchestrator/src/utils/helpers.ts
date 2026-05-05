export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}小时${minutes > 0 ? minutes + '分' : ''}`
  }
}

export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  ready: '就绪',
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
  failed: '失败',
  aborted: '已终止'
}

export const STATUS_COLORS: Record<string, string> = {
  draft: '#909399',
  ready: '#409EFF',
  running: '#67C23A',
  paused: '#E6A23C',
  completed: '#67C23A',
  failed: '#F56C6C',
  aborted: '#F56C6C'
}

export const STEP_STATUS_LABELS: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  paused: '已暂停'
}

export const STEP_STATUS_COLORS: Record<string, string> = {
  pending: '#909399',
  running: '#67C23A',
  completed: '#67C23A',
  failed: '#F56C6C',
  paused: '#E6A23C'
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as unknown as T
  const cloned = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
