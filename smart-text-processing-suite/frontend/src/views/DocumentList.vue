<template>
  <div class="document-list-container fade-in">
    <el-card class="card-container">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><List /></el-icon>
          文档列表
        </h2>
        <el-button type="primary" @click="goToProofreading">
          <el-icon><Plus /></el-icon>
          新建文档
        </el-button>
      </div>
      
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="请输入关键词" clearable />
        </el-form-item>
        <el-form-item label="文档类型">
          <el-select v-model="searchForm.document_type" placeholder="请选择" clearable>
            <el-option label="全部" value="" />
            <el-option label="通用文档" value="general" />
            <el-option label="正式公文" value="official" />
            <el-option label="报告" value="report" />
            <el-option label="通知" value="notice" />
            <el-option label="决定" value="decision" />
            <el-option label="函" value="letter" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="全部" value="" />
            <el-option label="草稿" value="draft" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="已通过" value="approved" />
            <el-option label="已发布" value="published" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
      
      <el-table :data="documentList" v-loading="loading" border stripe>
        <el-table-column prop="title" label="文档标题" min-width="250">
          <template #default="scope">
            <el-link type="primary" @click="viewDetail(scope.row.id)">
              {{ scope.row.title }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="document_type" label="类型" width="120">
          <template #default="scope">
            <el-tag size="small">{{ getDocumentTypeText(scope.row.document_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="document_number" label="发文字号" width="180">
          <template #default="scope">
            <span v-if="scope.row.document_number">{{ scope.row.document_number }}</span>
            <span v-else class="no-data">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="current_version" label="版本" width="80">
          <template #default="scope">
            <span>v{{ scope.row.current_version || 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="word_count" label="字数" width="80">
          <template #default="scope">
            <span>{{ scope.row.word_count || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="scope">
            {{ formatTime(scope.row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewDetail(scope.row.id)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button size="small" type="success" @click="editDocument(scope.row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="danger" @click="deleteDocument(scope.row)">
              <el-icon><Delete /></el-icon>
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
        @size-change="loadDocuments"
        @current-change="loadDocuments"
        class="mt-20"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { List, Plus, Search, Refresh, View, Edit, Delete } from '@element-plus/icons-vue'
import { documentProofreadingApi } from '@/api'

const router = useRouter()

const loading = ref(false)
const documentList = ref([])
const searchForm = ref({
  keyword: '',
  document_type: '',
  status: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const documentTypeMap = {
  'general': '通用文档',
  'official': '正式公文',
  'report': '报告',
  'notice': '通知',
  'decision': '决定',
  'letter': '函'
}

const statusMap = {
  'draft': { text: '草稿', type: 'info' },
  'reviewing': { text: '审核中', type: 'warning' },
  'approved': { text: '已通过', type: 'success' },
  'published': { text: '已发布', type: 'primary' }
}

const goToProofreading = () => {
  router.push('/document-proofreading')
}

const viewDetail = (id) => {
  router.push(`/document-detail/${id}`)
}

const editDocument = (row) => {
  router.push({
    path: '/document-proofreading',
    query: { id: row.id }
  })
}

const loadDocuments = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      ...searchForm.value
    }
    
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    
    const response = await documentProofreadingApi.getDocuments(params)
    const data = response.data.data || response.data
    
    documentList.value = data.items || []
    pagination.value.total = data.total || 0
  } catch (error) {
    console.error('加载文档列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  loadDocuments()
}

const handleReset = () => {
  searchForm.value = {
    keyword: '',
    document_type: '',
    status: ''
  }
  pagination.value.page = 1
  loadDocuments()
}

const deleteDocument = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文档「${row.title}」吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await documentProofreadingApi.deleteDocument(row.id)
    ElMessage.success('删除成功')
    loadDocuments()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const getDocumentTypeText = (type) => {
  return documentTypeMap[type] || type || '未知'
}

const getStatusText = (status) => {
  return statusMap[status]?.text || status || '未知'
}

const getStatusTagType = (status) => {
  return statusMap[status]?.type || 'info'
}

const formatTime = (timeString) => {
  if (!timeString) return '-'
  const date = new Date(timeString)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadDocuments()
})
</script>

<style scoped>
.document-list-container {
  max-width: 1400px;
  margin: 0 auto;
}

.search-form {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.no-data {
  color: #909399;
}

.mt-20 {
  margin-top: 20px;
}
</style>
