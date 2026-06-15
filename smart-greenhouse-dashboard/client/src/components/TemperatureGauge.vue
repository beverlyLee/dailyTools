<template>
  <div class="gauge-card" :class="{ 'is-warning': isWarning, 'is-danger': isDanger }">
    <div class="gauge-header">
      <span class="gauge-icon">🌡️</span>
      <span class="gauge-label">温度</span>
      <span class="gauge-status" :class="statusClass">
        {{ statusText }}
      </span>
    </div>
    
    <div class="gauge-body">
      <svg :width="size" :height="size" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color: #3b82f6" />
            <stop offset="50%" style="stop-color: #10b981" />
            <stop offset="100%" style="stop-color: #ef4444" />
          </linearGradient>
          <filter id="tempGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
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
          stroke="url(#tempGradient)"
          stroke-width="14"
          stroke-dasharray="377"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
          transform="rotate(135 100 100)"
          :filter="isDanger || isWarning ? 'url(#tempGlow)' : ''"
          class="progress-circle"
          :class="{ 'pulse-danger': isDanger, 'pulse-warning': isWarning }"
        />
        
        <line
          v-for="i in 11"
          :key="i"
          :x1="tickStartX(i)"
          :y1="tickStartY(i)"
          :x2="tickEndX(i)"
          :y2="tickEndY(i)"
          :stroke="tickColor(i)"
          stroke-width="2"
          opacity="0.6"
        />
        
        <g class="thermometer-icon">
          <path
            d="M 90 70 L 110 70 L 110 100 L 100 110 L 90 100 Z"
            :fill="thermometerFill"
            class="thermometer-body"
          />
          <circle
            cx="100"
            cy="120"
            r="15"
            :fill="thermometerFill"
            class="thermometer-bulb"
          />
          <rect
            x="95"
            y="75"
            width="10"
            :height="thermometerHeight"
            fill="rgba(255,255,255,0.3)"
            rx="2"
          />
        </g>
        
        <text x="100" y="50" text-anchor="middle" class="temp-value">
          {{ temperature.toFixed(1) }}
        </text>
        <text x="100" y="70" text-anchor="middle" class="temp-unit">
          ℃
        </text>
      </svg>
    </div>
    
    <div class="gauge-footer">
      <div class="gauge-range">
        <span class="range-min">{{ min }}℃</span>
        <span class="range-max">{{ max }}℃</span>
      </div>
      <div class="gauge-info">
        适宜: {{ idealMin }}-{{ idealMax }}℃
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

const temperature = computed(() => envStore.state.temperature);
const min = 10;
const max = 40;
const idealMin = 20;
const idealMax = 28;
const warningHigh = 32;
const warningLow = 15;

const percentage = computed(() => {
  const range = max - min;
  const val = Math.max(min, Math.min(max, temperature.value));
  return (val - min) / range;
});

const dashOffset = computed(() => {
  const circumference = 2 * Math.PI * 80;
  const visibleLength = circumference * 0.75;
  return circumference - visibleLength * percentage.value;
});

const isDanger = computed(() => temperature.value >= 35 || temperature.value <= 12);
const isWarning = computed(() => temperature.value >= warningHigh || temperature.value <= warningLow);

const statusClass = computed(() => {
  if (isDanger.value) return 'status-danger';
  if (isWarning.value) return 'status-warning';
  return 'status-good';
});

const statusText = computed(() => {
  if (temperature.value >= 35) return '超标';
  if (temperature.value <= 12) return '极低';
  if (temperature.value >= warningHigh) return '偏高';
  if (temperature.value <= warningLow) return '偏低';
  if (temperature.value >= idealMin && temperature.value <= idealMax) return '适宜';
  return '正常';
});

const thermometerFill = computed(() => {
  if (isDanger.value) return '#ef4444';
  if (isWarning.value) return '#f59e0b';
  if (temperature.value < 18) return '#3b82f6';
  return '#10b981';
});

const thermometerHeight = computed(() => {
  return 20 + percentage.value * 25;
});

function tickAngle(i) {
  const startAngle = 135;
  const endAngle = 405;
  return (startAngle + (endAngle - startAngle) * ((i - 1) / 10)) * Math.PI / 180;
}

function tickStartX(i) {
  return 100 + 60 * Math.cos(tickAngle(i));
}

function tickStartY(i) {
  return 100 + 60 * Math.sin(tickAngle(i));
}

function tickEndX(i) {
  return 100 + 70 * Math.cos(tickAngle(i));
}

function tickEndY(i) {
  return 100 + 70 * Math.sin(tickAngle(i));
}

function tickColor(i) {
  if (i <= 3) return '#3b82f6';
  if (i <= 7) return '#10b981';
  return '#ef4444';
}
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

.temp-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  fill: var(--color-text-primary);
}

.temp-unit {
  font-size: 14px;
  fill: var(--color-text-secondary);
}

.thermometer-bulb {
  transition: fill 0.5s ease;
}

.thermometer-body {
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
