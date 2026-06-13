<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import type { FamilyData, ShoeCabinet, GapAnalysis } from './types'
import { detectCapacityGap, calculateShoeNeeds, calculateCabinetCapacity } from './utils/calculations'
import FamilyInput from './components/FamilyInput.vue'
import CabinetGenerator from './components/CabinetGenerator.vue'
import ShoeFittingSim from './components/ShoeFittingSim.vue'
import SeasonalStorage from './components/SeasonalStorage.vue'
import DustAnalysis from './components/DustAnalysis.vue'

const familyData = ref<FamilyData>({
  adults: 2,
  children: 1,
  familyType: 'normal'
})

const cabinetConfig = ref<ShoeCabinet>({
  mode: 'deep-shallow',
  width: 100,
  depth: 35,
  height: 180,
  compartments: 3,
  compartmentHeights: [60, 40, 40]
})

const gapAnalysis = computed<GapAnalysis>(() => {
  return detectCapacityGap(familyData.value, cabinetConfig.value)
})

const totalShoes = computed(() => {
  return calculateShoeNeeds(familyData.value.adults, familyData.value.children)
})

const totalCapacity = computed(() => {
  return calculateCabinetCapacity(cabinetConfig.value)
})

provide('familyData', familyData)
provide('cabinetConfig', cabinetConfig)
provide('gapAnalysis', gapAnalysis)
provide('totalShoes', totalShoes)
provide('totalCapacity', totalCapacity)

const activeTab = ref('family')

const tabs = [
  { id: 'family', label: '家庭成员', icon: '👨‍👩‍👧' },
  { id: 'cabinet', label: '鞋柜生成', icon: '🗄️' },
  { id: 'fitting', label: '穿鞋模拟', icon: '🧍' },
  { id: 'storage', label: '换季收纳', icon: '🔄' },
  { id: 'dust', label: '落尘分析', icon: '🧹' }
]

function switchTab(tabId: string) {
  activeTab.value = tabId
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          <span class="title-icon">🏠</span>
          玄关收纳模拟系统
        </h1>
        <p class="app-subtitle">解决空间狭小与收纳需求的矛盾</p>
      </div>
    </header>

    <div class="main-layout">
      <aside class="sidebar">
        <nav class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['nav-item', { active: activeTab === tab.id }]"
            @click="switchTab(tab.id)"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-label">{{ tab.label }}</span>
          </button>
        </nav>

        <div class="quick-stats">
          <div class="stat-item">
            <span class="stat-label">家庭成员</span>
            <span class="stat-value">{{ familyData.adults }}大 + {{ familyData.children }}小</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">常鞋数量</span>
            <span class="stat-value highlight">{{ totalShoes }} 双</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">柜体容量</span>
            <span class="stat-value">{{ totalCapacity }} 双</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">容量状态</span>
            <span :class="['stat-value', gapAnalysis.hasGap ? 'warning' : 'success']">
              {{ gapAnalysis.hasGap ? '不足' : '充足' }}
            </span>
          </div>
        </div>

        <div v-if="gapAnalysis.hasGap" class="alert-card">
          <div class="alert-header">
            <span>⚠️</span>
            <span>容量预警</span>
          </div>
          <p class="alert-message">{{ gapAnalysis.suggestion }}</p>
        </div>
      </aside>

      <main class="content-area">
        <transition name="fade" mode="out-in">
          <div :key="activeTab" class="module-container">
            <FamilyInput
              v-if="activeTab === 'family'"
              v-model="familyData"
            />

            <CabinetGenerator
              v-if="activeTab === 'cabinet'"
              v-model="cabinetConfig"
            />

            <ShoeFittingSim
              v-if="activeTab === 'fitting'"
              :cabinet-config="cabinetConfig"
            />

            <SeasonalStorage
              v-if="activeTab === 'storage'"
              :family-data="familyData"
              :cabinet-config="cabinetConfig"
            />

            <DustAnalysis
              v-if="activeTab === 'dust'"
            />
          </div>
        </transition>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.app-header {
  background: linear-gradient(135deg, var(--color-primary), #3d6b42);
  color: white;
  padding: var(--space-lg) var(--space-xl);
  box-shadow: 0 4px 12px rgba(44, 85, 48, 0.2);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
}

.app-title {
  font-size: 1.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.title-icon {
  font-size: 2rem;
}

.app-subtitle {
  font-size: 0.95rem;
  opacity: 0.9;
  margin-left: 2.5rem;
}

.main-layout {
  display: flex;
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: var(--space-lg);
  gap: var(--space-lg);
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.tab-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: var(--color-secondary);
}

.nav-item.active {
  background: var(--color-primary);
  color: white;
}

.nav-icon {
  font-size: 1.25rem;
}

.nav-label {
  font-size: 0.95rem;
  font-weight: 500;
}

.quick-stats {
  padding: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-secondary);
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-value.highlight {
  color: var(--color-primary);
  font-size: 1rem;
}

.stat-value.warning {
  color: #dc3545;
}

.stat-value.success {
  color: var(--color-primary);
}

.alert-card {
  padding: var(--space-md);
  background: rgba(220, 53, 69, 0.1);
  border-left: 4px solid #dc3545;
  border-radius: var(--radius-md);
}

.alert-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 600;
  color: #dc3545;
  margin-bottom: var(--space-sm);
}

.alert-message {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.content-area {
  flex: 1;
  min-width: 0;
}

.module-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .main-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .tab-nav {
    flex-direction: row;
    overflow-x: auto;
  }

  .nav-item {
    flex-direction: column;
    padding: var(--space-sm);
    min-width: 80px;
  }

  .quick-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
  }

  .stat-item {
    border-bottom: none;
    padding: var(--space-sm);
    background: var(--bg-primary);
    border-radius: var(--radius-sm);
  }
}
</style>
