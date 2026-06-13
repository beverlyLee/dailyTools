<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ShoeCabinet, CompartmentConfig } from '../types'
import { generateLayout, calculateCabinetCapacity } from '../utils/calculations'

const props = defineProps<{
  modelValue: ShoeCabinet
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ShoeCabinet]
}>()

const cabinetConfig = ref<ShoeCabinet>({
  mode: 'deep-shallow',
  width: 100,
  depth: 35,
  height: 180,
  compartments: 3,
  compartmentHeights: [60, 40, 40]
})

watch(
  () => props.modelValue,
  (newVal) => {
    cabinetConfig.value = { ...newVal }
  },
  { immediate: true, deep: true }
)

watch(
  cabinetConfig,
  (newVal) => {
    emit('update:modelValue', { ...newVal })
  },
  { deep: true }
)

const modeOptions = [
  { value: 'deep-shallow', label: '深浅侧模式', icon: '📏', desc: '深度 35-40cm' },
  { value: 'thin', label: '薄侧模式', icon: '📐', desc: '深度 25-30cm' },
  { value: 'rotating', label: '旋转鞋架', icon: '🔄', desc: '360° 旋转' }
]

const compartments = computed(() => {
  return generateLayout(cabinetConfig.value.height, cabinetConfig.value.mode, 0.3)
})

const totalCapacity = computed(() => {
  return calculateCabinetCapacity(cabinetConfig.value)
})

const compartmentColors = {
  boots: '#8B4513',
  regular: '#2C5530',
  sandals: '#E8A838'
}

function adjustCompartment(index: number, delta: number) {
  const newHeights = [...cabinetConfig.value.compartmentHeights]
  const newHeight = Math.max(20, Math.min(80, newHeights[index] + delta))
  newHeights[index] = newHeight
  cabinetConfig.value.compartmentHeights = newHeights
}

function setMode(mode: ShoeCabinet['mode']) {
  cabinetConfig.value.mode = mode
  if (mode === 'rotating') {
    cabinetConfig.value.compartments = 4
  } else {
    cabinetConfig.value.compartments = 3
  }
}
</script>

<template>
  <div class="cabinet-generator">
    <h3 class="section-title">
      <span class="icon">🗄️</span>
      鞋柜模块生成器
    </h3>

    <div class="mode-selector">
      <div class="mode-label">柜体模式</div>
      <div class="mode-options">
        <button
          v-for="option in modeOptions"
          :key="option.value"
          :class="['mode-btn', { active: cabinetConfig.mode === option.value }]"
          @click="setMode(option.value as ShoeCabinet['mode'])"
        >
          <span class="mode-icon">{{ option.icon }}</span>
          <span class="mode-text">{{ option.label }}</span>
          <span class="mode-desc">{{ option.desc }}</span>
        </button>
      </div>
    </div>

    <div class="dimensions">
      <div class="dimension-row">
        <label class="dimension-label">
          <span>📏</span> 宽度
        </label>
        <input
          type="range"
          v-model.number="cabinetConfig.width"
          min="60"
          max="150"
          class="slider"
        />
        <span class="dimension-value">{{ cabinetConfig.width }} cm</span>
      </div>

      <div class="dimension-row">
        <label class="dimension-label">
          <span>📐</span> 深度
        </label>
        <input
          type="range"
          v-model.number="cabinetConfig.depth"
          min="20"
          max="50"
          class="slider"
        />
        <span class="dimension-value">{{ cabinetConfig.depth }} cm</span>
      </div>

      <div class="dimension-row">
        <label class="dimension-label">
          <span>📊</span> 高度
        </label>
        <input
          type="range"
          v-model.number="cabinetConfig.height"
          min="100"
          max="220"
          class="slider"
        />
        <span class="dimension-value">{{ cabinetConfig.height }} cm</span>
      </div>
    </div>

    <div class="compartments-section">
      <div class="compartments-header">
        <span class="section-subtitle">隔板调节</span>
        <span class="capacity-badge">
          总容量: {{ totalCapacity }} 双
        </span>
      </div>

      <div class="compartments-grid">
        <div
          v-for="(comp, index) in compartments"
          :key="index"
          class="compartment"
          :style="{ '--comp-height': comp.height + 'px', '--comp-color': compartmentColors[comp.type] }"
        >
          <div class="compartment-header">
            <span class="comp-type-icon">
              {{ comp.type === 'boots' ? '👢' : comp.type === 'sandals' ? '🩴' : '👟' }}
            </span>
            <span class="comp-type-label">{{ comp.type === 'boots' ? '长靴区' : comp.type === 'sandals' ? '凉鞋区' : '常规区' }}</span>
          </div>

          <div class="comp-content">
            <span class="comp-items">{{ comp.items }} 双</span>
            <span class="comp-height">{{ cabinetConfig.compartmentHeights[index] || Math.round(comp.height) }} cm</span>
          </div>

          <div class="comp-controls">
            <button
              class="height-btn"
              @click="adjustCompartment(index, -5)"
              :disabled="(cabinetConfig.compartmentHeights[index] || 40) <= 20"
            >
              −
            </button>
            <div class="height-indicator">
              <div
                class="height-bar"
                :style="{ height: ((cabinetConfig.compartmentHeights[index] || 40) / 80 * 100) + '%' }"
              ></div>
            </div>
            <button
              class="height-btn"
              @click="adjustCompartment(index, 5)"
              :disabled="(cabinetConfig.compartmentHeights[index] || 40) >= 80"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="utilization-bar">
      <div class="utilization-label">空间利用率</div>
      <div class="utilization-track">
        <div
          class="utilization-fill"
          :style="{ width: Math.min(100, (totalCapacity / 20) * 100) + '%' }"
        ></div>
      </div>
      <div class="utilization-value">{{ Math.min(100, (totalCapacity / 20) * 100) | 0 }}%</div>
    </div>
  </div>
</template>

<style scoped>
.cabinet-generator {
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

.mode-selector {
  margin-bottom: var(--space-lg);
}

.mode-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md);
  background: var(--bg-card);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.mode-btn:hover {
  border-color: var(--color-secondary);
  transform: translateY(-2px);
}

.mode-btn.active {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(44, 85, 48, 0.1), rgba(44, 85, 48, 0.05));
}

.mode-icon {
  font-size: 1.5rem;
  margin-bottom: var(--space-xs);
}

.mode-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.mode-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: var(--space-xs);
}

.dimensions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.dimension-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.dimension-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 80px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-secondary);
  border-radius: 3px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.dimension-value {
  min-width: 60px;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
}

.compartments-section {
  margin-bottom: var(--space-lg);
}

.compartments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.section-subtitle {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.capacity-badge {
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-accent);
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.compartments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-md);
}

.compartment {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid var(--comp-color);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 160px;
}

.compartment-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.comp-type-icon {
  font-size: 1.25rem;
}

.comp-type-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.comp-content {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.comp-items {
  font-weight: 600;
  color: var(--color-primary);
}

.comp-controls {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: auto;
}

.height-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-secondary);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-primary);
  transition: all 0.2s;
}

.height-btn:hover:not(:disabled) {
  background: var(--color-secondary);
}

.height-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.height-indicator {
  flex: 1;
  height: 60px;
  background: var(--color-secondary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.height-bar {
  background: var(--color-primary);
  transition: height 0.3s ease;
  border-radius: var(--radius-sm);
}

.utilization-bar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
}

.utilization-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  min-width: 80px;
}

.utilization-track {
  flex: 1;
  height: 8px;
  background: var(--color-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.utilization-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transition: width 0.5s ease;
}

.utilization-value {
  min-width: 50px;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
}
</style>
