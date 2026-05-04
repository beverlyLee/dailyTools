<template>
  <view class="container">
    <view class="intro-card card">
      <text class="intro-title">附近宠物医院</text>
      <text class="intro-desc">基于您的位置，查找附近的宠物医院和诊所，方便您为宠物提供及时的医疗服务。</text>
    </view>

    <view class="search-section card">
      <view class="search-input-wrapper">
        <input 
          class="search-input" 
          v-model="searchKeyword" 
          placeholder="搜索宠物医院、诊所..."
          @confirm="searchHospitals"
        />
        <button class="search-btn" @click="searchHospitals">搜索</button>
      </view>
      <view class="filter-section">
        <view class="filter-item" :class="{ active: selectedFilter === 'all' }" @click="selectFilter('all')">
          <text>全部</text>
        </view>
        <view class="filter-item" :class="{ active: selectedFilter === 'hospital' }" @click="selectFilter('hospital')">
          <text>宠物医院</text>
        </view>
        <view class="filter-item" :class="{ active: selectedFilter === 'clinic' }" @click="selectFilter('clinic')">
          <text>宠物诊所</text>
        </view>
        <view class="filter-item" :class="{ active: selectedFilter === '24h' }" @click="selectFilter('24h')">
          <text>24小时</text>
        </view>
      </view>
    </view>

    <view class="location-section card" v-if="currentLocation">
      <view class="location-header">
        <text class="location-icon">📍</text>
        <text class="location-text">当前位置：{{ currentLocation.address || '获取中...' }}</text>
      </view>
      <button class="refresh-location-btn" @click="getCurrentLocation">
        <text>刷新位置</text>
      </button>
    </view>

    <view class="hospitals-section" v-if="hospitals.length > 0">
      <view class="section-title">
        <text>附近的宠物医院</text>
        <text class="hospital-count">{{ hospitals.length }} 个结果</text>
      </view>
      
      <view class="hospital-list">
        <view class="hospital-card card" v-for="hospital in hospitals" :key="hospital.id">
          <view class="hospital-header">
            <view class="hospital-info">
              <text class="hospital-name">{{ hospital.name }}</text>
              <view class="hospital-tags">
                <text class="tag" v-if="hospital.is24h">24小时</text>
                <text class="tag" v-if="hospital.isEmergency">急诊</text>
                <text class="tag" v-if="hospital.rating">★ {{ hospital.rating }}</text>
              </view>
            </view>
            <view class="hospital-distance">
              <text>{{ hospital.distance }}</text>
            </view>
          </view>
          
          <view class="hospital-details" v-if="hospital.address">
            <text class="detail-label">地址：</text>
            <text class="detail-value">{{ hospital.address }}</text>
          </view>
          
          <view class="hospital-details" v-if="hospital.phone">
            <text class="detail-label">电话：</text>
            <text class="detail-value phone" @click="callHospital(hospital.phone)">{{ hospital.phone }}</text>
          </view>
          
          <view class="hospital-details" v-if="hospital.businessHours">
            <text class="detail-label">营业时间：</text>
            <text class="detail-value">{{ hospital.businessHours }}</text>
          </view>
          
          <view class="hospital-actions">
            <button class="btn-secondary action-btn" @click="viewHospitalDetail(hospital)">查看详情</button>
            <button class="btn-secondary action-btn" @click="navigateToHospital(hospital)">导航</button>
            <button class="btn-primary action-btn" @click="callHospital(hospital.phone)" v-if="hospital.phone">打电话</button>
          </view>
        </view>
      </view>
    </view>

    <view class="loading-state" v-else-if="loading">
      <text class="loading-icon">🔄</text>
      <text class="loading-text">正在查找附近的宠物医院...</text>
    </view>

    <view class="empty-state" v-else>
      <text class="empty-icon">🏥</text>
      <text class="empty-text">未找到附近的宠物医院</text>
      <text class="empty-desc">请尝试搜索其他关键词或刷新位置</text>
      <button class="btn-primary mt-20" @click="getCurrentLocation">获取位置并搜索</button>
    </view>

    <!-- 医院详情弹窗 -->
    <view class="modal-overlay" v-if="showDetailModal" @click="hideDetailModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ selectedHospital?.name }}</text>
          <text class="modal-close" @click="hideDetailModal">×</text>
        </view>
        
        <view class="modal-body">
          <view class="detail-section">
            <text class="detail-section-title">基本信息</text>
            <view class="detail-item">
              <text class="detail-label">评分：</text>
              <text class="detail-value">{{ selectedHospital?.rating || '暂无评分' }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">距离：</text>
              <text class="detail-value">{{ selectedHospital?.distance }}</text>
            </view>
            <view class="detail-item" v-if="selectedHospital?.address">
              <text class="detail-label">地址：</text>
              <text class="detail-value">{{ selectedHospital.address }}</text>
            </view>
            <view class="detail-item" v-if="selectedHospital?.phone">
              <text class="detail-label">电话：</text>
              <text class="detail-value phone" @click="callHospital(selectedHospital?.phone || '')">{{ selectedHospital?.phone }}</text>
            </view>
            <view class="detail-item" v-if="selectedHospital?.businessHours">
              <text class="detail-label">营业时间：</text>
              <text class="detail-value">{{ selectedHospital.businessHours }}</text>
            </view>
          </view>
          
          <view class="detail-section" v-if="selectedHospital?.services && selectedHospital.services.length > 0">
            <text class="detail-section-title">提供服务</text>
            <view class="services-list">
              <text class="service-tag" v-for="(service, index) in selectedHospital.services" :key="index">{{ service }}</text>
            </view>
          </view>
          
          <view class="detail-section" v-if="selectedHospital?.description">
            <text class="detail-section-title">医院介绍</text>
            <text class="hospital-description">{{ selectedHospital.description }}</text>
          </view>
        </view>
        
        <view class="modal-footer">
          <button class="btn-secondary modal-btn" @click="navigateToHospital(selectedHospital)">导航</button>
          <button class="btn-primary modal-btn" @click="callHospital(selectedHospital?.phone || '')" v-if="selectedHospital?.phone">打电话</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMapService } from '@/services/mapService'

interface Hospital {
  id: string
  name: string
  address: string
  phone: string
  distance: string
  rating: number
  is24h: boolean
  isEmergency: boolean
  businessHours: string
  services: string[]
  description: string
  latitude: number
  longitude: number
}

interface Location {
  latitude: number
  longitude: number
  address: string
}

const mapService = useMapService()

const searchKeyword = ref<string>('')
const selectedFilter = ref<string>('all')
const currentLocation = ref<Location | null>(null)
const hospitals = ref<Hospital[]>([])
const loading = ref<boolean>(false)
const showDetailModal = ref<boolean>(false)
const selectedHospital = ref<Hospital | null>(null)

const getCurrentLocation = async () => {
  loading.value = true
  try {
    // 使用 uni-app 的位置 API 获取当前位置
    uni.getLocation({
      type: 'gcj02',
      success: async (res) => {
        currentLocation.value = {
          latitude: res.latitude,
          longitude: res.longitude,
          address: '当前位置'
        }
        
        // 尝试获取地址信息
        try {
          const address = await mapService.getAddressFromLocation(res.latitude, res.longitude)
          currentLocation.value.address = address
        } catch (error) {
          console.error('获取地址失败:', error)
        }
        
        // 搜索附近的宠物医院
        await searchNearbyHospitals()
      },
      fail: (error) => {
        console.error('获取位置失败:', error)
        uni.showModal({
          title: '位置权限',
          content: '需要获取您的位置信息才能查找附近的宠物医院，请在设置中开启位置权限。',
          showCancel: false
        })
        loading.value = false
      }
    })
  } catch (error) {
    console.error('获取位置失败:', error)
    loading.value = false
  }
}

const searchNearbyHospitals = async () => {
  if (!currentLocation.value) return
  
  loading.value = true
  try {
    // 调用高德地图 API 搜索附近的宠物医院
    const results = await mapService.searchNearbyHospitals(
      currentLocation.value.latitude,
      currentLocation.value.longitude,
      searchKeyword.value,
      selectedFilter.value
    )
    
    hospitals.value = results
  } catch (error) {
    console.error('搜索医院失败:', error)
    uni.showToast({
      title: '搜索失败',
      icon: 'error'
    })
  } finally {
    loading.value = false
  }
}

const searchHospitals = () => {
  if (currentLocation.value) {
    searchNearbyHospitals()
  } else {
    getCurrentLocation()
  }
}

const selectFilter = (filter: string) => {
  selectedFilter.value = filter
  if (currentLocation.value) {
    searchNearbyHospitals()
  }
}

const viewHospitalDetail = (hospital: Hospital) => {
  selectedHospital.value = hospital
  showDetailModal.value = true
}

const hideDetailModal = () => {
  showDetailModal.value = false
  selectedHospital.value = null
}

const callHospital = (phone: string) => {
  if (!phone) return
  
  uni.makePhoneCall({
    phoneNumber: phone,
    fail: (error) => {
      console.error('拨打电话失败:', error)
      uni.showToast({
        title: '拨打电话失败',
        icon: 'none'
      })
    }
  })
}

const navigateToHospital = (hospital: Hospital | null) => {
  if (!hospital) return
  
  uni.openLocation({
    latitude: hospital.latitude,
    longitude: hospital.longitude,
    name: hospital.name,
    address: hospital.address,
    fail: (error) => {
      console.error('打开地图失败:', error)
      uni.showToast({
        title: '打开地图失败',
        icon: 'none'
      })
    }
  })
}

// 页面加载时尝试获取位置
onMounted(() => {
  // 检查是否已经获取过位置，或者用户授权
  uni.getSetting({
    success: (res) => {
      if (res.authSetting['scope.userLocation']) {
        getCurrentLocation()
      }
    }
  })
})
</script>

<style scoped>
.intro-card {
  margin-bottom: 30rpx;
}

.intro-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.intro-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.search-section {
  margin-bottom: 30rpx;
  padding: 24rpx;
}

.search-input-wrapper {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.search-input {
  flex: 1;
  height: 80rpx;
  padding: 0 20rpx;
  background-color: #f9f9f9;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.search-btn {
  height: 80rpx;
  padding: 0 32rpx;
  background-color: #4A90D9;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-section {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.filter-item {
  padding: 12rpx 24rpx;
  background-color: #f9f9f9;
  border: 1rpx solid #e0e0e0;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #666;
  transition: all 0.3s;
}

.filter-item.active {
  background-color: rgba(74, 144, 217, 0.1);
  border-color: #4A90D9;
  color: #4A90D9;
}

.location-section {
  margin-bottom: 30rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.location-icon {
  font-size: 32rpx;
}

.location-text {
  font-size: 26rpx;
  color: #333;
}

.refresh-location-btn {
  padding: 12rpx 24rpx;
  background-color: #f0f0f0;
  border: none;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #666;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title text:first-child {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  padding-left: 10rpx;
  border-left: 6rpx solid #4A90D9;
}

.hospital-count {
  font-size: 24rpx;
  color: #999;
}

.hospital-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.hospital-card {
  padding: 24rpx;
}

.hospital-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.hospital-info {
  flex: 1;
}

.hospital-name {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.hospital-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.tag {
  padding: 4rpx 12rpx;
  background-color: rgba(74, 144, 217, 0.1);
  color: #4A90D9;
  border-radius: 4rpx;
  font-size: 22rpx;
}

.hospital-distance {
  font-size: 26rpx;
  color: #4A90D9;
  font-weight: 500;
  white-space: nowrap;
}

.hospital-details {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 26rpx;
}

.hospital-details:last-child {
  margin-bottom: 20rpx;
}

.detail-label {
  color: #666;
  min-width: 100rpx;
}

.detail-value {
  color: #333;
  flex: 1;
}

.detail-value.phone {
  color: #4A90D9;
  text-decoration: underline;
}

.hospital-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  padding: 16rpx;
  font-size: 26rpx;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-icon,
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.loading-text,
.empty-text {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: #999;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-height: 80vh;
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.modal-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 30rpx;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.detail-item {
  display: flex;
  margin-bottom: 16rpx;
  font-size: 26rpx;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.services-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.service-tag {
  padding: 8rpx 16rpx;
  background-color: rgba(74, 144, 217, 0.1);
  color: #4A90D9;
  border-radius: 4rpx;
  font-size: 24rpx;
}

.hospital-description {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  font-size: 28rpx;
}
</style>
