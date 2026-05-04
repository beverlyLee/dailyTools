import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FileItem, NoteContent, NoteLinks, SearchResult } from '@/types'
import { fileApi, linkApi, searchApi } from '@/services/api'

export const useNotesStore = defineStore('notes', () => {
  // 状态
  const fileTree = ref<FileItem[]>([])
  const currentPath = ref<string | null>(null)
  const currentContent = ref<string>('')
  const currentNoteInfo = ref<NoteContent | null>(null)
  const noteLinks = ref<NoteLinks | null>(null)
  const searchResults = ref<SearchResult[]>([])
  const searchQuery = ref('')
  const isLoading = ref(false)
  const expandedDirs = ref<Set<string>>(new Set())

  // 计算属性
  const hasUnsavedChanges = computed(() => {
    if (!currentNoteInfo.value) return false
    return currentContent.value !== currentNoteInfo.value.content
  })

  // 加载文件树
  async function loadFileTree(directory: string = '') {
    try {
      isLoading.value = true
      const response = await fileApi.listFiles(directory)
      if (response.success) {
        if (directory === '') {
          fileTree.value = response.data
        } else {
          // 更新特定目录的内容
          updateFileTree(directory, response.data)
        }
      }
    } catch (error) {
      console.error('Failed to load file tree:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 更新文件树中的目录内容
  function updateFileTree(directory: string, items: FileItem[]) {
    // 简单实现：重新加载根目录
    loadFileTree('')
  }

  // 打开笔记
  async function openNote(path: string) {
    try {
      // 如果有未保存的更改，这里可以提示用户
      
      isLoading.value = true
      const response = await fileApi.readFile(path)
      
      if (response.success) {
        currentPath.value = path
        currentContent.value = response.data.content
        currentNoteInfo.value = response.data
        
        // 加载链接信息
        await loadNoteLinks(path)
      }
    } catch (error) {
      console.error('Failed to open note:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 加载笔记链接
  async function loadNoteLinks(path: string) {
    try {
      const response = await linkApi.getBothLinks(path)
      if (response.success) {
        noteLinks.value = response.data
      }
    } catch (error) {
      console.error('Failed to load note links:', error)
    }
  }

  // 保存笔记
  async function saveNote() {
    if (!currentPath.value) return false
    
    try {
      isLoading.value = true
      const response = await fileApi.writeFile(currentPath.value, currentContent.value)
      
      if (response.success) {
        // 更新当前笔记信息
        if (currentNoteInfo.value) {
          currentNoteInfo.value.content = currentContent.value
        }
        
        // 重新加载链接信息
        await loadNoteLinks(currentPath.value)
        
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to save note:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 创建新笔记
  async function createNote(path: string, content: string = '') {
    try {
      isLoading.value = true
      const response = await fileApi.createFile(path, content)
      
      if (response.success) {
        // 重新加载文件树
        await loadFileTree('')
        // 打开新创建的笔记
        await openNote(path)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to create note:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 删除笔记
  async function deleteNote(path: string) {
    try {
      isLoading.value = true
      const response = await fileApi.deleteFile(path)
      
      if (response.success) {
        // 如果删除的是当前打开的笔记，清空当前状态
        if (currentPath.value === path) {
          currentPath.value = null
          currentContent.value = ''
          currentNoteInfo.value = null
          noteLinks.value = null
        }
        
        // 重新加载文件树
        await loadFileTree('')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to delete note:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 重命名笔记
  async function renameNote(oldPath: string, newPath: string) {
    try {
      isLoading.value = true
      const response = await fileApi.renameFile(oldPath, newPath)
      
      if (response.success) {
        // 如果重命名的是当前打开的笔记，更新路径
        if (currentPath.value === oldPath) {
          currentPath.value = newPath
          if (currentNoteInfo.value) {
            currentNoteInfo.value.path = newPath
          }
        }
        
        // 重新加载文件树
        await loadFileTree('')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to rename note:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 创建目录
  async function createDirectory(path: string) {
    try {
      isLoading.value = true
      const response = await fileApi.createDirectory(path)
      
      if (response.success) {
        await loadFileTree('')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to create directory:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 搜索笔记
  async function searchNotes(query: string) {
    if (!query.trim()) {
      searchResults.value = []
      searchQuery.value = ''
      return
    }
    
    try {
      isLoading.value = true
      searchQuery.value = query
      const response = await searchApi.search(query)
      
      if (response.success) {
        searchResults.value = response.data.results
      }
    } catch (error) {
      console.error('Failed to search notes:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 切换目录展开状态
  function toggleDir(path: string) {
    if (expandedDirs.value.has(path)) {
      expandedDirs.value.delete(path)
    } else {
      expandedDirs.value.add(path)
      // 可以在这里懒加载目录内容
    }
  }

  // 关闭当前笔记
  function closeNote() {
    currentPath.value = null
    currentContent.value = ''
    currentNoteInfo.value = null
    noteLinks.value = null
  }

  return {
    // 状态
    fileTree,
    currentPath,
    currentContent,
    currentNoteInfo,
    noteLinks,
    searchResults,
    searchQuery,
    isLoading,
    expandedDirs,
    // 计算属性
    hasUnsavedChanges,
    // 方法
    loadFileTree,
    openNote,
    loadNoteLinks,
    saveNote,
    createNote,
    deleteNote,
    renameNote,
    createDirectory,
    searchNotes,
    toggleDir,
    closeNote
  }
})
