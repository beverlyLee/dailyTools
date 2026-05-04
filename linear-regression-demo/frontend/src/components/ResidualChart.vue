<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { ResidualData } from '../api'

interface Props {
  data: ResidualData[]
}

const props = defineProps<Props>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  
  updateChart()
}

const updateChart = () => {
  if (!chartInstance || !props.data || props.data.length === 0) {
    if (chartInstance) {
      chartInstance.setOption({
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      })
    }
    return
  }
  
  const sortedData = [...props.data].sort((a, b) => a.actual - b.actual)
  
  const actualValues = sortedData.map(item => item.actual)
  const predictedValues = sortedData.map(item => item.predicted)
  const residuals = sortedData.map(item => item.residual)
  
  const sampleIndices = sortedData.map((_, idx) => `样本${idx + 1}`)
  
  const positiveResiduals = residuals.map(r => r > 0 ? r : null)
  const negativeResiduals = residuals.map(r => r < 0 ? r : null)
  
  const meanResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length
  const mse = residuals.reduce((a, b) => a + b * b, 0) / residuals.length
  const rmse = Math.sqrt(mse)
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
      type: 'cross'
    },
    formatter: (params: any) => {
      const dataIndex = params[0].dataIndex
      const item = sortedData[dataIndex]
      return `
        <div style="font-weight: 600; margin-bottom: 8px;">${sampleIndices[dataIndex]}</div>
        <div>实际房价: ${item.actual.toLocaleString()} 元/㎡</div>
        <div>预测房价: ${item.predicted.toLocaleString()} 元/㎡</div>
        <div style="margin-top: 4px; font-weight: 500; color: ${item.residual > 0 ? '#4ade80' : '#f87171'}">
          残差: ${item.residual > 0 ? '+' : ''}${item.residual.toFixed(2)}
        </div>
      `
    }
    },
    legend: {
      data: ['实际值', '预测值', '正残差', '负残差'],
      top: 0,
      textStyle: {
        fontSize: 12,
        color: '#666'
      }
    },
    grid: [
      {
        left: '5%',
        right: '5%',
        top: '10%',
        height: '35%'
      },
      {
        left: '5%',
        right: '5%',
        top: '55%',
        height: '35%'
      }
    ],
    xAxis: [
      {
        type: 'category',
        data: sampleIndices,
        gridIndex: 0,
        axisLabel: {
          show: false
        },
        axisTick: {
          show: false
        }
      },
      {
        type: 'category',
        data: sampleIndices,
        gridIndex: 1,
        axisLabel: {
          show: false
        },
        axisTick: {
          show: false
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '房价 (元/㎡)',
        nameLocation: 'end',
        nameGap: 10,
        gridIndex: 0,
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 10000) {
              return (value / 10000).toFixed(1) + '万'
            }
            return value.toString()
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f0f0f0'
          }
        }
      },
      {
        type: 'value',
        name: '残差',
        nameLocation: 'end',
        nameGap: 10,
        gridIndex: 1,
        splitLine: {
          lineStyle: {
            color: '#f0f0f0'
          }
        }
      }
    ],
    series: [
      {
        name: '实际值',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: actualValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#667eea',
          width: 2
        },
        itemStyle: {
          color: '#667eea'
        }
      },
      {
        name: '预测值',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: predictedValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#f59e0b',
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#f59e0b'
        }
      },
      {
        name: '正残差',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: positiveResiduals,
        itemStyle: {
          color: '#4ade80'
        }
      },
      {
        name: '负残差',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: negativeResiduals,
        itemStyle: {
          color: '#f87171'
        }
      }
    ],
    graphic: [
      {
        type: 'text',
        left: '5%',
        top: '52%',
        style: {
          text: `平均残差: ${meanResidual.toFixed(2)} | RMSE: ${rmse.toFixed(2)}`,
          fontSize: 12,
          fill: '#666'
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

watch(
  () => props.data,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true }
)

onMounted(() => {
  initChart()
  
  window.addEventListener('resize', () => {
    chartInstance?.resize()
  })
})
</script>

<template>
  <div ref="chartRef" class="chart-container"></div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
}
</style>
