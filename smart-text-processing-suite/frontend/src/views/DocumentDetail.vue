<template>
  <div class="document-detail-container fade-in">
    <el-card class="card-container">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><Document /></el-icon>
          文档详情
        </h2>
        <div class="header-actions">
          <el-button @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <el-button type="primary" @click="handleEdit">
            <el-icon><Edit /></el-icon>
            编辑文档
          </el-button>
        </div>
      </div>
      
      <el-descriptions :column="3" border class="mb-20">
        <el-descriptions-item label="文档标题">{{ documentData?.title || '-' }}</el-descriptions-item>
        <el-descriptions-item label="文档类型">
          <el-tag size="small">{{ getDocumentTypeText(documentData?.document_type) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(documentData?.status)" size="small">
            {{ getStatusText(documentData?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发文字号">{{ documentData?.document_number || '-' }}</el-descriptions-item>
        <el-descriptions-item label="红头文件类型">{{ documentData?.red_head_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前版本">v{{ documentData?.current_version || 1 }}</el-descriptions-item>
        <el-descriptions-item label="字数">{{ documentData?.word_count || 0 }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(documentData?.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatTime(documentData?.updated_at) }}</el-descriptions-item>
      </el-descriptions>
      
      <el-divider />
      
      <div class="content-section">
        <h3 class="section-title">文档内容</h3>
        <div class="document-content" v-if="documentData?.content">
          <pre>{{ documentData.content }}</pre>
        </div>
        <el-empty v-else description="暂无内容" />
      </div>
    </el-card>
    
    <el-card class="card-container mt-20">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><Clock /></el-icon>
          版本历史
        </h2>
      </div>
      
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
    
    <el-loading-mask v-if="loading">
      <div class="loading-text">加载中...</div>
    </el-loading-mask>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, ArrowLeft, Edit, Clock } from '@element-plus/icons-vue'
import { documentProofreadingApi } from '@/api'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const isReverting = ref(false)
const documentData = ref(null)
const versions = ref([])

const versionDialogVisible = ref(false)
const versionPreviewContent = ref('')
const selectedVersion = ref(null)

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

const goBack = () => {
  router.push('/document-list')
}

const handleEdit = () => {
  if (documentData.value?.id) {
    router.push({
      path: '/document-proofreading',
      query: { id: documentData.value.id }
    })
  }
}

const loadDocumentDetail = async () => {
  const docId = route.params.id
  if (!docId) {
    ElMessage.error('文档ID不存在')
    return
  }
  
  loading.value = true
  try {
    const response = await documentProofreadingApi.getDocumentById(docId)
    documentData.value = response.data.data || response.data
    
    await loadVersions(docId)
  } catch (error) {
    console.error('加载文档详情失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const loadVersions = async (docId) => {
  try {
    const response = await documentProofreadingApi.getVersions(docId)
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
      `确定要恢复到版本 v${version.version_number} 吗？`,
      '确认恢复',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    isReverting.value = true
    
    const response = await documentProofreadingApi.revertToVersion(documentData.value.id, version.version_number)
    
    if (response.data) {
      ElMessage.success('已恢复到指定版本')
      await loadDocumentDetail()
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
  loadDocumentDetail()
})
</script>

<style scoped>
.document-detail-container {
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

.document-content {
  background-color: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.document-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
  margin: 0;
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

.text-muted {
  color: #909399;
  font-size: 13px;
  margin: 5px 0 0 0;
}

.mb-20 {
  margin-bottom: 20px;
}

.mt-20 {
  margin-top: 20px;
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

.loading-text {
  font-size: 16px;
  color: #606266;
}
</style>
