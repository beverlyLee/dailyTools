<template>
  <div class="diff-view">
    <div class="diff-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <h2>文本差异比较</h2>
        </div>
        <div class="toolbar-center">
          <button class="btn btn-primary" @click="compareFiles">比较差异</button>
          <button class="btn btn-secondary" @click="saveToHistory">保存到历史</button>
          <button class="btn btn-secondary" @click="showHistoryModal = true">历史记录</button>
        </div>
        <div class="toolbar-right">
          <span class="diff-stats">{{ diffStats }}</span>
        </div>
      </div>
      
      <div class="editor-container">
        <div class="editor-panel">
          <div class="panel-header">
            <span class="panel-title">{{ leftFileName }}</span>
            <div class="panel-actions">
              <button class="btn btn-sm" @click="openFile('left')">打开文件</button>
              <button class="btn btn-sm" @click="saveFile('left')">保存</button>
              <button class="btn btn-sm" @click="clearEditor('left')">清空</button>
            </div>
          </div>
          <div ref="leftEditorRef" class="editor"></div>
        </div>
        
        <div class="divider">
          <div class="divider-actions">
            <button class="btn-icon" title="将所有更改合并到右侧" @click="mergeAll('right')">→</button>
            <button class="btn-icon" title="将所有更改合并到左侧" @click="mergeAll('left')">←</button>
          </div>
        </div>
        
        <div class="editor-panel">
          <div class="panel-header">
            <span class="panel-title">{{ rightFileName }}</span>
            <div class="panel-actions">
              <button class="btn btn-sm" @click="openFile('right')">打开文件</button>
              <button class="btn btn-sm" @click="saveFile('right')">保存</button>
              <button class="btn btn-sm" @click="clearEditor('right')">清空</button>
            </div>
          </div>
          <div ref="rightEditorRef" class="editor"></div>
        </div>
      </div>
    </div>
    
    <div class="modal-overlay" v-if="showHistoryModal">
      <div class="modal history-modal">
        <div class="modal-header">
          <h3>比较历史</h3>
          <button class="btn-close" @click="showHistoryModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="history-list">
            <div v-if="comparisons.length === 0" class="empty-history">
              暂无历史记录
            </div>
            <div v-else class="history-item" v-for="item in comparisons" :key="item.id">
              <div class="history-item-info">
                <div class="history-item-files">{{ item.left_file_name }} ↔ {{ item.right_file_name }}</div>
                <div class="history-item-time">{{ formatDate(item.created_at) }}</div>
              </div>
              <div class="history-item-actions">
                <button class="btn btn-sm" @click="loadFromHistory(item.id)">加载</button>
                <button class="btn btn-sm btn-danger" @click="deleteFromHistory(item.id)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showMergeHint" class="merge-hint">
      <span>点击差异区域可合并更改</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import DiffMatchPatch from 'diff-match-patch'
import { open as openDialog, save as saveDialog } from '@tauri-apps/api/dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/api/fs'
import { api, Comparison } from '@/api'

const dmp = new DiffMatchPatch()

const leftEditorRef = ref<HTMLDivElement | null>(null)
const rightEditorRef = ref<HTMLDivElement | null>(null)

let leftEditor: monaco.editor.IStandaloneCodeEditor | null = null
let rightEditor: monaco.editor.IStandaloneCodeEditor | null = null

const leftFileName = ref('左侧文本')
const rightFileName = ref('右侧文本')
const leftFilePath = ref<string | null>(null)
const rightFilePath = ref<string | null>(null)

const showHistoryModal = ref(false)
const showMergeHint = ref(false)
const comparisons = ref<Comparison[]>([])

let leftDecorations: string[] = []
let rightDecorations: string[] = []
let currentDiffs: any[] = []
let isSyncingScroll = false

const diffStats = computed(() => {
  if (currentDiffs.length === 0) return ''
  
  let insertions = 0
  let deletions = 0
  
  for (const diff of currentDiffs) {
    const type = diff[0]
    const text = diff[1]
    const lineCount = text.split('\n').length - 1 || (text.length > 0 ? 1 : 0)
    
    if (type === 1) {
      insertions += lineCount
    } else if (type === -1) {
      deletions += lineCount
    }
  }
  
  let statsText = ''
  if (insertions > 0) {
    statsText += `新增: ${insertions} 行 `
  }
  if (deletions > 0) {
    statsText += `删除: ${deletions} 行`
  }
  
  return statsText.trim() || '无差异'
})

self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  }
}

function initEditors() {
  if (!leftEditorRef.value || !rightEditorRef.value) return
  
  monaco.editor.defineTheme('diffTheme', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorLineNumber.foreground': '#858585',
      'editorGutter.background': '#1e1e1e',
    }
  })
  
  monaco.editor.setTheme('diffTheme')
  
  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    automaticLayout: true,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true
    }
  }
  
  leftEditor = monaco.editor.create(leftEditorRef.value, {
    ...editorOptions,
    language: 'plaintext',
    value: '// 在此输入或打开左侧文本\n// 点击"比较差异"按钮开始比较'
  })
  
  rightEditor = monaco.editor.create(rightEditorRef.value, {
    ...editorOptions,
    language: 'plaintext',
    value: '// 在此输入或打开右侧文本\n// 点击"比较差异"按钮开始比较'
  })
  
  leftEditor.onDidChangeModelContent(() => {
    clearDiffHighlights()
  })
  
  rightEditor.onDidChangeModelContent(() => {
    clearDiffHighlights()
  })
  
  syncScroll()
}

function syncScroll() {
  if (!leftEditor || !rightEditor) return
  
  leftEditor.onDidScrollChange((e) => {
    if (isSyncingScroll) return
    isSyncingScroll = true
    rightEditor!.setScrollPosition(e)
    isSyncingScroll = false
  })
  
  rightEditor.onDidScrollChange((e) => {
    if (isSyncingScroll) return
    isSyncingScroll = true
    leftEditor!.setScrollPosition(e)
    isSyncingScroll = false
  })
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'json': 'json',
    'md': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sh': 'shell',
    'bat': 'bat',
    'sql': 'sql',
    'rs': 'rust',
    'go': 'go',
    'vue': 'vue'
  }
  return langMap[ext] || 'plaintext'
}

async function openFile(side: 'left' | 'right') {
  try {
    const selectedPath = await openDialog({
      title: '选择文件',
      multiple: false,
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css', 'xml', 'yaml', 'yml'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    if (selectedPath) {
      const filePath = selectedPath as string
      const content = await readTextFile(filePath)
      const fileName = filePath.split(/[\\/]/).pop() || '未命名'
      
      const editor = side === 'left' ? leftEditor : rightEditor
      editor?.setValue(content)
      
      if (side === 'left') {
        leftFileName.value = fileName
        leftFilePath.value = filePath
      } else {
        rightFileName.value = fileName
        rightFilePath.value = filePath
      }
      
      const lang = detectLanguage(fileName)
      const model = editor?.getModel()
      if (model) {
        monaco.editor.setModelLanguage(model, lang)
      }
      
      clearDiffHighlights()
    }
  } catch (error) {
    console.error('打开文件失败:', error)
    alert('打开文件失败: ' + error)
  }
}

async function saveFile(side: 'left' | 'right') {
  try {
    const editor = side === 'left' ? leftEditor : rightEditor
    const content = editor?.getValue() || ''
    const defaultPath = side === 'left' ? leftFilePath.value : rightFilePath.value
    const defaultName = side === 'left' ? leftFileName.value : rightFileName.value
    
    let savePath: string | null = null
    
    if (defaultPath) {
      savePath = defaultPath
    } else {
      savePath = await saveDialog({
        title: '保存文件',
        defaultPath: defaultName,
        filters: [
          { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      }) as string | null
    }
    
    if (savePath) {
      await writeTextFile(savePath, content)
      const fileName = savePath.split(/[\\/]/).pop() || '未命名'
      
      if (side === 'left') {
        leftFileName.value = fileName
        leftFilePath.value = savePath
      } else {
        rightFileName.value = fileName
        rightFilePath.value = savePath
      }
      
      alert('保存成功！')
    }
  } catch (error) {
    console.error('保存文件失败:', error)
    alert('保存文件失败: ' + error)
  }
}

function clearEditor(side: 'left' | 'right') {
  const editor = side === 'left' ? leftEditor : rightEditor
  editor?.setValue('')
  
  if (side === 'left') {
    leftFileName.value = '左侧文本'
    leftFilePath.value = null
  } else {
    rightFileName.value = '右侧文本'
    rightFilePath.value = null
  }
  
  const model = editor?.getModel()
  if (model) {
    monaco.editor.setModelLanguage(model, 'plaintext')
  }
  
  clearDiffHighlights()
}

function compareFiles() {
  const leftText = leftEditor?.getValue() || ''
  const rightText = rightEditor?.getValue() || ''
  
  if (!leftText.trim() && !rightText.trim()) {
    alert('请先在两侧输入或打开文本文件')
    return
  }
  
  clearDiffHighlights()
  
  const diffs = dmp.diff_main(leftText, rightText)
  dmp.diff_cleanupSemantic(diffs)
  currentDiffs = diffs
  
  applyDiffHighlights(diffs)
  showMergeHintTemporarily()
}

function applyDiffHighlights(diffs: any[]) {
  if (!leftEditor || !rightEditor) return
  
  const leftModel = leftEditor.getModel()
  const rightModel = rightEditor.getModel()
  
  if (!leftModel || !rightModel) return
  
  let leftLine = 1
  let rightLine = 1
  let leftColumn = 1
  let rightColumn = 1
  
  const newLeftDecorations: monaco.editor.IModelDeltaDecoration[] = []
  const newRightDecorations: monaco.editor.IModelDeltaDecoration[] = []
  
  for (const diff of diffs) {
    const type = diff[0]
    const text = diff[1]
    const lines = text.split('\n')
    
    if (type === 0) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          leftLine++
          rightLine++
          leftColumn = 1
          rightColumn = 1
        }
        leftColumn += lines[i].length
        rightColumn += lines[i].length
      }
    } else if (type === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          leftLine++
          leftColumn = 1
        }
        
        if (lines[i].length > 0 || i > 0) {
          const startLine = leftLine
          const endLine = leftLine
          const startCol = leftColumn
          const endCol = leftColumn + lines[i].length
          
          newLeftDecorations.push({
            range: new monaco.Range(
              startLine,
              startCol,
              endLine,
              endCol > startCol ? endCol : startCol + 1
            ),
            options: {
              isWholeLine: lines[i].length === 0 && i > 0,
              className: 'deletion-decoration',
              glyphMarginClassName: 'gutter-deletion',
              linesDecorationsClassName: 'line-number-deletion'
            }
          })
        }
        
        leftColumn += lines[i].length
      }
    } else if (type === 1) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          rightLine++
          rightColumn = 1
        }
        
        if (lines[i].length > 0 || i > 0) {
          const startLine = rightLine
          const endLine = rightLine
          const startCol = rightColumn
          const endCol = rightColumn + lines[i].length
          
          newRightDecorations.push({
            range: new monaco.Range(
              startLine,
              startCol,
              endLine,
              endCol > startCol ? endCol : startCol + 1
            ),
            options: {
              isWholeLine: lines[i].length === 0 && i > 0,
              className: 'insertion-decoration',
              glyphMarginClassName: 'gutter-insertion',
              linesDecorationsClassName: 'line-number-insertion'
            }
          })
        }
        
        rightColumn += lines[i].length
      }
    }
  }
  
  leftDecorations = leftEditor.deltaDecorations(leftDecorations, newLeftDecorations)
  rightDecorations = rightEditor.deltaDecorations(rightDecorations, newRightDecorations)
}

function clearDiffHighlights() {
  if (leftEditor) {
    leftDecorations = leftEditor.deltaDecorations(leftDecorations, [])
  }
  if (rightEditor) {
    rightDecorations = rightEditor.deltaDecorations(rightDecorations, [])
  }
  currentDiffs = []
}

function showMergeHintTemporarily() {
  showMergeHint.value = true
  setTimeout(() => {
    showMergeHint.value = false
  }, 3000)
}

function mergeAll(direction: 'left' | 'right') {
  if (currentDiffs.length === 0) {
    alert('请先比较差异')
    return
  }
  
  const leftText = leftEditor?.getValue() || ''
  const rightText = rightEditor?.getValue() || ''
  
  if (direction === 'right') {
    rightEditor?.setValue(leftText)
  } else {
    leftEditor?.setValue(rightText)
  }
  
  clearDiffHighlights()
}

async function saveToHistory() {
  const leftText = leftEditor?.getValue() || ''
  const rightText = rightEditor?.getValue() || ''
  
  if (!leftText.trim() && !rightText.trim()) {
    alert('没有内容可保存')
    return
  }
  
  try {
    const id = await api.saveComparison(
      leftFileName.value,
      rightFileName.value,
      leftText,
      rightText
    )
    
    if (id) {
      alert('已保存到历史记录')
    } else {
      alert('保存失败')
    }
  } catch (error) {
    console.error('保存历史失败:', error)
    alert('保存失败: ' + error)
  }
}

async function loadComparisons() {
  try {
    comparisons.value = await api.getComparisons()
  } catch (error) {
    console.error('获取历史失败:', error)
    comparisons.value = []
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

async function loadFromHistory(id: number) {
  try {
    const item = comparisons.value.find(c => c.id === id)
    if (item) {
      leftEditor?.setValue(item.left_content || '')
      rightEditor?.setValue(item.right_content || '')
      
      leftFileName.value = item.left_file_name
      rightFileName.value = item.right_file_name
      leftFilePath.value = null
      rightFilePath.value = null
      
      const leftLang = detectLanguage(item.left_file_name)
      const rightLang = detectLanguage(item.right_file_name)
      
      const leftModel = leftEditor?.getModel()
      const rightModel = rightEditor?.getModel()
      
      if (leftModel) {
        monaco.editor.setModelLanguage(leftModel, leftLang)
      }
      if (rightModel) {
        monaco.editor.setModelLanguage(rightModel, rightLang)
      }
      
      showHistoryModal.value = false
      clearDiffHighlights()
    }
  } catch (error) {
    console.error('加载历史失败:', error)
    alert('加载失败')
  }
}

async function deleteFromHistory(id: number) {
  if (confirm('确定要删除这条历史记录吗？')) {
    try {
      await api.deleteComparison(id)
      await loadComparisons()
    } catch (error) {
      console.error('删除历史失败:', error)
      alert('删除失败')
    }
  }
}

onMounted(() => {
  initEditors()
  loadComparisons()
})

onUnmounted(() => {
  leftEditor?.dispose()
  rightEditor?.dispose()
})
</script>

<style scoped>
.diff-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.diff-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.toolbar-left h2 {
  margin: 0;
  font-size: 1.1rem;
}

.toolbar-center {
  display: flex;
  gap: 0.5rem;
}

.toolbar-center .btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.toolbar-center .btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.toolbar-center .btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.toolbar-center .btn-primary {
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
}

.toolbar-center .btn-primary:hover {
  background: white;
  transform: none;
  box-shadow: none;
}

.diff-stats {
  font-size: 0.875rem;
  font-weight: 500;
}

.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}

.panel-title {
  color: #d4d4d4;
  font-size: 0.875rem;
  font-weight: 500;
}

.panel-actions {
  display: flex;
  gap: 0.25rem;
}

.panel-actions .btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: #d4d4d4;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.panel-actions .btn-sm:hover {
  background: rgba(255, 255, 255, 0.2);
}

.editor {
  flex: 1;
  overflow: hidden;
}

.divider {
  width: 40px;
  background: #2d2d2d;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #3c3c3c;
  border-right: 1px solid #3c3c3c;
}

.divider-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #d4d4d4;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: bold;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.2);
}

.history-modal {
  max-width: 600px;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.modal-body {
  overflow-y: auto;
  max-height: 60vh;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-history {
  text-align: center;
  color: #858585;
  padding: 40px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.history-item-info {
  flex: 1;
}

.history-item-files {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.history-item-time {
  font-size: 0.75rem;
  color: #999;
}

.history-item-actions {
  display: flex;
  gap: 0.5rem;
}

.merge-hint {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>

<style>
:global(.deletion-decoration) {
  background-color: rgba(255, 100, 100, 0.3) !important;
  border-radius: 2px;
}

:global(.insertion-decoration) {
  background-color: rgba(100, 255, 100, 0.3) !important;
  border-radius: 2px;
}

:global(.gutter-deletion) {
  background-color: rgba(255, 100, 100, 0.5) !important;
}

:global(.gutter-insertion) {
  background-color: rgba(100, 255, 100, 0.5) !important;
}

:global(.line-number-deletion) {
  background-color: rgba(255, 100, 100, 0.2) !important;
}

:global(.line-number-insertion) {
  background-color: rgba(100, 255, 100, 0.2) !important;
}
</style>
