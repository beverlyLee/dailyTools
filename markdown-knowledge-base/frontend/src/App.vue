<template>
  <div class="app">
    <!-- 顶部菜单栏 -->
    <header class="app-header">
      <div class="header-left">
        <span class="app-title">📝 Markdown KB</span>
      </div>
      <div class="header-center">
        <div class="search-bar">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索笔记 (Ctrl+K)"
            @input="handleSearch"
            @focus="showSearchResults = true"
          />
          <div v-if="showSearchResults && searchResults.length > 0" class="search-dropdown">
            <div
              v-for="result in searchResults.slice(0, 8)"
              :key="result.path"
              class="search-result-item"
              @click="openSearchResult(result.path)"
            >
              <span class="result-icon">📄</span>
              <div class="result-content">
                <div class="result-title">{{ result.title }}</div>
                <div class="result-path">{{ result.path }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="header-right">
        <button
          class="header-btn"
          @click="showGraphView = !showGraphView"
          :class="{ active: showGraphView }"
          title="知识图谱"
        >
          <span class="icon">🕸️</span>
        </button>
        <button
          v-if="currentPath && hasUnsavedChanges"
          class="header-btn save-btn"
          @click="saveCurrentNote"
          title="保存 (Ctrl+S)"
        >
          <span class="icon">💾</span>
          <span class="text">保存</span>
        </button>
      </div>
    </header>
    
    <!-- 主内容区 -->
    <main class="app-main">
      <!-- 左侧边栏：文件树 -->
      <aside class="sidebar left-sidebar" v-if="!showGraphView">
        <FileTree :items="fileTree" />
      </aside>
      
      <!-- 中间区域：编辑器和预览 -->
      <div class="main-content" v-if="!showGraphView">
        <div v-if="!currentPath" class="welcome-view">
          <div class="welcome-content">
            <h1>📝 Markdown Knowledge Base</h1>
            <p>一个支持双向链接和知识图谱的本地 Markdown 笔记应用</p>
            <div class="welcome-actions">
              <button class="welcome-btn primary" @click="showNewFileDialog = true">
                ✨ 创建新笔记
              </button>
              <button class="welcome-btn" @click="loadFileTree">
                🔄 刷新文件列表
              </button>
            </div>
            <div class="welcome-features">
              <div class="feature">
                <span class="feature-icon">🔗</span>
                <span class="feature-title">Wiki Links</span>
                <span class="feature-desc">使用 [[笔记名称]] 创建双向链接</span>
              </div>
              <div class="feature">
                <span class="feature-icon">🕸️</span>
                <span class="feature-title">知识图谱</span>
                <span class="feature-desc">可视化笔记之间的关联关系</span>
              </div>
              <div class="feature">
                <span class="feature-icon">🔍</span>
                <span class="feature-title">全文搜索</span>
                <span class="feature-desc">快速搜索所有笔记内容</span>
              </div>
            </div>
          </div>
        </div>
        
        <template v-else>
          <!-- 编辑器区域 -->
          <div class="editor-panel">
            <div class="panel-header">
              <span class="panel-title">编辑器</span>
              <span class="file-name">{{ currentPath }}</span>
            </div>
            <div class="panel-content">
              <CodeEditor
                v-model="editorContent"
                @save="saveCurrentNote"
              />
            </div>
          </div>
          
          <!-- 预览区域 -->
          <div class="preview-panel">
            <MarkdownPreview
              :content="editorContent"
              :current-path="currentPath"
              @navigate="navigateToNote"
            />
          </div>
        </template>
      </div>
      
      <!-- 右侧边栏：链接面板 -->
      <aside class="sidebar right-sidebar" v-if="!showGraphView && currentPath">
        <LinkPanel
          :current-path="currentPath"
          @navigate="navigateToNote"
        />
      </aside>
      
      <!-- 知识图谱视图 -->
      <div v-else class="graph-view">
        <KnowledgeGraph
          :center-path="currentPath"
          @navigate="navigateToNote"
        />
      </div>
    </main>
    
    <!-- 新建文件对话框 -->
    <div v-if="showNewFileDialog" class="dialog-overlay" @click.self="showNewFileDialog = false">
      <div class="dialog">
        <h3>创建新笔记</h3>
        <input
          v-model="newFileName"
          type="text"
          placeholder="输入文件名 (如: my-note.md)"
          @keyup.enter="createNewNote"
          autofocus
        />
        <div class="dialog-actions">
          <button class="btn-cancel" @click="showNewFileDialog = false">取消</button>
          <button class="btn-confirm" @click="createNewNote">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useNotesStore } from '@/stores/notes'
import { storeToRefs } from 'pinia'
import { debounce } from 'lodash-es'

import FileTree from '@/components/FileTree.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
import LinkPanel from '@/components/LinkPanel.vue'
import KnowledgeGraph from '@/components/KnowledgeGraph.vue'

const notesStore = useNotesStore()
const {
  fileTree,
  currentPath,
  currentContent,
  hasUnsavedChanges,
  searchResults,
  searchQuery: storeSearchQuery
} = storeToRefs(notesStore)

const {
  loadFileTree,
  openNote,
  saveNote,
  createNote,
  searchNotes
} = notesStore

// 状态
const showGraphView = ref(false)
const showNewFileDialog = ref(false)
const newFileName = ref('')
const showSearchResults = ref(false)
const searchQuery = ref('')

// 编辑器内容（双向绑定）
const editorContent = computed({
  get: () => currentContent.value,
  set: (val) => {
    notesStore.currentContent = val
  }
})

// 防抖搜索
const debouncedSearch = debounce((query: string) => {
  searchNotes(query)
}, 300)

// 处理搜索
function handleSearch() {
  if (searchQuery.value.trim()) {
    debouncedSearch(searchQuery.value)
  } else {
    searchResults.value = []
  }
}

// 打开搜索结果
function openSearchResult(path: string) {
  openNote(path)
  showSearchResults.value = false
  searchQuery.value = ''
}

// 导航到笔记
function navigateToNote(path: string) {
  openNote(path)
}

// 保存当前笔记
async function saveCurrentNote() {
  const success = await saveNote()
  if (success) {
    // 可以显示保存成功提示
  }
}

// 创建新笔记
async function createNewNote() {
  if (!newFileName.value.trim()) return
  
  let path = newFileName.value.trim()
  if (!path.endsWith('.md')) {
    path += '.md'
  }
  
  const success = await createNote(path)
  if (success) {
    showNewFileDialog.value = false
    newFileName.value = ''
  }
}

// 键盘快捷键
function setupKeyboardShortcuts() {
  const handleKeydown = (event: KeyboardEvent) => {
    // Ctrl/Cmd + K: 聚焦搜索
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault()
      const searchInput = document.querySelector('.search-bar input') as HTMLInputElement
      searchInput?.focus()
    }
    
    // Ctrl/Cmd + N: 新建笔记
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault()
      showNewFileDialog.value = true
    }
    
    // Escape: 关闭对话框
    if (event.key === 'Escape') {
      showNewFileDialog.value = false
      showSearchResults.value = false
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}

// 生命周期
onMounted(async () => {
  await loadFileTree()
  setupKeyboardShortcuts()
})

// 同步搜索查询
watch(searchQuery, (val) => {
  storeSearchQuery.value = val
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  overflow: hidden;
}

/* 顶部菜单栏 */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background-color: #252526;
  border-bottom: 1px solid #2d2d2d;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 16px;
  font-weight: 600;
  color: #dcdcaa;
}

.header-center {
  flex: 1;
  max-width: 600px;
  margin: 0 24px;
}

.search-bar {
  position: relative;
}

.search-bar input {
  width: 100%;
  padding: 8px 12px;
  background-color: #3c3c3c;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 14px;
  box-sizing: border-box;
}

.search-bar input:focus {
  outline: none;
  border-color: #007fd4;
}

.search-bar input::placeholder {
  color: #858585;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background-color: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.search-result-item:hover {
  background-color: #2a2d2e;
}

.result-icon {
  margin-right: 10px;
  font-size: 16px;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 500;
  color: #d4d4d4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-path {
  font-size: 12px;
  color: #858585;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.header-btn:hover {
  background-color: #2a2d2e;
  border-color: #3c3c3c;
}

.header-btn.active {
  background-color: #0e639c;
  border-color: #0e639c;
}

.save-btn {
  background-color: #0e639c;
  border-color: #0e639c;
}

.save-btn:hover {
  background-color: #1177bb;
  border-color: #1177bb;
}

/* 主内容区 */
.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 250px;
  min-width: 200px;
  max-width: 400px;
  background-color: #1e1e1e;
  border-right: 1px solid #2d2d2d;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.right-sidebar {
  border-right: none;
  border-left: 1px solid #2d2d2d;
}

/* 主内容 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-panel, .preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 300px;
}

.editor-panel {
  border-right: 1px solid #2d2d2d;
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: #252526;
  border-bottom: 1px solid #2d2d2d;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #858585;
}

.panel-title {
  margin-right: 16px;
}

.file-name {
  flex: 1;
  color: #d4d4d4;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

/* 欢迎视图 */
.welcome-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.welcome-content {
  max-width: 600px;
  text-align: center;
}

.welcome-content h1 {
  font-size: 32px;
  color: #dcdcaa;
  margin-bottom: 16px;
}

.welcome-content p {
  font-size: 16px;
  color: #858585;
  margin-bottom: 32px;
}

.welcome-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 48px;
}

.welcome-btn {
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid #3c3c3c;
  background-color: #252526;
  color: #d4d4d4;
}

.welcome-btn:hover {
  background-color: #2a2d2e;
}

.welcome-btn.primary {
  background-color: #0e639c;
  border-color: #0e639c;
  color: white;
}

.welcome-btn.primary:hover {
  background-color: #1177bb;
}

.welcome-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #252526;
  border-radius: 8px;
  border: 1px solid #2d2d2d;
}

.feature-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.feature-title {
  font-weight: 600;
  color: #dcdcaa;
  margin-bottom: 6px;
}

.feature-desc {
  font-size: 13px;
  color: #858585;
  text-align: center;
}

/* 知识图谱视图 */
.graph-view {
  flex: 1;
  overflow: hidden;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  padding: 24px;
  min-width: 400px;
  max-width: 90vw;
}

.dialog h3 {
  margin: 0 0 16px 0;
  color: #d4d4d4;
  font-size: 16px;
  font-weight: 600;
}

.dialog input {
  width: 100%;
  padding: 10px 14px;
  background-color: #3c3c3c;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 14px;
  box-sizing: border-box;
}

.dialog input:focus {
  outline: none;
  border-color: #007fd4;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.btn-cancel, .btn-confirm {
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  background-color: #3c3c3c;
  border: 1px solid #3c3c3c;
  color: #d4d4d4;
}

.btn-cancel:hover {
  background-color: #4a4a4a;
}

.btn-confirm {
  background-color: #0e639c;
  border: none;
  color: white;
}

.btn-confirm:hover {
  background-color: #1177bb;
}

/* 滚动条样式 */
:deep(.search-dropdown::-webkit-scrollbar) {
  width: 8px;
}

:deep(.search-dropdown::-webkit-scrollbar-track) {
  background: #252526;
}

:deep(.search-dropdown::-webkit-scrollbar-thumb) {
  background: #424242;
  border-radius: 4px;
}

:deep(.search-dropdown::-webkit-scrollbar-thumb:hover) {
  background: #4f4f4f;
}
</style>
