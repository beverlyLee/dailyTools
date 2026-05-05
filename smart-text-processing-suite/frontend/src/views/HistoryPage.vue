<template>
  <div class="history-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="全部类型" clearable>
            <el-option label="作文批改" value="essay" />
            <el-option label="公文校对" value="document" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="reset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-card">
      <el-table :data="historyList" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.type === 'essay' ? 'primary' : 'success'" size="small">
              {{ scope.row.type === 'essay' ? '作文批改' : '公文校对' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="评分" width="100">
          <template #default="scope">
            <span v-if="scope.row.score" :class="getScoreClass(scope.row.score)">
              {{ scope.row.score }}分
            </span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="issues" label="问题数" width="100">
          <template #default="scope">
            <span>{{ scope.row.issues || 0 }}个</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="viewDetail(scope.row)">
              查看详情
            </el-button>
            <el-button type="danger" link @click="deleteItem(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        class="pagination"
      />
    </el-card>

    <el-dialog
      v-model="detailVisible"
      title="详情"
      width="800px"
      destroy-on-close
    >
      <el-descriptions :column="2" border v-if="currentDetail">
        <el-descriptions-item label="标题">{{ currentDetail.title }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          {{ currentDetail.type === 'essay' ? '作文批改' : '公文校对' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentDetail.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="评分" v-if="currentDetail.score">
          <span :class="getScoreClass(currentDetail.score)">{{ currentDetail.score }}分</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider>内容</el-divider>
      <div class="detail-content">
        <pre>{{ currentDetail?.content || '-' }}</pre>
      </div>

      <el-divider v-if="currentDetail?.result">分析结果</el-divider>
      <div v-if="currentDetail?.result" class="detail-result">
        <pre>{{ JSON.stringify(currentDetail.result, null, 2) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { essayApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const detailVisible = ref(false)
const currentDetail = ref(null)

const searchForm = reactive({
  type: '',
  dateRange: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const historyList = ref([
  {
    id: 1,
    title: '我的梦想',
    type: 'essay',
    score: 85,
    issues: 3,
    createdAt: '2024-01-15 10:30:00',
    content: '每个人都有自己的梦想...',
    result: { totalScore: 85, scores: { content: 28, language: 30, structure: 27 } }
  },
  {
    id: 2,
    title: '关于加强安全生产的通知',
    type: 'document',
    score: null,
    issues: 5,
    createdAt: '2024-01-14 15:20:00',
    content: '各部门：为进一步加强安全生产工作...',
    result: { issues: [], formatIssues: [] }
  }
])

const search = () => {
  loadHistoryList()
}

const reset = () => {
  searchForm.type = ''
  searchForm.dateRange = null
  loadHistoryList()
}

const loadHistoryList = async () => {
  loading.value = true
  try {
    // TODO: 调用实际API
    // const params = {
    //   page: pagination.page,
    //   pageSize: pagination.pageSize,
    //   type: searchForm.type
    // }
    // const response = await essayApi.getHistory(params)
    // historyList.value = response.data.list
    // pagination.total = response.data.total
  } catch (error) {
    ElMessage.error('加载失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  loadHistoryList()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  loadHistoryList()
}

const viewDetail = (row) => {
  currentDetail.value = row
  detailVisible.value = true
}

const deleteItem = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${row.title}"吗？`,
      '删除确认',
      { type: 'warning' }
    )
    // TODO: 调用删除API
    const index = historyList.value.findIndex(item => item.id === row.id)
    if (index > -1) {
      historyList.value.splice(index, 1)
    }
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

const getScoreClass = (score) => {
  if (score >= 85) return 'score-excellent'
  if (score >= 70) return 'score-good'
  return 'score-need-improve'
}

onMounted(() => {
  loadHistoryList()
})
</script>

<style scoped>
.history-page {
  height: 100%;
}

.filter-card {
  margin-bottom: 20px;
}

.list-card {
  height: calc(100vh - 220px);
}

.pagination {
  margin-top: 20px;
  justify-content: flex-end;
}

.text-gray {
  color: #909399;
}

.score-excellent {
  color: #67c23a;
  font-weight: bold;
}

.score-good {
  color: #e6a23c;
  font-weight: bold;
}

.score-need-improve {
  color: #f56c6c;
  font-weight: bold;
}

.detail-content,
.detail-result {
  max-height: 300px;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.detail-content pre,
.detail-result pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}
</style>
