<template>
  <div class="history-view">
    <h2 class="page-title">历史记录</h2>
    
    <div class="info-box">
      <p>查看和管理 RSA 密钥对生成历史和加解密操作历史记录。</p>
    </div>

    <el-row :gutter="24">
      <el-col :span="8">
        <div class="card">
          <h3 class="card-title">统计信息</h3>
          
          <el-row :gutter="16">
            <el-col :span="12">
              <div class="stat-card">
                <div class="stat-number">{{ stats.key_pair_count || 0 }}</div>
                <div class="stat-label">密钥对数量</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="stat-card">
                <div class="stat-number">{{ stats.crypto_operation_count || 0 }}</div>
                <div class="stat-label">加解密操作</div>
              </div>
            </el-col>
          </el-row>
          
          <el-row :gutter="16" style="margin-top: 16px;">
            <el-col :span="12">
              <div class="stat-card success">
                <div class="stat-number">{{ stats.encrypt_count || 0 }}</div>
                <div class="stat-label">加密操作</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="stat-card warning">
                <div class="stat-number">{{ stats.decrypt_count || 0 }}</div>
                <div class="stat-label">解密操作</div>
              </div>
            </el-col>
          </el-row>

          <div class="button-group" style="margin-top: 20px;">
            <el-button type="primary" @click="refreshStats">
              刷新统计
            </el-button>
            <el-button type="danger" @click="confirmClearAllHistory" :loading="clearing">
              清空所有历史
            </el-button>
          </div>
        </div>
      </el-col>

      <el-col :span="16">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="密钥对历史" name="key-pairs">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">密钥对列表</h3>
                <div class="header-actions">
                  <el-button type="primary" size="small" @click="loadKeyPairs">
                    刷新
                  </el-button>
                </div>
              </div>

              <el-table 
                :data="keyPairs" 
                style="width: 100%"
                v-loading="loadingKeyPairs"
              >
                <el-table-column prop="id" label="ID" width="80" />
                <el-table-column prop="key_size" label="密钥位数" width="100" />
                <el-table-column prop="e" label="公钥 e" min-width="150">
                  <template #default="scope">
                    <span class="truncate-text">{{ scope.row.e }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="n" label="模数 n" min-width="200">
                  <template #default="scope">
                    <span class="truncate-text">{{ scope.row.n }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="180">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.created_at) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120" fixed="right">
                  <template #default="scope">
                    <el-button 
                      type="primary" 
                      link 
                      size="small"
                      @click="viewKeyPairDetail(scope.row)"
                    >
                      详情
                    </el-button>
                    <el-button 
                      type="danger" 
                      link 
                      size="small"
                      @click="confirmDeleteKeyPair(scope.row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <el-empty v-if="keyPairs.length === 0 && !loadingKeyPairs" description="暂无密钥对历史记录" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="加解密历史" name="crypto-operations">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">操作记录列表</h3>
                <div class="header-actions">
                  <el-select 
                    v-model="filterOperationType" 
                    placeholder="过滤操作类型"
                    size="small"
                    style="width: 150px; margin-right: 12px;"
                    @change="filterOperations"
                  >
                    <el-option label="全部" value="" />
                    <el-option label="加密" value="encrypt" />
                    <el-option label="解密" value="decrypt" />
                  </el-select>
                  <el-button type="primary" size="small" @click="loadCryptoOperations">
                    刷新
                  </el-button>
                </div>
              </div>

              <el-table 
                :data="cryptoOperations" 
                style="width: 100%"
                v-loading="loadingOperations"
              >
                <el-table-column prop="id" label="ID" width="80" />
                <el-table-column prop="operation_type" label="操作类型" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.operation_type === 'encrypt' ? 'success' : 'warning'">
                      {{ scope.row.operation_type === 'encrypt' ? '加密' : '解密' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="plain_text" label="明文" min-width="150">
                  <template #default="scope">
                    <span class="truncate-text">{{ scope.row.plain_text }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="cipher_text" label="密文" min-width="150">
                  <template #default="scope">
                    <span class="truncate-text">{{ scope.row.cipher_text }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="时间" width="180">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.created_at) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" fixed="right">
                  <template #default="scope">
                    <el-button 
                      type="primary" 
                      link 
                      size="small"
                      @click="viewOperationDetail(scope.row)"
                    >
                      详情
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <el-empty v-if="cryptoOperations.length === 0 && !loadingOperations" description="暂无加解密历史记录" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>

    <el-dialog
      v-model="showKeyPairDetail"
      title="密钥对详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="currentKeyPair" class="detail-content">
        <div class="detail-section">
          <h4>基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="ID">{{ currentKeyPair.id }}</el-descriptions-item>
            <el-descriptions-item label="密钥位数">{{ currentKeyPair.key_size }} 位</el-descriptions-item>
            <el-descriptions-item label="创建时间" :span="2">
              {{ formatDateTime(currentKeyPair.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h4>生成参数</h4>
          <div class="param-display">
            <div class="param-item">
              <span class="param-label">素数 p:</span>
              <span class="param-value">{{ currentKeyPair.p }}</span>
            </div>
            <div class="param-item">
              <span class="param-label">素数 q:</span>
              <span class="param-value">{{ currentKeyPair.q }}</span>
            </div>
            <div class="param-item">
              <span class="param-label">模数 n:</span>
              <span class="param-value">{{ currentKeyPair.n }}</span>
            </div>
            <div class="param-item">
              <span class="param-label">欧拉函数 φ(n):</span>
              <span class="param-value">{{ currentKeyPair.phi_n }}</span>
            </div>
            <div class="param-item">
              <span class="param-label">公钥指数 e:</span>
              <span class="param-value">{{ currentKeyPair.e }}</span>
            </div>
            <div class="param-item">
              <span class="param-label">私钥指数 d:</span>
              <span class="param-value">{{ currentKeyPair.d }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>操作</h4>
          <div class="button-group">
            <el-button type="primary" @click="useKeyPairForCrypto">
              使用此密钥对进行加解密
            </el-button>
            <el-button type="danger" @click="confirmDeleteKeyPairFromDetail">
              删除此密钥对
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showOperationDetail"
      title="操作详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="currentOperation" class="detail-content">
        <div class="detail-section">
          <h4>基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="ID">{{ currentOperation.id }}</el-descriptions-item>
            <el-descriptions-item label="操作类型">
              <el-tag :type="currentOperation.operation_type === 'encrypt' ? 'success' : 'warning'">
                {{ currentOperation.operation_type === 'encrypt' ? '加密' : '解密' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="关联密钥对 ID">
              {{ currentOperation.key_pair_id || '无' }}
            </el-descriptions-item>
            <el-descriptions-item label="时间">
              {{ formatDateTime(currentOperation.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h4>内容详情</h4>
          <div class="content-display">
            <div class="content-item">
              <span class="content-label">明文:</span>
              <div class="content-value">{{ currentOperation.plain_text }}</div>
            </div>
            <div class="content-item">
              <span class="content-label">密文:</span>
              <div class="content-value">{{ currentOperation.cipher_text }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { historyApi, rsaApi } from '../services/api'

const router = useRouter()

const activeTab = ref('key-pairs')
const stats = ref({})
const keyPairs = ref([])
const cryptoOperations = ref([])
const filterOperationType = ref('')

const loadingKeyPairs = ref(false)
const loadingOperations = ref(false)
const clearing = ref(false)

const showKeyPairDetail = ref(false)
const showOperationDetail = ref(false)
const currentKeyPair = ref(null)
const currentOperation = ref(null)

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const loadStats = async () => {
  try {
    const response = await historyApi.getStats()
    stats.value = response.data
  } catch (error) {
    console.error('加载统计信息失败：', error)
  }
}

const refreshStats = () => {
  loadStats()
  ElMessage.success('统计信息已刷新')
}

const loadKeyPairs = async () => {
  loadingKeyPairs.value = true
  try {
    const response = await rsaApi.getKeyPairs(0, 100)
    keyPairs.value = response.data.key_pairs
  } catch (error) {
    ElMessage.error('加载密钥对失败：' + error.message)
  } finally {
    loadingKeyPairs.value = false
  }
}

const loadCryptoOperations = async () => {
  loadingOperations.value = true
  try {
    const params = filterOperationType.value ? { operation_type: filterOperationType.value } : {}
    const response = await historyApi.getCryptoHistory(params)
    cryptoOperations.value = response.data.records
  } catch (error) {
    ElMessage.error('加载操作记录失败：' + error.message)
  } finally {
    loadingOperations.value = false
  }
}

const filterOperations = () => {
  loadCryptoOperations()
}

const viewKeyPairDetail = (row) => {
  currentKeyPair.value = row
  showKeyPairDetail.value = true
}

const viewOperationDetail = (row) => {
  currentOperation.value = row
  showOperationDetail.value = true
}

const useKeyPairForCrypto = () => {
  showKeyPairDetail.value = false
  router.push('/crypto')
}

const confirmDeleteKeyPair = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除密钥对 #${row.id} 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await rsaApi.deleteKeyPair(row.id)
    ElMessage.success('密钥对已删除')
    loadKeyPairs()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

const confirmDeleteKeyPairFromDetail = async () => {
  if (!currentKeyPair.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除密钥对 #${currentKeyPair.value.id} 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await rsaApi.deleteKeyPair(currentKeyPair.value.id)
    showKeyPairDetail.value = false
    currentKeyPair.value = null
    ElMessage.success('密钥对已删除')
    loadKeyPairs()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

const confirmClearAllHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有加解密历史记录吗？密钥对历史将不会被清空。此操作不可恢复。',
      '确认清空',
      {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    clearing.value = true
    const response = await historyApi.clearAllHistory()
    ElMessage.success(response.data.message)
    loadCryptoOperations()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败：' + error.message)
    }
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  loadStats()
  loadKeyPairs()
  loadCryptoOperations()
})
</script>

<style scoped>
.history-view {
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: white;
}

.stat-card.success {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.stat-card.warning {
  background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e6ed;
}

.card-header .card-title {
  margin: 0;
  padding: 0;
  border: none;
}

.header-actions {
  display: flex;
  align-items: center;
}

.truncate-text {
  display: inline-block;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.85rem;
}

.detail-content {
  line-height: 1.6;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 16px;
}

.param-display,
.content-display {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.param-item,
.content-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.param-item:last-child,
.content-item:last-child {
  border-bottom: none;
}

.param-label,
.content-label {
  font-weight: 600;
  color: #4a5568;
  min-width: 140px;
  flex-shrink: 0;
}

.param-value,
.content-value {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #2d3748;
  word-break: break-all;
  font-size: 0.9rem;
}
</style>
