<template>
  <div ref="chartRef" style="width: 100%; height: 100%;"></div>
</template>

<script>
import { defineComponent, ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'

export default defineComponent({
  name: 'EfficiencyChart',
  props: {
    overview: {
      type: Object,
      default: () => null
    }
  },
  setup(props) {
    const chartRef = ref(null)
    let chart = null

    const chartData = computed(() => {
      if (!props.overview) {
        return {
          efficiency: 0,
          productivity: 0,
          concentration: 0,
          overallScore: 0
        }
      }

      return {
        efficiency: props.overview.components?.efficiency || 0,
        productivity: props.overview.components?.productivity || 0,
        concentration: props.overview.components?.concentration || 0,
        overallScore: props.overview.overallScore || 0
      }
    })

    function initChart() {
      if (!chartRef.value) return

      chart = echarts.init(chartRef.value)
      updateChart()
    }

    function updateChart() {
      if (!chart) return

      const data = chartData.value
      const hasData = data.efficiency > 0 || data.productivity > 0 || data.concentration > 0

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}分 ({d}%)',
          backgroundColor: 'rgba(50, 50, 50, 0.9)',
          borderColor: '#333',
          borderWidth: 1,
          textStyle: {
            color: '#fff',
            fontSize: 13
          }
        },
        legend: {
          orient: 'vertical',
          right: '5%',
          top: 'center',
          data: ['效率评分', '生产力评分', '集中度评分'],
          textStyle: {
            color: '#666',
            fontSize: 13
          },
          itemWidth: 14,
          itemHeight: 14,
          itemGap: 20
        },
        series: [
          {
            name: '综合专注度',
            type: 'pie',
            radius: ['45%', '70%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 12,
              borderColor: '#fff',
              borderWidth: 3
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 28,
                fontWeight: 'bold',
                color: '#333',
                formatter: function() {
                  return hasData ? `${data.overallScore}分` : '暂无数据'
                },
                rich: {
                  a: {
                    color: '#999',
                    fontSize: 14,
                    lineHeight: 22
                  }
                }
              }
            },
            labelLine: {
              show: false
            },
            data: hasData ? [
              {
                value: data.efficiency,
                name: '效率评分',
                itemStyle: { 
                  color: '#667eea',
                  emphasis: {
                    shadowBlur: 15,
                    shadowColor: 'rgba(102, 126, 234, 0.5)'
                  }
                }
              },
              {
                value: data.productivity,
                name: '生产力评分',
                itemStyle: { 
                  color: '#4caf50',
                  emphasis: {
                    shadowBlur: 15,
                    shadowColor: 'rgba(76, 175, 80, 0.5)'
                  }
                }
              },
              {
                value: data.concentration,
                name: '集中度评分',
                itemStyle: { 
                  color: '#ff9800',
                  emphasis: {
                    shadowBlur: 15,
                    shadowColor: 'rgba(255, 152, 0, 0.5)'
                  }
                }
              }
            ] : [
              {
                value: 1,
                name: '暂无数据',
                itemStyle: { color: '#ddd' }
              }
            ]
          }
        ],
        graphic: [
          {
            type: 'text',
            left: '35%',
            top: '82%',
            style: {
              text: hasData ? '综合专注度构成' : '请导入数据以查看分析',
              textAlign: 'center',
              fill: '#999',
              fontSize: 13
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
      () => props.overview,
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
