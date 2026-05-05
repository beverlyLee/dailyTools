<template>
  <div class="scan-plot-container">
    <div class="scan-controls">
      <label class="form-label">显示变量:</label>
      <select v-model="selectedVarIndex" class="form-select" style="width: 150px">
        <option v-for="(v, i) in variables" :key="i" :value="i">{{ v }}</option>
      </select>
      <label class="form-label" style="margin-left: 16px">显示值类型:</label>
      <select v-model="valueType" class="form-select" style="width: 120px">
        <option value="final_state">最终状态</option>
        <option value="max_values">最大值</option>
        <option value="min_values">最小值</option>
        <option value="mean_values">平均值</option>
        <option value="std_steady_state">稳态标准差</option>
      </select>
    </div>
    <div ref="chartRef" class="chart-container" style="margin-top: 16px"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import type { ParameterScanData } from '../types';

const props = defineProps<{
  scanData: ParameterScanData;
}>();

const chartRef = ref<HTMLElement | null>(null);
let chart: ECharts | null = null;

const selectedVarIndex = ref(0);
const valueType = ref<'final_state' | 'max_values' | 'min_values' | 'mean_values' | 'std_steady_state'>('final_state');

const variables = computed(() => props.scanData.variables || []);
const scanParameter = computed(() => props.scanData.scan_parameter);

const colors = {
  line: '#3b82f6',
  error: '#ef4444',
  point: '#10b981'
};

const initChart = () => {
  if (!chartRef.value) return;
  
  chart = echarts.init(chartRef.value);
  updateChart();
};

const updateChart = () => {
  if (!chart || !props.scanData || !props.scanData.results) return;
  
  const results = props.scanData.results;
  const paramValues = props.scanData.parameter_values;
  
  const successData: { param: number; value: number }[] = [];
  const errorData: { param: number; value: number }[] = [];
  
  results.forEach((result, index) => {
    if (result.success) {
      const value = result[valueType.value]?.[selectedVarIndex.value];
      if (value !== undefined && !isNaN(value)) {
        successData.push({ param: paramValues[index], value });
      }
    } else {
      errorData.push({ param: paramValues[index], value: 0 });
    }
  });
  
  const option: echarts.EChartsOption = {
    title: {
      text: `参数 ${scanParameter.value} 扫描 - ${variables.value[selectedVarIndex.value]} (${getValueTypeName()})`,
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 600
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      formatter: (params: any) => {
        const data = params[0];
        return `${scanParameter.value}: ${data.value[0].toFixed(4)}<br/>${variables.value[selectedVarIndex.value]}: ${data.value[1].toFixed(6)}`;
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '15%',
      top: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: scanParameter.value,
      nameLocation: 'middle',
      nameGap: 30,
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
      name: `${variables.value[selectedVarIndex.value]} (${getValueTypeName()})`,
      nameLocation: 'middle',
      nameGap: 45,
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
        name: '成功',
        data: successData.map(d => [d.param, d.value]),
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 2,
          color: colors.line
        },
        itemStyle: {
          color: colors.point
        }
      }
    ]
  };
  
  chart.setOption(option, true);
};

const getValueTypeName = () => {
  const typeNames: Record<string, string> = {
    final_state: '最终状态',
    max_values: '最大值',
    min_values: '最小值',
    mean_values: '平均值',
    std_steady_state: '稳态标准差'
  };
  return typeNames[valueType.value] || valueType.value;
};

const handleResize = () => {
  chart?.resize();
};

watch([selectedVarIndex, valueType], () => {
  updateChart();
});

watch(() => props.scanData, () => {
  if (variables.value.length > 0) {
    selectedVarIndex.value = 0;
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
.scan-plot-container {
  width: 100%;
  height: 100%;
}

.scan-controls {
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
