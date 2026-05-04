<template>
  <view class="container">
    <view class="identify-area">
      <view v-if="!selectedImage" class="empty-image-area">
        <view class="camera-icon">📷</view>
        <text class="hint-text">点击下方按钮拍摄或选择图片</text>
        <text class="sub-hint">支持识别番茄、黄瓜、苹果、葡萄等植物病害</text>
      </view>
      
      <view v-else class="selected-image-area">
        <image :src="selectedImage" mode="aspectFit" class="preview-image" />
        <view class="reselect-btn" @click="reselectImage">
          <text>重新选择</text>
        </view>
      </view>
    </view>

    <view class="plant-select" v-if="plants.length > 0">
      <text class="select-label">关联植物（可选）</text>
      <picker 
        :value="selectedPlantIndex" 
        :range="plants" 
        range-key="name"
        @change="onPlantChange"
        @cancel="onPlantCancel"
      >
        <view class="picker-display">
          <text v-if="selectedPlant">{{ selectedPlant.name }}</text>
          <text v-else class="placeholder">选择关联的植物</text>
          <text class="picker-arrow">›</text>
        </view>
      </picker>
    </view>

    <view class="action-buttons">
      <view class="action-row">
        <view class="btn-secondary" @click="chooseFromAlbum">
          <text class="btn-icon">🖼️</text>
          <text>相册选择</text>
        </view>
        <view class="btn-primary" @click="takePhoto">
          <text class="btn-icon">📸</text>
          <text>拍照识别</text>
        </view>
      </view>
      
      <view 
        v-if="selectedImage && !isIdentifying" 
        class="identify-btn btn-primary" 
        @click="startIdentify"
      >
        <text>开始识别</text>
      </view>
      
      <view v-if="isIdentifying" class="identifying-btn">
        <view class="loading-spinner"></view>
        <text>正在识别中...</text>
      </view>
    </view>

    <view class="tips-section">
      <view class="tips-header">
        <text class="tips-icon">💡</text>
        <text class="tips-title">识别小技巧</text>
      </view>
      <view class="tips-list">
        <view class="tip-item">
          <text class="tip-number">1</text>
          <text class="tip-text">确保图片清晰，重点拍摄病叶或病果</text>
        </view>
        <view class="tip-item">
          <text class="tip-number">2</text>
          <text class="tip-text">光线充足，避免逆光拍摄</text>
        </view>
        <view class="tip-item">
          <text class="tip-number">3</text>
          <text class="tip-text">拍摄时尽量靠近病斑部位</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      selectedImage: '',
      plants: [],
      selectedPlantIndex: -1,
      selectedPlant: null,
      isIdentifying: false
    }
  },
  onShow() {
    this.loadPlants()
  },
  methods: {
    async loadPlants() {
      try {
        const plants = await api.plantApi.getAll()
        this.plants = plants
      } catch (error) {
        console.error('加载植物列表失败:', error)
      }
    },
    takePhoto() {
      uni.chooseImage({
        count: 1,
        sourceType: ['camera'],
        sizeType: ['compressed'],
        success: (res) => {
          this.selectedImage = res.tempFilePaths[0]
        }
      })
    },
    chooseFromAlbum() {
      uni.chooseImage({
        count: 1,
        sourceType: ['album'],
        sizeType: ['compressed'],
        success: (res) => {
          this.selectedImage = res.tempFilePaths[0]
        }
      })
    },
    reselectImage() {
      this.selectedImage = ''
    },
    onPlantChange(e) {
      this.selectedPlantIndex = e.detail.value
      this.selectedPlant = this.plants[e.detail.value]
    },
    onPlantCancel() {
      this.selectedPlantIndex = -1
      this.selectedPlant = null
    },
    async startIdentify() {
      if (!this.selectedImage) {
        uni.showToast({
          title: '请先选择图片',
          icon: 'none'
        })
        return
      }

      this.isIdentifying = true
      
      try {
        const plantId = this.selectedPlant ? this.selectedPlant.id : null
        const result = await api.diseaseApi.identify(this.selectedImage, plantId)
        
        uni.navigateTo({
          url: `/pages/result/result?result=${encodeURIComponent(JSON.stringify(result))}&image=${encodeURIComponent(this.selectedImage)}`
        })
      } catch (error) {
        console.error('识别失败:', error)
        uni.showToast({
          title: error.message || '识别失败，请重试',
          icon: 'none'
        })
      } finally {
        this.isIdentifying = false
      }
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 30rpx;
}

.identify-area {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  min-height: 500rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-image-area {
  text-align: center;
}

.camera-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.hint-text {
  font-size: 32rpx;
  color: #333333;
  display: block;
  margin-bottom: 16rpx;
}

.sub-hint {
  font-size: 26rpx;
  color: #999999;
}

.selected-image-area {
  position: relative;
  width: 100%;
}

.preview-image {
  width: 100%;
  height: 500rpx;
}

.reselect-btn {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  background-color: rgba(0, 0, 0, 0.6);
  color: #FFFFFF;
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.plant-select {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.select-label {
  font-size: 28rpx;
  color: #666666;
  display: block;
  margin-bottom: 16rpx;
}

.picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #F8F8F8;
  border-radius: 12rpx;
}

.picker-display .placeholder {
  color: #999999;
}

.picker-arrow {
  font-size: 32rpx;
  color: #CCCCCC;
}

.action-buttons {
  margin-bottom: 40rpx;
}

.action-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 28rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.btn-primary {
  background-color: #2B9939;
  color: #FFFFFF;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #333333;
  border: 2rpx solid #E0E0E0;
}

.btn-icon {
  font-size: 40rpx;
}

.identify-btn {
  padding: 32rpx;
  text-align: center;
}

.identifying-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 32rpx;
  background-color: #F5F5F5;
  border-radius: 16rpx;
  color: #666666;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #E0E0E0;
  border-top-color: #2B9939;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tips-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.tips-icon {
  font-size: 32rpx;
}

.tips-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.tip-number {
  width: 40rpx;
  height: 40rpx;
  background-color: #E8F5E9;
  color: #2B9939;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  flex-shrink: 0;
}

.tip-text {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}
</style>
