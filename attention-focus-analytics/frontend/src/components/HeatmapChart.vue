<template>
  <div ref="chartRef" style="width: 100%; height: 100%;"></div>
</template>

<script>
import { defineComponent, ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'

export default defineComponent({
  name: 'HeatmapChart',
  props: {
    data: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const chartRef = ref(null)
    let chart = null

    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`)

    const heatmapData = computed(() => {
      if (!props.data || props.data.length === 0) {
        return []
      }
      return props.data.map(([day, hour, value]) => [day, hour, value])
    })

    const maxValue = computed(() => {
      if (!heatmapData.value || heatmapData.value.length === 0) {
        return 10
      }
      const values = heatmapData.value.map(d => d[2])
      const max = Math.max(...values)
      return max > 0 ? Math.ceil(max) : 10
    })

    function initChart() {
      if (!chartRef.value) return

      chart = echarts.init(chartRef.value)
      updateChart()
    }

    function updateChart() {
      if (!chart) return

      const option = {
        tooltip: {
          position: 'top',
          backgroundColor: 'rgba(50, 50, 50, 0.9)',
          borderColor: '#333',
          borderWidth: 1,
          padding: [10, 15],
          textStyle: {
            color: '#fff',
            fontSize: 13
          },
          formatter: function(params) {
            const day = days[params.data[0]]
            const hour = params.data[1]
            const value = params.data[2].toFixed(2)
            return `${day} ${hour}:00 - ${hour + 1}:00<br/><span style="color:#66ccff;">专注强度: ${value}</span>`
          }
        },
        grid: {
          left: 80,
          right: 40,
          top: 40,
          bottom: 80
        },
        xAxis: {
          type: 'category',
          data: hours,
          splitArea: {
            show: true
          },
          axisLabel: {
            interval: 3,
            fontSize: 11,
            color: '#666',
            rotate: 0
          },
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          }
        },
        yAxis: {
          type: 'category',
          data: days,
          splitArea: {
            show: true
          },
          axisLabel: {
            fontSize: 12,
            color: '#666'
          },
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          }
        },
        visualMap: {
          min: 0,
          max: maxValue.value,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 15,
          itemWidth: 200,
          itemHeight: 20,
          inRange: {
            color: [
              '#e0f3f8',
              '#abd9e9',
              '#74add1',
              '#4575b4',
              '#313695'
            ]
          },
          text: ['高', '低'],
          textStyle: {
            color: '#666',
            fontSize: 11
          }
        },
        series: [
          {
            name: '专注强度',
            type: 'heatmap',
            data: heatmapData.value,
            label: {
              show: false
            },
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 15,
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: '#666',
                borderWidth: 2
              }
            }
          }
        ]
      }

      chart.setOption(option, true)
    }

    function handleResize() {
      if (chart) {
        chart.resize()
      }
    }

    onMounted(() => {
      initChart()
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      if (chart) {
        chart.dispose()
      }
      window.removeEventListener('resize', handleResize)
    })

    watch(
      () => props.data,
      () => {
        updateChart()
      },
      { deep: true }
    )

    return {
      chartRef
    }
  }
})
</script>
