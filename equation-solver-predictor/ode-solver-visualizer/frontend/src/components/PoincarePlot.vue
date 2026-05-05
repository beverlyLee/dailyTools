<template>
  <div class="poincare-container">
    <div v-if="analysis" class="poincare-info">
      <div class="poincare-info-item">
        <span class="poincare-info-label">数据点数:</span>
        <span class="poincare-info-value">{{ analysis.num_points }}</span>
      </div>
      <div class="poincare-info-item">
        <span class="poincare-info-label">独特点数:</span>
        <span class="poincare-info-value">{{ analysis.num_unique_points }}</span>
      </div>
      <div class="poincare-info-item">
        <span class="poincare-info-label">行为类型:</span>
        <span class="poincare-info-value" :class="getBehaviorClass(analysis.behavior)">{{ analysis.behavior }}</span>
      </div>
      <div class="poincare-info-item">
        <span class="poincare-info-label">描述:</span>
        <span class="poincare-info-value">{{ analysis.description }}</span>
      </div>
    </div>
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import type { PoincareAnalysis } from '../types';

const props = defineProps<{
  points: number[][];
  variables: string[];
  analysis: PoincareAnalysis | null;
}>();

const chartRef = ref<HTMLElement | null>(null);
let chart: ECharts | null = null;

const colors = {
  point: '#3b82f6',
  highlight: '#ef4444'
};

const getBehaviorClass = (behavior: string) => {
  switch (behavior) {
    case 'fixed_point':
      return 'behavior-fixed';
    case 'periodic':
      return 'behavior-periodic';
    case 'chaotic':
      return 'behavior-chaotic';
    case 'quasiperiodic':
      return 'behavior-quasiperiodic';
    default:
      return '';
  }
};

const is3D = computed(() => props.variables.length === 3);

const initChart = () => {
  if (!chartRef.value) return;
  
  chart = echarts.init(chartRef.value);
  updateChart();
};

const updateChart = () => {
  if (!chart || !props.points || props.points.length === 0) return;
  
  let option: echarts.EChartsOption;
  
  if (is3D.value) {
    option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        formatter: (params: any) => {
          return `索引: ${params.dataIndex}<br/>${props.variables[0]}: ${params.data[0].toFixed(4)}<br/>${props.variables[1]}: ${params.data[1].toFixed(4)}<br/>${props.variables[2] || 'z'}: ${params.data[2]?.toFixed(4) || '-'}`;
        }
      },
      xAxis3D: {
        name: props.variables[0],
        type: 'value'
      },
      yAxis3D: {
        name: props.variables[1],
        type: 'value'
      },
      zAxis3D: {
        name: props.variables[2] || 'z',
        type: 'value'
      },
      grid3D: {
        viewControl: {
          distance: 200,
          autoRotate: false
        }
      },
      series: [
        {
          type: 'scatter3D',
          data: props.points,
          symbolSize: 8,
          itemStyle: {
            color: colors.point,
            opacity: 0.7
          },
          emphasis: {
            itemStyle: {
              color: colors.highlight,
              opacity: 1
            }
          }
        }
      ]
    };
  } else {
    option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        formatter: (params: any) => {
          return `索引: ${params.dataIndex}<br/>${props.variables[0]}: ${params.data[0].toFixed(4)}<br/>${props.variables[1]}: ${params.data[1].toFixed(4)}`;
        }
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '8%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: props.variables[0],
        nameLocation: 'middle',
        nameGap: 25,
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
      yAxis: {
        type: 'value',
        name: props.variables[1],
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
      series: [
        {
          type: 'scatter',
          data: props.points,
          symbolSize: 10,
          itemStyle: {
            color: colors.point,
            opacity: 0.7
          },
          emphasis: {
            itemStyle: {
              color: colors.highlight,
              opacity: 1,
              shadowBlur: 10
            }
          }
        }
      ]
    };
  }
  
  chart.setOption(option, true);
};

const handleResize = () => {
  chart?.resize();
};

watch(() => [props.points, props.variables, props.analysis], () => {
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

<style scoped>
.poincare-container {
  width: 100%;
  height: 100%;
}

.poincare-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  margin-bottom: 16px;
}

.poincare-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.poincare-info-label {
  color: var(--text-secondary);
}

.poincare-info-value {
  font-weight: 500;
  color: var(--text-primary);
}

.behavior-fixed {
  color: #10b981;
}

.behavior-periodic {
  color: #3b82f6;
}

.behavior-chaotic {
  color: #ef4444;
}

.behavior-quasiperiodic {
  color: #f59e0b;
}
</style>
