<template>
  <div class="control-panel">
    <h3 class="panel-title">场景控制</h3>
    
    <div class="control-section">
      <label class="control-label">
        环境光遮蔽强度
        <span class="control-value">{{ Math.round(ambientOcclusion * 100) }}%</span>
      </label>
      <input 
        type="range" 
        min="0" 
        max="100" 
        :value="ambientOcclusion * 100"
        @input="onAoChange"
        class="range-slider"
      />
      <div class="range-labels">
        <span>弱</span>
        <span>强</span>
      </div>
    </div>
    
    <div class="control-section">
      <label class="control-label">沙发颜色</label>
      <div class="color-picker-row">
        <div 
          v-for="color in sofaPresets" 
          :key="color.hex"
          class="color-preset"
          :class="{ active: currentSofaColor === color.hex }"
          :style="{ backgroundColor: color.hex }"
          :title="color.name"
          @click="$emit('sofaColorChange', color.hex)"
        ></div>
      </div>
    </div>
    
    <div class="control-section">
      <label class="control-label">窗帘颜色</label>
      <div class="color-picker-row">
        <div 
          v-for="color in curtainPresets" 
          :key="color.hex"
          class="color-preset"
          :class="{ active: currentCurtainColor === color.hex }"
          :style="{ backgroundColor: color.hex }"
          :title="color.name"
          @click="$emit('curtainColorChange', color.hex)"
        ></div>
      </div>
    </div>
    
    <div class="control-section">
      <button class="reset-btn" @click="$emit('reset')">
        重置为默认
      </button>
    </div>
    
    <div class="tips-section">
      <h4 class="tips-title">使用提示</h4>
      <ul class="tips-list">
        <li>点击沙发提取主色调</li>
        <li>点击抱枕进行单独配色</li>
        <li>拖拽旋转 3D 视图</li>
        <li>滚轮缩放查看细节</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  ambientOcclusion: number
  currentSofaColor: string
  currentCurtainColor: string
}>()

const emit = defineEmits<{
  ambientOcclusionChange: [value: number]
  sofaColorChange: [hex: string]
  curtainColorChange: [hex: string]
  reset: []
}>()

const sofaPresets = [
  { hex: '#1e3a5f', name: '深蓝色' },
  { hex: '#3d5c8a', name: '灰蓝色' },
  { hex: '#8b4513', name: '棕色' },
  { hex: '#704214', name: '深褐色' },
  { hex: '#2f4f4f', name: '暗青色' },
  { hex: '#4a0080', name: '深紫色' },
  { hex: '#8b0000', name: '暗红色' },
  { hex: '#2e2e2e', name: '深灰色' },
]

const curtainPresets = [
  { hex: '#f5f0e8', name: '米白色' },
  { hex: '#e8ddd0', name: '米色' },
  { hex: '#d4c8b8', name: '浅咖色' },
  { hex: '#c9b896', name: '卡其色' },
  { hex: '#a8c5e6', name: '淡蓝色' },
  { hex: '#b8d4b8', name: '淡绿色' },
  { hex: '#e6c8c8', name: '淡粉色' },
  { hex: '#d0c8e0', name: '淡紫色' },
]

function onAoChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('ambientOcclusionChange', Number(target.value) / 100)
}
</script>

<style scoped>
.control-panel {
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
  margin: 0 0 16px 0;
}

.control-section {
  margin-bottom: 20px;
}

.control-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 500;
  color: #555;
  margin-bottom: 8px;
}

.control-value {
  color: #2d7dcc;
  font-weight: 600;
}

.range-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #e0e0e0;
  border-radius: 3px;
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #4a9eff 0%, #2d7dcc 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #999;
  margin-top: 4px;
}

.color-picker-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-preset {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-preset:hover {
  transform: scale(1.1);
}

.color-preset.active {
  border-color: #2d7dcc;
  box-shadow: 0 0 0 2px rgba(45, 125, 204, 0.3);
}

.reset-btn {
  width: 100%;
  padding: 10px;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: #eee;
  color: #333;
}

.tips-section {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.tips-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.tips-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  color: #888;
  line-height: 1.8;
}
</style>
