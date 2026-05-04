<template>
  <view class="container">
    <view class="welcome-section card">
      <text class="welcome-title">宠物健康管理</text>
      <text class="welcome-desc">全面管理您宠物的健康状况</text>
    </view>

    <view class="quick-actions">
      <view class="action-item card" @click="navigateTo('vaccine')">
        <view class="action-icon vaccine-icon">
          <text>💉</text>
        </view>
        <text class="action-text">疫苗计划</text>
      </view>
      <view class="action-item card" @click="navigateTo('symptom')">
        <view class="action-icon symptom-icon">
          <text>🩺</text>
        </view>
        <text class="action-text">症状自查</text>
      </view>
      <view class="action-item card" @click="navigateTo('medical')">
        <view class="action-icon medical-icon">
          <text>📋</text>
        </view>
        <text class="action-text">病历记录</text>
      </view>
      <view class="action-item card" @click="navigateTo('hospital')">
        <view class="action-icon hospital-icon">
          <text>🏥</text>
        </view>
        <text class="action-text">附近医院</text>
      </view>
    </view>

    <view class="reminder-section card" v-if="reminders.length > 0">
      <text class="section-title">疫苗提醒</text>
      <view class="reminder-list">
        <view class="reminder-item" v-for="reminder in reminders" :key="reminder.id">
          <view class="reminder-info">
            <text class="reminder-pet">{{ reminder.petName }}</text>
            <text class="reminder-vaccine">{{ reminder.vaccineName }}</text>
          </view>
          <view class="reminder-date">
            <text>{{ reminder.date }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePetStore } from '@/stores/pet'

const petStore = usePetStore()

interface Reminder {
  id: number
  petName: string
  vaccineName: string
  date: string
}

const reminders = ref<Reminder[]>([])

const navigateTo = (page: string) => {
  uni.navigateTo({
    url: `/pages/${page}/${page}`
  })
}

onMounted(() => {
  loadReminders()
})

const loadReminders = async () => {
  try {
    const data = await petStore.getVaccineReminders()
    reminders.value = data
  } catch (error) {
    console.error('加载提醒失败:', error)
  }
}
</script>

<style scoped>
.welcome-section {
  text-align: center;
  padding: 40rpx;
  margin-bottom: 30rpx;
}

.welcome-title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #4A90D9;
  margin-bottom: 20rpx;
}

.welcome-desc {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 30rpx;
}

.action-item {
  width: 48%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx 0;
  margin-bottom: 20rpx;
  transition: transform 0.2s;
}

.action-item:active {
  transform: scale(0.98);
}

.action-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 48rpx;
  margin-bottom: 20rpx;
}

.vaccine-icon {
  background-color: rgba(74, 144, 217, 0.1);
}

.symptom-icon {
  background-color: rgba(255, 107, 107, 0.1);
}

.medical-icon {
  background-color: rgba(78, 205, 196, 0.1);
}

.hospital-icon {
  background-color: rgba(255, 230, 109, 0.1);
}

.action-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.reminder-section {
  padding: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
}

.reminder-list {
  display: flex;
  flex-direction: column;
}

.reminder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.reminder-item:last-child {
  border-bottom: none;
}

.reminder-info {
  display: flex;
  flex-direction: column;
}

.reminder-pet {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
}

.reminder-vaccine {
  font-size: 24rpx;
  color: #666;
}

.reminder-date {
  font-size: 24rpx;
  color: #4A90D9;
  font-weight: 500;
}
</style>
