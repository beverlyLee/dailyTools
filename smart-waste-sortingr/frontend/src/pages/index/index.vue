<template>
  <view class="container">
    <view class="header">
      <text class="title">智能垃圾分类</text>
      <text class="subtitle">拍照或上传图片，AI 帮您识别垃圾分类</text>
    </view>

    <view class="upload-area" @tap="chooseImage">
      <view v-if="!imagePath" class="upload-placeholder">
        <view class="camera-icon">
          <text class="icon">📷</text>
        </view>
        <text class="upload-text">点击上传图片或拍照</text>
        <text class="upload-hint">支持 JPG、PNG、BMP 格式</text>
      </view>
      <image v-else :src="imagePath" class="preview-image" mode="aspectFit" />
    </view>

    <view class="action-buttons">
      <button 
        class="btn-primary" 
        :disabled="!imagePath || isLoading"
        @tap="doClassify"
      >
        <text v-if="isLoading" class="loading-text">识别中...</text>
        <text v-else>开始识别</text>
      </button>
    </view>

    <view v-if="recentHistory.length > 0" class="recent-section">
      <view class="section-header">
        <text class="section-title">最近识别</text>
      </view>
      <view class="recent-list">
        <view 
          v-for="item in recentHistory" 
          :key="item.id" 
          class="recent-item"
          @tap="viewHistory(item)"
        >
          <view class="recent-left">
            <view :class="['category-badge', getCategoryClass(item.waste_category)]">
              <text class="badge-text">{{ item.waste_category }}</text>
            </view>
            <text class="recent-name">{{ item.predicted_item }}</text>
          </view>
          <view class="recent-right">
            <text class="recent-confidence">{{ item.confidence }}%</text>
          </view>
        </view>
      </view>
    </view>

    <view class="quick-guide">
      <view class="section-header">
        <text class="section-title">快速分类指南</text>
      </view>
      <view class="category-grid">
        <view 
          v-for="cat in categories" 
          :key="cat.name" 
          class="category-card"
          :class="getCategoryBgClass(cat.name)"
          @tap="viewCategory(cat)"
        >
          <text class="category-icon">{{ getCategoryIcon(cat.name) }}</text>
          <text class="category-name">{{ cat.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiService, HistoryRecord, CategoryInfo } from '@/services/api'

const imagePath = ref<string>('')
const isLoading = ref<boolean>(false)
const recentHistory = ref<HistoryRecord[]>([])
const categories = ref<CategoryInfo[]>([])

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

const getCategoryBgClass = (category: string): string => {
  const map: Record<string, string> = {
    '可回收物': 'card-recyclable',
    '厨余垃圾': 'card-kitchen',
    '有害垃圾': 'card-hazardous',
    '其他垃圾': 'card-other'
  }
  return map[category] || 'card-other'
}

const getCategoryIcon = (category: string): string => {
  return categoryIcons[category] || '🗑️'
}

const chooseImage = () => {
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择'],
    success: (res) => {
      const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: sourceType,
        success: (chooseRes) => {
          imagePath.value = chooseRes.tempFilePaths[0]
        }
      })
    }
  })
}

const doClassify = async () => {
  if (!imagePath.value || isLoading.value) return

  isLoading.value = true
  uni.showLoading({ title: '识别中...' })

  try {
    const result = await apiService.classifyImage(imagePath.value)
    uni.hideLoading()

    if (result.success) {
      uni.navigateTo({
        url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(result))}`
      })
      loadRecentHistory()
    } else {
      uni.showToast({ title: '识别失败', icon: 'error' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('Classification error:', error)
    uni.showToast({ title: '识别出错，请重试', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

const loadRecentHistory = async () => {
  try {
    const result = await apiService.getHistory(0, 5)
    if (result.success) {
      recentHistory.value = result.data.records
    }
  } catch (error) {
    console.error('Failed to load history:', error)
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

const viewHistory = (item: HistoryRecord) => {
  uni.showModal({
    title: item.predicted_item,
    content: `分类: ${item.waste_category}\n置信度: ${item.confidence}%`,
    showCancel: false
  })
}

const viewCategory = (cat: CategoryInfo) => {
  uni.navigateTo({
    url: `/pages/knowledge/knowledge?category=${encodeURIComponent(cat.name)}`
  })
}

onMounted(() => {
  loadCategories()
  loadRecentHistory()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 30rpx;
  padding-bottom: 120rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.subtitle {
  font-size: 28rpx;
  color: #999;
  margin-top: 16rpx;
  display: block;
}

.upload-area {
  width: 100%;
  height: 500rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.camera-icon {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.icon {
  font-size: 80rpx;
}

.upload-text {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.upload-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 12rpx;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.action-buttons {
  margin-top: 40rpx;
}

.btn-primary {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  font-size: 34rpx;
  font-weight: 500;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: #FFFFFF;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary[disabled] {
  background: #CCCCCC;
  opacity: 0.6;
}

.loading-text {
  margin-right: 16rpx;
}

.recent-section {
  margin-top: 50rpx;
}

.section-header {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.recent-list {
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.category-badge {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  margin-right: 20rpx;
}

.badge-text {
  font-size: 22rpx;
  color: #FFFFFF;
}

.recent-name {
  font-size: 30rpx;
  color: #333;
}

.recent-right {
  display: flex;
  align-items: center;
}

.recent-confidence {
  font-size: 28rpx;
  color: #4CAF50;
  font-weight: 500;
}

.quick-guide {
  margin-top: 50rpx;
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.category-card {
  width: calc((100% - 20rpx) / 2);
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.category-card:active {
  transform: scale(0.98);
}

.category-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.category-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.card-recyclable:active {
  background: rgba(33, 150, 243, 0.1);
}

.card-kitchen:active {
  background: rgba(76, 175, 80, 0.1);
}

.card-hazardous:active {
  background: rgba(244, 67, 54, 0.1);
}

.card-other:active {
  background: rgba(158, 158, 158, 0.1);
}
</style>
