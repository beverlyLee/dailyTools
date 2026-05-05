<template>
  <div ref="chartRef" class="chart-container"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';

const props = defineProps<{
  time: number[];
  states: number[][];
  variables: string[];
}>();

const chartRef = ref<HTMLElement | null>(null);
let chart: ECharts | null = null;

const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const initChart = () => {
  if (!chartRef.value) return;
  
  chart = echarts.init(chartRef.value);
  updateChart();
};

const updateChart = () => {
  if (!chart || !props.time || !props.states || !props.variables) return;
  
  const series = props.variables.map((variable, index) => ({
    name: variable,
    type: 'line',
    smooth: true,
    showSymbol: false,
    lineStyle: {
      width: 2,
      color: colors[index % colors.length]
    },
    data: props.states.map((state) => state[index])
  }));
  
  const option = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: '#1e293b'
      }
    },
    legend: {
      data: props.variables,
      top: 0,
      right: 20
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      name: '时间 t',
      nameLocation: 'middle',
      nameGap: 25,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#cbd5e1'
        }
      },
      data: props.time.map((t, i) => i % Math.ceil(props.time.length / 20) === 0 ? t.toFixed(2) : '')
    },
    yAxis: {
      type: 'value',
      name: '状态值',
      nameLocation: 'middle',
      nameGap: 35,
      axisLine: {
        lineStyle: {
          color: '#cbd5e1'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed'
        }
      }
    },
    series
  };
  
  chart.setOption(option, true);
};

const handleResize = () => {
  chart?.resize();
};

watch(() => [props.time, props.states, props.variables], () => {
  updateChart();
}, { deep: true });

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chart?.dispose();
});
</script>
