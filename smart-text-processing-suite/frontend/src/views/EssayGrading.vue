<template>
  <div class="essay-grading-container fade-in">
    <el-card class="card-container">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><EditPen /></el-icon>
          中文作文智能批改
        </h2>
        <el-button type="primary" @click="goToEssayList">
          <el-icon><List /></el-icon>
          作文列表
        </el-button>
      </div>
      
      <el-form :model="essayForm" label-width="80px">
        <el-form-item label="作文标题">
          <el-input 
            v-model="essayForm.title" 
            placeholder="请输入作文标题" 
            :disabled="isGrading"
          />
        </el-form-item>
        <el-form-item label="学生信息">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-input 
                v-model="essayForm.studentName" 
                placeholder="学生姓名" 
                :disabled="isGrading"
              />
            </el-col>
            <el-col :span="8">
              <el-input 
                v-model="essayForm.className" 
                placeholder="班级" 
                :disabled="isGrading"
              />
            </el-col>
            <el-col :span="8">
              <el-input 
                v-model="essayForm.grade" 
                placeholder="年级" 
                :disabled="isGrading"
              />
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      
      <el-divider />
      
      <div class="editor-section">
        <div class="editor-header">
          <span class="section-title">作文内容编辑器</span>
          <span class="word-count">字数: {{ wordCount }}</span>
        </div>
        <div ref="editorContainer" class="monaco-editor-container essay-editor"></div>
      </div>
      
      <div class="action-buttons mt-20">
        <el-button 
          type="primary" 
          size="large" 
          :loading="isGrading" 
          @click="handleGrade"
        >
          <el-icon><MagicStick /></el-icon>
          智能批改
        </el-button>
        <el-button 
          size="large" 
          :loading="isSaving" 
          @click="handleSave"
        >
          <el-icon><Download /></el-icon>
          保存作文
        </el-button>
        <el-button size="large" @click="handleClear">
          <el-icon><Delete /></el-icon>
          清空内容
        </el-button>
      </div>
    </el-card>
    
    <el-card class="card-container mt-20" v-if="gradingResult">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><Analysis /></el-icon>
          批改结果
        </h2>
      </div>
      
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value">{{ gradingResult.total_score || 0 }}</div>
            <div class="score-label">总分</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color: #67c23a;">{{ gradingResult.content_score || 0 }}</div>
            <div class="score-label">内容立意</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color: #e6a23c;">{{ gradingResult.language_score || 0 }}</div>
            <div class="score-label">语言表达</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color: #909399;">{{ gradingResult.structure_score || 0 }}</div>
            <div class="score-label">结构层次</div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-tabs v-model="activeTab" class="mt-20">
        <el-tab-pane label="详细评语" name="comments">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="内容立意评语">
              {{ gradingResult.content_comment || '暂无' }}
            </el-descriptions-item>
            <el-descriptions-item label="语言表达评语">
              {{ gradingResult.language_comment || '暂无' }}
            </el-descriptions-item>
            <el-descriptions-item label="结构层次评语">
              {{ gradingResult.structure_comment || '暂无' }}
            </el-descriptions-item>
            <el-descriptions-item label="总体评价">
              {{ gradingResult.overall_comment || '暂无' }}
            </el-descriptions-item>
            <el-descriptions-item label="改进建议">
              {{ gradingResult.suggestions || '暂无' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        
        <el-tab-pane label="错误检测" name="errors">
          <div v-if="errors.length === 0" class="empty-state">
            <div class="empty-icon">✅</div>
            <div class="empty-text">未检测到明显错误</div>
          </div>
          <div v-else>
            <div 
              v-for="(error, index) in errors" 
              :key="index" 
              class="result-card" 
              :class="getErrorClass(error.severity)"
              @click="locateError(error)"
            >
              <div class="flex-between">
                <el-tag :type="getErrorTagType(error.severity)" size="small">
                  {{ error.error_type }}
                </el-tag>
                <el-tag v-if="error.severity" :type="getSeverityTagType(error.severity)" size="small">
                  {{ error.severity === 'critical' ? '严重' : error.severity === 'major' ? '中等' : '轻微' }}
                </el-tag>
              </div>
              <div class="mt-10">
                <span class="label">原文：</span>
                <span class="original-text">{{ error.original_text }}</span>
              </div>
              <div v-if="error.corrected_text" class="mt-10">
                <span class="label">建议：</span>
                <span class="corrected-text">{{ error.corrected_text }}</span>
              </div>
              <div v-if="error.explanation" class="mt-10 explanation">
                {{ error.explanation }}
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="句法分析" name="syntax">
          <div v-if="syntaxAnalysis.length === 0" class="empty-state">
            <div class="empty-icon">📊</div>
            <div class="empty-text">暂无句法分析数据</div>
          </div>
          <div v-else>
            <el-table :data="syntaxAnalysis" border stripe>
              <el-table-column prop="word" label="词语" width="120" />
              <el-table-column prop="pos" label="词性" width="100" />
              <el-table-column prop="dep" label="依存关系" width="120" />
              <el-table-column prop="head" label="支配词" width="120" />
              <el-table-column prop="explanation" label="说明" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { EditPen, List, MagicStick, Download, Delete, Analysis } from '@element-plus/icons-vue'
import * as monaco from 'monaco-editor'
import { essayGradingApi } from '@/api'

const router = useRouter()

const editorContainer = ref(null)
let editor = null

const essayForm = ref({
  title: '',
  studentName: '',
  className: '',
  grade: ''
})

const isGrading = ref(false)
const isSaving = ref(false)
const gradingResult = ref(null)
const errors = ref([])
const syntaxAnalysis = ref([])
const activeTab = ref('comments')

const wordCount = computed(() => {
  const content = editor?.getValue() || ''
  return content.length
})

const goToEssayList = () => {
  router.push('/essay-list')
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
    placeholder: '请在这里输入作文内容...'
  })
}

const handleGrade = async () => {
  const content = editor?.getValue() || ''
  const title = essayForm.value.title
  
  if (!title.trim()) {
    ElMessage.warning('请输入作文标题')
    return
  }
  
  if (!content.trim()) {
    ElMessage.warning('请输入作文内容')
    return
  }
  
  isGrading.value = true
  gradingResult.value = null
  errors.value = []
  syntaxAnalysis.value = []
  
  try {
    const response = await essayGradingApi.submitEssay({
      title: title,
      content: content,
      student_name: essayForm.value.studentName || '匿名',
      class_name: essayForm.value.className || '',
      grade: essayForm.value.grade || ''
    })
    
    if (response.data.success) {
      const essayId = response.data.data.essay_id
      
      const gradeResponse = await essayGradingApi.gradeEssay(essayId)
      if (gradeResponse.data.success) {
        gradingResult.value = gradeResponse.data.data.grading
        errors.value = gradeResponse.data.data.errors || []
        syntaxAnalysis.value = gradeResponse.data.data.syntax_analysis || []
        ElMessage.success('作文批改完成！')
      }
    }
  } catch (error) {
    console.error('批改失败:', error)
    ElMessage.error('批改失败，请重试')
  } finally {
    isGrading.value = false
  }
}

const handleSave = async () => {
  const content = editor?.getValue() || ''
  const title = essayForm.value.title
  
  if (!title.trim()) {
    ElMessage.warning('请输入作文标题')
    return
  }
  
  if (!content.trim()) {
    ElMessage.warning('请输入作文内容')
    return
  }
  
  isSaving.value = true
  
  try {
    const response = await essayGradingApi.submitEssay({
      title: title,
      content: content,
      student_name: essayForm.value.studentName || '匿名',
      class_name: essayForm.value.className || '',
      grade: essayForm.value.grade || ''
    })
    
    if (response.data.success) {
      ElMessage.success('保存成功！')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    isSaving.value = false
  }
}

const handleClear = () => {
  if (editor) {
    editor.setValue('')
  }
  essayForm.value = {
    title: '',
    studentName: '',
    className: '',
    grade: ''
  }
  gradingResult.value = null
  errors.value = []
  syntaxAnalysis.value = []
  ElMessage.info('内容已清空')
}

const getErrorClass = (severity) => {
  if (severity === 'critical') return 'error'
  if (severity === 'major') return 'warning'
  return 'info'
}

const getErrorTagType = (type) => {
  if (type === '错别字') return 'danger'
  if (type === '成语使用') return 'warning'
  if (type === '语法错误') return 'danger'
  return 'info'
}

const getSeverityTagType = (severity) => {
  if (severity === 'critical') return 'danger'
  if (severity === 'major') return 'warning'
  return 'info'
}

const locateError = (error) => {
  if (!editor || error.position_start === undefined) return
  
  const model = editor.getModel()
  const startPos = model.getPositionAt(error.position_start)
  const endPos = model.getPositionAt(error.position_end || error.position_start + 1)
  
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

onMounted(() => {
  nextTick(() => {
    initEditor()
  })
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
})
</script>

<style scoped>
.essay-grading-container {
  max-width: 1400px;
  margin: 0 auto;
}

.essay-editor {
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

.section-title {
  font-weight: 600;
  color: #303133;
}

.word-count {
  color: #909399;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.score-card {
  text-align: center;
}

.score-card :deep(.el-card__body) {
  padding: 20px;
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
  background-color: #f4f4f5;
  padding: 8px 12px;
  border-radius: 4px;
}
</style>
