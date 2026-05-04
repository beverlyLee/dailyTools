const BASE_URL = '/api'

export interface ClassificationResult {
  success: boolean
  result: {
    item_name: string
    category: string
    confidence: number
    disposal_guide: {
      item_name: string
      category: string
      category_info?: {
        description: string
        color: string
        disposal_guide: string
        examples: string[]
      }
      item_info?: {
        category: string
        disposal_tips: string
        recycling_value: string
        environmental_impact: string
      }
      disposal_instructions: string
    }
  }
  history_id?: number
}

export interface HistoryRecord {
  id: number
  predicted_item: string
  waste_category: string
  confidence: number
  disposal_guide: string
  created_at: string
}

export interface HistoryList {
  total: number
  skip: number
  limit: number
  records: HistoryRecord[]
}

export interface CategoryInfo {
  name: string
  description: string
  color: string
  disposal_guide: string
  examples: string[]
}

class ApiService {
  private request<T>(
    url: string,
    options: UniApp.RequestOptions = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      uni.request({
        url: `${BASE_URL}${url}`,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Content-Type': options.header?.['Content-Type'] || 'application/json',
          ...options.header
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data as T)
          } else {
            reject(new Error(`Request failed with status ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }

  async classifyImage(filePath: string): Promise<ClassificationResult> {
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${BASE_URL}/classification/classify`,
        filePath: filePath,
        name: 'file',
        formData: {
          save_history: 'true'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data)
              resolve(data)
            } catch (e) {
              reject(new Error('Failed to parse response'))
            }
          } else {
            reject(new Error(`Upload failed with status ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }

  async getHistory(
    skip: number = 0,
    limit: number = 20,
    category?: string
  ): Promise<{ success: boolean; data: HistoryList }> {
    let url = `/history/?skip=${skip}&limit=${limit}`
    if (category) {
      url += `&category=${encodeURIComponent(category)}`
    }
    return this.request(url)
  }

  async getHistoryDetail(id: number): Promise<{ success: boolean; data: HistoryRecord }> {
    return this.request(`/history/${id}`)
  }

  async deleteHistory(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/history/${id}`, { method: 'DELETE' })
  }

  async getCategories(): Promise<{ success: boolean; categories: CategoryInfo[] }> {
    return this.request('/classification/categories')
  }

  async getKnowledgeCategories(): Promise<{ success: boolean; data: CategoryInfo[] }> {
    return this.request('/knowledge/categories')
  }

  async getKnowledgeCategoryDetail(name: string): Promise<{ success: boolean; data: CategoryInfo & { name: string } }> {
    return this.request(`/knowledge/categories/${encodeURIComponent(name)}`)
  }

  async searchKnowledge(keyword: string): Promise<{
    success: boolean
    data: {
      keyword: string
      matched_categories: CategoryInfo[]
      matched_items: Array<{ name: string; category: string; disposal_tips: string }>
    }
  }> {
    return this.request(`/knowledge/search?keyword=${encodeURIComponent(keyword)}`)
  }

  async getCategoryStats(): Promise<{
    success: boolean
    data: {
      category_counts: Record<string, number>
    }
  }> {
    return this.request('/history/stats/categories')
  }
}

export const apiService = new ApiService()
