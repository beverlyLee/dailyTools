<template>
  <div class="energy-dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card electricity">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#409EFF'"><Lightning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ energyStats.electricity.value }}</div>
              <div class="stat-unit">{{ energyStats.electricity.unit }}</div>
              <div class="stat-label">今日用电</div>
            </div>
          </div>
          <div class="stat-trend" :class="energyStats.electricity.trend">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ energyStats.electricity.change }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card water">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#67C23A'"><WaterTank /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ energyStats.water.value }}</div>
              <div class="stat-unit">{{ energyStats.water.unit }}</div>
              <div class="stat-label">今日用水</div>
            </div>
          </div>
          <div class="stat-trend" :class="energyStats.water.trend">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ energyStats.water.change }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card gas">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#E6A23C'"><Fire /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ energyStats.gas.value }}</div>
              <div class="stat-unit">{{ energyStats.gas.unit }}</div>
              <div class="stat-label">今日用气</div>
            </div>
          </div>
          <div class="stat-trend" :class="energyStats.gas.trend">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ energyStats.gas.change }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card cost">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="40" :color="'#909399'"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ energyStats.cost.value }}</div>
              <div class="stat-unit"></div>
              <div class="stat-label">今日费用</div>
            </div>
          </div>
          <div class="stat-trend" :class="energyStats.cost.trend">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ energyStats.cost.change }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>能耗趋势分析</span>
              <el-radio-group v-model="timeRange" size="small">
                <el-radio-button label="day">今日</el-radio-button>
                <el-radio-button label="week">本周</el-radio-button>
                <el-radio-button label="month">本月</el-radio-button>
                <el-radio-button label="year">本年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" ref="trendChartRef"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span>能耗占比</span>
          </template>
          <div class="chart-container" ref="pieChartRef"></div>
          <div class="pie-legend">
            <div class="legend-item" v-for="item in pieData" :key="item.name">
              <span class="dot" :style="{ background: item.itemStyle.color }"></span>
              <span>{{ item.name }}</span>
              <span class="value">{{ item.value }}</span>
              <span class="percent">{{ item.percent }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="building-card">
          <template #header>
            <div class="card-header">
              <span>各建筑能耗统计</span>
              <div class="filters">
                <el-select v-model="selectedBuilding" placeholder="选择建筑" size="small" clearable style="width: 150px;">
                  <el-option label="全部" value="" />
                  <el-option label="A栋" value="A" />
                  <el-option label="B栋" value="B" />
                  <el-option label="C栋" value="C" />
                </el-select>
                <el-select v-model="selectedEnergyType" placeholder="能源类型" size="small" clearable style="width: 130px; margin-left: 10px;">
                  <el-option label="全部" value="" />
                  <el-option label="用电" value="electricity" />
                  <el-option label="用水" value="water" />
                  <el-option label="用气" value="gas" />
                </el-select>
              </div>
            </div>
          </template>
          <el-table :data="buildingEnergyData" stripe style="width: 100%">
            <el-table-column prop="building" label="建筑名称" width="120" />
            <el-table-column label="用电" width="180">
              <template #default="scope">
                <div class="energy-row">
                  <span class="value">{{ scope.row.electricity.value }}</span>
                  <span class="unit">kWh</span>
                  <span class="trend" :class="scope.row.electricity.trend">
                    {{ scope.row.electricity.trend === 'up' ? '↑' : '↓' }}
                    {{ scope.row.electricity.change }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用水" width="180">
              <template #default="scope">
                <div class="energy-row">
                  <span class="value">{{ scope.row.water.value }}</span>
                  <span class="unit">m³</span>
                  <span class="trend" :class="scope.row.water.trend">
                    {{ scope.row.water.trend === 'up' ? '↑' : '↓' }}
                    {{ scope.row.water.change }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用气" width="180">
              <template #default="scope">
                <div class="energy-row">
                  <span class="value">{{ scope.row.gas.value }}</span>
                  <span class="unit">m³</span>
                  <span class="trend" :class="scope.row.gas.trend">
                    {{ scope.row.gas.trend === 'up' ? '↑' : '↓' }}
                    {{ scope.row.gas.change }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="费用" width="120">
              <template #default="scope">
                <span class="cost">¥{{ scope.row.cost }}</span>
              </template>
            </el-table-column>
            <el-table-column label="排名" width="80">
              <template #default="scope">
                <el-tag v-if="scope.$index === 0" type="danger" effect="dark">第1</el-tag>
                <el-tag v-else-if="scope.$index === 1" type="warning" effect="dark">第2</el-tag>
                <el-tag v-else-if="scope.$index === 2" type="primary" effect="dark">第3</el-tag>
                <span v-else>第{{ scope.$index + 1 }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { 
  Lightning, 
  WaterTank, 
  Fire, 
  Money, 
  TrendCharts 
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { energyApi } from '../../api'

const trendChartRef = ref(null)
const pieChartRef = ref(null)
let trendChart = null
let pieChart = null

const timeRange = ref('day')
const selectedBuilding = ref('')
const selectedEnergyType = ref('')
const loading = ref(false)

const energyStats = ref({
  electricity: { value: '0', unit: 'kWh', trend: 'stable', change: '0%' },
  water: { value: '0', unit: 'm³', trend: 'stable', change: '0%' },
  gas: { value: '0', unit: 'm³', trend: 'stable', change: '0%' },
  cost: { value: '0', unit: '', trend: 'stable', change: '0%' }
})

const pieData = ref([])

const buildingEnergyData = ref([])

const loadOverview = async () => {
  loading.value = true
  try {
    const data = await energyApi.getOverview({ timeRange: timeRange.value })
    if (data.stats) {
      energyStats.value = data.stats
    }
    if (data.pieData) {
      pieData.value = data.pieData
    }
  } catch (error) {
    console.error('加载能耗概览失败:', error)
    energyStats.value = {
      electricity: { value: '2,458.5', unit: 'kWh', trend: 'down', change: '-12.5%' },
      water: { value: '156.8', unit: 'm³', trend: 'down', change: '-8.3%' },
      gas: { value: '89.2', unit: 'm³', trend: 'up', change: '+5.2%' },
      cost: { value: '3,256.8', unit: '', trend: 'down', change: '-10.1%' }
    }
    pieData.value = [
      { name: '用电', value: 2458, percent: '65%', itemStyle: { color: '#409EFF' } },
      { name: '用水', value: 560, percent: '15%', itemStyle: { color: '#67C23A' } },
      { name: '用气', value: 450, percent: '12%', itemStyle: { color: '#E6A23C' } },
      { name: '其他', value: 320, percent: '8%', itemStyle: { color: '#909399' } }
    ]
  } finally {
    loading.value = false
  }
}

const loadBuildingStats = async () => {
  try {
    const data = await energyApi.getBuildingStats({
      building: selectedBuilding.value,
      energyType: selectedEnergyType.value
    })
    buildingEnergyData.value = data
  } catch (error) {
    console.error('加载建筑能耗失败:', error)
    buildingEnergyData.value = [
      { building: 'A栋', electricity: { value: '856.2', trend: 'down', change: '5.2%' }, water: { value: '45.6', trend: 'up', change: '3.1%' }, gas: { value: '28.5', trend: 'down', change: '2.8%' }, cost: 1256.5 },
      { building: 'B栋', electricity: { value: '752.8', trend: 'up', change: '2.5%' }, water: { value: '38.2', trend: 'down', change: '1.5%' }, gas: { value: '25.3', trend: 'up', change: '4.2%' }, cost: 1089.3 },
      { building: 'C栋', electricity: { value: '542.6', trend: 'down', change: '8.3%' }, water: { value: '32.5', trend: 'down', change: '4.2%' }, gas: { value: '18.9', trend: 'down', change: '6.1%' }, cost: 785.2 }
    ]
  }
}

const initTrendChart = async () => {
  if (!trendChartRef.value) return
  
  try {
    const data = await energyApi.getTrend({ timeRange: timeRange.value })
    if (trendChart) {
      trendChart.dispose()
    }
    
    trendChart = echarts.init(trendChartRef.value)
    
    const option = {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['用电', '用水', '用气']
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
        data: data.xAxis || ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '用电',
          type: 'line',
          smooth: true,
          data: data.electricity || [120, 80, 250, 320, 280, 300, 180],
          itemStyle: { color: '#409EFF' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
                { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
              ]
            }
          }
        },
        {
          name: '用水',
          type: 'line',
          smooth: true,
          data: data.water || [20, 15, 35, 45, 38, 42, 25],
          itemStyle: { color: '#67C23A' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
                { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
              ]
            }
          }
        },
        {
          name: '用气',
          type: 'line',
          smooth: true,
          data: data.gas || [10, 8, 15, 25, 20, 18, 12],
          itemStyle: { color: '#E6A23C' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(230, 162, 60, 0.3)' },
                { offset: 1, color: 'rgba(230, 162, 60, 0.05)' }
              ]
            }
          }
        }
      ]
    }
    
    trendChart.setOption(option)
  } catch (error) {
    console.error('加载趋势数据失败:', error)
  }
}

const initPieChart = () => {
  if (!pieChartRef.value) return
  
  pieChart = echarts.init(pieChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '能耗占比',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: pieData.value
      }
    ]
  }
  
  pieChart.setOption(option)
}

watch(timeRange, () => {
  loadOverview()
  initTrendChart()
})

watch([selectedBuilding, selectedEnergyType], () => {
  loadBuildingStats()
})

onMounted(async () => {
  await loadOverview()
  await initTrendChart()
  await loadBuildingStats()
  initPieChart()
  
  window.addEventListener('resize', () => {
    trendChart?.resize()
    pieChart?.resize()
  })
})
</script>

<style scoped>
.energy-dashboard {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filters {
  display: flex;
  align-items: center;
}

.stat-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.stat-card.electricity .stat-icon { background: rgba(64, 158, 255, 0.1); }
.stat-card.water .stat-icon { background: rgba(103, 194, 58, 0.1); }
.stat-card.gas .stat-icon { background: rgba(230, 162, 60, 0.1); }
.stat-card.cost .stat-icon { background: rgba(144, 147, 153, 0.1); }

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-unit {
  font-size: 12px;
  color: #909399;
  margin-left: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.stat-trend.up {
  color: #F56C6C;
}

.stat-trend.down {
  color: #67C23A;
}

.chart-card, .building-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chart-container {
  height: 300px;
}

.pie-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.value {
  color: #303133;
  font-weight: bold;
}

.percent {
  color: #909399;
}

.energy-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.energy-row .value {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.energy-row .unit {
  font-size: 12px;
  color: #909399;
}

.energy-row .trend {
  font-size: 12px;
}

.energy-row .trend.up {
  color: #F56C6C;
}

.energy-row .trend.down {
  color: #67C23A;
}

.cost {
  font-size: 16px;
  font-weight: bold;
  color: #E6A23C;
}
</style>
