<template>
  <div class="data-sync">
    <h2 class="text-xl font-bold mb-6">数据同步</h2>

    <div class="grid grid-2 mb-6">
      <div class="card">
        <div class="card-header">
          <h3>导入数据</h3>
        </div>
        <div class="card-body">
          <div class="mb-4">
            <p class="text-secondary text-sm mb-2">
              支持导入 CSV 格式的阅读记录数据。您可以导入书籍、阅读会话和阅读笔记。
            </p>
            <div class="import-example">
              <h4 class="font-medium mb-2">CSV 格式示例：</h4>
              <pre class="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
type,title,author,total_pages,genre
book,深入理解计算机系统,Randal E. Bryant,1000,计算机科学
type,book_id,start_time,end_time,start_page,end_page
session,1,2023-01-01T10:00:00,2023-01-01T11:00:00,0,50
type,session_id,page_number,content
note,1,25,"这是一段重要的笔记内容"
              </pre>
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label">选择 CSV 文件</label>
            <input 
              type="file" 
              ref="fileInput"
              accept=".csv"
              @change="handleFileSelect"
              class="form-input"
              style="padding: 0.5rem;"
            />
          </div>

          <div v-if="selectedFile" class="mb-4 p-3 bg-blue-50 rounded">
            <div class="flex justify-between items-center">
              <div>
                <span class="font-medium">{{ selectedFile.name }}</span>
                <span class="text-secondary text-sm ml-2">({{ formatFileSize(selectedFile.size) }})</span>
              </div>
              <button class="btn btn-sm btn-outline" @click="clearFile">清除</button>
            </div>
          </div>

          <div v-if="uploadProgress > 0" class="mb-4">
            <div class="flex justify-between text-sm mb-1">
              <span>上传中...</span>
              <span>{{ uploadProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
            </div>
          </div>

          <div v-if="importResult" class="mb-4">
            <div v-if="importResult.success" class="alert alert-success">
              <p class="font-medium">{{ importResult.message }}</p>
              <p v-if="importResult.errors?.length > 0" class="text-sm mt-2">
                警告：有 {{ importResult.errors.length }} 条记录导入失败
              </p>
            </div>
            <div v-else class="alert alert-error">
              <p class="font-medium">{{ importResult.error }}</p>
              <p v-if="importResult.details" class="text-sm mt-2">{{ importResult.details }}</p>
            </div>
          </div>

          <button 
            class="btn btn-primary w-full" 
            @click="handleImport"
            :disabled="!selectedFile || isUploading"
          >
            <span v-if="isUploading" class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></span>
            {{ isUploading ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>导出数据</h3>
        </div>
        <div class="card-body">
          <p class="text-secondary text-sm mb-4">
            将您的阅读记录数据导出为 CSV 格式，可用于备份或在其他应用中使用。
          </p>

          <div class="form-group">
            <label class="form-label">选择导出类型</label>
            <select v-model="exportType" class="form-input form-select">
              <option value="all">全部数据</option>
              <option value="books">仅书籍</option>
              <option value="sessions">仅阅读会话</option>
              <option value="notes">仅阅读笔记</option>
            </select>
          </div>

          <div v-if="isExporting" class="mb-4 text-center">
            <div class="spinner" style="margin: 0 auto;"></div>
            <p class="text-secondary mt-2">正在导出...</p>
          </div>

          <button 
            class="btn btn-secondary w-full" 
            @click="handleExport"
            :disabled="isExporting"
          >
            导出 CSV 文件
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>OAuth 连接（模拟）</h3>
      </div>
      <div class="card-body">
        <p class="text-secondary text-sm mb-4">
          连接到第三方阅读服务（如 Kindle、Goodreads）以同步您的阅读记录。
          这些连接当前处于模拟模式，用于演示 OAuth 2.0 流程。
        </p>

        <div class="grid grid-2 gap-4">
          <div class="oauth-provider card p-4">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-semibold">📚 Kindle</h4>
              <span v-if="mockStatus.kindle === 'connected'" class="badge badge-success">已连接</span>
              <span v-else class="badge badge-warning">未连接</span>
            </div>
            <p class="text-secondary text-sm mb-4">
              同步您的 Kindle 阅读进度和笔记。
            </p>
            <div v-if="mockStatus.kindle === 'connected'" class="mb-4">
              <p class="text-sm">上次同步：{{ formatDateTime(mockStatus.kindleLastSync) }}</p>
              <p class="text-sm">已同步 {{ mockStatus.kindleSyncCount }} 条记录</p>
            </div>
            <button 
              class="btn btn-primary btn-sm w-full" 
              @click="toggleMockConnection('kindle')"
            >
              {{ mockStatus.kindle === 'connected' ? '断开连接' : '连接 Kindle' }}
            </button>
          </div>

          <div class="oauth-provider card p-4">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-semibold">📖 Goodreads</h4>
              <span v-if="mockStatus.goodreads === 'connected'" class="badge badge-success">已连接</span>
              <span v-else class="badge badge-warning">未连接</span>
            </div>
            <p class="text-secondary text-sm mb-4">
              同步您的 Goodreads 书架和阅读记录。
            </p>
            <div v-if="mockStatus.goodreads === 'connected'" class="mb-4">
              <p class="text-sm">上次同步：{{ formatDateTime(mockStatus.goodreadsLastSync) }}</p>
              <p class="text-sm">已同步 {{ mockStatus.goodreadsSyncCount }} 条记录</p>
            </div>
            <button 
              class="btn btn-primary btn-sm w-full" 
              @click="toggleMockConnection('goodreads')"
            >
              {{ mockStatus.goodreads === 'connected' ? '断开连接' : '连接 Goodreads' }}
            </button>
          </div>
        </div>

        <div class="mt-4 p-3 bg-yellow-50 rounded">
          <p class="text-sm text-yellow-800">
            <strong>提示：</strong> 当前 OAuth 连接处于模拟模式。
            要启用真实连接，请设置环境变量 <code>USE_MOCK_OAUTH=false</code> 
            并配置相应的 OAuth 客户端凭证。
          </p>
        </div>
      </div>
    </div>

    <div class="card mt-6">
      <div class="card-header">
        <h3>导入历史</h3>
      </div>
      <div class="card-body">
        <div v-if="importHistory.length === 0" class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-title">暂无导入记录</div>
          <div class="empty-state-description">导入数据后将显示在此处</div>
        </div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>导入时间</th>
              <th>来源类型</th>
              <th>文件名</th>
              <th>导入数量</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in importHistory" :key="record.id">
              <td>{{ formatDateTime(record.created_at) }}</td>
              <td>{{ record.source_type }}</td>
              <td>{{ record.file_name || '-' }}</td>
              <td>{{ record.imported_count }}</td>
              <td>
                <span 
                  class="badge" 
                  :class="record.status === 'completed' ? 'badge-success' : 'badge-warning'"
                >
                  {{ record.status === 'completed' ? '已完成' : '处理中' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { syncApi } from '../api'

const fileInput = ref(null)
const selectedFile = ref(null)
const uploadProgress = ref(0)
const isUploading = ref(false)
const isExporting = ref(false)
const importResult = ref(null)
const exportType = ref('all')
const importHistory = ref([])

const mockStatus = reactive({
  kindle: 'disconnected',
  kindleLastSync: null,
  kindleSyncCount: 0,
  goodreads: 'disconnected',
  goodreadsLastSync: null,
  goodreadsSyncCount: 0
})

function handleFileSelect(event) {
  const files = event.target.files
  if (files && files.length > 0) {
    selectedFile.value = files[0]
    importResult.value = null
  }
}

function clearFile() {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  importResult.value = null
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDateTime(dateTime) {
  if (!dateTime) return '-'
  const date = new Date(dateTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function handleImport() {
  if (!selectedFile.value) return

  isUploading.value = true
  uploadProgress.value = 0
  importResult.value = null

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const response = await syncApi.importCSV(formData, (progressEvent) => {
      if (progressEvent.total > 0) {
        uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
    })

    importResult.value = response.data
    
    if (response.data.success) {
      // 刷新导入历史
      await fetchImportHistory()
      clearFile()
    }
  } catch (error) {
    console.error('导入失败:', error)
    importResult.value = {
      success: false,
      error: '导入失败',
      details: error.response?.data?.error || error.message
    }
  } finally {
    isUploading.value = false
  }
}

async function handleExport() {
  isExporting.value = true

  try {
    const response = await syncApi.exportCSV(exportType.value)
    
    // 创建下载链接
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `reading-data-${exportType.value}-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败，请重试')
  } finally {
    isExporting.value = false
  }
}

function toggleMockConnection(provider) {
  if (mockStatus[provider] === 'connected') {
    mockStatus[provider] = 'disconnected'
    mockStatus[`${provider}LastSync`] = null
    mockStatus[`${provider}SyncCount`] = 0
  } else {
    mockStatus[provider] = 'connected'
    mockStatus[`${provider}LastSync`] = new Date().toISOString()
    mockStatus[`${provider}SyncCount`] = Math.floor(Math.random() * 50) + 10
  }
}

async function fetchImportHistory() {
  // 模拟获取导入历史
  // 在实际应用中，这里应该调用 API 获取导入记录
  importHistory.value = [
    {
      id: 1,
      created_at: new Date().toISOString(),
      source_type: 'csv',
      file_name: 'reading-export.csv',
      imported_count: 15,
      status: 'completed'
    }
  ]
}

onMounted(() => {
  fetchImportHistory()
})
</script>

<style scoped>
.import-example {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  background-color: var(--background-color);
}

pre {
  margin: 0;
  white-space: pre-wrap;
}

.oauth-provider {
  border: 2px solid var(--border-color);
  transition: border-color 0.2s;
}

.oauth-provider:hover {
  border-color: var(--primary-color);
}
</style>
