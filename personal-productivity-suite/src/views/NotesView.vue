<template>
  <div class="notes-view">
    <div class="notes-layout">
      <aside class="sidebar left-sidebar">
        <div class="sidebar-header">
          <h3>📁 文件</h3>
          <div class="sidebar-actions">
            <button class="action-icon" @click="showNewNoteDialog = true" title="新建笔记">
              📝
            </button>
            <button class="action-icon" @click="showNewFolderDialog = true" title="新建文件夹">
              📁
            </button>
            <button class="action-icon" @click="refreshFileTree" title="刷新">
              🔄
            </button>
          </div>
        </div>
        <div class="file-tree-container">
          <FileTreeComponent 
            :items="fileTree" 
            @select="handleFileSelect"
            @delete="handleFileDelete"
            @rename="handleFileRename"
          />
        </div>
      </aside>
      
      <main class="main-content-area" v-if="currentPath">
        <div class="editor-panel">
          <div class="panel-header">
            <span class="panel-title">编辑器</span>
            <span class="file-name">{{ currentFileName }}</span>
            <div class="panel-actions">
              <button 
                class="save-btn" 
                @click="saveCurrentNote" 
                :disabled="!hasUnsavedChanges"
                :class="{ 'has-changes': hasUnsavedChanges }"
              >
                💾 保存
              </button>
            </div>
          </div>
          <div class="panel-content">
            <textarea
              v-model="editorContent"
              class="code-editor"
              placeholder="在此输入 Markdown 内容...&#10;&#10;提示：使用 [[笔记名称]] 创建双向链接"
              @input="handleContentChange"
            ></textarea>
          </div>
        </div>
        
        <div class="preview-panel">
          <div class="panel-header">
            <span class="panel-title">预览</span>
          </div>
          <div class="panel-content">
            <div class="markdown-preview" v-html="renderedContent"></div>
          </div>
        </div>
      </main>
      
      <aside class="sidebar right-sidebar" v-if="currentPath">
        <div class="sidebar-header">
          <h3>🔗 链接</h3>
        </div>
        <div class="links-container">
          <div class="links-section">
            <h4 class="links-title">出链 (当前笔记链接到)</h4>
            <div class="links-list" v-if="outgoingLinks.length > 0">
              <div 
                v-for="(link, index) in outgoingLinks" 
                :key="index"
                class="link-item"
                @click="navigateToNote(link[1].file_path)"
              >
                <span class="link-icon">→</span>
                <span class="link-text">{{ link[1].title }}</span>
              </div>
            </div>
            <div class="empty-links" v-else>
              暂无出链
            </div>
          </div>
          
          <div class="links-section">
            <h4 class="links-title">入链 (链接到当前笔记)</h4>
            <div class="links-list" v-if="incomingLinks.length > 0">
              <div 
                v-for="(link, index) in incomingLinks" 
                :key="index"
                class="link-item"
                @click="navigateToNote(link[1].file_path)"
              >
                <span class="link-icon">←</span>
                <span class="link-text">{{ link[1].title }}</span>
              </div>
            </div>
            <div class="empty-links" v-else>
              暂无入链
            </div>
          </div>
        </div>
      </aside>
      
      <div class="welcome-view" v-else>
        <div class="welcome-content">
          <h1>📝 Markdown 知识库</h1>
          <p>一个支持双向链接和知识图谱的本地 Markdown 笔记应用</p>
          <div class="welcome-actions">
            <button class="welcome-btn primary" @click="showNewNoteDialog = true">
              ✨ 创建新笔记
            </button>
            <button class="welcome-btn" @click="showGraphView = true">
              🕸️ 查看知识图谱
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
    </div>
    
    <div class="search-bar-top">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="🔍 搜索笔记..."
        @input="handleSearch"
        class="search-input"
      />
      <div v-if="showSearchResults && searchResults.length > 0" class="search-dropdown">
        <div
          v-for="result in searchResults.slice(0, 8)"
          :key="result.note_id"
          class="search-result-item"
          @click="openSearchResult(result.file_path)"
        >
          <span class="result-icon">📄</span>
          <div class="result-content">
            <div class="result-title">{{ result.title }}</div>
            <div class="result-snippet" v-html="result.snippet"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="graph-toggle" @click="showGraphView = true">
      🕸️ 知识图谱
    </div>
    
    <div v-if="showGraphView" class="graph-modal-overlay" @click.self="showGraphView = false">
      <div class="graph-modal">
        <div class="graph-modal-header">
          <h3>知识图谱</h3>
          <button class="close-btn" @click="showGraphView = false">✕</button>
        </div>
        <div class="graph-modal-content">
          <div class="graph-placeholder">
            <p>知识图谱视图</p>
            <p class="graph-hint">显示所有笔记及其关联关系</p>
            <div class="graph-nodes" v-if="graphNotes.length > 0">
              <div 
                v-for="note in graphNotes" 
                :key="note.id"
                class="graph-node"
                @click="navigateFromGraph(note.file_path)"
              >
                {{ note.title }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showNewNoteDialog" class="dialog-overlay" @click.self="showNewNoteDialog = false">
      <div class="dialog">
        <h3>创建新笔记</h3>
        <input
          v-model="newFileName"
          type="text"
          placeholder="输入文件名 (如: my-note.md)"
          @keyup.enter="createNewNote"
          class="dialog-input"
        />
        <div class="dialog-actions">
          <button class="btn-cancel" @click="showNewNoteDialog = false">取消</button>
          <button class="btn-confirm" @click="createNewNote">创建</button>
        </div>
      </div>
    </div>
    
    <div v-if="showNewFolderDialog" class="dialog-overlay" @click.self="showNewFolderDialog = false">
      <div class="dialog">
        <h3>创建新文件夹</h3>
        <input
          v-model="newFolderName"
          type="text"
          placeholder="输入文件夹名称"
          @keyup.enter="createNewFolder"
          class="dialog-input"
        />
        <div class="dialog-actions">
          <button class="btn-cancel" @click="showNewFolderDialog = false">取消</button>
          <button class="btn-confirm" @click="createNewFolder">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { marked } from 'marked'
import { useNotesStore } from '@/stores/notes'
import { storeToRefs } from 'pinia'
import { api, NoteMetadata, WikiLink, FileNode } from '@/api'
import FileTreeComponent from '@/components/knowledge/FileTree.vue'

const notesStore = useNotesStore()
const {
  fileTree,
  currentPath,
  currentContent,
  hasUnsavedChanges,
  searchResults,
  currentFileName,
  notesDirectory,
  currentNoteMetadata
} = storeToRefs(notesStore)

const {
  loadFileTree,
  openNote,
  saveNote,
  updateContent,
  createNote,
  createFolder,
  deleteItem,
  renameItem,
  searchNotes,
  loadAllNotesMetadata
} = notesStore

const searchQuery = ref('')
const showSearchResults = ref(false)
const showNewNoteDialog = ref(false)
const showNewFolderDialog = ref(false)
const showGraphView = ref(false)
const newFileName = ref('')
const newFolderName = ref('')
const outgoingLinks = ref<[WikiLink, NoteMetadata][]>([])
const incomingLinks = ref<[WikiLink, NoteMetadata][]>([])
const graphNotes = ref<NoteMetadata[]>([])
const graphLinks = ref<WikiLink[]>([])

const editorContent = computed({
  get: () => currentContent.value,
  set: (val) => {
    updateContent(val)
  }
})

const renderedContent = computed(() => {
  try {
    return marked.parse(editorContent.value) as string
  } catch {
    return editorContent.value
  }
})

function handleFileSelect(path: string, isDir: boolean) {
  if (!isDir) {
    openNote(path)
    loadLinks()
  }
}

function handleContentChange() {
}

async function saveCurrentNote() {
  const success = await saveNote()
  if (success) {
    loadLinks()
  }
}

async function loadLinks() {
  try {
    if (!currentNoteMetadata.value) {
      outgoingLinks.value = []
      incomingLinks.value = []
      return
    }
    
    outgoingLinks.value = await api.getOutgoingLinks(currentNoteMetadata.value.id)
    incomingLinks.value = await api.getIncomingLinks(currentNoteMetadata.value.id)
  } catch (e) {
    console.error('Failed to load links:', e)
  }
}

async function navigateToNote(path: string) {
  await openNote(path)
  loadLinks()
}

function handleSearch() {
  if (searchQuery.value.trim()) {
    searchNotes(searchQuery.value)
    showSearchResults.value = true
  } else {
    searchResults.value = []
    showSearchResults.value = false
  }
}

function openSearchResult(path: string) {
  openNote(path)
  showSearchResults.value = false
  searchQuery.value = ''
}

async function refreshFileTree() {
  await loadFileTree()
}

async function createNewNote() {
  if (!newFileName.value.trim()) return
  const success = await createNote(newFileName.value.trim())
  if (success) {
    showNewNoteDialog.value = false
    newFileName.value = ''
  }
}

async function createNewFolder() {
  if (!newFolderName.value.trim()) return
  const success = await createFolder(newFolderName.value.trim())
  if (success) {
    showNewFolderDialog.value = false
    newFolderName.value = ''
  }
}

async function handleFileDelete(path: string) {
  if (confirm(`确定要删除 "${path}" 吗？`)) {
    await deleteItem(path)
  }
}

async function handleFileRename(oldPath: string, newPath: string) {
  await renameItem(oldPath, newPath)
}

async function loadKnowledgeGraph() {
  try {
    const [notes, links] = await api.getKnowledgeGraph()
    graphNotes.value = notes
    graphLinks.value = links
  } catch (e) {
    console.error('Failed to load knowledge graph:', e)
  }
}

function navigateFromGraph(path: string) {
  showGraphView.value = false
  navigateToNote(path)
}

watch(showGraphView, (show) => {
  if (show) {
    loadKnowledgeGraph()
  }
})

onMounted(async () => {
  await loadFileTree()
})
</script>

<style scoped>
.notes-view {
  width: 100%;
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  position: relative;
}

.search-bar-top {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 100;
}

.search-input {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.9);
  width: 250px;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.search-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  min-width: 300px;
  z-index: 1000;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #f5f5f5;
}

.result-icon {
  margin-right: 12px;
  font-size: 18px;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-snippet {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px;
}

.graph-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s;
  z-index: 100;
}

.graph-toggle:hover {
  transform: translateY(-2px);
}

.notes-layout {
  flex: 1;
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.sidebar {
  width: 250px;
  min-width: 200px;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.sidebar:last-child {
  border-right: none;
  border-left: 1px solid #e9ecef;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  color: #495057;
}

.sidebar-actions {
  display: flex;
  gap: 8px;
}

.action-icon {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.action-icon:hover {
  background: #e9ecef;
}

.file-tree-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.main-content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-panel,
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 300px;
}

.editor-panel {
  border-right: 1px solid #e9ecef;
}

.panel-header {
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-title {
  font-size: 12px;
  text-transform: uppercase;
  color: #6c757d;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #495057;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-actions {
  display: flex;
}

.save-btn {
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #f8f9fa;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn.has-changes {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

.code-editor {
  width: 100%;
  height: 100%;
  padding: 16px;
  border: none;
  resize: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background: #fff;
  outline: none;
}

.markdown-preview {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  line-height: 1.8;
  color: #333;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
  color: #2c3e50;
}

.markdown-preview :deep(h1) { font-size: 2em; }
.markdown-preview :deep(h2) { font-size: 1.5em; }
.markdown-preview :deep(h3) { font-size: 1.25em; }

.markdown-preview :deep(p) {
  margin-bottom: 16px;
}

.markdown-preview :deep(code) {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-preview :deep(pre) {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  margin-bottom: 16px;
  padding-left: 24px;
}

.markdown-preview :deep(li) {
  margin-bottom: 4px;
}

.markdown-preview :deep(blockquote) {
  border-left: 4px solid #667eea;
  padding-left: 16px;
  margin: 16px 0;
  color: #6c757d;
}

.links-container {
  padding: 8px;
}

.links-section {
  margin-bottom: 20px;
}

.links-title {
  font-size: 12px;
  text-transform: uppercase;
  color: #6c757d;
  font-weight: 600;
  margin-bottom: 8px;
  padding: 0 8px;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.link-item:hover {
  background: #e9ecef;
}

.link-icon {
  font-size: 12px;
  color: #667eea;
  font-weight: bold;
}

.link-text {
  font-size: 13px;
  color: #495057;
}

.empty-links {
  padding: 12px;
  font-size: 12px;
  color: #adb5bd;
  text-align: center;
}

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
  color: #2c3e50;
  margin-bottom: 16px;
}

.welcome-content > p {
  font-size: 16px;
  color: #6c757d;
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
  border-radius: 8px;
  border: 1px solid #dee2e6;
  background: #fff;
  color: #495057;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.welcome-btn:hover {
  background: #f8f9fa;
}

.welcome-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.welcome-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
  background: #f8f9fa;
  border-radius: 12px;
}

.feature-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.feature-title {
  font-weight: 600;
  color: #495057;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 13px;
  color: #6c757d;
  text-align: center;
}

.graph-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.graph-modal {
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.graph-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.graph-modal-header h3 {
  margin: 0;
  color: #495057;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6c757d;
  padding: 4px;
}

.close-btn:hover {
  color: #495057;
}

.graph-modal-content {
  flex: 1;
  overflow: auto;
}

.graph-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
}

.graph-placeholder p {
  margin-bottom: 8px;
}

.graph-hint {
  font-size: 14px;
  opacity: 0.7;
}

.graph-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  max-width: 600px;
}

.graph-node {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.2s;
}

.graph-node:hover {
  transform: scale(1.05);
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background: white;
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.dialog h3 {
  margin: 0 0 16px 0;
  color: #495057;
}

.dialog-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  outline: none;
}

.dialog-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: #f8f9fa;
  color: #6c757d;
}

.btn-cancel:hover {
  background: #e9ecef;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
