export interface Session {
  session_id: string;
  name: string;
  display_name: string;
  title: string;
  created_at: number;
  created_at_str: string;
  workspace: string;
  command: string;
  is_active: boolean;
  source: string;
  session_type: 'sandbox' | 'chat';
}

export interface MonitorStatus {
  session_id: string;
  display_name: string;
  title: string;
  is_monitoring: boolean;
  status: 'unknown' | 'idle' | 'running' | 'completed' | 'error';
  cpu_history: number[];
  start_time: number | null;
  task_start_time: number | null;
  last_update_time: number | null;
  idle_count: number;
  in_progress: boolean;
  last_completed: boolean;
  elapsed_time: number;
  avg_cpu: number;
  status_text: string;
}

export interface SSEMessage {
  type: 'init' | 'status_update' | 'completed' | 'error';
  session_id?: string;
  data: any;
}
