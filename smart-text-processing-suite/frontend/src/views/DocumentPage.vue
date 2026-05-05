<template>
  <div class="document-page">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span>公文写作智能校对</span>
          <div class="header-actions">
            <el-button @click="saveDocument" :loading="saving">
              <el-icon><Save /></el-icon>
              保存文档
            </el-button>
            <el-button type="primary" @click="checkDocument" :loading="checking">
              <el-icon><Check /></el-icon>
              开始校对
            </el-button>
          </div>
        </div>
      </template>
      <el-form :model="documentForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="文档类型">
              <el-select v-model="documentForm.docType" placeholder="选择文档类型">
                <el-option label="通知" value="notice" />
                <el-option label="请示" value="request" />
                <el-option label="报告" value="report" />
                <el-option label="决定" value="decision" />
                <el-option label="意见" value="opinion" />
                <el-option label="函" value="letter" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="发文字号">
              <el-input v-model="documentForm.docNumber" placeholder="如：国发〔2024〕1号" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="校对级别">
              <el-select v-model="documentForm.checkLevel" placeholder="选择校对级别">
                <el-option label="基础校对" value="basic" />
                <el-option label="标准校对" value="standard" />
                <el-option label="严格校对" value="strict" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-row :gutter="20" class="editor-row">
      <el-col :span="12">
        <el-card class="editor-card">
          <template #header>
            <div class="card-header">
              <span>公文内容</span>
              <span class="char-count">字符数：{{ currentCharCount }}</span>
            </div>
          </template>
          <MonacoEditor
            ref="editorRef"
            v-model="documentForm.content"
            :height="550"
            language="plaintext"
            @change="onContentChange"
          />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="校对问题" name="issues">
            <el-card class="issues-card">
              <div v-if="!checkResult || checkResult.issues.length === 0" class="empty-result">
                <el-empty description="暂无校对问题，请点击开始校对" />
              </div>
              
              <div v-else class="issues-list">
                <el-alert
                  :title="`共发现 ${checkResult.issues.length} 个问题`"
                  type="warning"
                  :closable="false"
                  class="issue-alert"
                />
                
                <div class="issue-items">
                  <div
                    v-for="(issue, index) in checkResult.issues"
                    :key="index"
                    class="issue-item"
                    @click="highlightIssue(issue)"
                  >
                    <el-tag :type="getIssueTagType(issue.severity)" size="small">
                      {{ getSeverityName(issue.severity) }}
                    </el-tag>
                    <span class="issue-category">{{ getCategoryName(issue.category) }}</span>
                    <div class="issue-content">
                      <div class="issue-original">
                        <span class="label">原文：</span>
                        <span class="text">{{ issue.original }}</span>
                      </div>
                      <div class="issue-suggestion" v-if="issue.suggestion">
                        <span class="label">建议：</span>
                        <span class="text suggestion">{{ issue.suggestion }}</span>
                      </div>
                      <div class="issue-explanation" v-if="issue.explanation">
                        {{ issue.explanation }}
                      </div>
                    </div>
                    <el-button
                      v-if="issue.suggestion"
                      type="primary"
                      size="small"
                      @click.stop="applySuggestion(issue)"
                    >
                      应用建议
                    </el-button>
                  </div>
                </div>
              </div>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="格式检查" name="format">
            <el-card class="format-card">
              <div v-if="!checkResult || checkResult.formatIssues.length === 0" class="empty-result">
                <el-empty description="格式检查通过" />
              </div>
              
              <div v-else class="format-issues">
                <el-timeline>
                  <el-timeline-item
                    v-for="(issue, index) in checkResult.formatIssues"
                    :key="index"
                    :type="issue.severity === 'error' ? 'danger' : 'warning'"
                  >
                    <h4>{{ issue.type }}</h4>
                    <p>{{ issue.description }}</p>
                    <p v-if="issue.suggestion" class="suggestion">建议：{{ issue.suggestion }}</p>
                  </el-timeline-item>
                </el-timeline>
              </div>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="润色建议" name="polish">
            <el-card class="polish-card">
              <div v-if="!checkResult || checkResult.polishSuggestions.length === 0" class="empty-result">
                <el-empty description="暂无润色建议" />
              </div>
              
              <div v-else class="polish-list">
                <div
                  v-for="(item, index) in checkResult.polishSuggestions"
                  :key="index"
                  class="polish-item"
                >
                  <div class="polish-original">
                    <span class="label">口语化表达：</span>
                    <span class="text">{{ item.original }}</span>
                  </div>
                  <div class="polish-suggestion">
                    <span class="label">公文用语：</span>
                    <span class="text suggestion">{{ item.suggestion }}</span>
                  </div>
                  <div class="polish-explanation" v-if="item.explanation">
                    {{ item.explanation }}
                  </div>
                </div>
              </div>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="版本历史" name="versions">
            <el-card class="versions-card">
              <div v-if="versions.length === 0" class="empty-result">
                <el-empty description="暂无版本历史" />
              </div>
              
              <div v-else class="versions-list">
                <el-table :data="versions" stripe>
                  <el-table-column prop="version" label="版本" width="100" />
                  <el-table-column prop="createdAt" label="时间" width="180" />
                  <el-table-column prop="wordCount" label="字数" width="100" />
                  <el-table-column label="操作" width="150">
                    <template #default="scope">
                      <el-button type="primary" link @click="viewVersion(scope.row)">
                        查看
                      </el-button>
                      <el-button type="success" link @click="restoreVersion(scope.row)">
                        恢复
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { documentApi } from '@/api'
import MonacoEditor from '@/components/MonacoEditor.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const checking = ref(false)
const saving = ref(false)
const activeTab = ref('issues')
const checkResult = ref(null)
const versions = ref([])
const editorRef = ref(null)

const documentForm = ref({
  docType: 'notice',
  docNumber: '',
  checkLevel: 'standard',
  content: ''
})

const currentCharCount = computed(() => {
  return documentForm.value.content ? documentForm.value.content.length : 0
})

const onContentChange = () => {
  if (checkResult.value) {
    checkResult.value = null
  }
}

const checkDocument = async () => {
  if (!documentForm.value.content.trim()) {
    ElMessage.warning('请输入公文内容')
    return
  }

  checking.value = true
  try {
    const response = await documentApi.checkDocument({
      docType: documentForm.value.docType,
      docNumber: documentForm.value.docNumber,
      checkLevel: documentForm.value.checkLevel,
      content: documentForm.value.content
    })
    checkResult.value = response.data
    highlightIssuesInEditor()
  } catch (error) {
    ElMessage.error('校对失败：' + (error.response?.data?.message || error.message))
  } finally {
    checking.value = false
  }
}

const saveDocument = async () => {
  if (!documentForm.value.content.trim()) {
    ElMessage.warning('请输入公文内容')
    return
  }

  saving.value = true
  try {
    const response = await documentApi.saveDocument({
      title: documentForm.value.docNumber || '未命名文档',
      docType: documentForm.value.docType,
      docNumber: documentForm.value.docNumber,
      content: documentForm.value.content
    })
    ElMessage.success('保存成功')
    loadVersions()
  } catch (error) {
    ElMessage.error('保存失败：' + (error.response?.data?.message || error.message))
  } finally {
    saving.value = false
  }
}

const loadVersions = async () => {
  try {
    // TODO: 需要先获取当前文档ID，这里简化处理
    const response = await documentApi.getVersions('demo-doc-id')
    versions.value = response.data.versions || []
  } catch (error) {
    console.error('加载版本历史失败:', error)
  }
}

const viewVersion = (version) => {
  ElMessageBox.alert(version.content || '版本内容', `版本 ${version.version}`, {
    confirmButtonText: '确定'
  })
}

const restoreVersion = async (version) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到版本 ${version.version} 吗？`,
      '恢复版本',
      { type: 'warning' }
    )
    documentForm.value.content = version.content || ''
    ElMessage.success('版本已恢复')
  } catch {
    // 用户取消
  }
}

const highlightIssuesInEditor = () => {
  if (!checkResult.value || !editorRef.value) return

  const decorations = []
  
  checkResult.value.issues.forEach(issue => {
    if (issue.range) {
      decorations.push({
        range: issue.range,
        options: {
          inlineClassName: getInlineClass(issue.severity),
          hoverMessage: { value: issue.suggestion || issue.explanation }
        }
      })
    }
  })

  editorRef.value.updateDecorations(decorations)
}

const highlightIssue = (issue) => {
  if (issue.range && editorRef.value) {
    const editor = editorRef.value.getEditor()
    if (editor) {
      editor.revealRangeInCenter(issue.range)
    }
  }
}

const applySuggestion = (issue) => {
  if (!issue.suggestion || !editorRef.value) return

  const editor = editorRef.value.getEditor()
  if (!editor) return

  const model = editor.getModel()
  if (!model || !issue.range) return

  const range = new window.monaco.Range(
    issue.range.startLineNumber,
    issue.range.startColumn,
    issue.range.endLineNumber,
    issue.range.endColumn
  )

  editor.executeEdits(null, [{
    range: range,
    text: issue.suggestion
  }])

  ElMessage.success('已应用建议')
}

const getIssueTagType = (severity) => {
  const map = {
    error: 'danger',
    warning: 'warning',
    info: 'info'
  }
  return map[severity] || 'info'
}

const getSeverityName = (severity) => {
  const map = {
    error: '错误',
    warning: '警告',
    info: '提示'
  }
  return map[severity] || severity
}

const getCategoryName = (category) => {
  const map = {
    'political': '政治术语',
    'collocation': '固定搭配',
    'punctuation': '标点符号',
    'style': '文体风格',
    'grammar': '语法'
  }
  return map[category] || category
}

const getInlineClass = (severity) => {
  const map = {
    error: 'error-decoration',
    warning: 'warning-decoration',
    info: 'info-decoration'
  }
  return map[severity] || 'info-decoration'
}

onMounted(() => {
  loadVersions()
})
</script>

<style scoped>
.document-page {
  height: 100%;
}

.header-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.editor-row {
  height: calc(100vh - 280px);
}

.editor-card,
.issues-card,
.format-card,
.polish-card,
.versions-card {
  height: 100%;
}

.char-count {
  color: #909399;
  font-size: 14px;
}

.empty-result {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.issue-alert {
  margin-bottom: 15px;
}

.issue-items {
  max-height: 400px;
  overflow-y: auto;
}

.issue-item {
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.issue-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.issue-category {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}

.issue-content {
  margin-top: 10px;
}

.issue-original,
.issue-suggestion,
.polish-original,
.polish-suggestion {
  margin-bottom: 5px;
}

.issue-explanation,
.polish-explanation {
  margin-top: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
}

.label {
  color: #909399;
  font-size: 12px;
}

.text {
  font-size: 14px;
}

.suggestion {
  color: #67c23a;
}

.polish-list {
  max-height: 450px;
  overflow-y: auto;
}

.polish-item {
  padding: 15px;
  border-bottom: 1px solid #ebeef5;
}

.polish-item:last-child {
  border-bottom: none;
}

.versions-list {
  max-height: 450px;
  overflow-y: auto;
}

.format-issues {
  max-height: 450px;
  overflow-y: auto;
}
</style>
