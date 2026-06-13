<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FamilyData, ShoeCabinet, StorageAnalysis } from '../types'
import { analyzeStorage, calculateShoeNeeds } from '../utils/calculations'

const props = defineProps<{
  familyData: FamilyData
  cabinetConfig: ShoeCabinet
}>()

const hasRotatingRack = ref(false)
const rotatingRackCapacity = ref(6)

const totalShoes = computed(() => {
  return calculateShoeNeeds(props.familyData.adults, props.familyData.children)
})

const storageAnalysis = computed(() => {
  const baseAnalysis = analyzeStorage(totalShoes.value, props.cabinetConfig)

  if (hasRotatingRack.value) {
    baseAnalysis.currentCapacity += rotatingRackCapacity.value
    baseAnalysis.deficit = Math.max(0, totalShoes.value - baseAnalysis.currentCapacity)
    baseAnalysis.utilization = Math.min(100, Math.round((totalShoes.value / baseAnalysis.currentCapacity) * 100))
  }

  return baseAnalysis
})

const currentSeasonPercent = computed(() => {
  return Math.round((totalShoes.value * 0.7 / storageAnalysis.value.currentCapacity) * 100)
})

const offSeasonPercent = computed(() => {
  return Math.round((totalShoes.value * 0.3 / storageAnalysis.value.currentCapacity) * 100)
})

const rotatingUtilization = computed(() => {
  if (!hasRotatingRack.value) return 0
  return Math.round((totalShoes.value * 0.3 / rotatingRackCapacity.value) * 100)
})

const suggestions = computed(() => {
  const list: string[] = []

  if (storageAnalysis.value.deficit > 0) {
    list.push(`当前容量不足，缺少 ${storageAnalysis.value.deficit} 双鞋的收纳空间`)
  }

  if (currentSeasonPercent.value > 80) {
    list.push('当季鞋区接近饱和，建议增加收纳空间或使用换季存储')
  }

  if (!hasRotatingRack.value && totalShoes.value > 12) {
    list.push('建议配置旋转鞋架以提高空间利用率')
  }

  if (rotatingUtilization.value > 90) {
    list.push('旋转鞋架利用率过高，建议增加容量')
  }

  if (offSeasonPercent.value > 50 && !hasRotatingRack.value) {
    list.push('过季鞋较多，建议使用抽拉层板或鞋盒收纳')
  }

  return list
})
</script>

<template>
  <div class="seasonal-storage">
    <h3 class="section-title">
      <span class="icon">🔄</span>
      换季收纳计算
    </h3>

    <div class="storage-overview">
      <div class="overview-card current-season">
        <div class="card-header">
          <span class="card-icon">👟</span>
          <span class="card-title">当季鞋</span>
        </div>
        <div class="card-value">{{ Math.round(totalShoes * 0.7) }} 双</div>
        <div class="card-percent">{{ currentSeasonPercent }}%</div>
        <div class="card-bar">
          <div
            class="card-fill"
            :style="{ width: Math.min(100, currentSeasonPercent) + '%' }"
          ></div>
        </div>
      </div>

      <div class="overview-card off-season">
        <div class="card-header">
          <span class="card-icon">📦</span>
          <span class="card-title">过季鞋</span>
        </div>
        <div class="card-value">{{ Math.round(totalShoes * 0.3) }} 双</div>
        <div class="card-percent">{{ offSeasonPercent }}%</div>
        <div class="card-bar">
          <div
            class="card-fill"
            :style="{ width: Math.min(100, offSeasonPercent) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <div class="rotating-section">
      <div class="rotating-header">
        <span class="section-subtitle">旋转鞋架配置</span>
        <label class="toggle-switch">
          <input type="checkbox" v-model="hasRotatingRack" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div v-if="hasRotatingRack" class="rotating-config">
        <div class="config-row">
          <label class="config-label">
            <span>📊</span> 旋转鞋架容量
          </label>
          <input
            type="range"
            v-model.number="rotatingRackCapacity"
            min="4"
            max="12"
            class="slider"
          />
          <span class="config-value">{{ rotatingRackCapacity }} 双</span>
        </div>

        <div class="rotating-stats">
          <div class="stat-item">
            <span class="stat-icon">📈</span>
            <div class="stat-info">
              <span class="stat-label">空间利用率</span>
              <span class="stat-value">{{ rotatingUtilization }}%</span>
            </div>
          </div>

          <div class="stat-item">
            <span class="stat-icon">✨</span>
            <div class="stat-info">
              <span class="stat-label">可用空间</span>
              <span class="stat-value">{{ rotatingRackCapacity - Math.round(totalShoes * 0.3) }} 双</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="capacity-summary">
      <div class="summary-row">
        <span class="summary-label">总需求</span>
        <span class="summary-value highlight">{{ totalShoes }} 双</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">当前容量</span>
        <span class="summary-value">{{ storageAnalysis.currentCapacity }} 双</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">空间利用率</span>
        <span class="summary-value">{{ storageAnalysis.utilization }}%</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">缺口</span>
        <span :class="['summary-value', { danger: storageAnalysis.deficit > 0 }]">
          {{ storageAnalysis.deficit > 0 ? `-${storageAnalysis.deficit} 双` : '无' }}
        </span>
      </div>
    </div>

    <div v-if="suggestions.length > 0" class="suggestions-panel">
      <div class="suggestions-header">
        <span>💡</span> 收纳建议
      </div>
      <ul class="suggestions-list">
        <li v-for="(suggestion, index) in suggestions" :key="index">
          {{ suggestion }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.seasonal-storage {
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

.storage-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.overview-card {
  padding: var(--space-lg);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.overview-card.current-season {
  border-left: 4px solid var(--color-primary);
}

.overview-card.off-season {
  border-left: 4px solid var(--color-accent);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.card-icon {
  font-size: 1.25rem;
}

.card-title {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.card-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.card-percent {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
}

.card-bar {
  height: 6px;
  background: var(--color-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.card-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.5s ease;
}

.off-season .card-fill {
  background: var(--color-accent);
}

.rotating-section {
  margin-bottom: var(--space-lg);
  padding: var(--space-lg);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
}

.rotating-header {
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

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-secondary);
  transition: 0.3s;
  border-radius: 26px;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

.rotating-config {
  padding-top: var(--space-md);
}

.config-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.config-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 120px;
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
}

.config-value {
  min-width: 60px;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
}

.rotating-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
}

.stat-icon {
  font-size: 1.25rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.capacity-summary {
  padding: var(--space-lg);
  background: linear-gradient(135deg, var(--color-primary), #3d6b42);
  border-radius: var(--radius-lg);
  color: white;
  margin-bottom: var(--space-lg);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.summary-value {
  font-size: 0.9rem;
  font-weight: 600;
}

.summary-value.highlight {
  font-size: 1.1rem;
}

.summary-value.danger {
  color: #ff6b6b;
}

.suggestions-panel {
  padding: var(--space-lg);
  background: rgba(232, 168, 56, 0.1);
  border-left: 4px solid var(--color-accent);
  border-radius: var(--radius-md);
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: var(--space-md);
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestions-list li {
  position: relative;
  padding-left: var(--space-md);
  margin-bottom: var(--space-sm);
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.suggestions-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-accent);
}
</style>
