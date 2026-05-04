<template>
  <view class="container">
    <view v-if="stats" class="stats-section">
      <view class="stats-grid">
        <view 
          v-for="(count, category) in stats.category_counts" 
          :key="category"
          class="stat-item"
          :class="getStatItemClass(category)"
        >
          <text class="stat-icon">{{ getCategoryIcon(category) }}</text>
          <text class="stat-count">{{ count }}</text>
          <text class="stat-label">{{ category }}</text>
        </view>
      </view>
    </view>

    <view class="filter-section">
      <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
        <view class="filter-list">
          <view 
            :class="['filter-item', { active: selectedCategory === null }]"
            @tap="selectCategory(null)"
          >
            <text class="filter-text">全部</text>
          </view>
          <view 
            v-for="cat in categories" 
            :key="cat.name"
            :class="['filter-item', { active: selectedCategory === cat.name }]"
            @tap="selectCategory(cat.name)"
          >
            <text class="filter-text">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="historyList.length > 0" class="history-list">
      <view 
        v-for="item in historyList" 
        :key="item.id" 
        class="history-card"
        @tap="viewDetail(item)"
      >
        <view class="card-left">
          <view :class="['category-badge', getCategoryClass(item.waste_category)]">
            <text class="badge-text">{{ item.waste_category }}</text>
          </view>
          <view class="item-info">
            <text class="item-name">{{ item.predicted_item }}</text>
            <text class="item-time">{{ formatTime(item.created_at) }}</text>
          </view>
        </view>
        <view class="card-right">
          <view class="confidence-display">
            <text class="confidence-value">{{ item.confidence }}%</text>
            <text class="confidence-label">置信度</text>
          </view>
          <text class="arrow-icon">›</text>
        </view>
      </view>
    </view>

    <view v-else-if="!isLoading" class="empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-title">暂无识别记录</text>
      <text class="empty-subtitle">快去拍照识别垃圾分类吧</text>
      <button class="empty-btn" @tap="goToScan">
        <text>开始识别</text>
      </button>
    </view>

    <view v-if="hasMore" class="load-more">
      <text class="load-more-text" v-if="!isLoadingMore">上拉加载更多</text>
      <text class="load-more-text" v-else>加载中...</text>
    </view>

    <view v-if="isLoading" class="loading-overlay">
      <text class="loading-spinner">⟳</text>
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiService, HistoryRecord, CategoryInfo } from '@/services/api'

const historyList = ref<HistoryRecord[]>([])
const categories = ref<CategoryInfo[]>([])
const selectedCategory = ref<string | null>(null)
const isLoading = ref<boolean>(false)
const isLoadingMore = ref<boolean>(false)
const hasMore = ref<boolean>(true)
const skip = ref<number>(0)
const limit = ref<number>(20)

const stats = ref<{ category_counts: Record<string, number> } | null>(null)

const categoryIcons: Record<string, string> = {
  '可回收物': '♻️',
  '厨余垃圾': '🍎',
  '有害垃圾': '⚠️',
  '其他垃圾': '🗑️'
}

const getCategoryClass = (category: string): string => {
  const map: Record<string, string> = {
    '可回收物': 'bg-recyclable',
    '厨余垃圾': 'bg-kitchen',
    '有害垃圾': 'bg-hazardous',
    '其他垃圾': 'bg-other'
  }
  return map[category] || 'bg-other'
}

const getStatItemClass = (category: string): string => {
  const map: Record<string, string> = {
    '可回收物': 'stat-recyclable',
    '厨余垃圾': 'stat-kitchen',
    '有害垃圾': 'stat-hazardous',
    '其他垃圾': 'stat-other'
  }
  return map[category] || ''
}

const getCategoryIcon = (category: string): string => {
  return categoryIcons[category] || '🗑️'
}

const formatTime = (timeStr: string): string => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const selectCategory = (category: string | null) => {
  selectedCategory.value = category
  skip.value = 0
  hasMore.value = true
  historyList.value = []
  loadHistory(true)
}

const loadHistory = async (reset: boolean = false) => {
  if (isLoadingMore.value || (!hasMore.value && !reset)) return
  
  if (reset) {
    isLoading.value = true
  } else {
    isLoadingMore.value = true
  }

  try {
    const result = await apiService.getHistory(
      reset ? 0 : skip.value,
      limit.value,
      selectedCategory.value || undefined
    )
    
    if (result.success) {
      const newRecords = result.data.records
      
      if (reset) {
        historyList.value = newRecords
      } else {
        historyList.value = [...historyList.value, ...newRecords]
      }
      
      skip.value = historyList.value.length
      hasMore.value = newRecords.length === limit.value
    }
  } catch (error) {
    console.error('Failed to load history:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const loadStats = async () => {
  try {
    const result = await apiService.getCategoryStats()
    if (result.success) {
      stats.value = result.data
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const loadCategories = async () => {
  try {
    const result = await apiService.getCategories()
    if (result.success) {
      categories.value = result.categories
    }
  } catch (error) {
    console.error('Failed to load categories:', error)
    categories.value = [
      { name: '可回收物', description: '', color: '', disposal_guide: '', examples: [] },
      { name: '厨余垃圾', description: '', color: '', disposal_guide: '', examples: [] },
      { name: '有害垃圾', description: '', color: '', disposal_guide: '', examples: [] },
      { name: '其他垃圾', description: '', color: '', disposal_guide: '', examples: [] }
    ]
  }
}

const viewDetail = (item: HistoryRecord) => {
  uni.showModal({
    title: item.predicted_item,
    content: `分类: ${item.waste_category}\n置信度: ${item.confidence}%\n\n${item.disposal_guide || '暂无投放指引'}`,
    confirmText: '删除',
    cancelText: '关闭',
    success: (res) => {
      if (res.confirm) {
        deleteRecord(item.id)
      }
    }
  })
}

const deleteRecord = async (id: number) => {
  try {
    const result = await apiService.deleteHistory(id)
    if (result.success) {
      uni.showToast({ title: '已删除', icon: 'success' })
      loadHistory(true)
      loadStats()
    }
  } catch (error) {
    console.error('Failed to delete record:', error)
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

const goToScan = () => {
  uni.switchTab({
    url: '/pages/index/index'
  })
}

onMounted(() => {
  loadCategories()
  loadStats()
  loadHistory(true)
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.stats-section {
  margin-bottom: 20rpx;
}

.stats-grid {
  display: flex;
  gap: 16rpx;
  padding: 0 10rpx;
}

.stat-item {
  flex: 1;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.stat-recyclable {
  border-top: 4rpx solid #2196F3;
}

.stat-kitchen {
  border-top: 4rpx solid #4CAF50;
}

.stat-hazardous {
  border-top: 4rpx solid #F44336;
}

.stat-other {
  border-top: 4rpx solid #9E9E9E;
}

.stat-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.stat-count {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.filter-section {
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 20rpx 0;
}

.filter-scroll {
  white-space: nowrap;
}

.filter-list {
  display: flex;
  gap: 16rpx;
  padding: 0 20rpx;
}

.filter-item {
  display: inline-flex;
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
  background: #F5F5F5;
}

.filter-item.active {
  background: linear-gradient(135deg, #4CAF50, #45a049);
}

.filter-text {
  font-size: 28rpx;
  color: #666;
}

.filter-item.active .filter-text {
  color: #FFFFFF;
  font-weight: 500;
}

.history-list {
  padding: 0 10rpx;
}

.history-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.history-card:active {
  background: #FAFAFA;
}

.card-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.category-badge {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.badge-text {
  font-size: 22rpx;
  color: #FFFFFF;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.item-time {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.card-right {
  display: flex;
  align-items: center;
}

.confidence-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 16rpx;
}

.confidence-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #4CAF50;
}

.confidence-label {
  font-size: 20rpx;
  color: #999;
}

.arrow-icon {
  font-size: 40rpx;
  color: #CCCCCC;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.empty-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
}

.empty-subtitle {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.empty-btn {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: #FFFFFF;
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  border: none;
}

.load-more {
  text-align: center;
  padding: 30rpx;
}

.load-more-text {
  font-size: 26rpx;
  color: #999;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  font-size: 60rpx;
  animation: spin 1s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #666;
}
</style>
