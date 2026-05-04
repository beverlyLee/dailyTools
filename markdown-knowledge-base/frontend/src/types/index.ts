export interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
}

export interface NoteInfo {
  id: number
  title: string
  file_path: string
  content_hash?: string
  created_at?: string
  updated_at?: string
}

export interface LinkInfo {
  id: number
  title: string
  file_path: string
}

export interface NoteLinks {
  note_id: number
  note_path: string
  outgoing_links: LinkInfo[]
  incoming_links: LinkInfo[]
}

export interface GraphNode {
  id: number
  title: string
  file_path: string
  created_at?: string
  updated_at?: string
  is_center?: boolean
  depth?: number
}

export interface GraphEdge {
  from: number
  to: number
  from_title: string
  to_title: string
}

export interface KnowledgeGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface SearchResult {
  path: string
  title: string
  tags: string[]
  created_at?: string
  updated_at?: string
  score: number
  highlights: Record<string, string>
}

export interface SearchSuggestion {
  title: string
  path: string
  type: 'note' | 'directory'
}

export interface FileInfo {
  path: string
  name: string
  size: number
  created: number
  modified: number
  is_directory: boolean
}

export interface NoteContent {
  path: string
  content: string
  content_hash: string
  info: FileInfo
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}
