<template>
  <div class="feature-importance-card card">
    <h3 class="card-title">特征重要性分析</h3>
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import type { FeatureImportance } from '../types';

const props = defineProps<{
  data: FeatureImportance[] | null;
}>();

const chartRef = ref<HTMLElement | null>(null);
let chartInstance: ECharts | null = null;

const formatData = (data: FeatureImportance[] | null) => {
  if (!data || data.length === 0) return { names: [], values: [], coefficients: [] };
  
  const sorted = [...data].sort((a, b) => Math.abs(a.importance) - Math.abs(b.importance));
  
  return {
    names: sorted.map(d => d.display_name),
    values: sorted.map(d => Math.abs(d.importance)),
    coefficients: sorted.map(d => d.coefficient),
  };
};

const updateChart = () => {
  if (!chartInstance || !props.data) return;

  const { names, values, coefficients } = formatData(props.data);

  if (names.length === 0) {
    chartInstance.setOption({
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999' },
      },
    });
    return;
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const dataIndex = params[0].dataIndex;
        const coeff = coefficients[dataIndex];
        return `
          <div style="font-weight: bold;">${names[dataIndex]}</div>
          <div>重要性: ${values[dataIndex].toFixed(4)}</div>
          <div>系数: ${coeff > 0 ? '+' : ''}${coeff.toFixed(4)}</div>
          <div style="color: ${coeff > 0 ? '#52c41a' : '#ff4d4f'};">
            ${coeff > 0 ? '正向影响' : '负向影响'}
          </div>
        `;
      },
    },
    grid: {
      left: '3%',
      right: '10%',
      top: '3%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: '重要性',
      axisLabel: { formatter: '{value}' },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        fontSize: 12,
        color: '#333',
      },
    },
    series: [
      {
        name: '特征重要性',
        type: 'bar',
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color: coefficients[index] > 0 ? '#52c41a' : '#ff4d4f',
          },
        })),
        barWidth: '60%',
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => params.value.toFixed(4),
          fontSize: 11,
        },
      },
    ],
  };

  chartInstance.setOption(option);
};

const handleResize = () => {
  chartInstance?.resize();
};

onMounted(() => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
    updateChart();
    window.addEventListener('resize', handleResize);
  }
});

watch(
  () => props.data,
  () => {
    updateChart();
  },
  { deep: true }
);

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>
