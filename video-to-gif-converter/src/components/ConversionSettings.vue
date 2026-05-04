<template>
  <div class="card">
    <h3 class="card-title">转换参数设置</h3>
    
    <div class="form-group">
      <label class="form-label">输出格式</label>
      <select 
        class="form-select"
        :value="modelValue.format"
        @change="updateFormat($event)"
      >
        <option value="gif">GIF</option>
        <option value="webm">WebM</option>
      </select>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">宽度 (像素)</label>
        <input 
          type="number" 
          class="form-input"
          :value="modelValue.width"
          @input="updateWidth($event)"
          min="64"
          max="3840"
          step="8"
        />
      </div>
      <div class="form-group">
        <label class="form-label">高度 (像素)</label>
        <input 
          type="number" 
          class="form-input"
          :value="modelValue.height"
          @input="updateHeight($event)"
          min="64"
          max="2160"
          step="8"
        />
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">帧率 (FPS)</label>
        <input 
          type="number" 
          class="form-input"
          :value="modelValue.fps"
          @input="updateFps($event)"
          min="1"
          max="60"
        />
        <input 
          type="range"
          :value="modelValue.fps"
          @input="updateFps($event)"
          min="1"
          max="60"
          class="slider"
        />
      </div>
      <div class="form-group">
        <label class="form-label">循环次数</label>
        <input 
          type="number" 
          class="form-input"
          :value="modelValue.loop"
          @input="updateLoop($event)"
          min="-1"
          max="100"
        />
        <p class="hint">0 = 无限循环, -1 = 不循环</p>
      </div>
    </div>
    
    <div v-if="modelValue.format === 'gif'" class="form-row">
      <div class="form-group">
        <label class="form-label">颜色数量</label>
        <select 
          class="form-select"
          :value="modelValue.colors"
          @change="updateColors($event)"
        >
          <option :value="32">32 色 (低质量)</option>
          <option :value="64">64 色</option>
          <option :value="128">128 色</option>
          <option :value="256">256 色 (高质量)</option>
        </select>
      </div>
    </div>
    
    <div v-if="modelValue.format === 'webm'" class="form-row">
      <div class="form-group">
        <label class="form-label">质量</label>
        <input 
          type="number" 
          class="form-input"
          :value="modelValue.quality"
          @input="updateQuality($event)"
          min="1"
          max="100"
        />
        <input 
          type="range"
          :value="modelValue.quality"
          @input="updateQuality($event)"
          min="1"
          max="100"
          class="slider"
        />
      </div>
    </div>
    
    <div class="presets">
      <h4>快速预设</h4>
      <div class="preset-buttons">
        <button 
          class="preset-btn"
          @click="applyPreset('low')"
        >
          低质量
        </button>
        <button 
          class="preset-btn"
          @click="applyPreset('medium')"
        >
          中等质量
        </button>
        <button 
          class="preset-btn"
          @click="applyPreset('high')"
        >
          高质量
        </button>
        <button 
          class="preset-btn"
          @click="applyPreset('social')"
        >
          社交媒体
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { ConversionSettings } from '../types'

interface Props {
  modelValue: ConversionSettings
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: ConversionSettings): void
}>()

const updateFormat = (e: Event) => {
  const select = e.target as HTMLSelectElement
  emit('update:modelValue', {
    ...props.modelValue,
    format: select.value as 'gif' | 'webm'
  })
}

const updateWidth = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = parseInt(input.value)
  if (!isNaN(value)) {
    emit('update:modelValue', {
      ...props.modelValue,
      width: Math.max(64, Math.min(3840, value))
    })
  }
}

const updateHeight = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = parseInt(input.value)
  if (!isNaN(value)) {
    emit('update:modelValue', {
      ...props.modelValue,
      height: Math.max(64, Math.min(2160, value))
    })
  }
}

const updateFps = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = parseInt(input.value)
  if (!isNaN(value)) {
    emit('update:modelValue', {
      ...props.modelValue,
      fps: Math.max(1, Math.min(60, value))
    })
  }
}

const updateLoop = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = parseInt(input.value)
  if (!isNaN(value)) {
    emit('update:modelValue', {
      ...props.modelValue,
      loop: Math.max(-1, Math.min(100, value))
    })
  }
}

const updateColors = (e: Event) => {
  const select = e.target as HTMLSelectElement
  const value = parseInt(select.value)
  if (!isNaN(value)) {
    emit('update:modelValue', {
      ...props.modelValue,
      colors: value
    })
  }
}

const updateQuality = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = parseInt(input.value)
  if (!isNaN(value)) {
    emit('update:modelValue', {
      ...props.modelValue,
      quality: Math.max(1, Math.min(100, value))
    })
  }
}

const applyPreset = (preset: string) => {
  let settings: Partial<ConversionSettings> = {}
  
  switch (preset) {
    case 'low':
      settings = {
        width: 320,
        height: 240,
        fps: 10,
        colors: 64,
        quality: 40
      }
      break
    case 'medium':
      settings = {
        width: 480,
        height: 360,
        fps: 15,
        colors: 128,
        quality: 60
      }
      break
    case 'high':
      settings = {
        width: 640,
        height: 480,
        fps: 24,
        colors: 256,
        quality: 85
      }
      break
    case 'social':
      settings = {
        width: 720,
        height: 720,
        fps: 15,
        colors: 256,
        quality: 75
      }
      break
  }
  
  emit('update:modelValue', {
    ...props.modelValue,
    ...settings
  })
}
</script>

<style scoped>
.slider {
  width: 100%;
  margin-top: 0.5rem;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.presets {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.presets h4 {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.preset-btn {
  padding: 0.5rem 1rem;
  background-color: var(--surface-hover);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}
</style>
