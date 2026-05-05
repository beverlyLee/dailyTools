<template>
  <div class="essay-page">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span>中文作文智能批改</span>
          <el-button type="primary" @click="checkEssay" :loading="checking">
            <el-icon><Check /></el-icon>
            开始批改
          </el-button>
        </div>
      </template>
      <el-form :model="essayForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="作文标题">
              <el-input v-model="essayForm.title" placeholder="请输入作文标题" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="年级">
              <el-select v-model="essayForm.grade" placeholder="选择年级">
                <el-option label="小学" value="primary" />
                <el-option label="初中" value="middle" />
                <el-option label="高中" value="high" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="字数要求">
              <el-select v-model="essayForm.wordCount" placeholder="字数要求">
                <el-option label="300字" :value="300" />
                <el-option label="500字" :value="500" />
                <el-option label="800字" :value="800" />
                <el-option label="1000字" :value="1000" />
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
              <span>作文内容</span>
              <span class="word-count">字数：{{ currentWordCount }}</span>
            </div>
          </template>
          <MonacoEditor
            v-model="essayForm.content"
            :height="500"
            language="plaintext"
            @change="onContentChange"
          />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="result-card">
          <template #header>
            <span>批改结果</span>
          </template>
          
          <div v-if="!result" class="empty-result">
            <el-empty description="请输入作文并点击开始批改" />
          </div>

          <div v-else class="result-content">
            <div class="score-section">
              <h4>综合评分</h4>
              <el-progress :percentage="result.totalScore" :color="getScoreColor(result.totalScore)" :stroke-width="20">
                <template #default="{ percentage }">
                  <span class="percentage-value">{{ percentage }}分</span>
                </template>
              </el-progress>
              
              <el-row :gutter="20" class="score-dimensions">
                <el-col :span="8">
                  <div class="dimension-item">
                    <div class="dimension-label">内容立意</div>
                    <div class="dimension-score">{{ result.scores.content }}</div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="dimension-item">
                    <div class="dimension-label">语言表达</div>
                    <div class="dimension-score">{{ result.scores.language }}</div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="dimension-item">
                    <div class="dimension-label">结构层次</div>
                    <div class="dimension-score">{{ result.scores.structure }}</div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <div class="issues-section" v-if="result.issues && result.issues.length > 0">
              <h4>发现问题</h4>
              <el-timeline>
                <el-timeline-item
                  v-for="(issue, index) in result.issues"
                  :key="index"
                  :type="getIssueType(issue.type)"
                >
                  <el-card>
                    <div class="issue-item">
                      <div class="issue-type">{{ getIssueTypeName(issue.type) }}</div>
                      <div class="issue-original">原文：{{ issue.original }}</div>
                      <div class="issue-suggestion" v-if="issue.suggestion">建议：{{ issue.suggestion }}</div>
                      <div class="issue-explanation" v-if="issue.explanation">{{ issue.explanation }}</div>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </div>

            <div class="comment-section" v-if="result.comment">
              <h4>综合评语</h4>
              <div class="comment-text">{{ result.comment }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { essayApi } from '@/api'
import MonacoEditor from '@/components/MonacoEditor.vue'

const checking = ref(false)
const result = ref(null)

const essayForm = ref({
  title: '',
  grade: 'middle',
  wordCount: 800,
  content: ''
})

const currentWordCount = computed(() => {
  return essayForm.value.content ? essayForm.value.content.replace(/\s/g, '').length : 0
})

const onContentChange = () => {
  // 内容变化时重置结果
  if (result.value) {
    result.value = null
  }
}

const checkEssay = async () => {
  if (!essayForm.value.content.trim()) {
    ElMessage.warning('请输入作文内容')
    return
  }

  checking.value = true
  try {
    const response = await essayApi.checkEssay({
      title: essayForm.value.title,
      grade: essayForm.value.grade,
      wordCount: essayForm.value.wordCount,
      content: essayForm.value.content
    })
    result.value = response.data
  } catch (error) {
    ElMessage.error('批改失败：' + (error.response?.data?.message || error.message))
  } finally {
    checking.value = false
  }
}

const getScoreColor = (score) => {
  if (score >= 85) return '#67c23a'
  if (score >= 70) return '#e6a23c'
  return '#f56c6c'
}

const getIssueType = (type) => {
  const typeMap = {
    'typo': 'danger',
    'grammar': 'warning',
    'idiom': 'warning',
    'punctuation': 'info',
    'style': ''
  }
  return typeMap[type] || ''
}

const getIssueTypeName = (type) => {
  const nameMap = {
    'typo': '错别字',
    'grammar': '语法问题',
    'idiom': '成语使用',
    'punctuation': '标点符号',
    'style': '表达建议'
  }
  return nameMap[type] || type
}

import { ElMessage } from 'element-plus'
</script>

<style scoped>
.essay-page {
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

.editor-row {
  height: calc(100vh - 280px);
}

.editor-card,
.result-card {
  height: 100%;
}

.word-count {
  color: #909399;
  font-size: 14px;
}

.empty-result {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.result-content {
  max-height: 450px;
  overflow-y: auto;
}

.score-section {
  margin-bottom: 20px;
}

.score-section h4 {
  margin-bottom: 15px;
  color: #303133;
}

.percentage-value {
  font-size: 18px;
  font-weight: bold;
}

.score-dimensions {
  margin-top: 20px;
}

.dimension-item {
  text-align: center;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
}

.dimension-label {
  color: #909399;
  font-size: 14px;
}

.dimension-score {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-top: 5px;
}

.issues-section,
.comment-section {
  margin-top: 20px;
}

.issues-section h4,
.comment-section h4 {
  margin-bottom: 15px;
  color: #303133;
}

.issue-item .issue-type {
  font-weight: bold;
  margin-bottom: 5px;
}

.issue-original,
.issue-suggestion,
.issue-explanation {
  margin-bottom: 3px;
  font-size: 13px;
}

.issue-original {
  color: #f56c6c;
}

.issue-suggestion {
  color: #67c23a;
}

.issue-explanation {
  color: #909399;
  font-style: italic;
}

.comment-text {
  padding: 15px;
  background: #ecf5ff;
  border-radius: 8px;
  line-height: 1.8;
  color: #303133;
}
</style>
