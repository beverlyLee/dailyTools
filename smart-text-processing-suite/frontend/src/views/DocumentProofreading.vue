<template>
  <div class="document-proofreading-container fade-in">
    <el-card class="card-container">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><DocumentCopy /></el-icon>
          公文写作智能校对
        </h2>
        <div class="header-actions">
          <el-button @click="goToDocumentList">
            <el-icon><List /></el-icon>
            文档列表
          </el-button>
          <el-button type="primary" @click="handleSave" :loading="isSaving" v-if="documentId">
            <el-icon><Edit /></el-icon>
            更新文档
          </el-button>
        </div>
      </div>
      
      <el-form :model="documentForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="文档标题">
              <el-input 
                v-model="documentForm.title" 
                placeholder="请输入文档标题" 
                :disabled="isProofreading"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="文档类型">
              <el-select v-model="documentForm.document_type" placeholder="请选择" :disabled="isProofreading">
                <el-option label="通用文档" value="general" />
                <el-option label="正式公文" value="official" />
                <el-option label="报告" value="report" />
                <el-option label="通知" value="notice" />
                <el-option label="决定" value="decision" />
                <el-option label="函" value="letter" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="红头文件类型">
              <el-input 
                v-model="documentForm.red_head_type" 
                placeholder="如：人民政府文件" 
                :disabled="isProofreading"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发文字号">
              <el-input 
                v-model="documentForm.document_number" 
                placeholder="如：XX〔2024〕1号" 
                :disabled="isProofreading"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="documentForm.status" placeholder="请选择" :disabled="isProofreading">
                <el-option label="草稿" value="draft" />
                <el-option label="审核中" value="reviewing" />
                <el-option label="已通过" value="approved" />
                <el-option label="已发布" value="published" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <el-divider />
      
      <div class="editor-section">
        <div class="editor-header">
          <span class="section-title">文档内容编辑器</span>
          <div class="editor-header-right">
            <span class="word-count">字数: {{ wordCount }}</span>
            <span class="version-info" v-if="documentId">版本: v{{ currentVersion }}</span>
          </div>
        </div>
        <div ref="editorContainer" class="monaco-editor-container document-editor"></div>
      </div>
      
      <div class="action-buttons mt-20">
        <el-dropdown trigger="click">
          <el-button type="primary" size="large" :loading="isProofreading">
            <el-icon><MagicStick /></el-icon>
            智能校对
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleProofread('all')">
                <el-icon><Check /></el-icon>
                完整校对（推荐）
              </el-dropdown-item>
              <el-dropdown-item @click="handleProofread('political')">
                <el-icon><Warning /></el-icon>
                政治术语检查
              </el-dropdown-item>
              <el-dropdown-item @click="handleProofread('collocation')">
                <el-icon><Document /></el-icon>
                固定搭配检查
              </el-dropdown-item>
              <el-dropdown-item @click="handleProofread('punctuation')">
                <el-icon><Edit /></el-icon>
                标点符号检查
              </el-dropdown-item>
              <el-dropdown-item @click="handleProofread('format')">
                <el-icon><Grid /></el-icon>
                格式规范检查
              </el-dropdown-item>
              <el-dropdown-item @click="handleProofread('polish')">
                <el-icon><Brush /></el-icon>
                润色建议
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <el-button size="large" @click="handleNewDocument">
          <el-icon><Plus /></el-icon>
          新建文档
        </el-button>
        <el-button size="large" @click="handleClear">
          <el-icon><Delete /></el-icon>
          清空内容
        </el-button>
        <el-button 
          size="large" 
          type="success" 
          :disabled="!canApplyCorrections"
          @click="handleApplyAllCorrections"
          :loading="isApplying"
        >
          <el-icon><Check /></el-icon>
          应用全部修正
        </el-button>
      </div>
    </el-card>
    
    <el-card class="card-container mt-20" v-if="proofreadResult">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><DataAnalysis /></el-icon>
          校对结果
        </h2>
        <div class="result-summary">
          <el-tag type="danger" v-if="statistics.major > 0">
            严重问题 {{ statistics.major }} 个
          </el-tag>
          <el-tag type="warning" v-if="statistics.warning > 0">
            警告 {{ statistics.warning }} 个
          </el-tag>
          <el-tag type="info" v-if="statistics.minor > 0">
            次要问题 {{ statistics.minor }} 个
          </el-tag>
          <el-tag type="success" v-if="statistics.total === 0">
            未发现问题
          </el-tag>
        </div>
      </div>
      
      <el-alert :title="proofreadResult.summary" type="info" show-icon class="mb-20" />
      
      <el-tabs v-model="activeTab" class="mt-10">
        <el-tab-pane label="错误检测" name="corrections">
          <div v-if="corrections.length === 0" class="empty-state">
            <div class="empty-icon">✅</div>
            <div class="empty-text">未检测到明显问题</div>
          </div>
          <div v-else>
            <div 
              v-for="(correction, index) in corrections" 
              :key="index" 
              class="result-card" 
              :class="getCorrectionClass(correction.severity)"
              @click="locateCorrection(correction)"
            >
              <div class="flex-between">
                <div>
                  <el-tag :type="getCategoryTagType(correction.category)" size="small">
                    {{ correction.category }}
                  </el-tag>
                  <el-tag 
                    v-if="correction.severity" 
                    :type="getSeverityTagType(correction.severity)" 
                    size="small"
                    class="ml-10"
                  >
                    {{ getSeverityText(correction.severity) }}
                  </el-tag>
                  <span class="confidence ml-10" v-if="correction.confidence">
                    置信度: {{ correction.confidence }}%
                  </span>
                </div>
                <div class="correction-actions">
                  <el-button 
                    type="success" 
                    size="small" 
                    :disabled="!correction.suggested_text"
                    @click.stop="handleApplySingleCorrection(correction, index)"
                  >
                    应用
                  </el-button>
                  <el-button type="info" size="small" @click.stop="handleIgnoreCorrection(index)">
                    忽略
                  </el-button>
                </div>
              </div>
              <div class="mt-10">
                <span class="label">原文：</span>
                <span class="original-text">{{ correction.original_text }}</span>
              </div>
              <div v-if="correction.suggested_text" class="mt-10">
                <span class="label">建议：</span>
                <span class="corrected-text">{{ correction.suggested_text }}</span>
              </div>
              <div v-if="correction.explanation" class="mt-10 explanation">
                {{ correction.explanation }}
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="格式问题" name="format">
          <div v-if="formatIssues.length === 0" class="empty-state">
            <div class="empty-icon">📄</div>
            <div class="empty-text">格式检查通过</div>
          </div>
          <div v-else>
            <div 
              v-for="(issue, index) in formatIssues" 
              :key="index" 
              class="result-card"
              :class="getCorrectionClass(issue.issue_level)"
            >
              <div class="flex-between">
                <el-tag :type="getSeverityTagType(issue.issue_level)" size="small">
                  {{ issue.issue_type }}
                </el-tag>
              </div>
              <div class="mt-10">
                <p class="issue-description">{{ issue.description }}</p>
                <p v-if="issue.suggestion" class="issue-suggestion">
                  <strong>建议：</strong>{{ issue.suggestion }}
                </p>
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="润色建议" name="polish">
          <div v-if="polishSuggestions.length === 0" class="empty-state">
            <div class="empty-icon">✨</div>
            <div class="empty-text">暂无润色建议</div>
          </div>
          <div v-else>
            <div 
              v-for="(suggestion, index) in polishSuggestions" 
              :key="index" 
              class="result-card polish-card"
            >
              <div class="flex-between">
                <el-tag type="info" size="small">{{ suggestion.category }}</el-tag>
                <span class="confidence" v-if="suggestion.confidence">
                  置信度: {{ Math.round(suggestion.confidence * 100) }}%
                </span>
              </div>
              <div class="mt-10 compare-box">
                <div class="original-box">
                  <div class="box-label">原表达</div>
                  <div class="original-text">{{ suggestion.original_phrase }}</div>
                </div>
                <div class="arrow-box">→</div>
                <div class="suggested-box">
                  <div class="box-label">建议</div>
                  <div class="corrected-text">{{ suggestion.suggested_phrase }}</div>
                </div>
              </div>
              <div v-if="suggestion.explanation" class="mt-10 explanation">
                {{ suggestion.explanation }}
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="版本历史" name="versions" v-if="documentId">
          <div v-if="versions.length === 0" class="empty-state">
            <div class="empty-icon">📁</div>
            <div class="empty-text">暂无版本历史</div>
          </div>
          <div v-else>
            <el-timeline>
              <el-timeline-item
                v-for="(version, index) in versions"
                :key="version.id"
                :timestamp="formatTime(version.created_at)"
                placement="top"
                :type="index === 0 ? 'primary' : ''"
              >
                <el-card>
                  <h4>版本 v{{ version.version_number }}</h4>
                  <p>{{ version.change_description || '无描述' }}</p>
                  <p class="text-muted">字数: {{ version.word_count }}</p>
                  <el-button size="small" @click="handlePreviewVersion(version)">
                    预览
                  </el-button>
                  <el-button 
                    v-if="index > 0" 
                    size="small" 
                    type="warning" 
                    @click="handleRevertVersion(version)"
                    :loading="isReverting"
                  >
                    恢复到此版本
                  </el-button>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <el-dialog v-model="versionDialogVisible" title="版本预览" width="70%">
      <div class="version-preview">
        <pre>{{ versionPreviewContent }}</pre>
      </div>
      <template #footer>
        <el-button @click="versionDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleConfirmRevert">恢复到此版本</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  DocumentCopy, List, Edit, MagicStick, ArrowDown, 
  Check, Warning, Document, Edit as EditIcon, 
  Grid, Brush, Plus, Delete, DataAnalysis 
} from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import { documentProofreadingApi } from '@/api'

const router = useRouter()
const route = useRoute()

const editorContainer = ref(null)
let editor = null

const documentId = ref(null)
const isProofreading = ref(false)
const isSaving = ref(false)
const isApplying = ref(false)
const isReverting = ref(false)

const documentForm = ref({
  title: '',
  document_type: 'general',
  status: 'draft',
  red_head_type: '',
  document_number: ''
})

const currentVersion = ref(1)

const proofreadResult = ref(null)
const corrections = ref([])
const formatIssues = ref([])
const polishSuggestions = ref([])
const versions = ref([])
const ignoredIndices = ref([])

const activeTab = ref('corrections')

const versionDialogVisible = ref(false)
const versionPreviewContent = ref('')
const selectedVersion = ref(null)

const wordCount = computed(() => {
  const content = editor?.getValue() || ''
  return content.length
})

const statistics = computed(() => {
  if (!proofreadResult.value) {
    return { total: 0, major: 0, warning: 0, minor: 0, info: 0 }
  }
  
  const stats = proofreadResult.value.statistics?.severity_distribution || {}
  return {
    total: corrections.value.length + formatIssues.value.length,
    major: stats.major || 0,
    warning: stats.warning || 0,
    minor: stats.minor || 0,
    info: stats.info || 0
  }
})

const canApplyCorrections = computed(() => {
  return corrections.value.some(c => c.suggested_text && !ignoredIndices.value.includes(corrections.value.indexOf(c)))
})

const goToDocumentList = () => {
  router.push('/document-list')
}

const initEditor = () => {
  if (!editorContainer.value) return
  
  editor = monaco.editor.create(editorContainer.value, {
    value: '',
    language: 'plaintext',
    theme: 'vs',
    automaticLayout: true,
    minimap: {
      enabled: true
    },
    fontSize: 16,
    lineNumbers: 'on',
    wordWrap: 'on',
    wrappingIndent: 'indent',
    scrollBeyondLastLine: false,
    padding: {
      top: 10,
      bottom: 10
    },
    placeholder: '请在这里输入公文内容...'
  })
}

const handleNewDocument = () => {
  documentId.value = null
  documentForm.value = {
    title: '',
    document_type: 'general',
    status: 'draft',
    red_head_type: '',
    document_number: ''
  }
  currentVersion.value = 1
  if (editor) {
    editor.setValue('')
  }
  proofreadResult.value = null
  corrections.value = []
  formatIssues.value = []
  polishSuggestions.value = []
  versions.value = []
  ignoredIndices.value = []
  ElMessage.info('已新建文档')
}

const handleClear = () => {
  ElMessageBox.confirm('确定要清空当前内容吗？', '确认清空', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    if (editor) {
      editor.setValue('')
    }
    proofreadResult.value = null
    corrections.value = []
    formatIssues.value = []
    polishSuggestions.value = []
    ignoredIndices.value = []
    ElMessage.info('内容已清空')
  }).catch(() => {})
}

const handleSave = async () => {
  const content = editor?.getValue() || ''
  const title = documentForm.value.title
  
  if (!title.trim()) {
    ElMessage.warning('请输入文档标题')
    return
  }
  
  if (!content.trim()) {
    ElMessage.warning('请输入文档内容')
    return
  }
  
  isSaving.value = true
  
  try {
    const data = {
      title: title,
      content: content,
      document_type: documentForm.value.document_type,
      red_head_type: documentForm.value.red_head_type || undefined,
      document_number: documentForm.value.document_number || undefined
    }
    
    let response
    if (documentId.value) {
      response = await documentProofreadingApi.updateDocument(documentId.value, {
        ...data,
        status: documentForm.value.status,
        change_description: '更新文档内容'
      })
      ElMessage.success('更新成功')
    } else {
      response = await documentProofreadingApi.createDocument(data)
      ElMessage.success('保存成功')
    }
    
    const resultData = response.data.data || response.data
    if (resultData?.id) {
      documentId.value = resultData.id
      currentVersion.value = resultData.current_version || currentVersion.value
      await loadVersions()
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

const handleProofread = async (mode = 'all') => {
  const content = editor?.getValue() || ''
  
  if (!content.trim()) {
    ElMessage.warning('请输入文档内容')
    return
  }
  
  isProofreading.value = true
  
  try {
    const options = {
      check_rules: true,
      check_format: true,
      check_bert: true,
      suggest_polish: true
    }
    
    if (mode === 'political') {
      options.check_rules = true
      options.check_format = false
      options.suggest_polish = false
    } else if (mode === 'collocation') {
      options.check_rules = true
      options.check_format = false
      options.suggest_polish = false
    } else if (mode === 'punctuation') {
      options.check_rules = true
      options.check_format = false
      options.suggest_polish = false
    } else if (mode === 'format') {
      options.check_rules = false
      options.check_format = true
      options.suggest_polish = false
    } else if (mode === 'polish') {
      options.check_rules = false
      options.check_format = false
      options.suggest_polish = true
    }
    
    const requestData = {
      text: content,
      options: options
    }
    
    if (documentId.value) {
      requestData.document_id = documentId.value
    }
    
    const response = await documentProofreadingApi.proofread(requestData)
    proofreadResult.value = response.data.data || response.data
    
    corrections.value = proofreadResult.value.corrections || []
    formatIssues.value = proofreadResult.value.format_issues?.issues_by_severity?.all || 
                         (proofreadResult.value.format_issues?.issues_by_severity ? 
                          Object.values(proofreadResult.value.format_issues.issues_by_severity).flat() : [])
    polishSuggestions.value = proofreadResult.value.polish_suggestions || []
    ignoredIndices.value = []
    
    ElMessage.success('校对完成')
  } catch (error) {
    console.error('校对失败:', error)
    ElMessage.error('校对失败')
  } finally {
    isProofreading.value = false
  }
}

const locateCorrection = (correction) => {
  if (!editor || correction.position_start === undefined) return
  
  const model = editor.getModel()
  const startPos = model.getPositionAt(correction.position_start)
  const endPos = model.getPositionAt(correction.position_end || correction.position_start + 1)
  
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

const handleApplySingleCorrection = async (correction, index) => {
  if (!correction.suggested_text) return
  
  isApplying.value = true
  
  try {
    const response = await documentProofreadingApi.applyCorrection({
      text: editor.getValue(),
      correction: correction,
      document_id: documentId.value
    })
    
    if (response.data.corrected_text !== undefined) {
      editor.setValue(response.data.corrected_text)
      
      corrections.value = corrections.value.filter((_, i) => i !== index)
      
      ElMessage.success('修正已应用')
    }
  } catch (error) {
    console.error('应用修正失败:', error)
    ElMessage.error('应用修正失败')
  } finally {
    isApplying.value = false
  }
}

const handleIgnoreCorrection = (index) => {
  ignoredIndices.value.push(index)
}

const handleApplyAllCorrections = async () => {
  const applicableCorrections = corrections.value.filter(
    (c, i) => c.suggested_text && !ignoredIndices.value.includes(i)
  )
  
  if (applicableCorrections.length === 0) {
    ElMessage.warning('没有可应用的修正')
    return
  }
  
  isApplying.value = true
  
  try {
    const response = await documentProofreadingApi.applyCorrections({
      text: editor.getValue(),
      corrections: applicableCorrections,
      document_id: documentId.value
    })
    
    if (response.data.corrected_text !== undefined) {
      editor.setValue(response.data.corrected_text)
      
      corrections.value = []
      ignoredIndices.value = []
      
      ElMessage.success(`已应用 ${response.data.applied_count} 个修正`)
    }
  } catch (error) {
    console.error('批量应用修正失败:', error)
    ElMessage.error('批量应用修正失败')
  } finally {
    isApplying.value = false
  }
}

const loadVersions = async () => {
  if (!documentId.value) return
  
  try {
    const response = await documentProofreadingApi.getVersions(documentId.value)
    versions.value = response.data.data || response.data || []
  } catch (error) {
    console.error('加载版本历史失败:', error)
  }
}

const handlePreviewVersion = (version) => {
  selectedVersion.value = version
  versionPreviewContent.value = version.content
  versionDialogVisible.value = true
}

const handleRevertVersion = async (version) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到版本 v${version.version_number} 吗？当前未保存的修改将丢失。`,
      '确认恢复',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    isReverting.value = true
    
    const response = await documentProofreadingApi.revertToVersion(documentId.value, version.version_number)
    
    if (response.data) {
      editor.setValue(response.data.content || version.content)
      currentVersion.value = response.data.current_version || version.version_number + 1
      await loadVersions()
      ElMessage.success('已恢复到指定版本')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复版本失败:', error)
      ElMessage.error('恢复版本失败')
    }
  } finally {
    isReverting.value = false
  }
}

const handleConfirmRevert = () => {
  if (selectedVersion.value) {
    versionDialogVisible.value = false
    handleRevertVersion(selectedVersion.value)
  }
}

const formatTime = (timeString) => {
  if (!timeString) return '-'
  const date = new Date(timeString)
  return date.toLocaleString('zh-CN')
}

const getCorrectionClass = (severity) => {
  if (severity === 'major') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}

const getCategoryTagType = (category) => {
  if (category === '政治术语') return 'danger'
  if (category === '固定搭配') return 'warning'
  if (category === '标点符号') return 'info'
  if (category === '口语化') return ''
  return 'info'
}

const getSeverityTagType = (severity) => {
  if (severity === 'major') return 'danger'
  if (severity === 'warning') return 'warning'
  if (severity === 'minor') return 'info'
  return 'info'
}

const getSeverityText = (severity) => {
  if (severity === 'major') return '严重'
  if (severity === 'warning') return '警告'
  if (severity === 'minor') return '次要'
  return '信息'
}

onMounted(() => {
  nextTick(() => {
    initEditor()
    
    const docId = route.query.id
    if (docId) {
      documentId.value = parseInt(docId)
      loadDocument(documentId.value)
    }
  })
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
})
</script>

<style scoped>
.document-proofreading-container {
  max-width: 1400px;
  margin: 0 auto;
}

.document-editor {
  height: 400px;
}

.editor-section {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.editor-header-right {
  display: flex;
  gap: 20px;
}

.section-title {
  font-weight: 600;
  color: #303133;
}

.word-count, .version-info {
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.result-summary {
  display: flex;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-text {
  font-size: 16px;
  color: #909399;
}

.result-card {
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  border: 1px solid #e4e7ed;
}

.result-card.error {
  background-color: #fef0f0;
  border-color: #fbc4c4;
}

.result-card.warning {
  background-color: #fdf6ec;
  border-color: #faecd8;
}

.result-card.info {
  background-color: #f4f4f5;
  border-color: #e9e9eb;
}

.polish-card {
  background-color: #ecf5ff;
  border-color: #b3d8ff;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.correction-actions {
  display: flex;
  gap: 8px;
}

.label {
  color: #909399;
  font-size: 14px;
}

.original-text {
  color: #f56c6c;
  text-decoration: line-through;
}

.corrected-text {
  color: #67c23a;
}

.explanation {
  font-size: 13px;
  color: #909399;
  background-color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.confidence {
  font-size: 12px;
  color: #909399;
}

.ml-10 {
  margin-left: 10px;
}

.mt-10 {
  margin-top: 10px;
}

.mt-20 {
  margin-top: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}

.compare-box {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 15px;
}

.original-box, .suggested-box {
  flex: 1;
  padding: 10px;
  border-radius: 4px;
}

.original-box {
  background-color: #fef0f0;
  border: 1px solid #fbc4c4;
}

.suggested-box {
  background-color: #f0f9eb;
  border: 1px solid #c2e7b0;
}

.box-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.arrow-box {
  font-size: 24px;
  color: #409eff;
  font-weight: bold;
}

.issue-description {
  margin: 0;
  color: #606266;
}

.issue-suggestion {
  margin: 5px 0 0 0;
  color: #67c23a;
}

.text-muted {
  color: #909399;
  font-size: 13px;
  margin: 5px 0 0 0;
}

.version-preview {
  max-height: 500px;
  overflow-y: auto;
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
}

.version-preview pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
  margin: 0;
}
</style>
