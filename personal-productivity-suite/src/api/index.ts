import { invoke } from '@tauri-apps/api/tauri';
import { 
  Task, 
  PomodoroSession, 
  DailyStat, 
  NoteMetadata, 
  WikiLink, 
  SearchResult, 
  FileNode 
} from '@/types';

export * from '@/types';

export const api = {
  createTask: async (title: string, description: string | null, estimated_pomodoros: number): Promise<Task> => {
    return invoke('create_task', { title, description, estimatedPomodoros: estimated_pomodoros });
  },
  
  getTasks: async (): Promise<Task[]> => {
    return invoke('get_tasks');
  },
  
  updateTask: async (task: Task): Promise<void> => {
    return invoke('update_task', { task });
  },
  
  deleteTask: async (id: number): Promise<void> => {
    return invoke('delete_task', { id });
  },
  
  createSession: async (taskId: number | null, sessionType: string, duration: number): Promise<PomodoroSession> => {
    return invoke('create_session', { taskId, sessionType, duration });
  },
  
  completeSession: async (id: number): Promise<void> => {
    return invoke('complete_session', { id });
  },
  
  getDailyStats: async (date: string): Promise<DailyStat> => {
    return invoke('get_daily_stats', { date });
  },
  
  getWeeklyStats: async (startDate: string, endDate: string): Promise<DailyStat[]> => {
    return invoke('get_weekly_stats', { startDate, endDate });
  },
  
  backupDatabase: async (backupPath: string): Promise<void> => {
    return invoke('backup_database', { backupPath });
  },
  
  restoreDatabase: async (backupPath: string): Promise<void> => {
    return invoke('restore_database', { backupPath });
  },
  
  sendNotification: async (title: string, body: string): Promise<void> => {
    return invoke('send_notification', { title, body });
  },

  getFileTree: async (rootPath: string): Promise<FileNode> => {
    return invoke('get_file_tree', { rootPath });
  },
  
  readFile: async (fullPath: string): Promise<string> => {
    return invoke('read_file', { fullPath });
  },
  
  writeFile: async (fullPath: string, content: string): Promise<void> => {
    return invoke('write_file', { fullPath, content });
  },
  
  createFile: async (fullPath: string, isDir: boolean): Promise<void> => {
    return invoke('create_file', { fullPath, isDir });
  },
  
  deleteFile: async (fullPath: string): Promise<void> => {
    return invoke('delete_file', { fullPath });
  },
  
  renameFile: async (oldPath: string, newPath: string): Promise<void> => {
    return invoke('rename_file', { oldPath, newPath });
  },
  
  searchNotes: async (query: string): Promise<SearchResult[]> => {
    return invoke('search_notes', { query });
  },
  
  getOutgoingLinks: async (noteId: number): Promise<[WikiLink, NoteMetadata][]> => {
    return invoke('get_outgoing_links', { noteId });
  },
  
  getIncomingLinks: async (noteId: number): Promise<[WikiLink, NoteMetadata][]> => {
    return invoke('get_incoming_links', { noteId });
  },
  
  getKnowledgeGraph: async (): Promise<[NoteMetadata[], WikiLink[]]> => {
    return invoke('get_knowledge_graph');
  },
  
  getAllNotes: async (): Promise<NoteMetadata[]> => {
    return invoke('get_all_notes');
  },
  
  getNotesDirectory: async (): Promise<string> => {
    return invoke('get_notes_directory');
  },
};
