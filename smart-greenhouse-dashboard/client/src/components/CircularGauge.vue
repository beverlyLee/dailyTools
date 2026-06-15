<template>
  <div class="circular-gauge" :class="{ 'status-danger': status === 'danger', 'status-warning': status === 'warning' }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <defs>
        <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" :style="{ stopColor: gradientStart }" />
          <stop offset="100%" :style="{ stopColor: gradientEnd }" />
        </linearGradient>
        <filter :id="glowId" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="trackColor"
        :stroke-width="strokeWidth"
        opacity="0.2"
      />
      
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="`url(#${gradientId})`"
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :stroke-linecap="strokeLinecap"
        :transform="`rotate(-90 ${center} ${center})`"
        :filter="showGlow ? `url(#${glowId})` : ''"
        class="progress-ring"
      />
      
      <g v-if="showTicks">
        <line
          v-for="i in tickCount"
          :key="i"
          :x1="center + (radius - 8) * Math.cos(tickAngle(i))"
          :y1="center + (radius - 8) * Math.sin(tickAngle(i))"
          :x2="center + (radius + 8) * Math.cos(tickAngle(i))"
          :y2="center + (radius + 8) * Math.sin(tickAngle(i))"
          stroke="var(--color-border)"
          stroke-width="1"
          opacity="0.5"
        />
      </g>
      
      <slot name="center">
        <text :x="center" :y="center - 10" text-anchor="middle" class="gauge-value">
          {{ displayValue }}
        </text>
        <text :x="center" :y="center + 20" text-anchor="middle" class="gauge-unit">
          {{ unit }}
        </text>
      </slot>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: {
    type: Number,
    default: 0,
  },
  min: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  unit: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 200,
  },
  strokeWidth: {
    type: Number,
    default: 12,
  },
  gradientStart: {
    type: String,
    default: '#10b981',
  },
  gradientEnd: {
    type: String,
    default: '#059669',
  },
  trackColor: {
    type: String,
    default: '#374151',
  },
  status: {
    type: String,
    default: 'normal',
  },
  showTicks: {
    type: Boolean,
    default: false,
  },
  tickCount: {
    type: Number,
    default: 10,
  },
  showGlow: {
    type: Boolean,
    default: false,
  },
  decimals: {
    type: Number,
    default: 1,
  },
});

const gradientId = computed(() => `gradient-${Math.random().toString(36).substr(2, 9)}`);
const glowId = computed(() => `glow-${Math.random().toString(36).substr(2, 9)}`);

const center = computed(() => props.size / 2);
const radius = computed(() => (props.size - props.strokeWidth) / 2 - 10);
const circumference = computed(() => 2 * Math.PI * radius.value);

const percentage = computed(() => {
  const range = props.max - props.min;
  const val = Math.max(props.min, Math.min(props.max, props.value));
  return (val - props.min) / range;
});

const dashOffset = computed(() => {
  return circumference.value * (1 - percentage.value * 0.75);
});

const strokeLinecap = 'round';

const displayValue = computed(() => {
  return props.value.toFixed(props.decimals);
});

function tickAngle(i) {
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 1.5;
  const angle = startAngle + (endAngle - startAngle) * (i / props.tickCount);
  return angle;
}
</script>

<style scoped>
.circular-gauge {
  position: relative;
  display: inline-block;
}

.progress-ring {
  transition: stroke-dashoffset 0.5s ease;
}

.gauge-value {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  fill: var(--color-text-primary);
}

.gauge-unit {
  font-size: 12px;
  fill: var(--color-text-secondary);
}

.status-danger .progress-ring {
  animation: pulse-danger 1.5s ease-in-out infinite;
}

@keyframes pulse-danger {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
