<template>
  <div class="essay-detail-container fade-in">
    <el-card class="card-container">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><Document /></el-icon>
          作文详情
        </h2>
        <div class="header-actions">
          <el-button @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-button type="primary" @click="handleGrade" :loading="isGrading" v-if="!essayData?.is_graded">
            <el-icon><MagicStick /></el-icon>
            开始批改
          </el-button>
        </div>
      </div>
      
      <el-descriptions :column="3" border class="mb-20">
        <el-descriptions-item label="作文标题">{{ essayData?.title || '-' }}</el-descriptions-item>
        <el-descriptions-item label="学生姓名">{{ essayData?.student_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="班级">{{ essayData?.class_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="年级">{{ essayData?.grade || '-' }}</el-descriptions-item>
        <el-descriptions-item label="字数">{{ essayData?.word_count || 0 }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ formatTime(essayData?.submitted_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="批改状态">
          <el-tag :type="essayData?.is_graded ? 'success' : 'warning'">
            {{ essayData?.is_graded ? '已批改' : '未批改' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider />
      
      <div class="content-section">
        <h3 class="section-title">作文内容</h3>
        <div class="essay-content" v-if="essayData?.content">
          <pre>{{ essayData.content }}</pre>
        </div>
        <el-empty v-else description="暂无内容" />
      </div>
    </el-card>
    
    <el-card class="card-container mt-20" v-if="gradingData">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><DataAnalysis /></el-icon>
          批改结果
        </h2>
      </div>
      
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" :style="{ color: getScoreColor(gradingData?.total_score) }">
              {{ gradingData?.total_score || 0 }}
            </div>
            <div class="score-label">总分</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color: #67c23a;">
              {{ gradingData?.content_score || 0 }}
            </div>
            <div class="score-label">内容立意</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color: #e6a23c;">
              {{ gradingData?.language_score || 0 }}
            </div>
            <div class="score-label">语言表达</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="score-card">
            <div class="score-value" style="color: #909399;">
              {{ gradingData?.structure_score || 0 }}
            </div>
            <div class="score-label">结构层次</div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-tabs v-model="activeTab" class="mt-20">
        <el-tab-pane label="详细评语" name="comments">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="内容立意评语">
              <p class="comment-text">{{ gradingData?.content_comment || '暂无' }}</p>
            </el-descriptions-item>
            <el-descriptions-item label="语言表达评语">
              <p class="comment-text">{{ gradingData?.language_comment || '暂无' }}</p>
            </el-descriptions-item>
            <el-descriptions-item label="结构层次评语">
              <p class="comment-text">{{ gradingData?.structure_comment || '暂无' }}</p>
            </el-descriptions-item>
            <el-descriptions-item label="总体评价">
              <p class="comment-text">{{ gradingData?.overall_comment || '暂无' }}</p>
            </el-descriptions-item>
            <el-descriptions-item label="改进建议">
              <p class="comment-text">{{ gradingData?.suggestions || '暂无' }}</p>
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
            >
              <div class="flex-between">
                <el-tag :type="getErrorTagType(error.error_type)" size="small">
                  {{ error.error_type || '未知类型' }}
                </el-tag>
                <el-tag v-if="error.severity" :type="getSeverityTagType(error.severity)" size="small">
                  {{ getSeverityText(error.severity) }}
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
              <el-table-column prop="word" label="词语" width="150" />
              <el-table-column prop="pos" label="词性" width="100" />
              <el-table-column prop="dep" label="依存关系" width="150" />
              <el-table-column prop="head" label="支配词" width="150" />
              <el-table-column prop="explanation" label="说明" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <el-loading-mask v-if="loading">
      <div class="loading-text">加载中...</div>
    </el-loading-mask>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, ArrowLeft, MagicStick, DataAnalysis } from '@element-plus/icons-vue'
import { essayGradingApi } from '@/api'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const isGrading = ref(false)
const essayData = ref(null)
const gradingData = ref(null)
const errors = ref([])
const syntaxAnalysis = ref([])
const activeTab = ref('comments')

const goBack = () => {
  router.push('/essay-list')
}

const loadEssayDetail = async () => {
  const essayId = route.params.id
  if (!essayId) {
    ElMessage.error('作文ID不存在')
    return
  }
  
  loading.value = true
  try {
    const response = await essayGradingApi.getEssayById(essayId)
    essayData.value = response.data.data || response.data
    
    if (essayData.value?.is_graded) {
      await loadGradingData(essayId)
    }
  } catch (error) {
    console.error('加载作文详情失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const loadGradingData = async (essayId) => {
  try {
    const response = await essayGradingApi.getGradingById(essayId)
    const data = response.data.data || response.data
    gradingData.value = data.grading || data
    errors.value = data.errors || []
    syntaxAnalysis.value = data.syntax_analysis || []
  } catch (error) {
    console.error('加载批改数据失败:', error)
  }
}

const handleGrade = async () => {
  const essayId = route.params.id
  if (!essayId) return
  
  isGrading.value = true
  try {
    const response = await essayGradingApi.gradeEssay(essayId)
    if (response.data.success || response.data) {
      ElMessage.success('批改完成')
      await loadEssayDetail()
    }
  } catch (error) {
    console.error('批改失败:', error)
    ElMessage.error('批改失败')
  } finally {
    isGrading.value = false
  }
}

const formatTime = (timeString) => {
  if (!timeString) return '-'
  const date = new Date(timeString)
  return date.toLocaleString('zh-CN')
}

const getScoreColor = (score) => {
  if (score >= 90) return '#67c23a'
  if (score >= 70) return '#e6a23c'
  if (score >= 60) return '#909399'
  return '#f56c6c'
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

const getSeverityText = (severity) => {
  if (severity === 'critical') return '严重'
  if (severity === 'major') return '中等'
  return '轻微'
}

onMounted(() => {
  loadEssayDetail()
})
</script>

<style scoped>
.essay-detail-container {
  max-width: 1400px;
  margin: 0 auto;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.content-section {
  margin-top: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #303133;
}

.essay-content {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.essay-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
  margin: 0;
}

.score-card {
  text-align: center;
}

.score-card :deep(.el-card__body) {
  padding: 20px;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 10px;
}

.score-label {
  font-size: 14px;
  color: #909399;
}

.comment-text {
  margin: 0;
  line-height: 1.8;
  color: #606266;
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

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.mt-10 {
  margin-top: 10px;
}

.mt-20 {
  margin-top: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}

.loading-text {
  font-size: 16px;
  color: #606266;
}
</style>
