<template>
  <div class="phase-portrait-container">
    <div v-if="variables.length === 3" class="phase-3d-controls">
      <label class="form-label">X轴变量:</label>
      <select v-model="xVarIndex" class="form-select" style="width: 120px">
        <option v-for="(v, i) in variables" :key="i" :value="i">{{ v }}</option>
      </select>
      <label class="form-label" style="margin-left: 16px">Y轴变量:</label>
      <select v-model="yVarIndex" class="form-select" style="width: 120px">
        <option v-for="(v, i) in variables" :key="i" :value="i">{{ v }}</option>
      </select>
      <label class="form-label" style="margin-left: 16px">Z轴变量:</label>
      <select v-model="zVarIndex" class="form-select" style="width: 120px">
        <option v-for="(v, i) in variables" :key="i" :value="i">{{ v }}</option>
      </select>
    </div>
    <div v-else class="phase-2d-controls">
      <label class="form-label">X轴变量:</label>
      <select v-model="xVarIndex" class="form-select" style="width: 120px">
        <option v-for="(v, i) in variables" :key="i" :value="i">{{ v }}</option>
      </select>
      <label class="form-label" style="margin-left: 16px">Y轴变量:</label>
      <select v-model="yVarIndex" class="form-select" style="width: 120px">
        <option v-for="(v, i) in variables" :key="i" :value="i">{{ v }}</option>
      </select>
    </div>
    <div ref="chartRef" class="chart-container" style="margin-top: 16px"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';

const props = defineProps<{
  states: number[][];
  variables: string[];
}>();

const chartRef = ref<HTMLElement | null>(null);
let chart: ECharts | null = null;

const xVarIndex = ref(0);
const yVarIndex = ref(1);
const zVarIndex = ref(2);

const is3D = computed(() => props.variables.length === 3);

const colors = {
  line: '#3b82f6',
  start: '#10b981',
  end: '#ef4444'
};

const initChart = () => {
  if (!chartRef.value) return;
  
  chart = echarts.init(chartRef.value);
  updateChart();
};

const updateChart = () => {
  if (!chart || !props.states || props.states.length === 0) return;
  
  let option: echarts.EChartsOption;
  
  if (is3D.value) {
    const points3D = props.states.map((s) => [
      s[xVarIndex.value],
      s[yVarIndex.value],
      s[zVarIndex.value]
    ]);
    
    option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        formatter: (params: any) => {
          if (params.dataIndex === 0) {
            return `起点<br/>${props.variables[xVarIndex.value]}: ${params.data[0].toFixed(4)}<br/>${props.variables[yVarIndex.value]}: ${params.data[1].toFixed(4)}<br/>${props.variables[zVarIndex.value]}: ${params.data[2].toFixed(4)}`;
          }
          if (params.dataIndex === props.states.length - 1) {
            return `终点<br/>${props.variables[xVarIndex.value]}: ${params.data[0].toFixed(4)}<br/>${props.variables[yVarIndex.value]}: ${params.data[1].toFixed(4)}<br/>${props.variables[zVarIndex.value]}: ${params.data[2].toFixed(4)}`;
          }
          return `${props.variables[xVarIndex.value]}: ${params.data[0].toFixed(4)}<br/>${props.variables[yVarIndex.value]}: ${params.data[1].toFixed(4)}<br/>${props.variables[zVarIndex.value]}: ${params.data[2].toFixed(4)}`;
        }
      },
      xAxis3D: {
        name: props.variables[xVarIndex.value],
        type: 'value'
      },
      yAxis3D: {
        name: props.variables[yVarIndex.value],
        type: 'value'
      },
      zAxis3D: {
        name: props.variables[zVarIndex.value],
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
          type: 'line3D',
          data: points3D,
          lineStyle: {
            width: 2,
            color: colors.line,
            opacity: 0.8
          },
          emphasis: {
            disabled: true
          }
        },
        {
          type: 'scatter3D',
          name: '起点',
          data: [points3D[0]],
          symbolSize: 15,
          itemStyle: {
            color: colors.start
          }
        },
        {
          type: 'scatter3D',
          name: '终点',
          data: [points3D[points3D.length - 1]],
          symbolSize: 15,
          itemStyle: {
            color: colors.end
          }
        }
      ]
    };
  } else {
    const points2D = props.states.map((s) => [
      s[xVarIndex.value],
      s[yVarIndex.value]
    ]);
    
    option = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        formatter: (params: any) => {
          if (params.dataIndex === 0) {
            return `起点<br/>${props.variables[xVarIndex.value]}: ${params.data[0].toFixed(4)}<br/>${props.variables[yVarIndex.value]}: ${params.data[1].toFixed(4)}`;
          }
          if (params.dataIndex === props.states.length - 1) {
            return `终点<br/>${props.variables[xVarIndex.value]}: ${params.data[0].toFixed(4)}<br/>${props.variables[yVarIndex.value]}: ${params.data[1].toFixed(4)}`;
          }
          return `${props.variables[xVarIndex.value]}: ${params.data[0].toFixed(4)}<br/>${props.variables[yVarIndex.value]}: ${params.data[1].toFixed(4)}`;
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
        name: props.variables[xVarIndex.value],
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
        name: props.variables[yVarIndex.value],
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
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: colors.line
          },
          data: points2D,
          emphasis: {
            disabled: true
          }
        },
        {
          type: 'scatter',
          name: '起点',
          data: [points2D[0]],
          symbolSize: 12,
          itemStyle: {
            color: colors.start
          }
        },
        {
          type: 'scatter',
          name: '终点',
          data: [points2D[points2D.length - 1]],
          symbolSize: 12,
          itemStyle: {
            color: colors.end
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

watch([xVarIndex, yVarIndex, zVarIndex], () => {
  updateChart();
});

watch(() => [props.states, props.variables], () => {
  if (props.variables.length > 0) {
    xVarIndex.value = 0;
    yVarIndex.value = props.variables.length >= 2 ? 1 : 0;
    zVarIndex.value = props.variables.length >= 3 ? 2 : 0;
  }
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
.phase-portrait-container {
  width: 100%;
  height: 100%;
}

.phase-2d-controls,
.phase-3d-controls {
  display: flex;
  align-items: center;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-right: 8px;
}

.form-select {
  padding: 6px 10px;
  font-size: 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
}
</style>
