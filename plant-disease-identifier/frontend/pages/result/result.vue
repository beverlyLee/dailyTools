<template>
  <view class="container">
    <view class="image-preview">
      <image :src="selectedImage" mode="aspectFill" class="preview-img" />
    </view>

    <view v-if="result" class="result-section">
      <view class="result-header">
        <view class="status-badge" :class="statusClass">
          <text class="status-icon">{{ statusIcon }}</text>
          <text class="status-text">{{ statusText }}</text>
        </view>
      </view>

      <view class="primary-result card">
        <view class="result-title">主要识别结果</view>
        <view class="disease-info">
          <text class="disease-name">{{ result.primary_disease.disease_name }}</text>
          <view class="confidence-bar">
            <view class="confidence-fill" :style="{ width: confidenceWidth }"></view>
            <text class="confidence-text">{{ result.primary_disease.confidence_percent }}</text>
          </view>
        </view>
      </view>

      <view v-if="result.other_candidates && result.other_candidates.length > 0" class="other-results card">
        <view class="result-title">其他可能</view>
        <view 
          v-for="(candidate, index) in result.other_candidates" 
          :key="index" 
          class="candidate-item"
        >
          <view class="candidate-header">
            <text class="candidate-name">{{ candidate.disease_name }}</text>
            <text class="candidate-confidence">{{ candidate.confidence_percent }}</text>
          </view>
          <view class="candidate-bar">
            <view class="candidate-fill" :style="{ width: (candidate.confidence * 100) + '%' }"></view>
          </view>
        </view>
      </view>

      <view v-if="result.treatment_info" class="treatment-section">
        <view class="section-header">
          <text class="section-icon">💊</text>
          <text class="section-title">防治建议</text>
        </view>

        <view class="treatment-card card">
          <view class="treatment-item" v-if="result.treatment_info.symptoms">
            <view class="item-header">
              <text class="item-icon">📋</text>
              <text class="item-title">病害症状</text>
            </view>
            <view class="item-content">
              <view v-for="(symptom, idx) in result.treatment_info.symptoms" :key="idx" class="list-item">
                <text class="bullet">•</text>
                <text class="item-text">{{ symptom }}</text>
              </view>
            </view>
          </view>

          <view class="divider"></view>

          <view class="treatment-item" v-if="result.treatment_info.prevention_methods">
            <view class="item-header">
              <text class="item-icon">🛡️</text>
              <text class="item-title">预防方法</text>
            </view>
            <view class="item-content">
              <view v-for="(method, idx) in result.treatment_info.prevention_methods" :key="idx" class="list-item">
                <text class="bullet">•</text>
                <text class="item-text">{{ method }}</text>
              </view>
            </view>
          </view>

          <view class="divider"></view>

          <view class="treatment-item" v-if="result.treatment_info.treatment_methods">
            <view class="item-header">
              <text class="item-icon">💉</text>
              <text class="item-title">治疗方法</text>
            </view>
            <view class="item-content">
              <view v-for="(method, idx) in result.treatment_info.treatment_methods" :key="idx" class="list-item">
                <text class="bullet">•</text>
                <text class="item-text">{{ method }}</text>
              </view>
            </view>
          </view>

          <view class="divider" v-if="result.treatment_info.recommended_pesticides"></view>

          <view class="treatment-item" v-if="result.treatment_info.recommended_pesticides">
            <view class="item-header">
              <text class="item-icon">🧪</text>
              <text class="item-title">推荐药剂</text>
            </view>
            <view class="item-content">
              <view class="tags-row">
                <view 
                  v-for="(pesticide, idx) in result.treatment_info.recommended_pesticides" 
                  :key="idx" 
                  class="tag tag-info"
                >{{ pesticide }}</view>
              </view>
            </view>
          </view>

          <view class="divider" v-if="result.treatment_info.notes"></view>

          <view class="treatment-item" v-if="result.treatment_info.notes">
            <view class="item-header">
              <text class="item-icon">📝</text>
              <text class="item-title">注意事项</text>
            </view>
            <view class="item-content">
              <text class="note-text">{{ result.treatment_info.notes }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="action-buttons">
        <view class="btn-outline" @click="goToIdentify">
          <text>重新识别</text>
        </view>
        <view class="btn-primary" @click="viewDiseaseDetail">
          <text>查看详情</text>
        </view>
      </view>
    </view>

    <view v-else class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">正在识别中...</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      selectedImage: '',
      result: null
    }
  },
  onLoad(options) {
    if (options.image) {
      this.selectedImage = decodeURIComponent(options.image)
    }
    if (options.result) {
      try {
        this.result = JSON.parse(decodeURIComponent(options.result))
      } catch (e) {
        console.error('解析结果失败:', e)
      }
    }
  },
  computed: {
    statusClass() {
      if (!this.result) return ''
      const diseaseName = this.result.primary_disease.disease_name
      return diseaseName === '健康' ? 'status-healthy' : 'status-diseased'
    },
    statusIcon() {
      if (!this.result) return ''
      const diseaseName = this.result.primary_disease.disease_name
      return diseaseName === '健康' ? '✅' : '⚠️'
    },
    statusText() {
      if (!this.result) return ''
      const diseaseName = this.result.primary_disease.disease_name
      return diseaseName === '健康' ? '植株健康' : '发现病害'
    },
    confidenceWidth() {
      if (!this.result) return '0%'
      return (this.result.primary_disease.confidence * 100) + '%'
    }
  },
  methods: {
    goToIdentify() {
      uni.switchTab({
        url: '/pages/identify/identify'
      })
    },
    viewDiseaseDetail() {
      if (!this.result) return
      uni.navigateTo({
        url: `/pages/disease-detail/disease-detail?name=${encodeURIComponent(this.result.primary_disease.disease_name)}`
      })
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding-bottom: 120rpx;
}

.image-preview {
  width: 100%;
  height: 500rpx;
  background-color: #F5F5F5;
}

.preview-img {
  width: 100%;
  height: 100%;
}

.result-section {
  padding: 30rpx;
}

.result-header {
  margin-bottom: 30rpx;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  border-radius: 50rpx;
}

.status-badge.status-healthy {
  background-color: #E8F5E9;
}

.status-badge.status-diseased {
  background-color: #FFEBEE;
}

.status-icon {
  font-size: 32rpx;
}

.status-text {
  font-size: 28rpx;
  font-weight: 500;
}

.status-healthy .status-text {
  color: #2B9939;
}

.status-diseased .status-text {
  color: #C62828;
}

.result-title {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 20rpx;
}

.primary-result {
  margin-bottom: 24rpx;
}

.disease-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.disease-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333333;
}

.confidence-bar {
  position: relative;
  height: 16rpx;
  background-color: #F0F0F0;
  border-radius: 8rpx;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #2B9939, #4CAF50);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.confidence-text {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24rpx;
  color: #666666;
  margin-right: 8rpx;
}

.other-results {
  margin-bottom: 30rpx;
}

.candidate-item {
  margin-bottom: 20rpx;
}

.candidate-item:last-child {
  margin-bottom: 0;
}

.candidate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.candidate-name {
  font-size: 28rpx;
  color: #333333;
}

.candidate-confidence {
  font-size: 26rpx;
  color: #666666;
}

.candidate-bar {
  height: 8rpx;
  background-color: #F0F0F0;
  border-radius: 4rpx;
  overflow: hidden;
}

.candidate-fill {
  height: 100%;
  background-color: #90CAF9;
  border-radius: 4rpx;
}

.treatment-section {
  margin-bottom: 30rpx;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.section-icon {
  font-size: 36rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.treatment-card {
  padding: 0;
  overflow: hidden;
}

.treatment-item {
  padding: 30rpx;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.item-icon {
  font-size: 28rpx;
}

.item-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

.item-content {
  padding-left: 40rpx;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.list-item:last-child {
  margin-bottom: 0;
}

.bullet {
  color: #2B9939;
  font-size: 24rpx;
}

.item-text {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
  flex: 1;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.note-text {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}

.divider {
  height: 1rpx;
  background-color: #F0F0F0;
  margin: 0 30rpx;
}

.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 30rpx;
  background-color: #FFFFFF;
  display: flex;
  gap: 24rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.action-buttons .btn-primary,
.action-buttons .btn-outline {
  flex: 1;
  padding: 28rpx;
  text-align: center;
  border-radius: 12rpx;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
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
</style>
