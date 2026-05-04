<template>
  <div class="file-tree">
    <div class="file-tree-header">
      <span class="title">文件</span>
      <div class="actions">
        <button class="action-btn" @click="showNewFileDialog = true" title="新建文件">
          <span class="icon">+</span>
        </button>
        <button class="action-btn" @click="showNewDirDialog = true" title="新建文件夹">
          <span class="icon">📁</span>
        </button>
        <button class="action-btn" @click="refresh" title="刷新">
          <span class="icon">🔄</span>
        </button>
      </div>
    </div>
    
    <div class="file-tree-content">
      <div v-if="isLoading" class="loading">加载中...</div>
      <div v-else-if="items.length === 0" class="empty">
        <p>暂无文件</p>
        <button class="create-btn" @click="showNewFileDialog = true">
          创建第一个笔记
        </button>
      </div>
      <div v-else class="tree-container">
        <template v-for="item in items" :key="item.path">
          <div
            v-if="item.type === 'directory'"
            class="tree-item directory"
          >
            <div class="item-content">
              <span class="expand-icon">▶</span>
              <span class="item-icon">📁</span>
              <span class="item-name">{{ item.name }}</span>
            </div>
          </div>
          <div
            v-else
            class="tree-item file"
            :class="{ active: currentPath === item.path }"
            @click="selectFile(item.path)"
          >
            <div class="item-content">
              <span class="expand-icon"></span>
              <span class="item-icon">{{ getFileIcon(item.name) }}</span>
              <span class="item-name">{{ item.name }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <!-- 新建文件对话框 -->
    <div v-if="showNewFileDialog" class="dialog-overlay" @click.self="closeDialogs">
      <div class="dialog">
        <h3>新建文件</h3>
        <input
          v-model="newFileName"
          type="text"
          placeholder="输入文件名 (如: notes/my-note.md)"
          @keyup.enter="createNewFile"
          autofocus
        />
        <div class="dialog-actions">
          <button class="btn-cancel" @click="closeDialogs">取消</button>
          <button class="btn-confirm" @click="createNewFile">创建</button>
        </div>
      </div>
    </div>
    
    <!-- 新建文件夹对话框 -->
    <div v-if="showNewDirDialog" class="dialog-overlay" @click.self="closeDialogs">
      <div class="dialog">
        <h3>新建文件夹</h3>
        <input
          v-model="newDirName"
          type="text"
          placeholder="输入文件夹名"
          @keyup.enter="createNewDir"
          autofocus
        />
        <div class="dialog-actions">
          <button class="btn-cancel" @click="closeDialogs">取消</button>
          <button class="btn-confirm" @click="createNewDir">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileItem } from '@/types'
import { useNotesStore } from '@/stores/notes'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  items: FileItem[]
}>()

const notesStore = useNotesStore()
const { currentPath, isLoading } = storeToRefs(notesStore)
const { loadFileTree, openNote, createNote, createDirectory } = notesStore

// 对话框状态
const showNewFileDialog = ref(false)
const showNewDirDialog = ref(false)
const newFileName = ref('')
const newDirName = ref('')

// 选择文件
function selectFile(path: string) {
  openNote(path)
}

// 刷新
function refresh() {
  loadFileTree('')
}

// 关闭对话框
function closeDialogs() {
  showNewFileDialog.value = false
  showNewDirDialog.value = false
  newFileName.value = ''
  newDirName.value = ''
}

// 创建新文件
async function createNewFile() {
  if (!newFileName.value.trim()) return
  
  let path = newFileName.value.trim()
  if (!path.endsWith('.md')) {
    path += '.md'
  }
  
  const success = await createNote(path)
  if (success) {
    closeDialogs()
  }
}

// 创建新文件夹
async function createNewDir() {
  if (!newDirName.value.trim()) return
  
  const success = await createDirectory(newDirName.value.trim())
  if (success) {
    closeDialogs()
  }
}

// 获取文件图标
function getFileIcon(name: string): string {
  if (name.endsWith('.md')) return '📝'
  if (name.endsWith('.txt')) return '📄'
  if (name.endsWith('.json')) return '📋'
  return '📎'
}
</script>

<style scoped>
.file-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-size: 13px;
}

.file-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #2d2d2d;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.title {
  color: #858585;
}

.actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 14px;
  transition: all 0.15s;
}

.action-btn:hover {
  background-color: #2d2d2d;
  color: #d4d4d4;
}

.file-tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.loading, .empty {
  padding: 20px;
  text-align: center;
  color: #858585;
}

.create-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #0e639c;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background-color 0.15s;
}

.create-btn:hover {
  background-color: #1177bb;
}

.tree-item {
  user-select: none;
}

.item-content {
  display: flex;
  align-items: center;
  padding: 4px 8px 4px 12px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.1s;
}

.item-content:hover {
  background-color: #2a2d2e;
}

.tree-item.file.active .item-content {
  background-color: #094771;
}

.expand-icon {
  width: 16px;
  text-align: center;
  font-size: 10px;
  color: #858585;
}

.item-icon {
  margin-right: 6px;
  font-size: 14px;
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory-children {
  margin-left: 16px;
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
  padding: 20px;
  min-width: 300px;
  max-width: 90vw;
}

.dialog h3 {
  margin: 0 0 16px 0;
  color: #d4d4d4;
  font-size: 14px;
  font-weight: 600;
}

.dialog input {
  width: 100%;
  padding: 8px 12px;
  background-color: #3c3c3c;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  color: #d4d4d4;
  font-size: 13px;
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
  margin-top: 16px;
}

.btn-cancel, .btn-confirm {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
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
.file-tree-content::-webkit-scrollbar {
  width: 10px;
}

.file-tree-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.file-tree-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.file-tree-content::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}
</style>
