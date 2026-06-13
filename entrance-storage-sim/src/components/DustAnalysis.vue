<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DustSimulation, DustResult } from '../types'
import { calculateDustArea } from '../utils/calculations'

const dustSim = ref<DustSimulation>({
  doorWidth: 90,
  trafficFrequency: 'medium',
  location: 'urban',
  season: 'spring'
})

const dustResult = computed<DustResult>(() => {
  return calculateDustArea(dustSim.value)
})

const trafficOptions = [
  { value: 'low', label: '低', icon: '🚶', desc: '1-2人/天' },
  { value: 'medium', label: '中', icon: '🚶‍♂️', desc: '3-5人/天' },
  { value: 'high', label: '高', icon: '👨‍👩‍👧', desc: '6人+/天' }
]

const locationOptions = [
  { value: 'urban', label: '城区', icon: '🏙️' },
  { value: 'suburban', label: '郊区', icon: '🌳' }
]

const seasonOptions = [
  { value: 'spring', label: '春季', icon: '🌸', desc: '花粉多' },
  { value: 'summer', label: '夏季', icon: '☀️', desc: '干燥' },
  { value: 'autumn', label: '秋季', icon: '🍂', desc: '落叶' },
  { value: 'winter', label: '冬季', icon: '❄️', desc: '干燥' }
]

const intensityLevel = computed(() => {
  if (dustResult.value.intensity < 80) return '低'
  if (dustResult.value.intensity < 100) return '中'
  return '高'
})

const intensityColor = computed(() => {
  if (dustResult.value.intensity < 80) return '#2C5530'
  if (dustResult.value.intensity < 100) return '#E8A838'
  return '#dc3545'
})

const matRecommendation = computed(() => {
  const { width, length } = dustResult.value.recommendedMat
  if (width <= 120 && length <= 150) {
    return { size: '小号', icon: '🟢', desc: '适合小玄关' }
  } else if (width <= 150 && length <= 200) {
    return { size: '中号', icon: '🟡', desc: '适合标准玄关' }
  } else {
    return { size: '大号', icon: '🔴', desc: '适合大玄关' }
  }
})
</script>

<template>
  <div class="dust-analysis">
    <h3 class="section-title">
      <span class="icon">🧹</span>
      落尘区分析
    </h3>

    <div class="dust-preview">
      <div class="preview-container">
        <div class="dust-zone" :style="{
          width: Math.min(100, dustResult.spreadX) + '%',
          height: Math.min(100, dustResult.spreadY) + '%'
        }">
          <div class="dust-particles">
            <div v-for="i in 12" :key="i" class="particle"></div>
          </div>
        </div>
        <div class="mat-area" :style="{
          width: Math.min(100, dustResult.recommendedMat.width / 2) + '%',
          height: Math.min(100, dustResult.recommendedMat.length / 2) + '%'
        }">
          <span class="mat-label">{{ matRecommendation.icon }} 地毯</span>
        </div>
        <div class="door-indicator">
          <span>🚪</span>
          <span class="door-width">{{ dustSim.doorWidth }}cm</span>
        </div>
      </div>
      <div class="preview-legend">
        <div class="legend-item">
          <span class="legend-color dust"></span>
          <span>落尘范围</span>
        </div>
        <div class="legend-item">
          <span class="legend-color mat"></span>
          <span>建议地毯</span>
        </div>
      </div>
    </div>

    <div class="controls-section">
      <div class="control-group">
        <label class="control-label">
          <span>📏</span> 门宽
        </label>
        <input
          type="range"
          v-model.number="dustSim.doorWidth"
          min="70"
          max="120"
          class="slider"
        />
        <span class="control-value">{{ dustSim.doorWidth }} cm</span>
      </div>

      <div class="control-group">
        <label class="control-label">
          <span>👥</span> 人流量
        </label>
        <div class="button-group">
          <button
            v-for="option in trafficOptions"
            :key="option.value"
            :class="['option-btn', { active: dustSim.trafficFrequency === option.value }]"
            @click="dustSim.trafficFrequency = option.value as DustSimulation['trafficFrequency']"
          >
            <span class="btn-icon">{{ option.icon }}</span>
            <span class="btn-text">{{ option.label }}</span>
          </button>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">
          <span>🏠</span> 位置
        </label>
        <div class="button-group">
          <button
            v-for="option in locationOptions"
            :key="option.value"
            :class="['option-btn', { active: dustSim.location === option.value }]"
            @click="dustSim.location = option.value as DustSimulation['location']"
          >
            <span class="btn-icon">{{ option.icon }}</span>
            <span class="btn-text">{{ option.label }}</span>
          </button>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">
          <span>🌸</span> 季节
        </label>
        <div class="button-group four-col">
          <button
            v-for="option in seasonOptions"
            :key="option.value"
            :class="['option-btn', { active: dustSim.season === option.value }]"
            @click="dustSim.season = option.value as DustSimulation['season']"
          >
            <span class="btn-icon">{{ option.icon }}</span>
            <span class="btn-text">{{ option.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="result-section">
      <div class="result-header">
        <span class="result-icon">📊</span>
        <span class="result-title">分析结果</span>
      </div>

      <div class="result-grid">
        <div class="result-card">
          <div class="card-label">灰尘强度</div>
          <div class="card-value" :style="{ color: intensityColor }">
            {{ intensityLevel }}
          </div>
          <div class="card-bar">
            <div
              class="bar-fill"
              :style="{
                width: dustResult.intensity + '%',
                backgroundColor: intensityColor
              }"
            ></div>
          </div>
        </div>

        <div class="result-card">
          <div class="card-label">横向散落</div>
          <div class="card-value">{{ dustResult.spreadX }} cm</div>
          <div class="card-bar">
            <div
              class="bar-fill horizontal"
              :style="{ width: Math.min(100, dustResult.spreadX / 2) + '%' }"
            ></div>
          </div>
        </div>

        <div class="result-card">
          <div class="card-label">纵向散落</div>
          <div class="card-value">{{ dustResult.spreadY }} cm</div>
          <div class="card-bar">
            <div
              class="bar-fill vertical"
              :style="{ width: Math.min(100, dustResult.spreadY / 3) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div class="mat-recommendation">
        <div class="recommendation-header">
          <span class="rec-icon">{{ matRecommendation.icon }}</span>
          <span class="rec-title">地毯推荐</span>
        </div>
        <div class="rec-content">
          <div class="rec-size">
            <span class="size-label">建议尺寸</span>
            <span class="size-value">
              {{ dustResult.recommendedMat.width }}cm × {{ dustResult.recommendedMat.length }}cm
            </span>
          </div>
          <div class="rec-type">
            <span class="type-label">推荐规格</span>
            <span class="type-value">{{ matRecommendation.size }}</span>
          </div>
          <div class="rec-desc">{{ matRecommendation.desc }}</div>
        </div>
      </div>

      <div class="cleaning-tips">
        <div class="tips-header">
          <span>💡</span> 清洁建议
        </div>
        <ul class="tips-list">
          <li v-if="dustResult.intensity >= 100">高频清洁区域，建议每日清扫</li>
          <li>地垫建议放置在门外，减少室内灰尘</li>
          <li>春季花粉季节可考虑增加清洁频率</li>
          <li>使用防尘地垫材质效果更佳</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dust-analysis {
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

.dust-preview {
  margin-bottom: var(--space-lg);
}

.preview-container {
  position: relative;
  height: 300px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: var(--space-lg);
}

.dust-zone {
  position: absolute;
  background: rgba(201, 185, 154, 0.3);
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.5s ease;
}

.dust-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(201, 185, 154, 0.6);
  border-radius: 50%;
  animation: float 3s infinite;
}

.particle:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; }
.particle:nth-child(2) { left: 30%; top: 40%; animation-delay: 0.5s; }
.particle:nth-child(3) { left: 50%; top: 30%; animation-delay: 1s; }
.particle:nth-child(4) { left: 70%; top: 60%; animation-delay: 1.5s; }
.particle:nth-child(5) { left: 20%; top: 70%; animation-delay: 2s; }
.particle:nth-child(6) { left: 80%; top: 20%; animation-delay: 0.3s; }
.particle:nth-child(7) { left: 40%; top: 80%; animation-delay: 0.8s; }
.particle:nth-child(8) { left: 60%; top: 50%; animation-delay: 1.2s; }
.particle:nth-child(9) { left: 15%; top: 55%; animation-delay: 1.8s; }
.particle:nth-child(10) { left: 85%; top: 45%; animation-delay: 2.2s; }
.particle:nth-child(11) { left: 35%; top: 15%; animation-delay: 0.7s; }
.particle:nth-child(12) { left: 75%; top: 75%; animation-delay: 1.3s; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
  50% { transform: translateY(-10px) rotate(180deg); opacity: 1; }
}

.mat-area {
  position: absolute;
  bottom: 20%;
  background: linear-gradient(135deg, #8b7355, #a0845c);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.5s ease;
  z-index: 10;
}

.mat-label {
  font-size: 0.8rem;
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.door-indicator {
  position: absolute;
  top: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 1.25rem;
}

.door-width {
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: white;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
}

.preview-legend {
  display: flex;
  gap: var(--space-lg);
  justify-content: center;
  margin-top: var(--space-md);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
}

.legend-color.dust {
  background: rgba(201, 185, 154, 0.3);
  border: 2px dashed var(--color-accent);
}

.legend-color.mat {
  background: linear-gradient(135deg, #8b7355, #a0845c);
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.control-group {
  padding: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
}

.control-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.slider {
  width: 100%;
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

.control-value {
  display: block;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: var(--space-xs);
}

.button-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.button-group.four-col {
  grid-template-columns: repeat(4, 1fr);
}

.option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm);
  background: var(--bg-primary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  border-color: var(--color-secondary);
}

.option-btn.active {
  background: rgba(44, 85, 48, 0.1);
  border-color: var(--color-primary);
}

.btn-icon {
  font-size: 1.25rem;
  margin-bottom: var(--space-xs);
}

.btn-text {
  font-size: 0.8rem;
  color: var(--text-primary);
}

.result-section {
  padding: var(--space-lg);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
}

.result-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.result-icon {
  font-size: 1.25rem;
}

.result-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.result-card {
  padding: var(--space-md);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  text-align: center;
}

.card-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: var(--space-sm);
}

.card-bar {
  height: 6px;
  background: var(--color-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.5s ease;
}

.mat-recommendation {
  padding: var(--space-lg);
  background: linear-gradient(135deg, var(--color-primary), #3d6b42);
  border-radius: var(--radius-lg);
  color: white;
  margin-bottom: var(--space-lg);
}

.recommendation-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.rec-icon {
  font-size: 1.5rem;
}

.rec-title {
  font-size: 1rem;
  font-weight: 600;
}

.rec-content {
  display: flex;
  gap: var(--space-lg);
  align-items: center;
}

.rec-size, .rec-type {
  display: flex;
  flex-direction: column;
}

.size-label, .type-label {
  font-size: 0.8rem;
  opacity: 0.8;
}

.size-value {
  font-size: 1.1rem;
  font-weight: 600;
}

.type-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.rec-desc {
  margin-left: auto;
  font-size: 0.9rem;
  opacity: 0.9;
}

.cleaning-tips {
  padding: var(--space-md);
  background: rgba(232, 168, 56, 0.1);
  border-left: 4px solid var(--color-accent);
  border-radius: var(--radius-md);
}

.tips-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: var(--space-sm);
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  position: relative;
  padding-left: var(--space-md);
  margin-bottom: var(--space-xs);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.tips-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-accent);
}
</style>
