<template>
  <view class="container">
    <view class="intro-card card">
      <text class="intro-title">症状自查</text>
      <text class="intro-desc">根据您宠物的症状，我们将为您提供初步的健康评估和建议。请注意：此功能仅供参考，不能替代专业兽医诊断。</text>
    </view>

    <view class="symptom-section" v-if="currentStep === 0">
      <view class="section-title">
        <text>第一步：选择宠物类型</text>
      </view>
      <view class="pet-type-grid">
        <view 
          class="pet-type-item card" 
          :class="{ active: selectedPetType === 'dog' }"
          @click="selectPetType('dog')"
        >
          <text class="pet-icon">🐕</text>
          <text class="pet-name">狗狗</text>
        </view>
        <view 
          class="pet-type-item card" 
          :class="{ active: selectedPetType === 'cat' }"
          @click="selectPetType('cat')"
        >
          <text class="pet-icon">🐱</text>
          <text class="pet-name">猫咪</text>
        </view>
        <view 
          class="pet-type-item card" 
          :class="{ active: selectedPetType === 'other' }"
          @click="selectPetType('other')"
        >
          <text class="pet-icon">🐰</text>
          <text class="pet-name">其他宠物</text>
        </view>
      </view>
      <button class="btn-primary mt-20" @click="nextStep" :disabled="!selectedPetType">下一步</button>
    </view>

    <view class="symptom-section" v-else-if="currentStep === 1">
      <view class="section-title">
        <text>第二步：选择主要症状</text>
      </view>
      <view class="symptom-category">
        <view class="category-title" v-for="category in symptomCategories" :key="category.id">
          <text>{{ category.name }}</text>
        </view>
        <view class="symptom-list">
          <view 
            class="symptom-item" 
            :class="{ selected: selectedSymptoms.includes(symptom.id) }"
            v-for="symptom in currentSymptoms" 
            :key="symptom.id"
            @click="toggleSymptom(symptom.id)"
          >
            <text class="symptom-name">{{ symptom.name }}</text>
            <text class="symptom-check" v-if="selectedSymptoms.includes(symptom.id)">✓</text>
          </view>
        </view>
      </view>
      <view class="step-actions">
        <button class="btn-secondary" @click="prevStep">上一步</button>
        <button class="btn-primary" @click="nextStep" :disabled="selectedSymptoms.length === 0">下一步</button>
      </view>
    </view>

    <view class="symptom-section" v-else-if="currentStep === 2">
      <view class="section-title">
        <text>第三步：症状持续时间</text>
      </view>
      <view class="duration-options">
        <view 
          class="duration-item card" 
          :class="{ active: selectedDuration === 'less_than_day' }"
          @click="selectDuration('less_than_day')"
        >
          <text class="duration-title">不到一天</text>
          <text class="duration-desc">症状出现不到24小时</text>
        </view>
        <view 
          class="duration-item card" 
          :class="{ active: selectedDuration === '1_3_days' }"
          @click="selectDuration('1_3_days')"
        >
          <text class="duration-title">1-3天</text>
          <text class="duration-desc">症状持续1到3天</text>
        </view>
        <view 
          class="duration-item card" 
          :class="{ active: selectedDuration === 'more_than_3_days' }"
          @click="selectDuration('more_than_3_days')"
        >
          <text class="duration-title">3天以上</text>
          <text class="duration-desc">症状持续超过3天</text>
        </view>
        <view 
          class="duration-item card" 
          :class="{ active: selectedDuration === 'recurring' }"
          @click="selectDuration('recurring')"
        >
          <text class="duration-title">反复发作</text>
          <text class="duration-desc">症状时好时坏，反复发作</text>
        </view>
      </view>
      <view class="step-actions">
        <button class="btn-secondary" @click="prevStep">上一步</button>
        <button class="btn-primary" @click="analyzeSymptoms" :disabled="!selectedDuration">获取评估结果</button>
      </view>
    </view>

    <view class="result-section" v-else-if="currentStep === 3">
      <view class="section-title">
        <text>健康评估结果</text>
      </view>
      
      <view class="severity-indicator card" :class="analysisResult.severity">
        <text class="severity-icon">{{ analysisResult.icon }}</text>
        <text class="severity-title">{{ analysisResult.title }}</text>
        <text class="severity-desc">{{ analysisResult.description }}</text>
      </view>

      <view class="possible-conditions card" v-if="analysisResult.possibleConditions.length > 0">
        <text class="result-subtitle">可能的健康问题：</text>
        <view class="condition-list">
          <view class="condition-item" v-for="(condition, index) in analysisResult.possibleConditions" :key="index">
            <text class="condition-name">{{ condition.name }}</text>
            <text class="condition-probability">{{ condition.probability }}</text>
          </view>
        </view>
      </view>

      <view class="recommendations card">
        <text class="result-subtitle">建议措施：</text>
        <view class="recommendation-list">
          <view class="recommendation-item" v-for="(recommendation, index) in analysisResult.recommendations" :key="index">
            <text class="recommendation-number">{{ index + 1 }}.</text>
            <text class="recommendation-text">{{ recommendation }}</text>
          </view>
        </view>
      </view>

      <view class="warning-card card" v-if="analysisResult.urgent">
        <text class="warning-icon">⚠️</text>
        <text class="warning-text">紧急提示：{{ analysisResult.urgentMessage }}</text>
      </view>

      <view class="disclaimer card">
        <text class="disclaimer-text">
          免责声明：本评估结果仅供参考，不能替代专业兽医的诊断。如果您的宠物症状严重或持续，请立即联系兽医进行专业检查和治疗。
        </text>
      </view>

      <view class="result-actions">
        <button class="btn-secondary" @click="resetSymptomCheck">重新评估</button>
        <button class="btn-primary" @click="findNearbyHospital">查找附近医院</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { symptomDecisionTree } from '@/data/symptomDecisionTree'

interface SymptomCategory {
  id: string
  name: string
  symptoms: Symptom[]
}

interface Symptom {
  id: string
  name: string
  keywords: string[]
  category: string
}

interface AnalysisResult {
  severity: 'mild' | 'moderate' | 'severe'
  icon: string
  title: string
  description: string
  possibleConditions: { name: string; probability: string }[]
  recommendations: string[]
  urgent: boolean
  urgentMessage: string
}

const currentStep = ref<number>(0)
const selectedPetType = ref<string>('')
const selectedSymptoms = ref<string[]>([])
const selectedDuration = ref<string>('')
const analysisResult = ref<AnalysisResult>({
  severity: 'mild',
  icon: 'ℹ️',
  title: '',
  description: '',
  possibleConditions: [],
  recommendations: [],
  urgent: false,
  urgentMessage: ''
})

const symptomCategories = ref<SymptomCategory[]>([])
const currentSymptoms = computed(() => {
  if (!selectedPetType.value) return []
  
  const petTypeSymptoms = symptomDecisionTree[selectedPetType.value] || []
  return petTypeSymptoms.flatMap(category => category.symptoms)
})

const selectPetType = (type: string) => {
  selectedPetType.value = type
}

const toggleSymptom = (symptomId: string) => {
  const index = selectedSymptoms.value.indexOf(symptomId)
  if (index === -1) {
    selectedSymptoms.value.push(symptomId)
  } else {
    selectedSymptoms.value.splice(index, 1)
  }
}

const selectDuration = (duration: string) => {
  selectedDuration.value = duration
}

const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const analyzeSymptoms = () => {
  const petType = selectedPetType.value
  const symptoms = selectedSymptoms.value
  const duration = selectedDuration.value

  let severity: 'mild' | 'moderate' | 'severe' = 'mild'
  let icon = 'ℹ️'
  let title = '轻度健康问题'
  let description = '根据您描述的症状，您的宠物可能存在一些轻微的健康问题。'
  let possibleConditions: { name: string; probability: string }[] = []
  let recommendations: string[] = []
  let urgent = false
  let urgentMessage = ''

  const redFlagSymptoms = [
    'difficulty_breathing', 'seizures', 'unconscious', 'severe_bleeding',
    'collapse', 'severe_pain', 'bloating', 'paralysis'
  ]

  const hasRedFlag = symptoms.some(symptom => redFlagSymptoms.includes(symptom))
  const isLongDuration = duration === 'more_than_3_days' || duration === 'recurring'

  if (hasRedFlag) {
    severity = 'severe'
    icon = '🚨'
    title = '紧急健康问题'
    description = '根据您描述的症状，您的宠物可能存在严重的健康问题，需要立即就医。'
    urgent = true
    urgentMessage = '请立即联系兽医或带宠物去急诊！'
    recommendations = [
      '立即联系最近的24小时宠物医院',
      '保持宠物安静，避免剧烈运动',
      '如果有出血，用干净的布按压止血',
      '记录症状出现的时间和具体表现'
    ]
    possibleConditions = [
      { name: '严重内科疾病', probability: '高' },
      { name: '外伤或中毒', probability: '中' }
    ]
  } else if (symptoms.length >= 3 || isLongDuration) {
    severity = 'moderate'
    icon = '⚠️'
    title = '中度健康问题'
    description = '根据您描述的症状，您的宠物可能存在一些需要关注的健康问题。'
    recommendations = [
      '建议在24-48小时内咨询兽医',
      '密切观察症状变化',
      '记录症状的详细情况',
      '确保宠物有充足的休息和饮水'
    ]
    possibleConditions = [
      { name: '消化系统问题', probability: '中' },
      { name: '呼吸道感染', probability: '中' },
      { name: '皮肤问题', probability: '低' }
    ]
  } else {
    severity = 'mild'
    icon = 'ℹ️'
    title = '轻度健康问题'
    description = '根据您描述的症状，您的宠物可能存在一些轻微的健康问题。'
    recommendations = [
      '密切观察宠物的状态变化',
      '确保宠物有充足的休息和饮水',
      '如果症状持续超过24小时，建议咨询兽医',
      '注意观察宠物的食欲和精神状态'
    ]
    possibleConditions = [
      { name: '轻微消化不适', probability: '中' },
      { name: '轻微皮肤刺激', probability: '低' }
    ]
  }

  analysisResult.value = {
    severity,
    icon,
    title,
    description,
    possibleConditions,
    recommendations,
    urgent,
    urgentMessage
  }

  currentStep.value = 3
}

const resetSymptomCheck = () => {
  currentStep.value = 0
  selectedPetType.value = ''
  selectedSymptoms.value = []
  selectedDuration.value = ''
}

const findNearbyHospital = () => {
  uni.switchTab({
    url: '/pages/hospital/hospital'
  })
}
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

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
  padding-left: 10rpx;
  border-left: 6rpx solid #4A90D9;
}

.pet-type-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.pet-type-item {
  width: 30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx 0;
  transition: all 0.3s;
}

.pet-type-item.active {
  border: 2rpx solid #4A90D9;
  background-color: rgba(74, 144, 217, 0.05);
}

.pet-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}

.pet-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.symptom-category {
  margin-bottom: 20rpx;
}

.category-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
}

.symptom-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.symptom-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
  transition: all 0.3s;
  min-width: 200rpx;
}

.symptom-item.selected {
  background-color: rgba(74, 144, 217, 0.1);
  border-color: #4A90D9;
}

.symptom-name {
  font-size: 26rpx;
  color: #333;
}

.symptom-check {
  color: #4A90D9;
  font-weight: bold;
  margin-left: 16rpx;
}

.duration-options {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.duration-item {
  padding: 24rpx;
  transition: all 0.3s;
}

.duration-item.active {
  border: 2rpx solid #4A90D9;
  background-color: rgba(74, 144, 217, 0.05);
}

.duration-title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
}

.duration-desc {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.step-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.step-actions button {
  flex: 1;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.severity-indicator {
  text-align: center;
  padding: 40rpx;
}

.severity-indicator.mild {
  background-color: rgba(78, 205, 196, 0.1);
  border-left: 6rpx solid #4ECDC4;
}

.severity-indicator.moderate {
  background-color: rgba(255, 230, 109, 0.1);
  border-left: 6rpx solid #FFE66D;
}

.severity-indicator.severe {
  background-color: rgba(255, 107, 107, 0.1);
  border-left: 6rpx solid #FF6B6B;
}

.severity-icon {
  display: block;
  font-size: 60rpx;
  margin-bottom: 16rpx;
}

.severity-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
}

.severity-indicator.mild .severity-title {
  color: #4ECDC4;
}

.severity-indicator.moderate .severity-title {
  color: #FFE66D;
}

.severity-indicator.severe .severity-title {
  color: #FF6B6B;
}

.severity-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.result-subtitle {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
}

.condition-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.condition-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.condition-item:last-child {
  border-bottom: none;
}

.condition-name {
  font-size: 26rpx;
  color: #333;
}

.condition-probability {
  font-size: 24rpx;
  color: #4A90D9;
  font-weight: 500;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  padding: 12rpx 0;
}

.recommendation-number {
  font-size: 26rpx;
  color: #4A90D9;
  font-weight: 500;
  margin-right: 12rpx;
  min-width: 32rpx;
}

.recommendation-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
  flex: 1;
}

.warning-card {
  display: flex;
  align-items: flex-start;
  background-color: rgba(255, 107, 107, 0.1);
  border-left: 6rpx solid #FF6B6B;
}

.warning-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}

.warning-text {
  font-size: 26rpx;
  color: #FF6B6B;
  font-weight: 500;
  line-height: 1.5;
  flex: 1;
}

.disclaimer {
  background-color: #f9f9f9;
  border: 1rpx solid #e0e0e0;
}

.disclaimer-text {
  display: block;
  font-size: 22rpx;
  color: #999;
  line-height: 1.6;
}

.result-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.result-actions button {
  flex: 1;
}

button:disabled {
  opacity: 0.5;
}
</style>
