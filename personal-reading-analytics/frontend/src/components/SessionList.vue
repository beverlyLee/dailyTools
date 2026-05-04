<template>
  <div class="session-list">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">阅读记录</h2>
      <button class="btn btn-primary" @click="showAddModal = true">
        + 新增阅读会话
      </button>
    </div>

    <div class="card mb-6">
      <div class="card-body">
        <div class="form-group mb-0">
          <label class="form-label">按书籍筛选</label>
          <select v-model="filterBookId" class="form-input form-select" @change="fetchSessions">
            <option value="">全部书籍</option>
            <option v-for="book in readingStore.books" :key="book.id" :value="book.id">
              {{ book.title }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center p-4">
      <div class="spinner" style="margin: 0 auto;"></div>
      <p class="text-secondary mt-2">加载中...</p>
    </div>

    <div v-else-if="sessions.length === 0" class="empty-state card">
      <div class="empty-state-icon">📖</div>
      <div class="empty-state-title">暂无阅读记录</div>
      <div class="empty-state-description">点击上方按钮开始记录您的阅读会话</div>
    </div>

    <div v-else>
      <div v-for="session in sessions" :key="session.id" class="card mb-4">
        <div class="card-body">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold mb-2">
                开始时间：{{ formatDateTime(session.start_time) }}
              </h3>
              <div class="flex gap-4 text-sm">
                <div>
                  <span class="text-secondary">书籍：</span>
                  <span>{{ getBookTitle(session.book_id) }}</span>
                </div>
                <div v-if="session.end_time">
                  <span class="text-secondary">结束时间：</span>
                  <span>{{ formatDateTime(session.end_time) }}</span>
                </div>
                <div v-if="session.start_page !== undefined && session.end_page !== undefined">
                  <span class="text-secondary">阅读页数：</span>
                  <span>{{ session.start_page }} - {{ session.end_page }} ({{ session.end_page - session.start_page }}页)</span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-outline" @click="editSession(session)">编辑</button>
              <button class="btn btn-sm btn-danger" @click="deleteSession(session)">删除</button>
            </div>
          </div>

          <div v-if="session.notes" class="pt-4 border-t border-gray-200">
            <p class="text-secondary text-sm">{{ session.notes }}</p>
          </div>

          <div v-if="session.end_time && session.start_page !== undefined && session.end_page !== undefined" class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex gap-6">
              <div>
                <span class="text-secondary text-sm">阅读速度：</span>
                <span class="font-semibold text-primary">{{ calculateSpeed(session).toFixed(2) }} 页/分钟</span>
              </div>
              <div>
                <span class="text-secondary text-sm">阅读时长：</span>
                <span class="font-semibold">{{ formatDuration(session.start_time, session.end_time) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ showAddModal ? '新增阅读会话' : '编辑阅读会话' }}</h3>
          <button class="modal-close" @click="closeModals">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="form-group">
              <label class="form-label">选择书籍 *</label>
              <select v-model="formData.book_id" class="form-input form-select" required>
                <option value="">请选择书籍</option>
                <option v-for="book in readingStore.books" :key="book.id" :value="book.id">
                  {{ book.title }}
                </option>
              </select>
            </div>

            <div class="grid grid-2 gap-4">
              <div class="form-group">
                <label class="form-label">开始时间 *</label>
                <input 
                  v-model="formData.start_time" 
                  type="datetime-local" 
                  class="form-input" 
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">结束时间</label>
                <input 
                  v-model="formData.end_time" 
                  type="datetime-local" 
                  class="form-input"
                />
              </div>
            </div>

            <div class="grid grid-2 gap-4">
              <div class="form-group">
                <label class="form-label">开始页数</label>
                <input 
                  v-model.number="formData.start_page" 
                  type="number" 
                  class="form-input" 
                  placeholder="请输入开始页数"
                  min="0"
                />
              </div>

              <div class="form-group">
                <label class="form-label">结束页数</label>
                <input 
                  v-model.number="formData.end_page" 
                  type="number" 
                  class="form-input" 
                  placeholder="请输入结束页数"
                  min="0"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea 
                v-model="formData.notes" 
                class="form-input form-textarea" 
                placeholder="请输入备注信息"
              ></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeModals">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="!formData.book_id || !formData.start_time">
            {{ showAddModal ? '添加' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useReadingStore } from '../stores/readingStore'

const readingStore = useReadingStore()

const filterBookId = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingSession = ref(null)

const sessions = computed(() => readingStore.sessions)
const loading = computed(() => readingStore.loading)

const formData = reactive({
  book_id: null,
  start_time: '',
  end_time: '',
  start_page: null,
  end_page: null,
  notes: ''
})

async function fetchSessions() {
  await readingStore.fetchSessions(filterBookId.value || null)
}

function getBookTitle(bookId) {
  const book = readingStore.books.find(b => b.id === bookId)
  return book ? book.title : '未知书籍'
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

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  const start = new Date(startTime)
  const end = new Date(endTime)
  const minutes = Math.floor((end - start) / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours}小时${mins}分钟`
  }
  return `${mins}分钟`
}

function calculateSpeed(session) {
  if (!session.start_time || !session.end_time || 
      session.start_page === undefined || session.end_page === undefined) {
    return 0
  }
  const pagesRead = session.end_page - session.start_page
  const minutes = (new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60)
  return minutes > 0 ? pagesRead / minutes : 0
}

function openAddModal() {
  resetForm()
  formData.start_time = formatDateTimeLocal(new Date())
  showAddModal.value = true
}

function editSession(session) {
  editingSession.value = session
  Object.assign(formData, {
    book_id: session.book_id,
    start_time: formatDateTimeLocal(session.start_time),
    end_time: session.end_time ? formatDateTimeLocal(session.end_time) : '',
    start_page: session.start_page,
    end_page: session.end_page,
    notes: session.notes || ''
  })
  showEditModal.value = true
}

function formatDateTimeLocal(date) {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function closeModals() {
  showAddModal.value = false
  showEditModal.value = false
  editingSession.value = null
  resetForm()
}

function resetForm() {
  Object.assign(formData, {
    book_id: null,
    start_time: '',
    end_time: '',
    start_page: null,
    end_page: null,
    notes: ''
  })
}

async function handleSubmit() {
  if (!formData.book_id || !formData.start_time) return

  try {
    if (showAddModal.value) {
      await readingStore.addSession(formData)
    } else if (showEditModal.value && editingSession.value) {
      await readingStore.updateSession(editingSession.value.id, formData)
    }
    await fetchSessions()
    closeModals()
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败，请重试')
  }
}

async function deleteSession(session) {
  if (confirm(`确定要删除此阅读会话吗？此操作不可撤销。`)) {
    try {
      await readingStore.deleteSession(session.id)
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败，请重试')
    }
  }
}

onMounted(() => {
  readingStore.fetchBooks()
  fetchSessions()
})
</script>
