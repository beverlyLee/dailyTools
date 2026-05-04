<template>
  <view class="container">
    <view class="header">
      <text class="header-title">我的植物</text>
      <view class="add-btn" @click="goToAddPlant">
        <text class="add-icon">➕</text>
        <text>添加</text>
      </view>
    </view>

    <view v-if="plants.length === 0" class="empty-state">
      <view class="empty-icon">🌱</view>
      <text class="empty-title">暂无植物档案</text>
      <text class="empty-subtitle">添加你的第一株植物，开始记录养护历程</text>
      <view class="btn-primary" @click="goToAddPlant">
        <text>添加植物</text>
      </view>
    </view>

    <view v-else class="plants-list">
      <view 
        v-for="(plant, index) in plants" 
        :key="plant.id" 
        class="plant-item"
        @click="goToPlantDetail(plant.id)"
      >
        <view class="plant-avatar">
          <text class="plant-icon">{{ getPlantIcon(plant.plant_type) }}</text>
        </view>
        <view class="plant-info">
          <view class="plant-header">
            <text class="plant-name">{{ plant.name }}</text>
            <view 
              :class="['status-tag', getStatusClass(plant.current_health_status)]"
            >{{ plant.current_health_status }}</view>
          </view>
          <view class="plant-meta">
            <text class="plant-type">{{ plant.plant_type }}</text>
          </view>
          <view class="plant-footer">
            <view class="meta-item">
              <text class="meta-icon">📅</text>
              <text class="meta-text">种植于 {{ formatDate(plant.planting_date) }}</text>
            </view>
            <view class="meta-item" v-if="plant.health_records && plant.health_records.length > 0">
              <text class="meta-icon">📊</text>
              <text class="meta-text">{{ plant.health_records.length }} 次记录</text>
            </view>
          </view>
        </view>
        <view class="plant-arrow">›</view>
      </view>
    </view>

    <view v-if="plants.length > 0" class="floating-add" @click="goToAddPlant">
      <text class="floating-icon">➕</text>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      plants: []
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
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    goToAddPlant() {
      uni.navigateTo({
        url: '/pages/add-plant/add-plant'
      })
    },
    goToPlantDetail(plantId) {
      uni.navigateTo({
        url: `/pages/plant-detail/plant-detail?id=${plantId}`
      })
    },
    getPlantIcon(type) {
      const icons = {
        '番茄': '🍅',
        '黄瓜': '🥒',
        '苹果': '🍎',
        '葡萄': '🍇'
      }
      return icons[type] || '🌱'
    },
    getStatusClass(status) {
      if (status === '健康') return 'status-healthy'
      if (status === '患病') return 'status-diseased'
      return 'status-warning'
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F8F8F8;
  padding: 30rpx;
  padding-bottom: 120rpx;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.header-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #333333;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background-color: #E8F5E9;
  border-radius: 50rpx;
}

.add-icon {
  font-size: 28rpx;
}

.add-btn text:last-child {
  font-size: 28rpx;
  color: #2B9939;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333333;
  margin-bottom: 16rpx;
}

.empty-subtitle {
  font-size: 28rpx;
  color: #999999;
  text-align: center;
  margin-bottom: 40rpx;
}

.empty-state .btn-primary {
  padding: 24rpx 80rpx;
}

.plants-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.plant-item {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
}

.plant-avatar {
  width: 100rpx;
  height: 100rpx;
  background-color: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.plant-icon {
  font-size: 48rpx;
}

.plant-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.plant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plant-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #333333;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
}

.status-tag.status-healthy {
  background-color: #E8F5E9;
  color: #2B9939;
}

.status-tag.status-diseased {
  background-color: #FFEBEE;
  color: #C62828;
}

.status-tag.status-warning {
  background-color: #FFF3E0;
  color: #EF6C00;
}

.plant-meta {
  margin-top: 4rpx;
}

.plant-type {
  font-size: 26rpx;
  color: #666666;
}

.plant-footer {
  display: flex;
  gap: 24rpx;
  margin-top: 8rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.meta-icon {
  font-size: 24rpx;
}

.meta-text {
  font-size: 24rpx;
  color: #999999;
}

.plant-arrow {
  font-size: 40rpx;
  color: #CCCCCC;
  margin-left: 16rpx;
}

.floating-add {
  position: fixed;
  bottom: 40rpx;
  right: 40rpx;
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #2B9939, #4CAF50);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(43, 153, 57, 0.3);
}

.floating-icon {
  font-size: 48rpx;
  color: #FFFFFF;
}
</style>
