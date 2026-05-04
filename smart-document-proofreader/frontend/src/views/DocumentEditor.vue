<template>
  <el-container class="editor-container">
    <el-header class="editor-header">
      <div class="header-left">
        <el-button type="text" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <el-input
          v-model="documentTitle"
          placeholder="文档标题"
          class="title-input"
          @change="saveDocument"
        />
      </div>
      <div class="header-right">
        <el-button type="primary" @click="runFullCheck" :loading="checking">
          <el-icon><Search /></el-icon>
          智能校对
        </el-button>
        <el-button type="success" @click="saveDocument" :loading="saving">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
        <el-dropdown @command="handleDropdownCommand">
          <el-button>
            更多
            <el-icon><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="versions">
                <el-icon><Clock /></el-icon>
                版本历史
              </el-dropdown-item>
              <el-dropdown-item command="export" divided>
                <el-icon><Download /></el-icon>
                导出文档
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    <el-container class="editor-body">
      <el-main class="editor-main">
        <div ref="editorContainer" class="monaco-editor"></div>
      </el-main>
      <el-aside width="350px" class="editor-sidebar">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="校对结果" name="results">
            <div v-if="allResults.length === 0" class="empty-results">
              <div class="empty-icon">🔍</div>
              <div class="empty-text">暂无校对结果</div>
              <div class="empty-hint">点击"智能校对"开始检查</div>
            </div>
            <div v-else class="results-list">
              <div
                v-for="(result, index) in allResults"
                :key="index"
                class="result-item"
                :class="{ selected: selectedIndex === index }"
                @click="selectResult(index)"
              >
                <span class="result-type" :class="getResultTypeClass(result)">
                  {{ result.type || result.correction_type || result.category }}
                </span>
                <div class="result-original">
                  原文: <span class="original-text">{{ result.original_text || result.description }}</span>
                </div>
                <div class="result-suggested" v-if="result.suggested_text || result.suggestion">
                  建议: <span class="suggested-text">{{ result.suggested_text || result.suggestion }}</span>
                </div>
                <div class="result-explanation" v-if="result.explanation">
                  {{ result.explanation }}
                </div>
                <div class="result-actions" v-if="result.suggested_text">
                  <el-button size="small" type="primary" @click.stop="applySuggestion(result)">
                    应用
                  </el-button>
                  <el-button size="small" @click.stop="ignoreResult(result, index)">
                    忽略
                  </el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="版本历史" name="versions">
            <div v-if="versions.length === 0" class="empty-results">
              <div class="empty-icon">📜</div>
              <div class="empty-text">暂无版本记录</div>
            </div>
            <div v-else class="versions-list">
              <div
                v-for="version in versions"
                :key="version.id"
                class="version-item"
              >
                <div class="version-header">
                  <span class="version-number">v{{ version.version_number }}</span>
                  <span class="version-time">{{ formatTime(version.created_at) }}</span>
                </div>
                <div class="version-desc">{{ version.change_description }}</div>
                <div class="version-actions">
                  <el-button size="small" type="primary" @click="previewVersion(version)">
                    预览
                  </el-button>
                  <el-button size="small" type="success" @click="restoreVersion(version)">
                    恢复
                  </el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-aside>
    </el-container>
    
    <el-dialog
      v-model="versionPreviewVisible"
      title="版本预览"
      width="70%"
      :before-close="closeVersionPreview"
    >
      <div class="version-preview-content">
        <pre>{{ previewVersionContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="closeVersionPreview">关闭</el-button>
        <el-button type="primary" @click="restorePreviewVersion">恢复此版本</el-button>
      </template>
    </el-dialog>
    
    <el-dialog
      v-model="exportDialogVisible"
      title="导出文档"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="导出格式">
          <el-select v-model="exportFormat" style="width: 100%">
            <el-option label="纯文本 (.txt)" value="txt" />
            <el-option label="Markdown (.md)" value="md" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="exportDocument">导出</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Search, Check, ArrowDown, Clock, Download } from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import { documentApi, proofreaderApi } from '../utils/api'

const router = useRouter()
const route = useRoute()

const editorContainer = ref(null)
let editor = null

const documentId = ref(null)
const documentTitle = ref('未命名文档')
const currentContent = ref('')
const saving = ref(false)
const checking = ref(false)
const activeTab = ref('results')
const selectedIndex = ref(-1)
const allResults = ref([])
const versions = ref([])
const versionPreviewVisible = ref(false)
const previewVersionContent = ref('')
const currentPreviewVersion = ref(null)
const exportDialogVisible = ref(false)
const exportFormat = ref('txt')

const initEditor = () => {
  if (!editorContainer.value) return
  
  editor = monaco.editor.create(editorContainer.value, {
    value: currentContent.value,
    language: 'plaintext',
    theme: 'vs',
    automaticLayout: true,
    minimap: {
      enabled: true
    },
    fontSize: 14,
    lineNumbers: 'on',
    wordWrap: 'on',
    wrappingIndent: 'indent',
    scrollBeyondLastLine: false,
    padding: {
      top: 10
    }
  })
  
  editor.onDidChangeModelContent(() => {
    currentContent.value = editor.getValue()
  })
}

const goBack = () => {
  router.push('/documents')
}

const loadDocument = async () => {
  const id = route.params.id
  if (id) {
    documentId.value = parseInt(id)
    try {
      const response = await documentApi.getById(documentId.value)
      if (response.data.success) {
        const doc = response.data.data
        documentTitle.value = doc.title
        currentContent.value = doc.current_content
        if (editor) {
          editor.setValue(currentContent.value)
        }
      }
    } catch (error) {
      console.error('加载文档失败:', error)
      ElMessage.error('加载文档失败')
    }
  }
}

const loadVersions = async () => {
  if (!documentId.value) return
  try {
    const response = await documentApi.getVersions(documentId.value)
    if (response.data.success) {
      versions.value = response.data.data.versions
    }
  } catch (error) {
    console.error('加载版本历史失败:', error)
  }
}

const saveDocument = async () => {
  if (!documentTitle.value.trim()) {
    ElMessage.warning('请输入文档标题')
    return
  }
  
  saving.value = true
  try {
    if (documentId.value) {
      await documentApi.update(documentId.value, {
        content: currentContent.value,
        change_description: '手动保存'
      })
    } else {
      const response = await documentApi.create({
        title: documentTitle.value,
        content: currentContent.value,
        document_type: 'general'
      })
      if (response.data.success) {
        documentId.value = response.data.data.id
        router.replace(`/documents/${documentId.value}`)
      }
    }
    ElMessage.success('保存成功')
    loadVersions()
  } catch (error) {
    console.error('保存文档失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const runFullCheck = async () => {
  if (!currentContent.value.trim()) {
    ElMessage.warning('请先输入文档内容')
    return
  }
  
  checking.value = true
  allResults.value = []
  
  try {
    const response = await proofreaderApi.fullCheck(currentContent.value)
    if (response.data.success) {
      const data = response.data.data
      const results = []
      
      if (data.proofreading && data.proofreading.corrections) {
        data.proofreading.corrections.forEach(c => {
          results.push({ ...c, type: c.correction_type })
        })
      }
      
      if (data.format_check && data.format_check.issues) {
        data.format_check.issues.forEach(i => {
          results.push({ 
            ...i, 
            type: i.issue_type,
            original_text: i.description,
            suggested_text: i.suggestion
          })
        })
      }
      
      if (data.polishing && data.polishing.suggestions) {
        data.polishing.suggestions.forEach(s => {
          results.push({ ...s, type: s.category })
        })
      }
      
      allResults.value = results
      
      if (results.length > 0) {
        ElMessage.info(`发现 ${results.length} 个问题`)
      } else {
        ElMessage.success('文档检查完成，未发现问题')
      }
    }
  } catch (error) {
    console.error('校对失败:', error)
    ElMessage.error('校对失败')
  } finally {
    checking.value = false
  }
}

const getResultTypeClass = (result) => {
  const type = (result.type || result.correction_type || result.category || '').toLowerCase()
  if (type.includes('政治') || type.includes('political')) return 'political'
  if (type.includes('搭配') || type.includes('collocation')) return 'collocation'
  if (type.includes('标点') || type.includes('punctuation')) return 'punctuation'
  if (type.includes('格式') || type.includes('format')) return 'format'
  if (type.includes('润色') || type.includes('polish') || type.includes('口语化')) return 'polish'
  return 'default'
}

const selectResult = (index) => {
  selectedIndex.value = index
  const result = allResults.value[index]
  if (result.start_position >= 0 && result.end_position >= 0 && editor) {
    const model = editor.getModel()
    const startPos = model.getPositionAt(result.start_position)
    const endPos = model.getPositionAt(result.end_position)
    editor.setSelection({
      startLineNumber: startPos.lineNumber,
      startColumn: startPos.column,
      endLineNumber: endPos.lineNumber,
      endColumn: endPos.column
    })
    editor.revealRangeInCenter({
      startLineNumber: startPos.lineNumber,
      startColumn: startPos.column,
      endLineNumber: endPos.lineNumber,
      endColumn: endPos.column
    })
  }
}

const applySuggestion = (result) => {
  if (!result.suggested_text || result.start_position < 0 || result.end_position < 0) {
    ElMessage.warning('无法应用此建议')
    return
  }
  
  const content = currentContent.value
  const newContent = content.slice(0, result.start_position) + 
                      result.suggested_text + 
                      content.slice(result.end_position)
  
  currentContent.value = newContent
  if (editor) {
    editor.setValue(newContent)
  }
  
  const index = allResults.value.indexOf(result)
  if (index > -1) {
    allResults.value.splice(index, 1)
    selectedIndex.value = -1
  }
  
  ElMessage.success('已应用修改')
}

const ignoreResult = (result, index) => {
  allResults.value.splice(index, 1)
  selectedIndex.value = -1
  ElMessage.info('已忽略此问题')
}

const handleDropdownCommand = (command) => {
  if (command === 'versions') {
    activeTab.value = 'versions'
    loadVersions()
  } else if (command === 'export') {
    exportDialogVisible.value = true
  }
}

const previewVersion = (version) => {
  previewVersionContent.value = version.content
  currentPreviewVersion.value = version
  versionPreviewVisible.value = true
}

const closeVersionPreview = () => {
  versionPreviewVisible.value = false
  previewVersionContent.value = ''
  currentPreviewVersion.value = null
}

const restoreVersion = async (version) => {
  if (!documentId.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要恢复到版本 v${version.version_number} 吗？`,
      '确认恢复',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await documentApi.restoreVersion(documentId.value, version.version_number)
    if (response.data.success) {
      currentContent.value = response.data.data.current_content
      if (editor) {
        editor.setValue(currentContent.value)
      }
      ElMessage.success('版本恢复成功')
      loadVersions()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复版本失败:', error)
      ElMessage.error('恢复失败')
    }
  }
}

const restorePreviewVersion = () => {
  if (currentPreviewVersion.value) {
    versionPreviewVisible.value = false
    restoreVersion(currentPreviewVersion.value)
  }
}

const exportDocument = () => {
  const content = currentContent.value
  const title = documentTitle.value || '未命名文档'
  const extension = exportFormat.value === 'md' ? 'md' : 'txt'
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.${extension}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  exportDialogVisible.value = false
  ElMessage.success('导出成功')
}

const formatTime = (timeString) => {
  if (!timeString) return '-'
  const date = new Date(timeString)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  nextTick(() => {
    initEditor()
    loadDocument()
    loadVersions()
  })
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
})
</script>

<style scoped>
.editor-container {
  height: 100vh;
}

.editor-header {
  background-color: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left .el-button {
  color: #fff;
}

.title-input {
  width: 300px;
}

.title-input :deep(.el-input__inner) {
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
}

.title-input :deep(.el-input__inner)::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-body {
  flex: 1;
  overflow: hidden;
}

.editor-main {
  padding: 0;
  background-color: #fff;
}

.monaco-editor {
  width: 100%;
  height: 100%;
}

.editor-sidebar {
  background-color: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.editor-sidebar :deep(.el-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-sidebar :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.editor-sidebar :deep(.el-tab-pane) {
  height: 100%;
  overflow-y: auto;
  padding: 10px;
}

.empty-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
}

.results-list {
  padding: 5px;
}

.result-item {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
}

.result-item.selected {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.result-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 8px;
  background-color: #f4f4f5;
  color: #909399;
}

.result-type.political {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.result-type.collocation {
  background-color: #f4f4f5;
  color: #909399;
}

.result-type.punctuation {
  background-color: #f0f9eb;
  color: #67c23a;
}

.result-type.format {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.result-type.polish {
  background-color: #ecf5ff;
  color: #409eff;
}

.result-original {
  font-size: 13px;
  margin-bottom: 4px;
}

.original-text {
  color: #f56c6c;
  text-decoration: line-through;
}

.result-suggested {
  font-size: 13px;
  margin-bottom: 8px;
}

.suggested-text {
  color: #67c23a;
}

.result-explanation {
  font-size: 12px;
  color: #909399;
  margin-bottom: 10px;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.versions-list {
  padding: 5px;
}

.version-item {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.version-number {
  font-weight: 600;
  color: #409eff;
  font-size: 15px;
}

.version-time {
  font-size: 12px;
  color: #909399;
}

.version-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 10px;
}

.version-actions {
  display: flex;
  gap: 8px;
}

.version-preview-content {
  max-height: 400px;
  overflow-y: auto;
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.version-preview-content pre {
  margin: 0;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
