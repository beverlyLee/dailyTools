<template>
  <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        票价趋势对比
      </h3>
      <div class="flex gap-2">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          二等座
        </span>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          一等座
        </span>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          商务座
        </span>
      </div>
    </div>
    <div ref="chartRef" class="w-full h-[320px]"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useTrainStore } from '@/stores/train'
import type { ECharts } from 'echarts'

const store = useTrainStore()
const chartRef = ref<HTMLElement | null>(null)
const chart = ref<ECharts | null>(null)
const echartsModule = ref<any>(null)

const trains = computed(() => store.trains)

async function loadECharts() {
  if (!echartsModule.value) {
    echartsModule.value = await import('echarts')
  }
  return echartsModule.value
}

async function initChart() {
  if (!chartRef.value) return
  
  const echarts = await loadECharts()
  chart.value = echarts.init(chartRef.value)
  await renderChart()
}

async function renderChart() {
  if (!chart.value || trains.value.length === 0) return

  const echarts = await loadECharts()
  const trainCodes = trains.value.map(t => t.trainCode)
  const secondPrices = trains.value.map(t => 
    t.prices?.find((p: any) => p.seatType === 'second')?.price || 0
  )
  const firstPrices = trains.value.map(t => 
    t.prices?.find((p: any) => p.seatType === 'first')?.price || 0
  )
  const businessPrices = trains.value.map(t => 
    t.prices?.find((p: any) => p.seatType === 'business')?.price || 0
  )

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#111827'
      }
    },
    legend: {
      show: false
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: trainCodes,
      axisLabel: {
        rotate: 0,
        color: '#374151',
        fontWeight: 500 as const
      },
      axisLine: {
        lineStyle: {
          color: '#e5e7eb'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '价格 (元)',
      nameTextStyle: {
        color: '#6b7280'
      },
      axisLabel: {
        color: '#6b7280'
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
          type: 'dashed' as const
        }
      }
    },
    series: [
      {
        name: '二等座',
        type: 'bar',
        data: secondPrices,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#60a5fa' },
            { offset: 1, color: '#3b82f6' }
          ]),
          borderRadius: [4, 4, 0, 0] as [number, number, number, number]
        },
        barWidth: '22%'
      },
      {
        name: '一等座',
        type: 'bar',
        data: firstPrices,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#34d399' },
            { offset: 1, color: '#10b981' }
          ]),
          borderRadius: [4, 4, 0, 0] as [number, number, number, number]
        },
        barWidth: '22%'
      },
      {
        name: '商务座',
        type: 'bar',
        data: businessPrices,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#fbbf24' },
            { offset: 1, color: '#f59e0b' }
          ]),
          borderRadius: [4, 4, 0, 0] as [number, number, number, number]
        },
        barWidth: '22%'
      }
    ]
  }

  chart.value.setOption(option)
}

function handleResize() {
  chart.value?.resize()
}

watch(trains, () => {
  nextTick(renderChart)
})

onMounted(() => {
  nextTick(() => {
    initChart()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart.value?.dispose()
})
</script>
