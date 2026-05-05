<template>
  <div class="residual-plot-card card">
    <h3 class="card-title">残差分析</h3>
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import type { ResidualData } from '../types';

const props = defineProps<{
  data: ResidualData | null;
}>();

const chartRef = ref<HTMLElement | null>(null);
let chartInstance: ECharts | null = null;

const updateChart = () => {
  if (!chartInstance) return;

  if (!props.data || props.data.residuals.length === 0) {
    chartInstance.setOption({
      title: {
        text: '暂无残差数据\n请先训练模型',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', align: 'center' },
      },
    });
    return;
  }

  const { actual, predicted, residuals } = props.data;
  
  const scatterData = predicted.map((p, i) => [p, residuals[i]]);
  const minResidual = Math.min(...residuals);
  const maxResidual = Math.max(...residuals);
  const padding = Math.max(Math.abs(minResidual), Math.abs(maxResidual)) * 0.1;

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const idx = params.dataIndex;
        return `
          <div style="font-weight: bold;">样本 #${idx + 1}</div>
          <div>预测值: ¥${predicted[idx].toLocaleString()}</div>
          <div>实际值: ¥${actual[idx].toLocaleString()}</div>
          <div>残差: ¥${residuals[idx] > 0 ? '+' : ''}${residuals[idx].toLocaleString()}</div>
        `;
      },
    },
    grid: {
      left: '5%',
      right: '5%',
      top: '10%',
      bottom: '15%',
    },
    xAxis: {
      type: 'value',
      name: '预测值',
      nameLocation: 'middle',
      nameGap: 25,
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 10000) {
            return (value / 10000).toFixed(0) + '万';
          }
          return value.toFixed(0);
        },
      },
    },
    yAxis: {
      type: 'value',
      name: '残差',
      nameLocation: 'middle',
      nameGap: 30,
      min: minResidual - padding,
      max: maxResidual + padding,
      axisLabel: {
        formatter: (value: number) => {
          if (Math.abs(value) >= 10000) {
            return (value / 10000).toFixed(1) + '万';
          }
          return value.toFixed(0);
        },
      },
    },
    series: [
      {
        name: '残差点',
        type: 'scatter',
        data: scatterData,
        symbolSize: 8,
        itemStyle: {
          color: (params: any) => {
            const residual = params.value[1];
            return Math.abs(residual) > 20000 ? '#ff4d4f' : '#1890ff';
          },
          opacity: 0.7,
        },
      },
      {
        name: '零线',
        type: 'line',
        data: [
          [Math.min(...predicted), 0],
          [Math.max(...predicted), 0],
        ],
        lineStyle: {
          color: '#faad14',
          type: 'dashed',
          width: 2,
        },
        symbol: 'none',
        silent: true,
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        bottom: 20,
        style: {
          text: '理想情况下残差点应随机分布在零线两侧',
          fill: '#999',
          fontSize: 12,
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
