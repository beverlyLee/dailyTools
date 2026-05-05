import { invoke } from '@tauri-apps/api'

export interface Task {
  id: number
  title: string
  description: string | null
  estimated_pomodoros: number
  completed_pomodoros: number
  created_at: string
  updated_at: string
  completed: boolean
}

export interface PomodoroSession {
  id: number
  task_id: number | null
  session_type: string
  duration: number
  started_at: string
  completed_at: string | null
  completed: boolean
}

export interface DailyStat {
  date: string
  total_pomodoros: number
  total_minutes: number
  completed_tasks: number
}

export interface Comparison {
  id: number
  left_file_name: string
  right_file_name: string
  left_content: string
  right_content: string
  created_at: string
}

export const api = {
  createTask: (title: string, description: string | null, estimated_pomodoros: number): Promise<Task> => {
    return invoke('create_task', { title, description, estimated_pomodoros })
  },
  
  getTasks: (): Promise<Task[]> => {
    return invoke('get_tasks')
  },
  
  updateTask: (task: Task): Promise<void> => {
    return invoke('update_task', { task })
  },
  
  deleteTask: (id: number): Promise<void> => {
    return invoke('delete_task', { id })
  },
  
  createSession: (taskId: number | null, sessionType: string, duration: number): Promise<PomodoroSession> => {
    return invoke('create_session', { taskId, sessionType, duration })
  },
  
  completeSession: (id: number): Promise<void> => {
    return invoke('complete_session', { id })
  },
  
  getDailyStats: (date: string): Promise<DailyStat> => {
    return invoke('get_daily_stats', { date })
  },
  
  getWeeklyStats: (startDate: string, endDate: string): Promise<DailyStat[]> => {
    return invoke('get_weekly_stats', { startDate, endDate })
  },
  
  backupDatabase: (backupPath: string): Promise<void> => {
    return invoke('backup_database', { backupPath })
  },
  
  restoreDatabase: (backupPath: string): Promise<void> => {
    return invoke('restore_database', { backupPath })
  },
  
  sendNotification: (title: string, body: string): Promise<void> => {
    return invoke('send_notification', { title, body })
  },

  saveComparison: (leftFileName: string, rightFileName: string, leftContent: string, rightContent: string): Promise<number> => {
    return invoke('save_comparison', { leftFileName, rightFileName, leftContent, rightContent })
  },

  getComparisons: (): Promise<Comparison[]> => {
    return invoke('get_comparisons')
  },

  getComparison: (id: number): Promise<Comparison | null> => {
    return invoke('get_comparison', { id })
  },

  deleteComparison: (id: number): Promise<void> => {
    return invoke('delete_comparison', { id })
  }
}
