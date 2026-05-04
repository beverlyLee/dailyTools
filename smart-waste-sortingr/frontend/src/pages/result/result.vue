<template>
  <view class="container">
    <view v-if="result" class="result-card">
      <view class="result-header">
        <view :class="['category-tag', getCategoryClass(result.result.category)]">
          <text class="tag-icon">{{ getCategoryIcon(result.result.category) }}</text>
          <text class="tag-text">{{ result.result.category }}</text>
        </view>
      </view>

      <view class="item-info">
        <text class="item-name">{{ result.result.item_name }}</text>
        <view class="confidence-badge">
          <text class="confidence-value">{{ result.result.confidence }}%</text>
          <text class="confidence-label">置信度</text>
        </view>
      </view>

      <view v-if="result.result.disposal_guide.category_info" class="info-section">
        <view class="section-title-row">
          <text class="section-title">分类说明</text>
        </view>
        <view class="info-card">
          <text class="info-description">
            {{ result.result.disposal_guide.category_info.description }}
          </text>
          <view v-if="result.result.disposal_guide.category_info.examples?.length > 0" class="examples-row">
            <text class="examples-label">常见物品：</text>
            <view class="examples-list">
              <text 
                v-for="(example, index) in result.result.disposal_guide.category_info.examples" 
                :key="index"
                class="example-tag"
              >
                {{ example }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view class="info-section">
        <view class="section-title-row">
          <text class="section-title">投放指引</text>
        </view>
        <view class="guide-card">
          <view class="guide-icon">📋</view>
          <text class="guide-text">
            {{ result.result.disposal_guide.disposal_instructions || '暂无详细投放指引' }}
          </text>
        </view>
      </view>

      <view v-if="result.result.disposal_guide.item_info" class="info-section">
        <view class="section-title-row">
          <text class="section-title">相关知识</text>
        </view>
        <view class="knowledge-card">
          <view v-if="result.result.disposal_guide.item_info.recycling_value" class="knowledge-item">
            <text class="knowledge-label">回收价值：</text>
            <text class="knowledge-value">{{ result.result.disposal_guide.item_info.recycling_value }}</text>
          </view>
          <view v-if="result.result.disposal_guide.item_info.environmental_impact" class="knowledge-item">
            <text class="knowledge-label">环境影响：</text>
            <text class="knowledge-desc">{{ result.result.disposal_guide.item_info.environmental_impact }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <text class="empty-icon">🔍</text>
      <text class="empty-text">暂无识别结果</text>
    </view>

    <view class="action-footer">
      <button class="secondary-btn" @tap="goBack">
        <text>返回首页</text>
      </button>
      <button class="primary-btn" @tap="classifyAgain">
        <text>继续识别</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ClassificationResult } from '@/services/api'

const result = ref<ClassificationResult | null>(null)

const categoryIcons: Record<string, string> = {
  '可回收物': '♻️',
  '厨余垃圾': '🍎',
  '有害垃圾': '⚠️',
  '其他垃圾': '🗑️'
}

const getCategoryClass = (category: string): string => {
  const map: Record<string, string> = {
    '可回收物': 'tag-recyclable',
    '厨余垃圾': 'tag-kitchen',
    '有害垃圾': 'tag-hazardous',
    '其他垃圾': 'tag-other'
  }
  return map[category] || 'tag-other'
}

const getCategoryIcon = (category: string): string => {
  return categoryIcons[category] || '🗑️'
}

const goBack = () => {
  uni.navigateBack()
}

const classifyAgain = () => {
  uni.redirectTo({
    url: '/pages/index/index'
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options
  
  if (options?.data) {
    try {
      result.value = JSON.parse(decodeURIComponent(options.data))
    } catch (error) {
      console.error('Failed to parse result data:', error)
    }
  }
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 30rpx;
  padding-bottom: 200rpx;
}

.result-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.result-header {
  display: flex;
  justify-content: center;
  margin-bottom: 40rpx;
}

.category-tag {
  display: flex;
  align-items: center;
  padding: 20rpx 40rpx;
  border-radius: 50rpx;
}

.tag-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.tag-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.tag-recyclable {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.tag-kitchen {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
}

.tag-hazardous {
  background: linear-gradient(135deg, #F44336, #D32F2F);
}

.tag-other {
  background: linear-gradient(135deg, #9E9E9E, #757575);
}

.item-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40rpx;
  padding-bottom: 40rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.item-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.confidence-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
}

.confidence-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.confidence-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4rpx;
}

.info-section {
  margin-bottom: 40rpx;
}

.section-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.info-card, .guide-card, .knowledge-card {
  background: #F8F9FA;
  border-radius: 16rpx;
  padding: 30rpx;
}

.info-description {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

.examples-row {
  margin-top: 24rpx;
}

.examples-label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}

.examples-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.example-tag {
  font-size: 24rpx;
  color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.guide-card {
  display: flex;
  align-items: flex-start;
}

.guide-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.guide-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  flex: 1;
  white-space: pre-line;
}

.knowledge-item {
  margin-bottom: 16rpx;
  display: flex;
  align-items: flex-start;
}

.knowledge-item:last-child {
  margin-bottom: 0;
}

.knowledge-label {
  font-size: 28rpx;
  color: #999;
  flex-shrink: 0;
}

.knowledge-value {
  font-size: 28rpx;
  color: #4CAF50;
  font-weight: 500;
}

.knowledge-desc {
  font-size: 28rpx;
  color: #666;
  flex: 1;
  line-height: 1.6;
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

.empty-text {
  font-size: 32rpx;
  color: #999;
}

.action-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 20rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.secondary-btn, .primary-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.secondary-btn {
  background: #F5F5F5;
  color: #666;
}

.primary-btn {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: #FFFFFF;
}
</style>
