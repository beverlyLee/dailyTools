<template>
  <div class="essay-detail-container">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="essay-card">
          <template #header>
            <div class="card-header">
              <span>{{ essay.title }}</span>
              <div class="actions">
                <el-button size="small" @click="reAnalyze">
                  <el-icon><Refresh /></el-icon>
                  重新分析
                </el-button>
                <el-button size="small" @click="$router.back()">
                  <el-icon><Back /></el-icon>
                  返回
                </el-button>
              </div>
            </div>
          </template>

          <div class="essay-meta">
            <el-tag size="small">{{ essay.word_count || 0 }}字</el-tag>
            <span class="submit-time">提交时间：{{ formatDate(essay.submitted_at) }}</span>
          </div>

          <el-divider />

          <div class="essay-content" v-html="essay.content"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="score-card">
          <template #header>
            <span>评分详情</span>
          </template>

          <div class="total-score-section">
            <div class="score-circle">
              <span class="score-value">{{ grading?.total_score || 0 }}</span>
              <span class="score-unit">分</span>
            </div>
            <el-progress 
              type="dashboard"
              :percentage="grading?.total_score || 0"
              :color="getScoreColor(grading?.total_score)"
              :width="120"
            />
          </div>

          <el-divider />

          <div class="dimension-scores">
            <div class="dimension-item">
              <div class="dimension-header">
                <span>内容立意</span>
                <span class="score">{{ grading?.content_score || 0 }}分</span>
              </div>
              <el-progress 
                :percentage="grading?.content_score || 0" 
                :stroke-width="10"
                status="exception"
              />
            </div>
            <div class="dimension-item">
              <div class="dimension-header">
                <span>语言表达</span>
                <span class="score">{{ grading?.language_score || 0 }}分</span>
              </div>
              <el-progress 
                :percentage="grading?.language_score || 0" 
                :stroke-width="10"
                status="exception"
              />
            </div>
            <div class="dimension-item">
              <div class="dimension-header">
                <span>结构层次</span>
                <span class="score">{{ grading?.structure_score || 0 }}分</span>
              </div>
              <el-progress 
                :percentage="grading?.structure_score || 0" 
                :stroke-width="10"
                status="exception"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px;">
      <template #header>
        <span>批改评语</span>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="总体评价" name="overview">
          <div class="comment-box">
            <p>{{ grading?.overall_comment || '暂无评价' }}</p>
          </div>
        </el-tab-pane>
        <el-tab-pane label="分项评价" name="details">
          <div class="sub-comments">
            <div class="sub-comment">
              <el-tag type="primary">内容立意</el-tag>
              <p>{{ grading?.content_comment || '暂无评价' }}</p>
            </div>
            <el-divider />
            <div class="sub-comment">
              <el-tag type="success">语言表达</el-tag>
              <p>{{ grading?.language_comment || '暂无评价' }}</p>
            </div>
            <el-divider />
            <div class="sub-comment">
              <el-tag type="warning">结构层次</el-tag>
              <p>{{ grading?.structure_comment || '暂无评价' }}</p>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="错误检测" name="errors">
          <el-table :data="errors" style="width: 100%">
            <el-table-column prop="error_type" label="错误类型" width="120">
              <template #default="scope">
                <el-tag :type="getErrorTagType(scope.row.severity)" size="small">
                  {{ scope.row.error_type }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="original_text" label="原文" min-width="150">
              <template #default="scope">
                <span style="text-decoration: line-through; color: #f56c6c;">
                  {{ scope.row.original_text }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="corrected_text" label="改正" min-width="150">
              <template #default="scope">
                <span style="color: #67c23a; font-weight: 500;">
                  {{ scope.row.corrected_text || '无需改正' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="explanation" label="说明" min-width="200" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="改进建议" name="suggestions">
          <div class="suggestions-box">
            <p style="white-space: pre-line;">{{ grading?.suggestions || '暂无建议' }}</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { essayApi } from '../api'

const route = useRoute()

const essay = ref({
  title: '我的妈妈',
  content: '<p>我的妈妈是一位普通的家庭主妇，但在我心中，她却是世界上最伟大的人。</p><p>妈妈每天很早就起床，为我们准备早餐。她做的饭菜总是那么美味，让我和爸爸吃得津津有味。</p><p>妈妈对我的学习非常关心。每当我遇到困难时，她总是耐心地帮助我，鼓励我不要放弃。</p><p>我记得有一次我生病了，妈妈整夜守在我的床边，照顾我。当我醒来时，看到妈妈疲惫的面容，我感动得流下了眼泪。</p><p>妈妈就是这样，默默地为我们付出，从不抱怨。我想对妈妈说："妈妈，您辛苦了！我永远爱您！"</p>',
  word_count: 380,
  submitted_at: '2024-01-15T10:30:00'
})

const grading = ref({
  total_score: 82,
  content_score: 85,
  language_score: 78,
  structure_score: 83,
  overall_comment: '这是一篇感情真挚的作文。作者通过具体的事例，展现了妈妈对自己的关爱。文章结构完整，语言流畅，是一篇不错的习作。',
  content_comment: '文章主题明确，围绕"我的妈妈"展开叙述。通过"准备早餐"、"关心学习"、"生病照顾"等具体事例，展现了妈妈的伟大。感情真挚，能够引起读者的共鸣。',
  language_comment: '语言表达基本通顺，但词汇略显单调。建议适当运用一些修辞手法，如比喻、拟人等，使语言更加生动形象。',
  structure_comment: '文章结构完整，采用"总-分-总"的结构。开头点明主题，中间通过具体事例展开叙述，结尾总结全文。段落划分清晰，逻辑严谨。',
  suggestions: '【内容建议】可以增加更多细节描写，如妈妈的外貌特征、说话的语气等，让人物形象更加鲜明。\n【语言建议】尝试运用一些成语或修辞手法，使语言更加丰富生动。\n【结构建议】可以在每个事例前加上过渡句，使文章衔接更加自然。'
})

const errors = ref([
  {
    error_type: '错别字',
    original_text: '在',
    corrected_text: '再',
    explanation: '此处应该用"再"，表示"又一次"的意思',
    severity: 'medium'
  },
  {
    error_type: '的地得',
    original_text: '地饭菜',
    corrected_text: '的饭菜',
    explanation: '形容词后面应该用"的"',
    severity: 'minor'
  }
])

const activeTab = ref('overview')
const loading = ref(false)

onMounted(() => {
  loadEssayDetail()
})

const loadEssayDetail = async () => {
  const essayId = route.params.id
  if (!essayId) return
  
  try {
    loading.value = true
    const response = await essayApi.getById(essayId)
    if (response.data.essay) {
      essay.value = response.data.essay
      grading.value = response.data.grading
      errors.value = response.data.errors || []
    }
  } catch (error) {
    console.log('使用模拟数据')
  } finally {
    loading.value = false
  }
}

const reAnalyze = async () => {
  const essayId = route.params.id
  if (!essayId) return
  
  try {
    loading.value = true
    const response = await essayApi.reAnalyze(essayId)
    if (response.data.success) {
      ElMessage.success('重新分析成功')
      loadEssayDetail()
    }
  } catch (error) {
    ElMessage.error('重新分析失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const getScoreColor = (score) => {
  if (!score) return '#909399'
  if (score >= 90) return '#67c23a'
  if (score >= 80) return '#409eff'
  if (score >= 70) return '#e6a23c'
  if (score >= 60) return '#909399'
  return '#f56c6c'
}

const getErrorTagType = (severity) => {
  switch (severity) {
    case 'major': return 'danger'
    case 'medium': return 'warning'
    case 'minor': return 'info'
    default: return 'info'
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.essay-detail-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions {
  display: flex;
  gap: 10px;
}

.essay-meta {
  display: flex;
  gap: 20px;
  align-items: center;
  color: #909399;
  font-size: 14px;
}

.essay-content {
  line-height: 1.8;
  font-size: 16px;
  color: #303133;
}

.essay-content p {
  margin-bottom: 15px;
  text-indent: 2em;
}

.score-card {
  height: 100%;
}

.total-score-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
  padding: 20px 0;
}

.score-circle {
  text-align: center;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  color: #409eff;
}

.score-unit {
  font-size: 18px;
  color: #909399;
}

.dimension-item {
  margin-bottom: 20px;
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dimension-header .score {
  font-weight: bold;
  color: #409eff;
}

.comment-box,
.sub-comments,
.suggestions-box {
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.sub-comment {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.sub-comment .el-tag {
  flex-shrink: 0;
}

.sub-comment p {
  margin: 0;
  line-height: 1.6;
  color: #606266;
}
</style>
