<script setup lang="ts">
import { computed } from 'vue'
import type { FeatureStatistic } from '../api'

interface Props {
  features: Record<string, FeatureStatistic>
  ranges: Record<string, { min: number; max: number; mean: number; std: number }>
  modelValue: Record<string, number>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, number>): void
}>()

const featureNames: Record<string, string> = {
  year: '年份',
  gdp: 'GDP (亿元)',
  population: '人口 (万人)',
  interest_rate: '利率 (%)',
  inflation_rate: '通货膨胀率 (%)',
  unemployment_rate: '失业率 (%)',
  construction_cost: '建筑成本 (元/平方米)',
  land_price: '土地价格 (元/平方米)'
}

const getFeatureName = (key: string): string => {
  return featureNames[key] || key
}

const getRange = (key: string) => {
  if (props.ranges[key]) {
    return props.ranges[key]
  }
  if (props.features[key]) {
    return {
      min: props.features[key].min,
      max: props.features[key].max,
      mean: props.features[key].mean,
      std: props.features[key].std
    }
  }
  return { min: 0, max: 100, mean: 50, std: 10 }
}

const updateValue = (key: string, value: number) => {
  const newValues = { ...props.modelValue, [key]: value }
  emit('update:modelValue', newValues)
}

const featureKeys = computed(() => {
  return Object.keys(props.features).length > 0 
    ? Object.keys(props.features) 
    : Object.keys(props.ranges)
})
</script>

<template>
  <div class="feature-slider-container">
    <div class="slider-grid">
      <div 
        v-for="key in featureKeys" 
        :key="key" 
        class="slider-item"
      >
        <div class="slider-header">
          <span class="feature-name">{{ getFeatureName(key) }}</span>
          <span class="feature-value">{{ modelValue[key]?.toFixed(2) || '0.00' }}</span>
        </div>
        
        <input
          type="range"
          :min="getRange(key).min"
          :max="getRange(key).max"
          :step="(getRange(key).max - getRange(key).min) / 100"
          :value="modelValue[key] || getRange(key).mean"
          @input="(e: Event) => updateValue(key, parseFloat((e.target as HTMLInputElement).value))"
          class="slider-input"
        />
        
        <div class="slider-range">
          <span class="min">{{ getRange(key).min.toFixed(1) }}</span>
          <span class="max">{{ getRange(key).max.toFixed(1) }}</span>
        </div>
        
        <div v-if="features[key]" class="feature-stats">
          <span class="stat-item">
            均值: {{ features[key].mean.toFixed(1) }}
          </span>
          <span class="stat-item correlation" :class="{'positive': features[key].correlation_with_price > 0}">
            相关性: {{ features[key].correlation_with_price > 0 ? '+' : '' }}{{ features[key].correlation_with_price.toFixed(3) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-slider-container {
  width: 100%;
}

.slider-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.slider-item {
  background: #f8f9ff;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.slider-item:hover {
  background: #f0f3ff;
  box-shadow: 0 2px 12px rgba(102, 126, 234, 0.1);
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.feature-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.feature-value {
  font-size: 16px;
  font-weight: 700;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4px 12px;
  border-radius: 6px;
}

.slider-input {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #e0e5ff 0%, #667eea 100%);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s ease;
}

.slider-input::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-input::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.slider-range {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.feature-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.correlation {
  font-weight: 500;
}

.correlation.positive {
  color: #4ade80;
}

.correlation:not(.positive) {
  color: #f87171;
}

@media (max-width: 768px) {
  .slider-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .slider-item {
    padding: 16px;
  }
}
</style>
