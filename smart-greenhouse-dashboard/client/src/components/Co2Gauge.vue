<template>
  <div class="gauge-card" :class="{ 'is-danger': isDanger, 'is-warning': isWarning }">
    <div class="gauge-header">
      <span class="gauge-icon">🌫️</span>
      <span class="gauge-label">CO₂浓度</span>
      <span class="gauge-status" :class="statusClass">
        {{ statusText }}
      </span>
    </div>
    
    <div class="gauge-body">
      <svg :width="size" :height="size" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="co2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color: #a78bfa" />
            <stop offset="100%" style="stop-color: #8b5cf6" />
          </linearGradient>
          <filter id="co2Glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="var(--color-border)"
          stroke-width="14"
          opacity="0.3"
          stroke-dasharray="377"
          stroke-dashoffset="94"
          stroke-linecap="round"
          transform="rotate(135 100 100)"
        />
        
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#co2Gradient)"
          stroke-width="14"
          stroke-dasharray="377"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
          transform="rotate(135 100 100)"
          :filter="isDanger || isWarning ? 'url(#co2Glow)' : ''"
          class="progress-circle"
          :class="{ 'pulse-danger': isDanger, 'pulse-warning': isWarning }"
        />
        
        <g class="co2-bubbles">
          <circle cx="85" cy="90" r="10" :fill="bubbleColor" opacity="0.7" class="bubble bubble-1" />
          <circle cx="110" cy="100" r="12" :fill="bubbleColor" opacity="0.5" class="bubble bubble-2" />
          <circle cx="95" cy="115" r="8" :fill="bubbleColor" opacity="0.6" class="bubble bubble-3" />
        </g>
        
        <text x="100" y="50" text-anchor="middle" class="co2-value">
          {{ co2.toFixed(0) }}
        </text>
        <text x="100" y="68" text-anchor="middle" class="co2-unit">
          ppm
        </text>
      </svg>
    </div>
    
    <div class="gauge-footer">
      <div class="gauge-range">
        <span class="range-min">{{ min }} ppm</span>
        <span class="range-max">{{ max }} ppm</span>
      </div>
      <div class="gauge-info">
        适宜: {{ idealMin }}-{{ idealMax }} ppm
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useEnvironmentStore } from '../stores/environment';

const envStore = useEnvironmentStore();

const props = defineProps({
  size: {
    type: Number,
    default: 200,
  },
});

const co2 = computed(() => envStore.state.co2);
const min = 300;
const max = 2000;
const idealMin = 600;
const idealMax = 1000;
const warningHigh = 1500;
const warningLow = 400;

const percentage = computed(() => {
  const range = max - min;
  const val = Math.max(min, Math.min(max, co2.value));
  return (val - min) / range;
});

const dashOffset = computed(() => {
  const circumference = 2 * Math.PI * 80;
  const visibleLength = circumference * 0.75;
  return circumference - visibleLength * percentage.value;
});

const isDanger = computed(() => co2.value >= 1800);
const isWarning = computed(() => co2.value >= warningHigh || co2.value <= warningLow);

const statusClass = computed(() => {
  if (isDanger.value) return 'status-danger';
  if (isWarning.value) return 'status-warning';
  return 'status-good';
});

const statusText = computed(() => {
  if (co2.value >= warningHigh) return '偏高';
  if (co2.value <= warningLow) return '偏低';
  if (co2.value >= idealMin && co2.value <= idealMax) return '适宜';
  return '正常';
});

const bubbleColor = computed(() => {
  if (isDanger.value) return '#ef4444';
  if (isWarning.value) return '#f59e0b';
  return '#8b5cf6';
});
</script>

<style scoped>
.gauge-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-border);
  transition: all var(--transition-normal);
}

.gauge-card.is-danger {
  border-color: var(--color-danger);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

.gauge-card.is-warning {
  border-color: var(--color-warning);
}

.gauge-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.gauge-icon {
  font-size: 20px;
}

.gauge-label {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.gauge-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.status-good {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.status-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.status-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.gauge-body {
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-circle {
  transition: stroke-dashoffset 0.8s ease;
}

.pulse-danger {
  animation: pulse-red 1.5s ease-in-out infinite;
}

.pulse-warning {
  animation: pulse-orange 2s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes pulse-orange {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.co2-value {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  fill: var(--color-text-primary);
}

.co2-unit {
  font-size: 12px;
  fill: var(--color-text-secondary);
}

.co2-bubbles {
  animation: float 4s ease-in-out infinite;
}

.bubble-1 {
  animation-delay: 0s;
}

.bubble-2 {
  animation-delay: 0.5s;
}

.bubble-3 {
  animation-delay: 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.bubble {
  transition: fill 0.5s ease;
}

.gauge-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.gauge-range {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.gauge-info {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
