<template>
  <view class="container">
    <view class="header-card">
      <view class="header-content">
        <text class="app-title">植物病害识别</text>
        <text class="app-subtitle">智能识别植物病害，专业防治建议</text>
      </view>
    </view>

    <view class="quick-actions">
      <view class="action-grid">
        <view class="action-item" @click="goToIdentify">
          <view class="action-icon camera">📷</view>
          <text class="action-text">拍照识别</text>
        </view>
        <view class="action-item" @click="goToPlants">
          <view class="action-icon plant">🌱</view>
          <text class="action-text">我的植物</text>
        </view>
        <view class="action-item" @click="goToKnowledge">
          <view class="action-icon book">📖</view>
          <text class="action-text">防治知识</text>
        </view>
        <view class="action-item" @click="goToAddPlant">
          <view class="action-icon add">➕</view>
          <text class="action-text">添加植物</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">最近识别</text>
        <text class="section-more" @click="goToHistory">查看全部</text>
      </view>
      
      <view v-if="recentRecords.length === 0" class="empty-state">
        <view class="empty-state-icon">📷</view>
        <text class="empty-state-text">暂无识别记录</text>
        <text class="empty-hint" @click="goToIdentify">点击开始识别植物病害</text>
      </view>
      
      <view v-else class="records-list">
        <view 
          v-for="(record, index) in recentRecords" 
          :key="index" 
          class="record-item card"
          @click="viewRecordDetail(record)"
        >
          <view class="record-image">
            <image :src="record.image_url" mode="aspectFill" class="record-preview" />
          </view>
          <view class="record-info">
            <view class="disease-name">
              <text>{{ record.identified_disease }}</text>
              <view 
                :class="['tag', getHealthTagClass(record.health_status)]"
              >{{ record.health_status }}</view>
            </view>
            <view class="confidence">置信度: {{ record.confidence }}</view>
            <view class="record-date">{{ formatDate(record.check_date) }}</view>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">我的植物</text>
        <text class="section-more" @click="goToPlants">查看全部</text>
      </view>
      
      <view v-if="myPlants.length === 0" class="empty-state">
        <view class="empty-state-icon">🌱</view>
        <text class="empty-state-text">暂无植物档案</text>
        <text class="empty-hint" @click="goToAddPlant">点击添加你的第一株植物</text>
      </view>
      
      <view v-else class="plants-list">
        <view 
          v-for="(plant, index) in myPlants" 
          :key="index" 
          class="plant-item card"
          @click="goToPlantDetail(plant.id)"
        >
          <view class="plant-avatar">
            <view class="plant-icon">{{ getPlantIcon(plant.plant_type) }}</view>
          </view>
          <view class="plant-info">
            <view class="plant-name">{{ plant.name }}</view>
            <view class="plant-type">{{ plant.plant_type }}</view>
            <view class="plant-meta">
              <text>种植于 {{ formatDate(plant.planting_date) }}</text>
              <view 
                :class="['tag', getHealthTagClass(plant.current_health_status)]"
              >{{ plant.current_health_status }}</view>
            </view>
          </view>
          <view class="plant-arrow">›</view>
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
      recentRecords: [],
      myPlants: []
    }
  },
  onShow() {
    this.loadData()
  },
  methods: {
    async loadData() {
      await this.loadRecentRecords()
      await this.loadMyPlants()
    },
    async loadRecentRecords() {
      try {
        const plants = await api.plantApi.getAll(0, 5)
        let allRecords = []
        
        for (const plant of plants) {
          if (plant.health_records && plant.health_records.length > 0) {
            allRecords = allRecords.concat(plant.health_records.map(r => ({
              ...r,
              plant_name: plant.name
            })))
          }
        }
        
        allRecords.sort((a, b) => new Date(b.check_date) - new Date(a.check_date))
        this.recentRecords = allRecords.slice(0, 5)
      } catch (error) {
        console.error('加载识别记录失败:', error)
      }
    },
    async loadMyPlants() {
      try {
        const plants = await api.plantApi.getAll(0, 5)
        this.myPlants = plants
      } catch (error) {
        console.error('加载植物列表失败:', error)
      }
    },
    goToIdentify() {
      uni.switchTab({
        url: '/pages/identify/identify'
      })
    },
    goToPlants() {
      uni.switchTab({
        url: '/pages/plants/plants'
      })
    },
    goToKnowledge() {
      uni.navigateTo({
        url: '/pages/knowledge/knowledge'
      })
    },
    goToAddPlant() {
      uni.navigateTo({
        url: '/pages/add-plant/add-plant'
      })
    },
    goToHistory() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },
    goToPlantDetail(plantId) {
      uni.navigateTo({
        url: `/pages/plant-detail/plant-detail?id=${plantId}`
      })
    },
    viewRecordDetail(record) {
      uni.navigateTo({
        url: `/pages/result/result?record=${JSON.stringify(record)}`
      })
    },
    getHealthTagClass(status) {
      if (status === '健康') {
        return 'tag-success'
      } else if (status === '患病') {
        return 'tag-danger'
      }
      return 'tag-warning'
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
.header-card {
  background: linear-gradient(135deg, #2B9939 0%, #4CAF50 100%);
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  margin-bottom: 40rpx;
}

.header-content {
  text-align: center;
}

.app-title {
  font-size: 48rpx;
  font-weight: 600;
  color: #FFFFFF;
  display: block;
  margin-bottom: 16rpx;
}

.app-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

.quick-actions {
  margin-bottom: 40rpx;
}

.action-grid {
  display: flex;
  flex-wrap: wrap;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
}

.action-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}

.action-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  margin-bottom: 16rpx;
}

.action-icon.camera {
  background-color: #E8F5E9;
}

.action-icon.plant {
  background-color: #FFF3E0;
}

.action-icon.book {
  background-color: #E3F2FD;
}

.action-icon.add {
  background-color: #FCE4EC;
}

.action-text {
  font-size: 26rpx;
  color: #333333;
}

.section {
  margin-bottom: 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding: 0 10rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.section-more {
  font-size: 26rpx;
  color: #2B9939;
}

.empty-state {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 60rpx 40rpx;
  text-align: center;
}

.empty-state-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-state-text {
  font-size: 28rpx;
  color: #999999;
  display: block;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #2B9939;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-item {
  display: flex;
  padding: 24rpx;
}

.record-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.record-preview {
  width: 100%;
  height: 100%;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.disease-name {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.disease-name text {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
}

.confidence {
  font-size: 26rpx;
  color: #666666;
  margin: 8rpx 0;
}

.record-date {
  font-size: 24rpx;
  color: #999999;
}

.plants-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.plant-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
}

.plant-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #F5F5F5;
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
  gap: 8rpx;
}

.plant-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #333333;
}

.plant-type {
  font-size: 26rpx;
  color: #666666;
}

.plant-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

.plant-arrow {
  font-size: 40rpx;
  color: #CCCCCC;
  margin-left: 16rpx;
}
</style>
