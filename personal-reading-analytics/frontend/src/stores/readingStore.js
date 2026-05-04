import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { booksApi, sessionsApi, notesApi, analyticsApi, nlpApi } from '../api'

export const useReadingStore = defineStore('reading', () => {
  const books = ref([])
  const sessions = ref([])
  const notes = ref([])
  const statistics = ref(null)
  const readingSpeed = ref(null)
  const heatmap = ref(null)
  const themes = ref([])
  const patterns = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const totalBooks = computed(() => books.value.length)
  const totalSessions = computed(() => sessions.value.length)
  const totalNotes = computed(() => notes.value.length)

  async function fetchBooks() {
    try {
      loading.value = true
      const response = await booksApi.getAll()
      books.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('获取书籍失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchSessions(bookId = null) {
    try {
      loading.value = true
      const response = await sessionsApi.getAll(bookId)
      sessions.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('获取阅读会话失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchNotes(sessionId = null) {
    try {
      loading.value = true
      const response = await notesApi.getAll(sessionId)
      notes.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('获取阅读笔记失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchStatistics() {
    try {
      loading.value = true
      const response = await analyticsApi.getStatistics()
      statistics.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('获取统计数据失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchReadingSpeed() {
    try {
      loading.value = true
      const response = await analyticsApi.getReadingSpeed()
      readingSpeed.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('获取阅读速度失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchHeatmap() {
    try {
      loading.value = true
      const response = await analyticsApi.getHeatmap()
      heatmap.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('获取热力图失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchThemes() {
    try {
      loading.value = true
      const response = await nlpApi.getThemes()
      themes.value = response.data.themes
    } catch (err) {
      error.value = err.message
      console.error('获取主题失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchPatterns() {
    try {
      loading.value = true
      const response = await nlpApi.getPatterns()
      patterns.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('获取阅读模式失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function addBook(book) {
    try {
      const response = await booksApi.create(book)
      books.value.unshift(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('添加书籍失败:', err)
      throw err
    }
  }

  async function updateBook(id, book) {
    try {
      const response = await booksApi.update(id, book)
      const index = books.value.findIndex(b => b.id === id)
      if (index !== -1) {
        books.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('更新书籍失败:', err)
      throw err
    }
  }

  async function deleteBook(id) {
    try {
      await booksApi.delete(id)
      books.value = books.value.filter(b => b.id !== id)
    } catch (err) {
      error.value = err.message
      console.error('删除书籍失败:', err)
      throw err
    }
  }

  async function addSession(session) {
    try {
      const response = await sessionsApi.create(session)
      sessions.value.unshift(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('添加阅读会话失败:', err)
      throw err
    }
  }

  async function updateSession(id, session) {
    try {
      const response = await sessionsApi.update(id, session)
      const index = sessions.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sessions.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('更新阅读会话失败:', err)
      throw err
    }
  }

  async function deleteSession(id) {
    try {
      await sessionsApi.delete(id)
      sessions.value = sessions.value.filter(s => s.id !== id)
    } catch (err) {
      error.value = err.message
      console.error('删除阅读会话失败:', err)
      throw err
    }
  }

  async function addNote(note) {
    try {
      const response = await notesApi.create(note)
      notes.value.unshift(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('添加阅读笔记失败:', err)
      throw err
    }
  }

  async function updateNote(id, note) {
    try {
      const response = await notesApi.update(id, note)
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notes.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('更新阅读笔记失败:', err)
      throw err
    }
  }

  async function deleteNote(id) {
    try {
      await notesApi.delete(id)
      notes.value = notes.value.filter(n => n.id !== id)
    } catch (err) {
      error.value = err.message
      console.error('删除阅读笔记失败:', err)
      throw err
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    books,
    sessions,
    notes,
    statistics,
    readingSpeed,
    heatmap,
    themes,
    patterns,
    loading,
    error,
    totalBooks,
    totalSessions,
    totalNotes,
    fetchBooks,
    fetchSessions,
    fetchNotes,
    fetchStatistics,
    fetchReadingSpeed,
    fetchHeatmap,
    fetchThemes,
    fetchPatterns,
    addBook,
    updateBook,
    deleteBook,
    addSession,
    updateSession,
    deleteSession,
    addNote,
    updateNote,
    deleteNote,
    clearError
  }
})
