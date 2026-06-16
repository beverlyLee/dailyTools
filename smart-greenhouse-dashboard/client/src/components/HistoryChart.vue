<template>
  <div class="chart-card">
    <div class="card-header">
      <div class="header-left">
        <span class="header-icon">📈</span>
        <span class="header-title">环境趋势分析</span>
      </div>
      <div class="header-actions">
        <div class="time-range">
          <button
            v-for="range in timeRanges"
            :key="range.value"
            class="range-btn"
            :class="{ active: selectedRange === range.value }"
            @click="selectRange(range.value)"
          >
            {{ range.label }}
          </button>
        </div>
        <div class="legend-toggle">
          <button
            v-for="item in legendItems"
            :key="item.key"
            class="legend-btn"
            :class="{ active: visibleSeries.has(item.key) }"
            :style="{ borderColor: item.color }"
            @click="toggleSeries(item.key)"
          >
            <span class="legend-dot" :style="{ background: item.color }"></span>
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>
    
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';
import { useEnvironmentStore } from '../stores/environment';

const envStore = useEnvironmentStore();

const chartRef = ref(null);
let chart = null;

const timeRanges = [
  { label: '24小时', value: 24 },
  { label: '12小时', value: 12 },
  { label: '6小时', value: 6 },
  { label: '3小时', value: 3 },
];

const selectedRange = ref(24);

const legendItems = [
  { key: 'temperature', label: '温度', color: '#ef4444', unit: '℃' },
  { key: 'humidity', label: '湿度', color: '#3b82f6', unit: '%' },
  { key: 'light', label: '光照', color: '#fbbf24', unit: 'lux' },
  { key: 'co2', label: 'CO2', color: '#8b5cf6', unit: 'ppm' },
];

const visibleSeries = ref(new Set(['temperature', 'humidity', 'light']));

function toggleSeries(key) {
  if (visibleSeries.value.has(key)) {
    if (visibleSeries.value.size > 1) {
      visibleSeries.value.delete(key);
    }
  } else {
    visibleSeries.value.add(key);
  }
  visibleSeries.value = new Set(visibleSeries.value);
  updateChart();
}

function selectRange(hours) {
  selectedRange.value = hours;
  updateChart();
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

const chartData = computed(() => {
  const history = envStore.history;
  const hours = selectedRange.value;
  const pointsPerHour = 20;
  const totalPoints = hours * pointsPerHour;
  
  if (history.length === 0) {
    return { times: [], series: {} };
  }
  
  const filtered = history.slice(-totalPoints);
  
  const times = filtered.map(p => formatTime(p.timestamp));
  
  const series = {};
  legendItems.forEach(item => {
    series[item.key] = filtered.map(p => p[item.key]);
  });
  
  return { times, series };
});

function getChartOption() {
  const { times, series } = chartData.value;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  
  const seriesConfig = legendItems
    .filter(item => visibleSeries.value.has(item.key))
    .map(item => ({
      name: item.label,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: false,
      lineStyle: {
        width: 2,
        color: item.color,
      },
      itemStyle: {
        color: item.color,
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: item.color + '40' },
          { offset: 1, color: item.color + '05' },
        ]),
      },
      data: series[item.key] || [],
      yAxisIndex: item.key === 'light' ? 1 : 0,
    }));
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderColor: isDark ? '#374151' : '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: isDark ? '#e5e7eb' : '#1f2937',
      },
      axisPointer: {
        type: 'cross',
        lineStyle: {
          color: isDark ? '#4b5563' : '#d1d5db',
          type: 'dashed',
        },
      },
    },
    legend: {
      show: false,
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '10%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
      axisLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb',
        },
      },
      axisLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 11,
        maxTicksLimit: 8,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '温度/湿度/CO2',
        nameTextStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#1f2937' : '#f3f4f6',
            type: 'dashed',
          },
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
        },
        axisTick: {
          show: false,
        },
      },
      {
        type: 'value',
        name: '光照 (lux)',
        nameTextStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
        },
        splitLine: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 11,
        },
        axisTick: {
          show: false,
        },
      },
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 20,
        bottom: 5,
        borderColor: isDark ? '#374151' : '#e5e7eb',
        fillerColor: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
        handleStyle: {
          color: isDark ? '#6b7280' : '#9ca3af',
        },
        textStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
      },
    ],
    series: seriesConfig,
    animationDuration: 500,
  };
}

function updateChart() {
  if (!chart) return;
  chart.setOption(getChartOption());
}

function handleResize() {
  chart?.resize();
}

onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value);
    updateChart();
    window.addEventListener('resize', handleResize);
    
    envStore.fetchHistory();
  }
});

watch(
  () => [envStore.history?.length || 0, envStore.state?.timestamp || 0],
  () => {
    updateChart();
  },
  { deep: false }
);

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chart?.dispose();
});
</script>

<style scoped>
.chart-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--color-border);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 20px;
}

.header-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.time-range {
  display: flex;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.range-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.range-btn:hover {
  color: var(--color-text-primary);
}

.range-btn.active {
  background: var(--color-accent);
  color: white;
}

.legend-toggle {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.legend-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
  opacity: 0.5;
}

.legend-btn.active {
  opacity: 1;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chart-container {
  width: 100%;
  height: 350px;
}
</style>
