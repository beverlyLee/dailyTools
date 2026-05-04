<template>
  <view class="container">
    <view v-if="disease" class="content-section">
      <view class="disease-header">
        <text class="disease-name">{{ disease.disease_name }}</text>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-icon">📋</text>
          <text class="section-title">病害症状</text>
        </view>
        <view class="section-content card">
          <view 
            v-for="(symptom, index) in disease.symptoms" 
            :key="index" 
            class="list-item"
          >
            <view class="bullet">•</view>
            <text class="item-text">{{ symptom }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-icon">🛡️</text>
          <text class="section-title">预防方法</text>
        </view>
        <view class="section-content card">
          <view 
            v-for="(method, index) in disease.prevention_methods" 
            :key="index" 
            class="list-item"
          >
            <view class="number-badge">{{ index + 1 }}</view>
            <text class="item-text">{{ method }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-icon">💉</text>
          <text class="section-title">治疗方法</text>
        </view>
        <view class="section-content card">
          <view 
            v-for="(method, index) in disease.treatment_methods" 
            :key="index" 
            class="list-item"
          >
            <view class="number-badge">{{ index + 1 }}</view>
            <text class="item-text">{{ method }}</text>
          </view>
        </view>
      </view>

      <view class="section" v-if="disease.recommended_pesticides && disease.recommended_pesticides.length > 0">
        <view class="section-header">
          <text class="section-icon">🧪</text>
          <text class="section-title">推荐药剂</text>
        </view>
        <view class="section-content card">
          <view class="tags-container">
            <view 
              v-for="(pesticide, index) in disease.recommended_pesticides" 
              :key="index" 
              class="pesticide-tag"
            >
              <text class="tag-text">{{ pesticide }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section" v-if="disease.notes">
        <view class="section-header">
          <text class="section-icon">📝</text>
          <text class="section-title">注意事项</text>
        </view>
        <view class="section-content card notes-card">
          <text class="notes-text">{{ disease.notes }}</text>
        </view>
      </view>
    </view>

    <view v-else class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <view class="action-footer" v-if="disease && disease.disease_name !== '健康'">
      <view class="identify-btn btn-primary" @click="goToIdentify">
        <text>识别其他植物</text>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      diseaseName: '',
      disease: null
    }
  },
  onLoad(options) {
    if (options.name) {
      this.diseaseName = decodeURIComponent(options.name)
      this.loadDiseaseDetail()
    }
  },
  methods: {
    async loadDiseaseDetail() {
      try {
        const disease = await api.diseaseApi.getTreatment(this.diseaseName)
        this.disease = disease
      } catch (error) {
        console.error('加载病害详情失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    goToIdentify() {
      uni.switchTab({
        url: '/pages/identify/identify'
      })
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F8F8F8;
  padding: 30rpx;
  padding-bottom: 140rpx;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.disease-header {
  background: linear-gradient(135deg, #2B9939 0%, #4CAF50 100%);
  border-radius: 16rpx;
  padding: 40rpx;
}

.disease-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.section {
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
  padding: 0 10rpx;
}

.section-icon {
  font-size: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.section-content {
  padding: 24rpx;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.list-item:last-child {
  border-bottom: none;
}

.bullet {
  font-size: 28rpx;
  color: #2B9939;
  line-height: 1.6;
}

.number-badge {
  width: 40rpx;
  height: 40rpx;
  background-color: #E8F5E9;
  color: #2B9939;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.item-text {
  font-size: 28rpx;
  color: #333333;
  line-height: 1.6;
  flex: 1;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.pesticide-tag {
  background-color: #E3F2FD;
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
}

.tag-text {
  font-size: 26rpx;
  color: #1565C0;
}

.notes-card {
  background-color: #FFF8E1;
}

.notes-text {
  font-size: 28rpx;
  color: #E65100;
  line-height: 1.8;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 150rpx 0;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid #E0E0E0;
  border-top-color: #2B9939;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 24rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #666666;
}

.action-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 30rpx;
  background-color: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.identify-btn {
  padding: 28rpx;
  text-align: center;
  border-radius: 12rpx;
}

.identify-btn text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 500;
}
</style>
