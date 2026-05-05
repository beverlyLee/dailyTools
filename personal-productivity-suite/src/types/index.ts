export interface Task {
  id: number;
  title: string;
  description: string | null;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  created_at: string;
  updated_at: string;
  completed: boolean;
}

export interface PomodoroSession {
  id: number;
  task_id: number | null;
  session_type: string;
  duration: number;
  started_at: string;
  completed_at: string | null;
  completed: boolean;
}

export interface DailyStat {
  date: string;
  total_pomodoros: number;
  total_minutes: number;
  completed_tasks: number;
}

export interface NoteMetadata {
  id: number;
  file_path: string;
  title: string;
  created_at: string;
  updated_at: string;
  tags: string | null;
}

export interface WikiLink {
  id: number;
  from_note_id: number;
  to_note_id: number;
  link_text: string;
  created_at: string;
}

export interface SearchResult {
  note_id: number;
  file_path: string;
  title: string;
  snippet: string;
  score: number;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}
