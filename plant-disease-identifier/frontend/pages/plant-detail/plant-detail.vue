<template>
  <view class="container">
    <view v-if="plant" class="plant-header">
      <view class="plant-avatar">
        <text class="plant-icon">{{ getPlantIcon(plant.plant_type) }}</text>
      </view>
      <view class="plant-info">
        <view class="plant-name-row">
          <text class="plant-name">{{ plant.name }}</text>
          <view 
            :class="['status-tag', getStatusClass(plant.current_health_status)]"
          >{{ plant.current_health_status }}</view>
        </view>
        <view class="plant-meta">
          <text class="meta-item">
            <text class="meta-icon">🌿</text>
            <text>{{ plant.plant_type }}</text>
          </text>
          <text class="meta-item">
            <text class="meta-icon">📅</text>
            <text>种植于 {{ formatDate(plant.planting_date) }}</text>
          </text>
        </view>
        <view class="plant-location" v-if="plant.location">
          <text class="meta-icon">📍</text>
          <text>{{ plant.location }}</text>
        </view>
      </view>
    </view>

    <view class="action-buttons" v-if="plant">
      <view class="btn-outline" @click="identifyPlant">
        <text class="btn-icon">📷</text>
        <text>识别病害</text>
      </view>
      <view class="btn-secondary" @click="editPlant">
        <text class="btn-icon">✏️</text>
        <text>编辑</text>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">健康记录</text>
        <text class="section-count" v-if="plant.health_records">
          {{ plant.health_records.length }} 条记录
        </text>
      </view>

      <view v-if="!plant.health_records || plant.health_records.length === 0" class="empty-state">
        <view class="empty-icon">📊</view>
        <text class="empty-text">暂无健康记录</text>
        <text class="empty-hint" @click="identifyPlant">点击识别病害，开始记录</text>
      </view>

      <view v-else class="records-list">
        <view 
          v-for="(record, index) in sortedRecords" 
          :key="record.id" 
          class="record-item card"
          @click="viewRecordDetail(record)"
        >
          <view class="record-header">
            <view class="record-status">
              <view 
                :class="['status-dot', getStatusDotClass(record.health_status)]"
              ></view>
              <text class="record-disease">{{ record.identified_disease || record.health_status }}</text>
            </view>
            <view class="record-date">{{ formatDate(record.check_date) }}</view>
          </view>
          <view class="record-content">
            <view class="confidence-info" v-if="record.confidence">
              <text class="confidence-label">置信度:</text>
              <text class="confidence-value">{{ record.confidence }}</text>
            </view>
            <view class="record-notes" v-if="record.notes">
              <text class="notes-label">备注:</text>
              <text class="notes-text">{{ record.notes }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="plant && plant.notes">
      <view class="section-header">
        <text class="section-title">备注</text>
      </view>
      <view class="card notes-card">
        <text class="notes-text">{{ plant.notes }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      plantId: null,
      plant: null
    }
  },
  onLoad(options) {
    if (options.id) {
      this.plantId = parseInt(options.id)
      this.loadPlantDetail()
    }
  },
  computed: {
    sortedRecords() {
      if (!this.plant || !this.plant.health_records) return []
      return [...this.plant.health_records].sort((a, b) => 
        new Date(b.check_date) - new Date(a.check_date)
      )
    }
  },
  methods: {
    async loadPlantDetail() {
      try {
        const plant = await api.plantApi.getById(this.plantId)
        this.plant = plant
      } catch (error) {
        console.error('加载植物详情失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    identifyPlant() {
      uni.switchTab({
        url: '/pages/identify/identify'
      })
    },
    editPlant() {
      uni.navigateTo({
        url: `/pages/add-plant/add-plant?id=${this.plantId}`
      })
    },
    viewRecordDetail(record) {
      uni.navigateTo({
        url: `/pages/result/result?record=${encodeURIComponent(JSON.stringify(record))}`
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
    getStatusDotClass(status) {
      if (status === '健康') return 'dot-healthy'
      if (status === '患病') return 'dot-diseased'
      return 'dot-warning'
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F8F8F8;
  padding: 30rpx;
}

.plant-header {
  display: flex;
  align-items: flex-start;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.plant-avatar {
  width: 120rpx;
  height: 120rpx;
  background-color: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.plant-icon {
  font-size: 56rpx;
}

.plant-info {
  flex: 1;
}

.plant-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.plant-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333333;
}

.status-tag {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
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
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #666666;
}

.meta-icon {
  font-size: 26rpx;
}

.plant-location {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #666666;
  margin-top: 8rpx;
}

.action-buttons {
  display: flex;
  gap: 24rpx;
  margin-bottom: 30rpx;
}

.action-buttons .btn-outline,
.action-buttons .btn-secondary {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx;
  border-radius: 12rpx;
}

.btn-outline {
  background-color: #FFFFFF;
  border: 2rpx solid #2B9939;
}

.btn-outline text:last-child {
  color: #2B9939;
}

.btn-secondary {
  background-color: #FFFFFF;
  border: 2rpx solid #E0E0E0;
}

.btn-secondary text:last-child {
  color: #666666;
}

.btn-icon {
  font-size: 36rpx;
}

.section {
  margin-bottom: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 0 10rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.section-count {
  font-size: 26rpx;
  color: #999999;
}

.empty-state {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  padding: 60rpx 40rpx;
  text-align: center;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
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
  padding: 24rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.record-status {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.status-dot.dot-healthy {
  background-color: #2B9939;
}

.status-dot.dot-diseased {
  background-color: #C62828;
}

.status-dot.dot-warning {
  background-color: #EF6C00;
}

.record-disease {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
}

.record-date {
  font-size: 24rpx;
  color: #999999;
}

.record-content {
  padding-left: 28rpx;
}

.confidence-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.confidence-label {
  font-size: 26rpx;
  color: #666666;
}

.confidence-value {
  font-size: 26rpx;
  color: #2B9939;
  font-weight: 500;
}

.record-notes {
  display: flex;
  gap: 8rpx;
}

.notes-label {
  font-size: 26rpx;
  color: #666666;
}

.notes-text {
  font-size: 26rpx;
  color: #333333;
  flex: 1;
}

.notes-card {
  padding: 24rpx;
}

.notes-card .notes-text {
  line-height: 1.6;
  color: #333333;
}
</style>
