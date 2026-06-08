<template>
  <div class="color-scheme-panel">
    <h3 class="panel-title">色彩方案</h3>
    
    <div class="schemes-list">
      <div 
        v-for="scheme in schemes" 
        :key="scheme.id"
        class="scheme-card"
        :class="{ active: selectedSchemeId === scheme.id }"
        @click="$emit('select', scheme)"
      >
        <div class="scheme-header">
          <span class="scheme-name">{{ scheme.name }}</span>
          <span class="scheme-type-badge" :class="scheme.type">
            {{ typeLabels[scheme.type] }}
          </span>
        </div>
        
        <div class="scheme-colors">
          <div 
            v-for="(color, index) in scheme.colors" 
            :key="index"
            class="scheme-color"
            :style="{ backgroundColor: color.hex }"
            :title="color.name"
          ></div>
        </div>
        
        <p class="scheme-description">{{ scheme.description }}</p>
        
        <button 
          class="apply-btn"
          @click.stop="$emit('apply', scheme)"
        >
          应用到抱枕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColorScheme } from '../utils/colorTheory'

defineProps<{
  schemes: ColorScheme[]
  selectedSchemeId: string | null
}>()

defineEmits<{
  select: [scheme: ColorScheme]
  apply: [scheme: ColorScheme]
}>()

const typeLabels: Record<string, string> = {
  monochromatic: '同色系',
  analogous: '邻近色',
  complementary: '互补色',
}
</script>

<style scoped>
.color-scheme-panel {
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

.schemes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scheme-card {
  border: 2px solid #eee;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
}

.scheme-card:hover {
  border-color: #4a9eff;
  background: #f0f7ff;
}

.scheme-card.active {
  border-color: #2d7dcc;
  background: #e8f2fc;
}

.scheme-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.scheme-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.scheme-type-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.scheme-type-badge.monochromatic {
  background: #e3f2fd;
  color: #1565c0;
}

.scheme-type-badge.analogous {
  background: #e8f5e9;
  color: #2e7d32;
}

.scheme-type-badge.complementary {
  background: #fff3e0;
  color: #e65100;
}

.scheme-colors {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.scheme-color {
  flex: 1;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.scheme-description {
  font-size: 11px;
  color: #666;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.apply-btn {
  width: 100%;
  padding: 8px;
  background: linear-gradient(135deg, #4a9eff 0%, #2d7dcc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(45, 125, 204, 0.3);
}
</style>
