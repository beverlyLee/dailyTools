import axios from 'axios'
import type {
  FileItem,
  NoteContent,
  NoteLinks,
  KnowledgeGraph,
  SearchResult,
  SearchSuggestion,
  ApiResponse
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 文件相关 API
export const fileApi = {
  async listFiles(directory: string = ''): Promise<ApiResponse<FileItem[]>> {
    const response = await api.get('/files/list', {
      params: { directory }
    })
    return response.data
  },

  async readFile(path: string): Promise<ApiResponse<NoteContent>> {
    const response = await api.get('/files/read', {
      params: { path }
    })
    return response.data
  },

  async createFile(path: string, content: string = ''): Promise<ApiResponse<any>> {
    const response = await api.post('/files/create', {
      path,
      content
    })
    return response.data
  },

  async writeFile(path: string, content: string): Promise<ApiResponse<any>> {
    const response = await api.put('/files/write', {
      content
    }, {
      params: { path }
    })
    return response.data
  },

  async deleteFile(path: string): Promise<ApiResponse<any>> {
    const response = await api.delete('/files/delete', {
      params: { path }
    })
    return response.data
  },

  async createDirectory(path: string): Promise<ApiResponse<any>> {
    const response = await api.post('/files/directory/create', {
      path
    })
    return response.data
  },

  async renameFile(path: string, newPath: string): Promise<ApiResponse<any>> {
    const response = await api.post('/files/rename', {
      new_path: newPath
    }, {
      params: { path }
    })
    return response.data
  },

  async searchFilesByName(query: string): Promise<ApiResponse<FileItem[]>> {
    const response = await api.get('/files/search', {
      params: { query, search_type: 'name' }
    })
    return response.data
  }
}

// 链接相关 API
export const linkApi = {
  async getOutgoingLinks(path: string): Promise<ApiResponse<any>> {
    const response = await api.get('/links/outgoing', {
      params: { path }
    })
    return response.data
  },

  async getIncomingLinks(path: string): Promise<ApiResponse<any>> {
    const response = await api.get('/links/incoming', {
      params: { path }
    })
    return response.data
  },

  async getBothLinks(path: string): Promise<ApiResponse<NoteLinks>> {
    const response = await api.get('/links/both', {
      params: { path }
    })
    return response.data
  },

  async getKnowledgeGraph(): Promise<ApiResponse<KnowledgeGraph>> {
    const response = await api.get('/links/graph')
    return response.data
  },

  async getSubgraph(path: string, depth: number = 1): Promise<ApiResponse<any>> {
    const response = await api.get('/links/graph/subgraph', {
      params: { path, depth }
    })
    return response.data
  },

  async extractLinks(content: string, currentPath?: string): Promise<ApiResponse<any>> {
    const response = await api.post('/links/extract', null, {
      params: { content, current_path: currentPath }
    })
    return response.data
  },

  async renderWikiLinks(content: string, currentPath?: string): Promise<ApiResponse<any>> {
    const response = await api.post('/links/render-wiki-links', null, {
      params: { content, current_path: currentPath }
    })
    return response.data
  }
}

// 搜索相关 API
export const searchApi = {
  async search(query: string, fields?: string[], limit: number = 50): Promise<ApiResponse<{
    query: string
    fields: string[]
    count: number
    results: SearchResult[]
  }>> {
    const response = await api.get('/search/', {
      params: {
        query,
        fields: fields?.join(','),
        limit
      }
    })
    return response.data
  },

  async indexNote(path: string, content?: string): Promise<ApiResponse<any>> {
    const response = await api.post('/search/index/note', null, {
      params: { path, content }
    })
    return response.data
  },

  async indexAllNotes(): Promise<ApiResponse<any>> {
    const response = await api.post('/search/index/all')
    return response.data
  },

  async removeFromIndex(path: string): Promise<ApiResponse<any>> {
    const response = await api.delete('/search/index/note', {
      params: { path }
    })
    return response.data
  },

  async getIndexStats(): Promise<ApiResponse<any>> {
    const response = await api.get('/search/stats')
    return response.data
  },

  async getSuggestions(query: string, limit: number = 10): Promise<ApiResponse<{
    query: string
    suggestions: SearchSuggestion[]
  }>> {
    const response = await api.get('/search/suggest', {
      params: { query, limit }
    })
    return response.data
  }
}

// 通用 API
export const appApi = {
  async getInfo(): Promise<ApiResponse<any>> {
    const response = await api.get('/info')
    return response.data
  }
}

export default api
