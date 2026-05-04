<template>
  <div class="book-list">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">书籍管理</h2>
      <button class="btn btn-primary" @click="showAddModal = true">
        + 添加书籍
      </button>
    </div>

    <div v-if="readingStore.loading" class="text-center p-4">
      <div class="spinner" style="margin: 0 auto;"></div>
      <p class="text-secondary mt-2">加载中...</p>
    </div>

    <div v-else-if="readingStore.books.length === 0" class="empty-state card">
      <div class="empty-state-icon">📚</div>
      <div class="empty-state-title">暂无书籍</div>
      <div class="empty-state-description">点击上方按钮添加您的第一本书</div>
    </div>

    <div v-else class="grid grid-2">
      <div v-for="book in readingStore.books" :key="book.id" class="card">
        <div class="card-body">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-semibold mb-1">{{ book.title }}</h3>
              <p class="text-secondary text-sm" v-if="book.author">作者：{{ book.author }}</p>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-outline" @click="editBook(book)">编辑</button>
              <button class="btn btn-sm btn-danger" @click="deleteBook(book)">删除</button>
            </div>
          </div>

          <div class="grid grid-2 gap-2 text-sm">
            <div v-if="book.publisher">
              <span class="text-secondary">出版社：</span>
              <span>{{ book.publisher }}</span>
            </div>
            <div v-if="book.publication_date">
              <span class="text-secondary">出版日期：</span>
              <span>{{ book.publication_date }}</span>
            </div>
            <div v-if="book.total_pages">
              <span class="text-secondary">总页数：</span>
              <span>{{ book.total_pages }} 页</span>
            </div>
            <div v-if="book.genre">
              <span class="text-secondary">类型：</span>
              <span class="badge badge-primary">{{ book.genre }}</span>
            </div>
          </div>

          <div v-if="book.description" class="mt-4 pt-4 border-t border-gray-200">
            <p class="text-secondary text-sm">{{ book.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ showAddModal ? '添加书籍' : '编辑书籍' }}</h3>
          <button class="modal-close" @click="closeModals">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div class="form-group">
              <label class="form-label">书名 *</label>
              <input 
                v-model="formData.title" 
                type="text" 
                class="form-input" 
                placeholder="请输入书名"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">作者</label>
              <input 
                v-model="formData.author" 
                type="text" 
                class="form-input" 
                placeholder="请输入作者"
              />
            </div>

            <div class="grid grid-2 gap-4">
              <div class="form-group">
                <label class="form-label">出版社</label>
                <input 
                  v-model="formData.publisher" 
                  type="text" 
                  class="form-input" 
                  placeholder="请输入出版社"
                />
              </div>

              <div class="form-group">
                <label class="form-label">出版日期</label>
                <input 
                  v-model="formData.publication_date" 
                  type="date" 
                  class="form-input"
                />
              </div>
            </div>

            <div class="grid grid-2 gap-4">
              <div class="form-group">
                <label class="form-label">总页数</label>
                <input 
                  v-model.number="formData.total_pages" 
                  type="number" 
                  class="form-input" 
                  placeholder="请输入总页数"
                  min="1"
                />
              </div>

              <div class="form-group">
                <label class="form-label">类型</label>
                <input 
                  v-model="formData.genre" 
                  type="text" 
                  class="form-input" 
                  placeholder="请输入书籍类型"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">ISBN</label>
              <input 
                v-model="formData.isbn" 
                type="text" 
                class="form-input" 
                placeholder="请输入ISBN"
              />
            </div>

            <div class="form-group">
              <label class="form-label">简介</label>
              <textarea 
                v-model="formData.description" 
                class="form-input form-textarea" 
                placeholder="请输入书籍简介"
              ></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeModals">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="!formData.title">
            {{ showAddModal ? '添加' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useReadingStore } from '../stores/readingStore'

const readingStore = useReadingStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingBook = ref(null)

const formData = reactive({
  title: '',
  author: '',
  publisher: '',
  publication_date: '',
  total_pages: null,
  genre: '',
  isbn: '',
  description: ''
})

function openAddModal() {
  resetForm()
  showAddModal.value = true
}

function editBook(book) {
  editingBook.value = book
  Object.assign(formData, {
    title: book.title || '',
    author: book.author || '',
    publisher: book.publisher || '',
    publication_date: book.publication_date || '',
    total_pages: book.total_pages || null,
    genre: book.genre || '',
    isbn: book.isbn || '',
    description: book.description || ''
  })
  showEditModal.value = true
}

function closeModals() {
  showAddModal.value = false
  showEditModal.value = false
  editingBook.value = null
  resetForm()
}

function resetForm() {
  Object.assign(formData, {
    title: '',
    author: '',
    publisher: '',
    publication_date: '',
    total_pages: null,
    genre: '',
    isbn: '',
    description: ''
  })
}

async function handleSubmit() {
  if (!formData.title) return

  try {
    if (showAddModal.value) {
      await readingStore.addBook(formData)
    } else if (showEditModal.value && editingBook.value) {
      await readingStore.updateBook(editingBook.value.id, formData)
    }
    closeModals()
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败，请重试')
  }
}

async function deleteBook(book) {
  if (confirm(`确定要删除书籍「${book.title}」吗？此操作不可撤销。`)) {
    try {
      await readingStore.deleteBook(book.id)
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败，请重试')
    }
  }
}
</script>
