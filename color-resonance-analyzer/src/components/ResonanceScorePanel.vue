<template>
  <div class="resonance-score-panel">
    <h3 class="panel-title">共振度评分</h3>
    
    <div class="score-context" v-if="score.title">
      {{ score.title }}
    </div>
    
    <div class="score-overview">
      <div class="score-circle" :class="score.label">
        <div class="score-number">{{ score.overall }}</div>
        <div class="score-label">{{ score.label }}</div>
      </div>
      
      <div class="score-description">
        {{ score.description }}
      </div>
    </div>
    
    <div class="score-details">
      <div class="detail-item">
        <div class="detail-header">
          <span class="detail-label">色相差异</span>
          <span class="detail-value">{{ score.hueDiff }}°</span>
        </div>
        <div class="detail-bar">
          <div 
            class="detail-bar-fill" 
            :style="{ width: `${Math.min(score.hueDiff / 1.8, 100)}%` }"
          ></div>
        </div>
      </div>
      
      <div class="detail-item">
        <div class="detail-header">
          <span class="detail-label">饱和度差</span>
          <span class="detail-value">{{ score.saturationDiff }}%</span>
        </div>
        <div class="detail-bar">
          <div 
            class="detail-bar-fill saturation"
            :style="{ width: `${score.saturationDiff}%` }"
          ></div>
        </div>
      </div>
      
      <div class="detail-item">
        <div class="detail-header">
          <span class="detail-label">明度差异</span>
          <span class="detail-value">{{ score.valueDiff }}%</span>
        </div>
        <div class="detail-bar">
          <div 
            class="detail-bar-fill value"
            :style="{ width: `${score.valueDiff}%` }"
          ></div>
        </div>
      </div>
      
      <div class="detail-item">
        <div class="detail-header">
          <span class="detail-label">对比度</span>
          <span class="detail-value">{{ score.contrastRatio }}:1</span>
        </div>
        <div class="detail-bar">
          <div 
            class="detail-bar-fill contrast"
            :style="{ width: `${Math.min(score.contrastRatio / 0.21, 100)}%` }"
          ></div>
        </div>
      </div>
    </div>
    
    <div class="analysis-details">
      <h4 class="analysis-title">详细分析</h4>
      <ul class="analysis-list">
        <li v-for="(detail, index) in score.details" :key="index">
          {{ detail }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResonanceScore } from '../utils/resonanceScore'

defineProps<{
  score: ResonanceScore
}>()
</script>

<style scoped>
.resonance-score-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.score-context {
  font-size: 11px;
  color: #888;
  text-align: center;
  padding: 4px 10px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 12px;
  font-weight: 500;
}

.score-overview {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.score-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border: 4px solid;
  background: #fff;
}

.score-circle.和谐 {
  border-color: #4caf50;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

.score-circle.平庸 {
  border-color: #ff9800;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.3);
}

.score-circle.冲突 {
  border-color: #f44336;
  box-shadow: 0 0 20px rgba(244, 67, 54, 0.3);
}

.score-number {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.score-label {
  font-size: 14px;
  font-weight: 600;
  color: #666;
}

.和谐 .score-label { color: #4caf50; }
.平庸 .score-label { color: #ff9800; }
.冲突 .score-label { color: #f44336; }

.score-description {
  text-align: center;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.score-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.detail-label {
  color: #888;
}

.detail-value {
  color: #333;
  font-weight: 500;
}

.detail-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.detail-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a9eff, #2d7dcc);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.detail-bar-fill.saturation {
  background: linear-gradient(90deg, #66bb6a, #43a047);
}

.detail-bar-fill.value {
  background: linear-gradient(90deg, #ffa726, #fb8c00);
}

.detail-bar-fill.contrast {
  background: linear-gradient(90deg, #ab47bc, #7b1fa2);
}

.analysis-details {
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.analysis-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.analysis-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  color: #666;
  line-height: 1.6;
}

.analysis-list li {
  margin-bottom: 4px;
}
</style>
