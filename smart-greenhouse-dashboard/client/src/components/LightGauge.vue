<template>
  <div class="gauge-card" :class="{ 'is-warning': isWarning, 'is-danger': isDanger }">
    <div class="gauge-header">
      <span class="gauge-icon">☀️</span>
      <span class="gauge-label">光照</span>
      <span class="gauge-status" :class="statusClass">
        {{ statusText }}
      </span>
    </div>
    
    <div class="gauge-body">
      <svg :width="size" :height="size" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="lightGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color: #fef08a" />
            <stop offset="70%" style="stop-color: #fbbf24" />
            <stop offset="100%" style="stop-color: #f59e0b" />
          </radialGradient>
          <filter id="lightGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
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
          stroke="#fbbf24"
          stroke-width="14"
          stroke-dasharray="377"
          :stroke-dashoffset="dashOffset"
          stroke-linecap="round"
          transform="rotate(135 100 100)"
          class="progress-circle"
          :class="{ 'pulse-danger': isDanger, 'pulse-warning': isWarning }"
        />
        
        <g class="sun-icon" :filter="isDaytime ? 'url(#lightGlow)' : ''">
          <circle
            cx="100"
            cy="100"
            r="25"
            :fill="sunColor"
            class="sun-body"
          />
          <g v-if="isDaytime">
            <line
              v-for="i in 8"
              :key="i"
              :x1="rayX1(i)"
              :y1="rayY1(i)"
              :x2="rayX2(i)"
              :y2="rayY2(i)"
              stroke="#fbbf24"
              stroke-width="3"
              stroke-linecap="round"
              class="sun-ray"
            />
          </g>
        </g>
        
        <text x="100" y="48" text-anchor="middle" class="light-value">
          {{ light.toFixed(0) }}
        </text>
        <text x="100" y="66" text-anchor="middle" class="light-unit">
          lux
        </text>
      </svg>
    </div>
    
    <div class="gauge-footer">
      <div class="gauge-range">
        <span class="range-min">{{ min }} lux</span>
        <span class="range-max">{{ max }} lux</span>
      </div>
      <div class="gauge-info">
        适宜: {{ idealMin }}-{{ idealMax }} lux
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

const light = computed(() => envStore.state.light);
const min = 0;
const max = 10000;
const idealMin = 3000;
const idealMax = 8000;
const warningHigh = 9000;
const warningLow = 1000;
const dangerHigh = 9500;

const percentage = computed(() => {
  const range = max - min;
  const val = Math.max(min, Math.min(max, light.value));
  return (val - min) / range;
});

const dashOffset = computed(() => {
  const circumference = 2 * Math.PI * 80;
  const visibleLength = circumference * 0.75;
  return circumference - visibleLength * percentage.value;
});

const isDaytime = computed(() => light.value > 500);

const isDanger = computed(() => light.value >= dangerHigh);
const isWarning = computed(() => light.value >= warningHigh || (light.value <= warningLow && light.value > 0));

const statusClass = computed(() => {
  if (isDanger.value) return 'status-danger';
  if (isWarning.value) return 'status-warning';
  return 'status-good';
});

const statusText = computed(() => {
  if (light.value >= dangerHigh) return '极强';
  if (light.value >= warningHigh) return '过强';
  if (light.value <= warningLow && light.value > 0) return '不足';
  if (light.value === 0) return '夜间';
  if (light.value >= idealMin && light.value <= idealMax) return '适宜';
  return '正常';
});

const sunColor = computed(() => {
  if (isDanger.value) return '#ef4444';
  if (light.value < 1000) return '#4b5563';
  if (isWarning.value) return '#f59e0b';
  return '#fbbf24';
});

function rayX1(i) {
  const angle = (i - 1) * 45 * Math.PI / 180;
  return 100 + 35 * Math.cos(angle);
}

function rayY1(i) {
  return 100 + 35 * Math.sin(angle(i));
}

function rayX2(i) {
  const angle = (i - 1) * 45 * Math.PI / 180;
  return 100 + 50 * Math.cos(angle);
}

function rayY2(i) {
  return 100 + 50 * Math.sin(angle(i));
}

function angle(i) {
  return (i - 1) * 45 * Math.PI / 180;
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

.gauge-card.is-warning {
  border-color: var(--color-warning);
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.2);
}

.gauge-card.is-danger {
  border-color: var(--color-danger);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
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

.pulse-warning {
  animation: pulse-orange 2s ease-in-out infinite;
}

.pulse-danger {
  animation: pulse-red 1.5s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes pulse-orange {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.light-value {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  fill: var(--color-text-primary);
}

.light-unit {
  font-size: 12px;
  fill: var(--color-text-secondary);
}

.sun-body {
  transition: fill 0.5s ease;
}

.sun-ray {
  transition: opacity 0.5s ease;
}

.sun-icon {
  animation: rotate-sun 20s linear infinite;
  transform-origin: center;
}

@keyframes rotate-sun {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
