<template>
  <el-container class="list-container">
    <el-header class="list-header">
      <div class="header-left">
        <el-icon class="header-icon"><Document /></el-icon>
        <span class="header-title">公文写作智能校对系统</span>
      </div>
      <el-button type="primary" @click="createNewDocument">
        <el-icon><Plus /></el-icon>
        新建文档
      </el-button>
    </el-header>
    <el-main>
      <div v-if="documents.length === 0" class="empty-state">
        <div class="empty-state-icon">📄</div>
        <div class="empty-state-text">暂无文档</div>
        <div class="empty-state-hint">点击上方按钮创建新文档</div>
      </div>
      <div v-else class="document-grid">
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="document-card"
          @click="openDocument(doc.id)"
        >
          <div class="document-title">{{ doc.title }}</div>
          <div class="document-meta">
            <span>类型: {{ doc.document_type }}</span>
            <span>更新于: {{ formatTime(doc.updated_at) }}</span>
          </div>
          <div class="document-actions">
            <el-button size="small" type="primary" @click.stop="openDocument(doc.id)">
              编辑
            </el-button>
            <el-button size="small" type="danger" @click.stop="deleteDocument(doc.id)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Plus } from '@element-plus/icons-vue'
import { documentApi } from '../utils/api'

const router = useRouter()
const documents = ref([])

const loadDocuments = async () => {
  try {
    const response = await documentApi.getAll()
    if (response.data.success) {
      documents.value = response.data.data.documents
    }
  } catch (error) {
    console.error('加载文档列表失败:', error)
  }
}

const createNewDocument = () => {
  router.push('/editor')
}

const openDocument = (id) => {
  router.push(`/documents/${id}`)
}

const deleteDocument = async (id) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此文档吗？此操作不可恢复。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await documentApi.delete(id)
    ElMessage.success('文档删除成功')
    loadDocuments()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除文档失败:', error)
      ElMessage.error('删除失败')
    }
  }
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
.list-container {
  height: 100vh;
}

.list-header {
  background-color: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 28px;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.document-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.document-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.document-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: #909399;
}

.empty-state-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state-text {
  font-size: 18px;
  margin-bottom: 8px;
}

.empty-state-hint {
  font-size: 14px;
}
</style>
