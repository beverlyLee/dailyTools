<template>
  <div class="gauge-card" :class="{ 'is-warning': isWarning }">
    <div class="gauge-header">
      <span class="gauge-icon">💧</span>
      <span class="gauge-label">湿度</span>
      <span class="gauge-status" :class="statusClass">
        {{ statusText }}
      </span>
    </div>
    
    <div class="gauge-body">
      <svg :width="size" :height="size" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="humidityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color: #93c5fd" />
            <stop offset="100%" style="stop-color: #3b82f6" />
          </linearGradient>
          <filter id="humidityGlow" x="-50%" y="-50%" width="200%" height="200%">
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
          stroke="url(#humidityGradient)"
          stroke-width="14"
          stroke-dasharray="377"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
          transform="rotate(135 100 100)"
          :filter="isWarning ? 'url(#humidityGlow)' : ''"
          class="progress-circle"
          :class="{ 'pulse-warning': isWarning }"
        />
        
        <g class="water-drop">
          <path
            d="M 100 60 Q 130 95 100 130 Q 70 95 100 60"
            :fill="dropColor"
            class="drop-body"
          />
          <ellipse
            cx="90"
            cy="85"
            rx="8"
            ry="12"
            fill="rgba(255,255,255,0.4)"
          />
        </g>
        
        <text x="100" y="50" text-anchor="middle" class="humidity-value">
          {{ humidity.toFixed(1) }}
        </text>
        <text x="100" y="68" text-anchor="middle" class="humidity-unit">
          %
        </text>
      </svg>
    </div>
    
    <div class="gauge-footer">
      <div class="gauge-range">
        <span class="range-min">{{ min }}%</span>
        <span class="range-max">{{ max }}%</span>
      </div>
      <div class="gauge-info">
        适宜: {{ idealMin }}-{{ idealMax }}%
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

const humidity = computed(() => envStore.state.humidity);
const min = 30;
const max = 100;
const idealMin = 50;
const idealMax = 75;
const warningHigh = 85;
const warningLow = 40;

const percentage = computed(() => {
  const range = max - min;
  const val = Math.max(min, Math.min(max, humidity.value));
  return (val - min) / range;
});

const dashOffset = computed(() => {
  const circumference = 2 * Math.PI * 80;
  const visibleLength = circumference * 0.75;
  return circumference - visibleLength * percentage.value;
});

const isWarning = computed(() => humidity.value >= warningHigh || humidity.value <= warningLow);

const statusClass = computed(() => {
  if (isWarning.value) return 'status-warning';
  return 'status-good';
});

const statusText = computed(() => {
  if (humidity.value >= warningHigh) return '偏高';
  if (humidity.value <= warningLow) return '偏低';
  if (humidity.value >= idealMin && humidity.value <= idealMax) return '适宜';
  return '正常';
});

const dropColor = computed(() => {
  if (isWarning.value) return '#f59e0b';
  return '#3b82f6';
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

.gauge-card.is-warning {
  border-color: var(--color-warning);
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
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

.gauge-body {
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-circle {
  transition: stroke-dashoffset 0.8s ease;
}

.pulse-warning {
  animation: pulse-orange 2s ease-in-out infinite;
}

@keyframes pulse-orange {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.humidity-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  fill: var(--color-text-primary);
}

.humidity-unit {
  font-size: 14px;
  fill: var(--color-text-secondary);
}

.drop-body {
  transition: fill 0.5s ease;
}

.water-drop {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
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
