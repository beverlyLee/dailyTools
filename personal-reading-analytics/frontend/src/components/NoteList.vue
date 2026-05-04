<template>
  <div class="note-list">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">阅读笔记</h2>
      <button class="btn btn-primary" @click="showAddModal = true">
        + 新增笔记
      </button>
    </div>

    <div class="card mb-6">
      <div class="card-body">
        <div class="form-group mb-0">
          <label class="form-label">按阅读会话筛选</label>
          <select v-model="filterSessionId" class="form-input form-select" @change="fetchNotes">
            <option value="">全部会话</option>
            <option v-for="session in readingStore.sessions" :key="session.id" :value="session.id">
              {{ formatSessionLabel(session) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center p-4">
      <div class="spinner" style="margin: 0 auto;"></div>
      <p class="text-secondary mt-2">加载中...</p>
    </div>

    <div v-else-if="notes.length === 0" class="empty-state card">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-title">暂无笔记</div>
      <div class="empty-state-description">点击上方按钮添加您的第一条阅读笔记</div>
    </div>

    <div v-else>
      <div v-for="note in notes" :key="note.id" class="card mb-4">
        <div class="card-body">
          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="flex gap-4 text-sm mb-2">
                <div>
                  <span class="text-secondary">所属会话：</span>
                  <span>{{ formatSessionLabel(getSessionById(note.session_id)) }}</span>
                </div>
                <div v-if="note.page_number !== undefined">
                  <span class="text-secondary">页码：</span>
                  <span>第 {{ note.page_number }} 页</span>
                </div>
                <div>
                  <span class="text-secondary">创建时间：</span>
                  <span>{{ formatDateTime(note.created_at) }}</span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-outline" @click="editNote(note)">编辑</button>
              <button class="btn btn-sm btn-danger" @click="deleteNote(note)">删除</button>
            </div>
          </div>

          <div class="note-content">
            <p>{{ note.content }}</p>
          </div>

          <div v-if="note.content.length > 50" class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex gap-6">
              <button 
                class="btn btn-sm btn-outline" 
                @click="analyzeKeywords(note.content, note.id)"
                :disabled="analyzingNote === note.id"
              >
                <span v-if="analyzingNote === note.id" class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></span>
                分析关键词
              </button>
              <button 
                class="btn btn-sm btn-outline" 
                @click="analyzeSentiment(note.content, note.id)"
                :disabled="analyzingNote === note.id"
              >
                <span v-if="analyzingNote === note.id" class="spinner" style="width: 1rem; height: 1rem; margin-right: 0.5rem;"></span>
                分析情感
              </button>
            </div>

            <div v-if="noteKeywords[note.id]" class="mt-4">
              <h4 class="text-sm font-semibold text-secondary mb-2">提取的关键词：</h4>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="(keyword, index) in noteKeywords[note.id]" 
                  :key="index"
                  class="badge badge-primary"
                >
                  {{ keyword.word }} ({{ keyword.frequency }})
                </span>
              </div>
            </div>

            <div v-if="noteSentiment[note.id]" class="mt-4">
              <h4 class="text-sm font-semibold text-secondary mb-2">情感分析结果：</h4>
              <div class="grid grid-2 gap-4">
                <div>
                  <span class="text-secondary">整体得分：</span>
                  <span class="font-semibold" :class="getSentimentClass(noteSentiment[note.id].score)">
                    {{ noteSentiment[note.id].score.toFixed(2) }} ({{ formatSentiment(noteSentiment[note.id].score) }})
                  </span>
                </div>
                <div>
                  <span class="text-secondary">相对得分：</span>
                  <span class="font-semibold">{{ noteSentiment[note.id].comparative.toFixed(4) }}</span>
                </div>
                <div v-if="noteSentiment[note.id].positive?.length > 0">
                  <span class="text-secondary">正面词汇：</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-for="(word, index) in noteSentiment[note.id].positive" :key="index" class="badge badge-success text-xs">
                      {{ word }}
                    </span>
                  </div>
                </div>
                <div v-if="noteSentiment[note.id].negative?.length > 0">
                  <span class="text-secondary">负面词汇：</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-for="(word, index) in noteSentiment[note.id].negative" :key="index" class="badge badge-danger text-xs">
                      {{ word }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ showAddModal ? '新增笔记' : '编辑笔记' }}</h3>
          <button class="modal-close" @click="closeModals">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="form-group">
              <label class="form-label">选择阅读会话 *</label>
              <select v-model="formData.session_id" class="form-input form-select" required>
                <option value="">请选择阅读会话</option>
                <option v-for="session in readingStore.sessions" :key="session.id" :value="session.id">
                  {{ formatSessionLabel(session) }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">页码</label>
              <input 
                v-model.number="formData.page_number" 
                type="number" 
                class="form-input" 
                placeholder="请输入页码"
                min="1"
              />
            </div>

            <div class="form-group">
              <label class="form-label">笔记内容 *</label>
              <textarea 
                v-model="formData.content" 
                class="form-input form-textarea" 
                placeholder="请输入笔记内容"
                required
              ></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeModals">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="!formData.session_id || !formData.content">
            {{ showAddModal ? '添加' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useReadingStore } from '../stores/readingStore'
import { nlpApi } from '../api'

const readingStore = useReadingStore()

const filterSessionId = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingNote = ref(null)
const analyzingNote = ref(null)

const noteKeywords = reactive({})
const noteSentiment = reactive({})

const notes = computed(() => readingStore.notes)
const loading = computed(() => readingStore.loading)

const formData = reactive({
  session_id: null,
  page_number: null,
  content: ''
})

async function fetchNotes() {
  await readingStore.fetchNotes(filterSessionId.value || null)
}

function getSessionById(sessionId) {
  return readingStore.sessions.find(s => s.id === sessionId)
}

function formatSessionLabel(session) {
  if (!session) return '未知会话'
  const date = formatDateTime(session.start_time)
  return `会话 #${session.id} - ${date}`
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

function getSentimentClass(score) {
  if (score > 0.1) return 'text-success'
  if (score < -0.1) return 'text-danger'
  return 'text-secondary'
}

function formatSentiment(score) {
  if (score > 0.1) return '积极'
  if (score < -0.1) return '消极'
  return '中性'
}

async function analyzeKeywords(text, noteId) {
  if (noteKeywords[noteId]) {
    delete noteKeywords[noteId]
    return
  }
  
  analyzingNote.value = noteId
  try {
    const response = await nlpApi.extractKeywords(text, 10)
    noteKeywords[noteId] = response.data.keywords
  } catch (error) {
    console.error('分析关键词失败:', error)
    alert('分析关键词失败，请重试')
  } finally {
    analyzingNote.value = null
  }
}

async function analyzeSentiment(text, noteId) {
  if (noteSentiment[noteId]) {
    delete noteSentiment[noteId]
    return
  }
  
  analyzingNote.value = noteId
  try {
    const response = await nlpApi.analyzeSentiment(text)
    noteSentiment[noteId] = response.data
  } catch (error) {
    console.error('分析情感失败:', error)
    alert('分析情感失败，请重试')
  } finally {
    analyzingNote.value = null
  }
}

function openAddModal() {
  resetForm()
  showAddModal.value = true
}

function editNote(note) {
  editingNote.value = note
  Object.assign(formData, {
    session_id: note.session_id,
    page_number: note.page_number,
    content: note.content
  })
  showEditModal.value = true
}

function closeModals() {
  showAddModal.value = false
  showEditModal.value = false
  editingNote.value = null
  resetForm()
}

function resetForm() {
  Object.assign(formData, {
    session_id: null,
    page_number: null,
    content: ''
  })
}

async function handleSubmit() {
  if (!formData.session_id || !formData.content) return

  try {
    if (showAddModal.value) {
      await readingStore.addNote(formData)
    } else if (showEditModal.value && editingNote.value) {
      await readingStore.updateNote(editingNote.value.id, formData)
    }
    await fetchNotes()
    closeModals()
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败，请重试')
  }
}

async function deleteNote(note) {
  if (confirm(`确定要删除此笔记吗？此操作不可撤销。`)) {
    try {
      await readingStore.deleteNote(note.id)
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败，请重试')
    }
  }
}

onMounted(() => {
  readingStore.fetchSessions()
  fetchNotes()
})
</script>

<style scoped>
.note-content {
  background-color: var(--background-color);
  padding: 1rem;
  border-radius: var(--radius-md);
  white-space: pre-wrap;
  line-height: 1.8;
}

.text-success {
  color: var(--success-color);
}

.text-danger {
  color: var(--danger-color);
}
</style>
