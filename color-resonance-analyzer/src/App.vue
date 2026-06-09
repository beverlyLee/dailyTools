<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <div class="logo-icon">🎨</div>
        <div class="header-text">
          <h1 class="app-title">软装色彩共振分析仪</h1>
          <p class="app-subtitle">Color Resonance Analyzer</p>
        </div>
      </div>
      <div class="header-right">
        <span class="status-badge" :class="currentScore.label">
          {{ currentScore.label }}
        </span>
      </div>
    </header>
    
    <div class="main-content">
      <div class="scene-container" ref="sceneContainerRef">
        <div class="scene-hint" v-if="!selectedObject">
          <p>👆 点击沙发提取主色调</p>
          <p>🎯 点击抱枕进行配色</p>
          <p>🪟 点击窗帘查看效果</p>
        </div>
      </div>
      
      <aside class="sidebar left-sidebar">
        <ColorInfoPanel 
          v-if="sofaColorInfo"
          title="沙发主色调"
          :color-info="sofaColorInfo"
        />
        
        <ColorInfoPanel 
          v-if="curtainColorInfo && !selectedCurtainColor"
          title="窗帘主色"
          :color-info="curtainColorInfo"
        />
        
        <ColorInfoPanel 
          v-if="selectedPillowColor"
          title="选中抱枕"
          :color-info="selectedPillowColor"
        />
        
        <ColorInfoPanel 
          v-if="selectedCurtainColor"
          title="选中窗帘"
          :color-info="selectedCurtainColor"
        />
        
        <ResonanceScorePanel 
          v-if="currentScore"
          :score="currentScore"
        />
      </aside>
      
      <aside class="sidebar right-sidebar">
        <ColorSchemePanel
          :schemes="colorSchemes"
          :selected-scheme-id="selectedSchemeId"
          @select="onSchemeSelect"
          @apply="onSchemeApply"
          @apply-curtain="onSchemeApplyToCurtain"
        />
        
        <ControlPanel
          :ambient-occlusion="ambientOcclusionIntensity"
          :current-sofa-color="currentSofaColorHex"
          :current-curtain-color="currentCurtainColorHex"
          @ambient-occlusion-change="onAoChange"
          @sofa-color-change="onSofaColorChange"
          @curtain-color-change="onCurtainColorChange"
          @reset="onReset"
        />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useThreeScene } from './composables/useThreeScene'
import { generateAllSchemes, createColorInfo } from './utils/colorTheory'
import { calculateResonance, calculateOverallResonance } from './utils/resonanceScore'
import type { ColorScheme, ColorInfo } from './utils/colorTheory'
import type { ResonanceScore } from './utils/resonanceScore'
import ColorInfoPanel from './components/ColorInfoPanel.vue'
import ColorSchemePanel from './components/ColorSchemePanel.vue'
import ResonanceScorePanel from './components/ResonanceScorePanel.vue'
import ControlPanel from './components/ControlPanel.vue'

const sceneContainerRef = ref<HTMLElement | null>(null)

const {
  sofaObjects,
  pillowObjects,
  curtainObjects,
  selectedObject,
  selectedPillowIndex,
  selectedCurtainIndex,
  ambientOcclusionIntensity,
  getSofaColorInfo,
  getPillowColorInfo,
  getCurtainColorInfo,
  setPillowColor,
  setAllPillowColors,
  setCurtainColor,
  setAllCurtainColors,
  setSofaColor,
  setAmbientOcclusionIntensity,
  resetToOriginal,
} = useThreeScene(sceneContainerRef)

const colorSchemes = ref<ColorScheme[]>([])
const selectedSchemeId = ref<string | null>('monochromatic')

const sofaColorInfo = computed<ColorInfo | null>(() => {
  return getSofaColorInfo()
})

const selectedPillowColor = computed<ColorInfo | null>(() => {
  if (selectedPillowIndex.value >= 0) {
    return getPillowColorInfo(selectedPillowIndex.value)
  }
  return null
})

const selectedCurtainColor = computed<ColorInfo | null>(() => {
  if (selectedCurtainIndex.value >= 0) {
    return getCurtainColorInfo(selectedCurtainIndex.value)
  }
  return null
})

const curtainColorInfo = computed<ColorInfo | null>(() => {
  return getCurtainColorInfo(0)
})

const currentSofaColorHex = computed(() => {
  return sofaObjects.value[0]?.currentColor || '#1e3a5f'
})

const currentCurtainColorHex = computed(() => {
  return curtainObjects.value[0]?.currentColor || '#f5f0e8'
})

const currentScore = computed<ResonanceScore>(() => {
  const sofaColor = sofaColorInfo.value
  const curtainColor = curtainColorInfo.value
  
  if (!sofaColor) {
    return {
      overall: 0,
      saturationDiff: 0,
      valueDiff: 0,
      hueDiff: 0,
      contrastRatio: 0,
      label: '平庸',
      title: '等待分析',
      description: '点击沙发提取主色调',
      details: ['请点击沙发开始色彩分析'],
    }
  }
  
  if (selectedPillowIndex.value >= 0 && selectedPillowColor.value) {
    const score = calculateResonance(sofaColor, selectedPillowColor.value)
    return {
      ...score,
      title: `沙发 vs 抱枕${selectedPillowIndex.value + 1}`,
    }
  }
  
  if (selectedCurtainIndex.value >= 0 && selectedCurtainColor.value) {
    const score = calculateResonance(sofaColor, selectedCurtainColor.value)
    return {
      ...score,
      title: `沙发 vs 窗帘`,
    }
  }
  
  const pillowColors = pillowObjects.value.map(p => createColorInfo(p.currentColor, p.name))
  
  if (curtainColor) {
    return calculateOverallResonance(sofaColor, pillowColors, curtainColor)
  }
  
  let totalScore = 0
  let count = 0
  const allDetails: string[] = []
  
  pillowColors.forEach((color, index) => {
    const score = calculateResonance(sofaColor, color)
    totalScore += score.overall
    count++
    allDetails.push(`沙发-抱枕${index + 1}: ${score.overall}分 - ${score.label}`)
  })
  
  const avgScore = count > 0 ? Math.round(totalScore / count) : 0
  
  let label: '和谐' | '平庸' | '冲突'
  let description: string
  
  if (avgScore >= 80) {
    label = '和谐'
    description = '沙发与抱枕整体配色和谐舒适'
  } else if (avgScore >= 60) {
    label = '平庸'
    description = '整体配色中规中矩，有提升空间'
  } else {
    label = '冲突'
    description = '整体配色冲突感较强，建议调整'
  }
  
  const firstPillow = pillowColors[0]
  const firstScore = firstPillow ? calculateResonance(sofaColor, firstPillow) : null
  
  return {
    overall: avgScore,
    saturationDiff: firstScore?.saturationDiff || 0,
    valueDiff: firstScore?.valueDiff || 0,
    hueDiff: firstScore?.hueDiff || 0,
    contrastRatio: firstScore?.contrastRatio || 0,
    label,
    title: '沙发 + 抱枕 · 综合评分',
    description,
    details: allDetails,
  }
})

watch(
  () => currentSofaColorHex.value,
  (newColor) => {
    if (newColor) {
      colorSchemes.value = generateAllSchemes(newColor)
    }
  },
  { immediate: true }
)



function onSchemeSelect(scheme: ColorScheme) {
  selectedSchemeId.value = scheme.id
}

function onSchemeApply(scheme: ColorScheme) {
  const baseColor = sofaColorInfo.value
  
  const pillowCount = pillowObjects.value.length
  const schemeColors = scheme.colors
    .filter(c => baseColor && c.hex.toLowerCase() !== baseColor.hex.toLowerCase())
    .slice(0, pillowCount)
    .map(c => c.hex)
  
  while (schemeColors.length < pillowCount) {
    const colorIndex = schemeColors.length % (scheme.colors.length - 1)
    const availableColors = scheme.colors.filter(
      c => baseColor && c.hex.toLowerCase() !== baseColor.hex.toLowerCase()
    )
    schemeColors.push(availableColors[colorIndex].hex)
  }
  
  setAllPillowColors(schemeColors)
}

function onSchemeApplyToCurtain(scheme: ColorScheme) {
  setAllCurtainColors(scheme.accentColor.hex)
}

function onAoChange(value: number) {
  setAmbientOcclusionIntensity(value)
}

function onSofaColorChange(hex: string) {
  setSofaColor(hex)
}

function onCurtainColorChange(hex: string) {
  setAllCurtainColors(hex)
}

function onReset() {
  resetToOriginal()
  selectedSchemeId.value = 'monochromatic'
  
  const defaultSofaColor = '#1e3a5f'
  colorSchemes.value = generateAllSchemes(defaultSofaColor)
}
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f3f0 0%, #e8e4df 100%);
}

.app-header {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  color: #222;
  margin: 0;
}

.app-subtitle {
  font-size: 11px;
  color: #999;
  margin: 0;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.header-right {
  display: flex;
  align-items: center;
}

.status-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.status-badge.和谐 {
  background: rgba(76, 175, 80, 0.15);
  color: #2e7d32;
}

.status-badge.平庸 {
  background: rgba(255, 152, 0, 0.15);
  color: #e65100;
}

.status-badge.冲突 {
  background: rgba(244, 67, 54, 0.15);
  color: #c62828;
}

.main-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.scene-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.scene-container :deep(canvas) {
  display: block;
}

.scene-hint {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
  pointer-events: none;
  z-index: 5;
}

.scene-hint p {
  margin: 0;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  backdrop-filter: blur(10px);
}

.sidebar {
  width: 300px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  z-index: 5;
}

.left-sidebar {
  border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.right-sidebar {
  border-left: 1px solid rgba(0, 0, 0, 0.05);
}

@media (max-width: 1200px) {
  .sidebar {
    width: 260px;
  }
}
</style>
