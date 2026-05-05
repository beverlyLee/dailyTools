<template>
  <div class="peak-valley-analysis">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="info-card">
          <template #header>
            <span>峰谷平时段设置</span>
          </template>
          <div class="time-periods">
            <div class="period-item peak">
              <div class="period-header">
                <span class="period-name">峰时</span>
                <span class="period-price">{{ priceConfig.peak }}元/kWh</span>
              </div>
              <div class="period-time">{{ timeConfig.peak }}</div>
              <div class="period-hours">共 {{ getHours(timeConfig.peak) }} 小时</div>
            </div>
            <div class="period-item flat">
              <div class="period-header">
                <span class="period-name">平时</span>
                <span class="period-price">{{ priceConfig.flat }}元/kWh</span>
              </div>
              <div class="period-time">{{ timeConfig.flat }}</div>
              <div class="period-hours">共 {{ getHours(timeConfig.flat) }} 小时</div>
            </div>
            <div class="period-item valley">
              <div class="period-header">
                <span class="period-name">谷时</span>
                <span class="period-price">{{ priceConfig.valley }}元/kWh</span>
              </div>
              <div class="period-time">{{ timeConfig.valley }}</div>
              <div class="period-hours">共 {{ getHours(timeConfig.valley) }} 小时</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>24小时用电曲线</span>
              <el-date-picker
                v-model="selectedDate"
                type="date"
                placeholder="选择日期"
                size="small"
                style="width: 180px;"
              />
            </div>
          </template>
          <div class="chart-container" ref="lineChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>峰谷平用电占比</span>
          </template>
          <div class="chart-container" ref="barChartRef"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>峰谷平费用对比</span>
          </template>
          <div class="chart-container" ref="costChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="analysis-card">
          <template #header>
            <div class="card-header">
              <span>用电规律分析</span>
              <el-button type="primary" size="small" @click="exportReport">
                <el-icon><Download /></el-icon> 导出报告
              </el-button>
            </div>
          </template>
          <el-table :data="analysisData" stripe style="width: 100%">
            <el-table-column prop="period" label="时段" width="100">
              <template #default="scope">
                <el-tag :type="getPeriodTag(scope.row.period)" effect="dark">
                  {{ scope.row.period }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="timeRange" label="时间范围" width="200" />
            <el-table-column prop="electricity" label="用电量(kWh)" width="150">
              <template #default="scope">
                <span class="energy-value">{{ scope.row.electricity }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="percent" label="占比" width="100">
              <template #default="scope">
                <el-progress 
                  :percentage="scope.row.percent" 
                  :color="getProgressColor(scope.row.period)"
                  :stroke-width="15"
                />
              </template>
            </el-table-column>
            <el-table-column prop="cost" label="费用(元)" width="120">
              <template #default="scope">
                <span class="cost-value">¥{{ scope.row.cost }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="avgPower" label="平均功率(kW)" width="150" />
            <el-table-column prop="maxPower" label="最大功率(kW)" width="150" />
            <el-table-column prop="suggestion" label="优化建议">
              <template #default="scope">
                <el-popover
                  placement="top"
                  :width="300"
                  trigger="hover"
                  :content="scope.row.suggestion"
                >
                  <template #reference>
                    <el-button type="text" size="small">
                      <el-icon><InfoFilled /></el-icon> 查看
                    </el-button>
                  </template>
                </el-popover>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="insight-card">
          <template #header>
            <span>用电规律洞察</span>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="insight-item">
                <div class="insight-icon" style="background: rgba(103, 194, 58, 0.1);">
                  <el-icon :size="30" :color="'#67C23A'"><TrendCharts /></el-icon>
                </div>
                <div class="insight-info">
                  <div class="insight-title">峰谷用电特征</div>
                  <div class="insight-value">高峰时段集中在9:00-18:00</div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="insight-item">
                <div class="insight-icon" style="background: rgba(64, 158, 255, 0.1);">
                  <el-icon :size="30" :color="'#409EFF'"><Money /></el-icon>
                </div>
                <div class="insight-info">
                  <div class="insight-title">费用优化空间</div>
                  <div class="insight-value">可节省约 15% 电费支出</div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="insight-item">
                <div class="insight-icon" style="background: rgba(230, 162, 60, 0.1);">
                  <el-icon :size="30" :color="'#E6A23C'"><Bulb /></el-icon>
                </div>
                <div class="insight-info">
                  <div class="insight-title">移峰填谷建议</div>
                  <div class="insight-value">将部分负荷转移至谷时段</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Download, InfoFilled, TrendCharts, Money, Bulb } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

const lineChartRef = ref(null)
const barChartRef = ref(null)
const costChartRef = ref(null)
let lineChart = null
let barChart = null
let costChart = null

const selectedDate = ref(new Date())

const priceConfig = ref({
  peak: 1.028,
  flat: 0.648,
  valley: 0.288
})

const timeConfig = ref({
  peak: '09:00-12:00, 17:00-22:00',
  flat: '08:00-09:00, 12:00-17:00, 22:00-23:00',
  valley: '23:00-08:00'
})

const analysisData = ref([
  {
    period: '峰时',
    timeRange: '09:00-12:00, 17:00-22:00',
    electricity: 1456.8,
    percent: 59,
    cost: 1497.6,
    avgPower: 182.1,
    maxPower: 356.2,
    suggestion: '建议将非关键设备的运行时间调整至谷时段，减少高峰用电成本'
  },
  {
    period: '平时',
    timeRange: '08:00-09:00, 12:00-17:00, 22:00-23:00',
    electricity: 685.2,
    percent: 28,
    cost: 443.9,
    avgPower: 85.7,
    maxPower: 156.8,
    suggestion: '可适当调整部分可延迟任务至谷时段'
  },
  {
    period: '谷时',
    timeRange: '23:00-08:00',
    electricity: 316.5,
    percent: 13,
    cost: 91.2,
    avgPower: 35.2,
    maxPower: 78.6,
    suggestion: '鼓励增加谷时段用电，如夜间充电设备、数据处理等'
  }
])

const getHours = (timeStr) => {
  let total = 0
  const periods = timeStr.split(', ')
  periods.forEach(p => {
    const [start, end] = p.split('-')
    const [startHour] = start.split(':').map(Number)
    const [endHour] = end.split(':').map(Number)
    total += endHour > startHour ? endHour - startHour : 24 - startHour + endHour
  })
  return total
}

const getPeriodTag = (period) => {
  const tags = { '峰时': 'danger', '平时': 'warning', '谷时': 'success' }
  return tags[period] || 'info'
}

const getProgressColor = (period) => {
  const colors = { '峰时': '#F56C6C', '平时': '#E6A23C', '谷时': '#67C23A' }
  return colors[period] || '#909399'
}

const initLineChart = () => {
  if (!lineChartRef.value) return
  
  lineChart = echarts.init(lineChartRef.value)
  
  const hourData = Array.from({ length: 24 }, (_, i) => `${i}:00`)
  const powerData = [80, 60, 50, 40, 35, 30, 40, 80, 120, 180, 220, 250, 180, 200, 220, 240, 260, 300, 280, 250, 200, 150, 100, 90]
  
  const markAreas = [
    [{ xAxis: '9:00', itemStyle: { color: 'rgba(245, 108, 108, 0.2)' } }, { xAxis: '12:00' }],
    [{ xAxis: '17:00', itemStyle: { color: 'rgba(245, 108, 108, 0.2)' } }, { xAxis: '22:00' }],
    [{ xAxis: '23:00', itemStyle: { color: 'rgba(103, 194, 58, 0.2)' } }, { xAxis: '8:00' }]
  ]
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hourData
    },
    yAxis: {
      type: 'value',
      name: 'kW'
    },
    series: [
      {
        name: '功率',
        type: 'line',
        smooth: true,
        data: powerData,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
            ]
          }
        },
        markLine: {
          data: [
            { type: 'average', name: '平均值' },
            { yAxis: 200, name: '预警线', lineStyle: { color: '#E6A23C', type: 'dashed' } }
          ]
        },
        markArea: {
          silent: true,
          data: markAreas
        }
      }
    ]
  }
  
  lineChart.setOption(option)
}

const initBarChart = () => {
  if (!barChartRef.value) return
  
  barChart = echarts.init(barChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['用电量']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['峰时', '平时', '谷时']
    },
    yAxis: {
      type: 'value',
      name: 'kWh'
    },
    series: [
      {
        name: '用电量',
        type: 'bar',
        data: [
          { value: 1456.8, itemStyle: { color: '#F56C6C' } },
          { value: 685.2, itemStyle: { color: '#E6A23C' } },
          { value: 316.5, itemStyle: { color: '#67C23A' } }
        ],
        label: {
          show: true,
          position: 'top',
          formatter: '{c} kWh'
        }
      }
    ]
  }
  
  barChart.setOption(option)
}

const initCostChart = () => {
  if (!costChartRef.value) return
  
  costChart = echarts.init(costChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['实际费用', '优化后费用']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['峰时', '平时', '谷时']
    },
    yAxis: {
      type: 'value',
      name: '元'
    },
    series: [
      {
        name: '实际费用',
        type: 'bar',
        data: [1497.6, 443.9, 91.2],
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '优化后费用',
        type: 'bar',
        data: [1200, 380, 180],
        itemStyle: { color: '#67C23A' }
      }
    ]
  }
  
  costChart.setOption(option)
}

const exportReport = () => {
  ElMessage.success('峰谷平分析报告导出成功')
}

onMounted(() => {
  initLineChart()
  initBarChart()
  initCostChart()
  
  window.addEventListener('resize', () => {
    lineChart?.resize()
    barChart?.resize()
    costChart?.resize()
  })
})
</script>

<style scoped>
.peak-valley-analysis {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-card, .chart-card, .analysis-card, .insight-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.time-periods {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.period-item {
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid;
}

.period-item.peak {
  background: rgba(245, 108, 108, 0.05);
  border-left-color: #F56C6C;
}

.period-item.flat {
  background: rgba(230, 162, 60, 0.05);
  border-left-color: #E6A23C;
}

.period-item.valley {
  background: rgba(103, 194, 58, 0.05);
  border-left-color: #67C23A;
}

.period-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.period-name {
  font-size: 16px;
  font-weight: bold;
}

.period-price {
  font-size: 14px;
  color: #E6A23C;
  font-weight: bold;
}

.period-time {
  font-size: 13px;
  color: #606266;
}

.period-hours {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.chart-container {
  height: 300px;
}

.energy-value, .cost-value {
  font-weight: bold;
}

.cost-value {
  color: #E6A23C;
}

.insight-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.insight-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.insight-title {
  font-size: 14px;
  color: #909399;
}

.insight-value {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-top: 5px;
}
</style>
