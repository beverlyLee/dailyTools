<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FamilyData } from '../types'
import { calculateShoeNeeds } from '../utils/calculations'

const props = defineProps<{
  modelValue: FamilyData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FamilyData]
}>()

const familyData = ref<FamilyData>({
  adults: 2,
  children: 1,
  familyType: 'normal'
})

watch(
  () => props.modelValue,
  (newVal) => {
    familyData.value = { ...newVal }
  },
  { immediate: true, deep: true }
)

watch(
  familyData,
  (newVal) => {
    emit('update:modelValue', { ...newVal })
  },
  { deep: true }
)

const totalShoes = computed(() => {
  return calculateShoeNeeds(familyData.value.adults, familyData.value.children)
})

const familyTypeOptions = [
  { value: 'normal', label: '普通家庭' },
  { value: 'sports', label: '运动型家庭' },
  { value: 'fashion', label: '高跟鞋爱好者' },
  { value: 'multi-season', label: '多季节型' }
]

function adjustAdults(delta: number) {
  const newVal = familyData.value.adults + delta
  if (newVal >= 1 && newVal <= 5) {
    familyData.value.adults = newVal
  }
}

function adjustChildren(delta: number) {
  const newVal = familyData.value.children + delta
  if (newVal >= 0 && newVal <= 4) {
    familyData.value.children = newVal
  }
}
</script>

<template>
  <div class="family-input">
    <h3 class="section-title">
      <span class="icon">👨‍👩‍👧</span>
      家庭成员录入
    </h3>

    <div class="input-group">
      <div class="input-row">
        <label class="input-label">
          <span class="label-icon">👤</span>
          大人数量
        </label>
        <div class="counter">
          <button
            class="counter-btn"
            @click="adjustAdults(-1)"
            :disabled="familyData.adults <= 1"
          >
            −
          </button>
          <span class="counter-value">{{ familyData.adults }}</span>
          <button
            class="counter-btn"
            @click="adjustAdults(1)"
            :disabled="familyData.adults >= 5"
          >
            +
          </button>
        </div>
      </div>

      <div class="input-row">
        <label class="input-label">
          <span class="label-icon">👧</span>
          小孩数量
        </label>
        <div class="counter">
          <button
            class="counter-btn"
            @click="adjustChildren(-1)"
            :disabled="familyData.children <= 0"
          >
            −
          </button>
          <span class="counter-value">{{ familyData.children }}</span>
          <button
            class="counter-btn"
            @click="adjustChildren(1)"
            :disabled="familyData.children >= 4"
          >
            +
          </button>
        </div>
      </div>

      <div class="input-row">
        <label class="input-label">
          <span class="label-icon">🏠</span>
          家庭类型
        </label>
        <select v-model="familyData.familyType" class="select-input">
          <option
            v-for="option in familyTypeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="result-card">
      <div class="result-header">
        <span class="result-icon">👟</span>
        <span class="result-title">预计常鞋数量</span>
      </div>
      <div class="result-value">{{ totalShoes }} 双</div>
      <div class="result-detail">
        <span>大人: {{ familyData.adults }} × 5 = {{ familyData.adults * 5 }}</span>
        <span>小孩: {{ familyData.children }} × 3 = {{ familyData.children * 3 }}</span>
        <span>季节调整: +{{ Math.ceil((familyData.adults * 5 + familyData.children * 3) * 0.2) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.family-input {
  padding: var(--space-lg);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.icon {
  font-size: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.input-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.95rem;
  color: var(--text-primary);
}

.label-icon {
  font-size: 1.25rem;
}

.counter {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.counter-btn {
  width: 36px;
  height: 36px;
  border: 2px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  font-size: 1.25rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.counter-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.counter-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.counter-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
  min-width: 40px;
  text-align: center;
}

.select-input {
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--color-secondary);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.select-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.result-card {
  margin-top: var(--space-lg);
  padding: var(--space-lg);
  background: linear-gradient(135deg, var(--color-primary), #3d6b42);
  border-radius: var(--radius-lg);
  color: white;
}

.result-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.result-icon {
  font-size: 1.5rem;
}

.result-title {
  font-size: 0.95rem;
  opacity: 0.9;
}

.result-value {
  font-size: 2.5rem;
  font-weight: 700;
  margin: var(--space-sm) 0;
}

.result-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: 0.85rem;
  opacity: 0.85;
}
</style>
