<template>
  <div class="color-info-panel">
    <h3 class="panel-title">{{ title }}</h3>
    
    <div class="color-preview-row">
      <div class="color-preview" :style="{ backgroundColor: colorInfo.hex }"></div>
      <div class="color-name">{{ colorInfo.name }}</div>
    </div>
    
    <div class="color-values">
      <div class="value-row">
        <span class="label">HEX</span>
        <span class="value">{{ colorInfo.hex.toUpperCase() }}</span>
      </div>
      <div class="value-row">
        <span class="label">RGB</span>
        <span class="value">{{ colorInfo.rgb.r }}, {{ colorInfo.rgb.g }}, {{ colorInfo.rgb.b }}</span>
      </div>
      <div class="value-row">
        <span class="label">HSV</span>
        <span class="value">{{ Math.round(colorInfo.hsv.h) }}°, {{ Math.round(colorInfo.hsv.s * 100) }}%, {{ Math.round(colorInfo.hsv.v * 100) }}%</span>
      </div>
      <div class="value-row">
        <span class="label">HSL</span>
        <span class="value">{{ Math.round(colorInfo.hsl.h) }}°, {{ Math.round(colorInfo.hsl.s * 100) }}%, {{ Math.round(colorInfo.hsl.l * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColorInfo } from '../utils/colorTheory'

defineProps<{
  title: string
  colorInfo: ColorInfo
}>()
</script>

<style scoped>
.color-info-panel {
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
  margin: 0 0 12px 0;
}

.color-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.color-preview {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.color-name {
  font-size: 16px;
  font-weight: 500;
  color: #222;
}

.color-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.value-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.label {
  color: #888;
  font-weight: 500;
}

.value {
  color: #333;
  font-family: monospace;
}
</style>
