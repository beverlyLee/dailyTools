<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { FeatureImportance } from '../api'

interface Props {
  data: FeatureImportance[]
}

const props = defineProps<Props>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const featureNames: Record<string, string> = {
  year: '年份',
  gdp: 'GDP',
  population: '人口',
  interest_rate: '利率',
  inflation_rate: '通胀率',
  unemployment_rate: '失业率',
  construction_cost: '建筑成本',
  land_price: '土地价格'
}

const getFeatureName = (key: string): string => {
  return featureNames[key] || key
}

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
  
  const sortedData = [...props.data].sort((a, b) => b.importance_score - a.importance_score)
  
  const names = sortedData.map(item => getFeatureName(item.feature))
  const importanceValues = sortedData.map(item => (item.importance_score * 100).toFixed(1))
  const coefficients = sortedData.map(item => item.coefficient)
  
  const colors = coefficients.map(coef => 
    coef > 0 ? '#4ade80' : '#f87171'
  )
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const dataIndex = params[0].dataIndex
        const item = sortedData[dataIndex]
        return `
          <div style="font-weight: 600; margin-bottom: 8px;">${getFeatureName(item.feature)}</div>
          <div>重要性: ${(item.importance_score * 100).toFixed(1)}%</div>
          <div>回归系数: ${item.coefficient > 0 ? '+' : ''}${item.coefficient.toFixed(4)}</div>
          <div style="margin-top: 4px; font-size: 12px; color: #666;">
            ${item.coefficient > 0 ? '正相关：特征增加，房价上涨' : '负相关：特征增加，房价下跌'}
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '10%',
      top: '3%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '重要性 (%)',
      nameLocation: 'end',
      nameGap: 10,
      axisLabel: {
        formatter: '{value}%'
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        fontSize: 12,
        color: '#333'
      }
    },
    series: [
      {
        name: '重要性',
        type: 'bar',
        data: importanceValues.map((val, idx) => ({
          value: parseFloat(val),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: colors[idx] },
              { offset: 1, color: colors[idx] === '#4ade80' ? '#22c55e' : '#ef4444' }
            ]),
            borderRadius: [0, 4, 4, 0]
          }
        })),
        barWidth: '60%',
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          fontSize: 12,
          fontWeight: 600,
          color: '#667eea'
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
