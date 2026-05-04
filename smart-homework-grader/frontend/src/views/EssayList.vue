<template>
  <div class="essay-list-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>我的作文</span>
          <el-button type="primary" @click="$router.push('/')">
            <el-icon><Edit /></el-icon>
            写作文
          </el-button>
        </div>
      </template>

      <el-table :data="essays" style="width: 100%" v-loading="loading">
        <el-table-column prop="title" label="作文标题" min-width="200">
          <template #default="scope">
            <el-link type="primary" @click="viewDetail(scope.row.id)">
              {{ scope.row.title }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="word_count" label="字数" width="100">
          <template #default="scope">
            {{ scope.row.word_count || 0 }}字
          </template>
        </el-table-column>
        <el-table-column label="得分" width="120">
          <template #default="scope">
            <el-tag :type="getScoreTagType(scope.row.gradings?.[0]?.total_score)">
              {{ scope.row.gradings?.[0]?.total_score || '--' }}分
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitted_at" label="提交时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.submitted_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="viewDetail(scope.row.id)">
              查看详情
            </el-button>
            <el-button type="warning" link @click="reAnalyze(scope.row.id)">
              重新分析
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { essayApi } from '../api'

const router = useRouter()

const essays = ref([])
const loading = ref(false)

onMounted(() => {
  loadEssays()
})

const loadEssays = async () => {
  loading.value = true
  try {
    essays.value = [
      {
        id: 1,
        title: '我的妈妈',
        word_count: 580,
        submitted_at: '2024-01-15T10:30:00',
        gradings: [{ total_score: 85 }]
      },
      {
        id: 2,
        title: '春天的故事',
        word_count: 620,
        submitted_at: '2024-01-14T14:20:00',
        gradings: [{ total_score: 78 }]
      },
      {
        id: 3,
        title: '难忘的一天',
        word_count: 450,
        submitted_at: '2024-01-13T09:15:00',
        gradings: [{ total_score: 92 }]
      }
    ]
  } catch (error) {
    ElMessage.error('加载作文列表失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const viewDetail = (id) => {
  router.push(`/essay/${id}`)
}

const reAnalyze = async (id) => {
  try {
    loading.value = true
    const response = await essayApi.reAnalyze(id)
    if (response.data.success) {
      ElMessage.success('重新分析成功')
      loadEssays()
    }
  } catch (error) {
    ElMessage.error('重新分析失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const getScoreTagType = (score) => {
  if (!score) return 'info'
  if (score >= 90) return 'success'
  if (score >= 80) return 'primary'
  if (score >= 60) return 'warning'
  return 'danger'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.essay-list-container {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
