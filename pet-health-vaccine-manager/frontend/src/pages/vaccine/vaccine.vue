<template>
  <view class="container">
    <view class="pet-select card">
      <text class="label">选择宠物品种：</text>
      <picker 
        :value="selectedPetIndex" 
        :range="petTypes" 
        range-key="name"
        @change="onPetTypeChange"
      >
        <view class="picker-view">
          <text>{{ selectedPetType ? selectedPetType.name : '请选择宠物品种' }}</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="vaccine-templates" v-if="vaccineTemplates.length > 0">
      <view class="section-title">
        <text>推荐疫苗计划</text>
      </view>
      <view class="template-card card" v-for="(template, index) in vaccineTemplates" :key="index">
        <view class="template-header">
          <text class="template-name">{{ template.name }}</text>
          <text class="template-age">{{ template.age }}</text>
        </view>
        <view class="template-details">
          <view class="detail-item" v-for="(detail, dIndex) in template.details" :key="dIndex">
            <text class="detail-label">{{ detail.label }}：</text>
            <text class="detail-value">{{ detail.value }}</text>
          </view>
        </view>
        <view class="template-actions">
          <button class="btn-primary" @click="addVaccineToPlan(template)">添加到我的计划</button>
        </view>
      </view>
    </view>

    <view class="my-plans" v-if="myVaccinePlans.length > 0">
      <view class="section-title">
        <text>我的疫苗计划</text>
      </view>
      <view class="plan-card card" v-for="(plan, index) in myVaccinePlans" :key="plan.id">
        <view class="plan-header">
          <view class="plan-pet-info">
            <text class="plan-pet-name">{{ plan.petName }}</text>
            <text class="plan-pet-type">{{ plan.petType }}</text>
          </view>
          <view class="plan-status" :class="plan.status">
            <text>{{ plan.status === 'completed' ? '已完成' : plan.status === 'in_progress' ? '进行中' : '待接种' }}</text>
          </view>
        </view>
        <view class="plan-vaccines">
          <view class="vaccine-item" v-for="(vaccine, vIndex) in plan.vaccines" :key="vIndex">
            <view class="vaccine-info">
              <text class="vaccine-name">{{ vaccine.name }}</text>
              <text class="vaccine-date">{{ vaccine.date }}</text>
            </view>
            <view class="vaccine-status" :class="vaccine.status">
              <text>{{ vaccine.status === 'completed' ? '已接种' : vaccine.status === 'scheduled' ? '已预约' : '待接种' }}</text>
            </view>
          </view>
        </view>
        <view class="plan-actions">
          <button class="btn-secondary" @click="viewPlanDetail(plan)">查看详情</button>
          <button class="btn-primary" @click="updatePlan(plan)">更新计划</button>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else-if="vaccineTemplates.length === 0 && myVaccinePlans.length === 0">
      <text class="empty-icon">💉</text>
      <text class="empty-text">请先选择宠物品种查看疫苗计划</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePetStore } from '@/stores/pet'
import { vaccineTemplatesData } from '@/data/vaccineTemplates'

const petStore = usePetStore()

interface PetType {
  id: number
  name: string
  type: 'dog' | 'cat' | 'other'
}

interface VaccineDetail {
  label: string
  value: string
}

interface VaccineTemplate {
  id: number
  name: string
  age: string
  details: VaccineDetail[]
  petType: string
}

interface Vaccine {
  id: number
  name: string
  date: string
  status: 'pending' | 'scheduled' | 'completed'
  notes?: string
}

interface MyVaccinePlan {
  id: number
  petName: string
  petType: string
  vaccines: Vaccine[]
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
}

const petTypes = ref<PetType[]>([
  { id: 1, name: '金毛犬', type: 'dog' },
  { id: 2, name: '拉布拉多', type: 'dog' },
  { id: 3, name: '哈士奇', type: 'dog' },
  { id: 4, name: '柯基', type: 'dog' },
  { id: 5, name: '泰迪', type: 'dog' },
  { id: 6, name: '比熊', type: 'dog' },
  { id: 7, name: '英国短毛猫', type: 'cat' },
  { id: 8, name: '美国短毛猫', type: 'cat' },
  { id: 9, name: '布偶猫', type: 'cat' },
  { id: 10, name: '暹罗猫', type: 'cat' },
  { id: 11, name: '其他犬类', type: 'dog' },
  { id: 12, name: '其他猫类', type: 'cat' },
  { id: 13, name: '其他宠物', type: 'other' }
])

const selectedPetIndex = ref<number>(0)
const selectedPetType = ref<PetType | null>(null)
const vaccineTemplates = ref<VaccineTemplate[]>([])
const myVaccinePlans = ref<MyVaccinePlan[]>([])

const onPetTypeChange = (e: any) => {
  selectedPetIndex.value = e.detail.value
  selectedPetType.value = petTypes.value[e.detail.value]
  loadVaccineTemplates()
}

const loadVaccineTemplates = () => {
  if (!selectedPetType.value) return
  
  const type = selectedPetType.value.type
  const templates = vaccineTemplatesData[type] || []
  vaccineTemplates.value = templates
}

const addVaccineToPlan = (template: VaccineTemplate) => {
  uni.showModal({
    title: '添加疫苗计划',
    content: `确定要为您的宠物添加"${template.name}"疫苗计划吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const plan = await petStore.addVaccinePlan({
            petName: '我的宠物',
            petType: selectedPetType.value?.name || '',
            templateId: template.id,
            vaccines: [
              {
                id: Date.now(),
                name: template.name,
                date: new Date().toISOString().split('T')[0],
                status: 'pending'
              }
            ]
          })
          
          myVaccinePlans.value.unshift(plan)
          uni.showToast({
            title: '添加成功',
            icon: 'success'
          })
        } catch (error) {
          uni.showToast({
            title: '添加失败',
            icon: 'error'
          })
        }
      }
    }
  })
}

const viewPlanDetail = (plan: MyVaccinePlan) => {
  uni.navigateTo({
    url: `/pages/vaccine-detail/vaccine-detail?id=${plan.id}`
  })
}

const updatePlan = (plan: MyVaccinePlan) => {
  uni.navigateTo({
    url: `/pages/vaccine-edit/vaccine-edit?id=${plan.id}`
  })
}

onMounted(async () => {
  try {
    const plans = await petStore.getVaccinePlans()
    myVaccinePlans.value = plans
  } catch (error) {
    console.error('加载疫苗计划失败:', error)
  }
})
</script>

<style scoped>
.pet-select {
  margin-bottom: 30rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  margin-bottom: 20rpx;
  color: #333;
}

.picker-view {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
}

.picker-arrow {
  color: #999;
  font-size: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
  padding-left: 10rpx;
  border-left: 6rpx solid #4A90D9;
}

.vaccine-templates,
.my-plans {
  margin-bottom: 30rpx;
}

.template-card,
.plan-card {
  margin-bottom: 20rpx;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.template-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.template-age {
  font-size: 24rpx;
  color: #666;
  background-color: rgba(74, 144, 217, 0.1);
  padding: 8rpx 16rpx;
  border-radius: 4rpx;
}

.template-details {
  margin-bottom: 20rpx;
}

.detail-item {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 26rpx;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #666;
  min-width: 120rpx;
}

.detail-value {
  color: #333;
  flex: 1;
}

.template-actions,
.plan-actions {
  display: flex;
  gap: 20rpx;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.plan-pet-info {
  display: flex;
  flex-direction: column;
}

.plan-pet-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.plan-pet-type {
  font-size: 24rpx;
  color: #666;
}

.plan-status {
  padding: 8rpx 16rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
}

.plan-status.pending {
  background-color: rgba(255, 230, 109, 0.1);
  color: #FFE66D;
}

.plan-status.in_progress {
  background-color: rgba(74, 144, 217, 0.1);
  color: #4A90D9;
}

.plan-status.completed {
  background-color: rgba(78, 205, 196, 0.1);
  color: #4ECDC4;
}

.plan-vaccines {
  margin-bottom: 20rpx;
}

.vaccine-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.vaccine-item:last-child {
  border-bottom: none;
}

.vaccine-info {
  display: flex;
  flex-direction: column;
}

.vaccine-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
}

.vaccine-date {
  font-size: 24rpx;
  color: #666;
}

.vaccine-status {
  padding: 6rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
}

.vaccine-status.pending {
  background-color: rgba(255, 107, 107, 0.1);
  color: #FF6B6B;
}

.vaccine-status.scheduled {
  background-color: rgba(74, 144, 217, 0.1);
  color: #4A90D9;
}

.vaccine-status.completed {
  background-color: rgba(78, 205, 196, 0.1);
  color: #4ECDC4;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
