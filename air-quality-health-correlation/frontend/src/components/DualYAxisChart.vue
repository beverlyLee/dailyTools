<template>
  <div ref="chartRef" :style="{ height: height, width: '100%', minHeight: height }"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  chartData: {
    type: Object,
    default: () => ({ dates: [], aqiData: [], pm25Data: [], sickData: [] })
  },
  height: {
    type: String,
    default: '500px'
  },
  title: {
    type: String,
    default: '空气质量与健康关联分析'
  }
})

const chartRef = ref(null)
let chartInstance = null

const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    updateChart()
    window.addEventListener('resize', handleResize)
  }
}

const updateChart = () => {
  if (!chartInstance || !props.chartData) return

  const { dates, aqiData, pm25Data, sickData } = props.chartData
  
  if (!dates || dates.length === 0) {
    const emptyOption = {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: {
          fontSize: 16,
          color: '#90a4ae'
        }
      }
    }
    chartInstance.setOption(emptyOption, true)
    return
  }

  const sickPoints = sickData.map((isSick, index) => {
    if (isSick && aqiData[index] !== null && aqiData[index] !== undefined) {
      return {
        value: [dates[index], aqiData[index]],
        itemStyle: { color: '#e53935' }
      }
    }
    return null
  }).filter(Boolean)

  const hasDataZoom = dates.length > 20

  const option = {
    backgroundColor: 'transparent',
    title: props.title ? {
      text: props.title,
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: '#1a237e'
      }
    } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#1e88e5'
        }
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e3f2fd',
      borderWidth: 1,
      textStyle: {
        color: '#37474f'
      },
      padding: [12, 16],
      formatter: (params) => {
        let result = `<div style="font-weight: 600; margin-bottom: 8px; color: #1a237e; font-size: 14px;">${params[0]?.axisValue}</div>`
        
        params.forEach(param => {
          let color = param.color
          let value = param.value
          let name = param.seriesName
          
          if (param.seriesName === '生病标记' && param.data) {
            result += `<div style="display: flex; align-items: center; margin: 4px 0; padding: 4px 0;">
              <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${color}; margin-right: 8px; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
              <span style="color: #37474f;">${name}: 生病</span>
            </div>`
          } else if (value !== null && value !== undefined) {
            const displayValue = typeof value === 'object' ? value[1] : value
            result += `<div style="display: flex; align-items: center; margin: 4px 0; padding: 4px 0;">
              <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${color}; margin-right: 8px;"></span>
              <span style="color: #37474f; margin-right: 8px;">${name}:</span>
              <span style="font-weight: 600; color: #1a237e;">${displayValue}</span>
            </div>`
          }
        })
        
        return result
      }
    },
    legend: {
      data: ['AQI 指数', 'PM2.5 浓度', '生病日期'],
      top: props.title ? 45 : 15,
      left: 'center',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        fontSize: 13,
        color: '#546e7a'
      },
      itemGap: 25
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: hasDataZoom ? 80 : '8%',
      top: props.title ? 90 : 60,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#cfd8dc'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#78909c',
        fontSize: 11,
        rotate: dates.length > 15 ? 45 : 0,
        interval: Math.max(0, Math.floor(dates.length / 12)),
        margin: 12,
        formatter: (value) => {
          if (value) {
            const parts = value.split('-')
            return `${parts[1]}-${parts[2]}`
          }
          return value
        }
      },
      splitLine: {
        show: false
      }
    },
    yAxis: [
      {
        type: 'value',
        name: 'AQI 指数',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: {
          fontSize: 13,
          color: '#1e88e5',
          fontWeight: 500
        },
        position: 'left',
        min: 0,
        max: 500,
        interval: 50,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f5f5f5',
            type: 'dashed'
          }
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#cfd8dc'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#78909c',
          fontSize: 11,
          formatter: '{value}'
        }
      },
      {
        type: 'value',
        name: 'PM2.5 (μg/m³)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontSize: 13,
          color: '#26a69a',
          fontWeight: 500
        },
        position: 'right',
        min: 0,
        max: 250,
        interval: 25,
        splitLine: {
          show: false
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#cfd8dc'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#78909c',
          fontSize: 11,
          formatter: '{value}'
        }
      }
    ],
    series: [
      {
        name: 'AQI 指数',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        yAxisIndex: 0,
        data: aqiData,
        lineStyle: {
          color: '#1e88e5',
          width: 3
        },
        itemStyle: {
          color: '#1e88e5',
          borderWidth: 2,
          borderColor: '#fff'
        },
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(30, 136, 229, 0.25)' },
            { offset: 0.5, color: 'rgba(30, 136, 229, 0.1)' },
            { offset: 1, color: 'rgba(30, 136, 229, 0.02)' }
          ])
        },
        markArea: {
          silent: true,
          data: [
            [
              { yAxis: 0, itemStyle: { color: 'rgba(0, 228, 0, 0.08)', borderWidth: 0 } },
              { yAxis: 50 }
            ],
            [
              { yAxis: 50, itemStyle: { color: 'rgba(255, 255, 0, 0.08)', borderWidth: 0 } },
              { yAxis: 100 }
            ],
            [
              { yAxis: 100, itemStyle: { color: 'rgba(255, 126, 0, 0.08)', borderWidth: 0 } },
              { yAxis: 150 }
            ],
            [
              { yAxis: 150, itemStyle: { color: 'rgba(255, 0, 0, 0.08)', borderWidth: 0 } },
              { yAxis: 200 }
            ],
            [
              { yAxis: 200, itemStyle: { color: 'rgba(153, 0, 76, 0.08)', borderWidth: 0 } },
              { yAxis: 300 }
            ],
            [
              { yAxis: 300, itemStyle: { color: 'rgba(126, 0, 35, 0.08)', borderWidth: 0 } },
              { yAxis: 500 }
            ]
          ]
        }
      },
      {
        name: 'PM2.5 浓度',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        yAxisIndex: 1,
        data: pm25Data,
        lineStyle: {
          color: '#26a69a',
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#26a69a',
          borderWidth: 2,
          borderColor: '#fff'
        },
        symbol: 'diamond',
        symbolSize: 5
      },
      {
        name: '生病日期',
        type: 'scatter',
        yAxisIndex: 0,
        data: sickPoints,
        symbolSize: 18,
        symbol: 'circle',
        itemStyle: {
          color: '#e53935',
          borderColor: '#fff',
          borderWidth: 3,
          shadowBlur: 8,
          shadowColor: 'rgba(229, 57, 53, 0.4)'
        },
        emphasis: {
          scale: 1.6,
          itemStyle: {
            shadowBlur: 15,
            shadowColor: 'rgba(229, 57, 53, 0.6)'
          }
        },
        zlevel: 10
      }
    ],
    dataZoom: hasDataZoom ? [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        bottom: 15,
        height: 25,
        borderColor: '#e3f2fd',
        fillerColor: 'rgba(30, 136, 229, 0.2)',
        handleStyle: {
          color: '#1e88e5',
          borderColor: '#fff',
          borderWidth: 2
        },
        textStyle: {
          color: '#78909c',
          fontSize: 10
        },
        dataBackground: {
          lineStyle: {
            color: '#bbdefb'
          },
          areaStyle: {
            color: 'rgba(187, 222, 251, 0.3)'
          }
        }
      }
    ] : undefined
  }

  chartInstance.setOption(option, true)
}

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

watch(
  () => props.chartData,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true }
)

watch(
  () => props.height,
  () => {
    nextTick(() => {
      if (chartInstance) {
        chartInstance.resize()
      }
    })
  }
)

onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    window.removeEventListener('resize', handleResize)
  }
})
</script>
