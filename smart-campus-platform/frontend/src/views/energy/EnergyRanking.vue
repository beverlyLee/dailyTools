<template>
  <div class="energy-ranking">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card class="ranking-card">
          <template #header>
            <div class="card-header">
              <span>建筑能耗排名</span>
              <div class="filters">
                <el-radio-group v-model="selectedPeriod" size="small">
                  <el-radio-button label="day">今日</el-radio-button>
                  <el-radio-button label="week">本周</el-radio-button>
                  <el-radio-button label="month">本月</el-radio-button>
                  <el-radio-button label="year">本年</el-radio-button>
                </el-radio-group>
                <el-select v-model="selectedEnergyType" size="small" placeholder="能源类型" style="width: 120px; margin-left: 10px;">
                  <el-option label="用电量" value="electricity" />
                  <el-option label="用水量" value="water" />
                  <el-option label="用气量" value="gas" />
                  <el-option label="总费用" value="cost" />
                </el-select>
              </div>
            </div>
          </template>
          
          <div class="ranking-list">
            <div 
              v-for="(item, index) in rankingData" 
              :key="item.id"
              class="ranking-item"
              :class="'rank-' + (index + 1)"
            >
              <div class="rank-number">
                <span v-if="index < 3" class="medal">
                  <span class="medal-icon" :class="'medal-' + (index + 1)">{{ index + 1 }}</span>
                </span>
                <span v-else class="number">{{ index + 1 }}</span>
              </div>
              <div class="rank-info">
                <div class="rank-building">{{ item.building }}</div>
                <div class="rank-detail">
                  <span class="detail-item">用电: <strong>{{ item.electricity }} kWh</strong></span>
                  <span class="detail-item">用水: <strong>{{ item.water }} m³</strong></span>
                  <span class="detail-item">用气: <strong>{{ item.gas }} m³</strong></span>
                </div>
              </div>
              <div class="rank-progress">
                <el-progress 
                  type="dashboard"
                  :percentage="item.percent"
                  :width="80"
                  :color="getProgressColor(index)"
                >
                  <template #default="{ percentage }">
                    <span class="percentage-value">{{ item.totalCost }}</span>
                    <span class="percentage-label">元</span>
                  </template>
                </el-progress>
              </div>
              <div class="rank-trend">
                <div class="trend-value" :class="item.trend">
                  <el-icon v-if="item.trend === 'up'"><TrendCharts /></el-icon>
                  <el-icon v-else><TrendCharts /></el-icon>
                  {{ item.change }}
                </div>
                <div class="trend-label">较上期</div>
              </div>
              <div class="rank-actions">
                <el-button type="primary" size="small" @click="viewDetail(item)">
                  详情
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span>能耗对比图表</span>
          </template>
          <div class="chart-container" ref="barChartRef"></div>
        </el-card>
        
        <el-card class="summary-card" style="margin-top: 20px;">
          <template #header>
            <span>排名分析</span>
          </template>
          <div class="summary-content">
            <div class="summary-item">
              <div class="summary-icon" style="background: rgba(245, 108, 108, 0.1);">
                <el-icon :size="24" :color="'#F56C6C'"><TrendCharts /></el-icon>
              </div>
              <div class="summary-info">
                <div class="summary-title">能耗最高</div>
                <div class="summary-value">{{ topBuilding }}</div>
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-icon" style="background: rgba(103, 194, 58, 0.1);">
                <el-icon :size="24" :color="'#67C23A'"><TrendCharts /></el-icon>
              </div>
              <div class="summary-info">
                <div class="summary-title">能耗最低</div>
                <div class="summary-value">{{ bottomBuilding }}</div>
              </div>
            </div>
            <div class="summary-item">
              <div class="summary-icon" style="background: rgba(64, 158, 255, 0.1);">
                <el-icon :size="24" :color="'#409EFF'"><Money /></el-icon>
              </div>
              <div class="summary-info">
                <div class="summary-title">优化空间</div>
                <div class="summary-value">{{ optimizationSpace }}%</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="compare-card">
          <template #header>
            <div class="card-header">
              <span>各建筑分项能耗对比</span>
              <el-button type="primary" size="small" @click="exportRanking">
                <el-icon><Download /></el-icon> 导出排名
              </el-button>
            </div>
          </template>
          <el-table :data="compareData" border style="width: 100%">
            <el-table-column prop="building" label="建筑名称" width="120" fixed />
            <el-table-column label="用电(kWh)" width="180">
              <template #default="scope">
                <div class="compare-cell">
                  <span class="value">{{ scope.row.electricity }}</span>
                  <span class="trend" :class="scope.row.electricityTrend">
                    {{ scope.row.electricityTrend === 'up' ? '↑' : '↓' }}
                    {{ scope.row.electricityChange }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用电费用(元)" width="150">
              <template #default="scope">
                <span class="cost-value">¥{{ scope.row.electricityCost }}</span>
              </template>
            </el-table-column>
            <el-table-column label="用水(m³)" width="180">
              <template #default="scope">
                <div class="compare-cell">
                  <span class="value">{{ scope.row.water }}</span>
                  <span class="trend" :class="scope.row.waterTrend">
                    {{ scope.row.waterTrend === 'up' ? '↑' : '↓' }}
                    {{ scope.row.waterChange }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用水费用(元)" width="150">
              <template #default="scope">
                <span class="cost-value">¥{{ scope.row.waterCost }}</span>
              </template>
            </el-table-column>
            <el-table-column label="用气(m³)" width="180">
              <template #default="scope">
                <div class="compare-cell">
                  <span class="value">{{ scope.row.gas }}</span>
                  <span class="trend" :class="scope.row.gasTrend">
                    {{ scope.row.gasTrend === 'up' ? '↑' : '↓' }}
                    {{ scope.row.gasChange }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="用气费用(元)" width="150">
              <template #default="scope">
                <span class="cost-value">¥{{ scope.row.gasCost }}</span>
              </template>
            </el-table-column>
            <el-table-column label="总费用(元)" width="150" fixed="right">
              <template #default="scope">
                <span class="total-cost">¥{{ scope.row.totalCost }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="detailVisible"
      title="能耗详情"
      width="900px"
    >
      <el-descriptions :column="3" border>
        <el-descriptions-item label="建筑名称">{{ selectedBuilding?.building }}</el-descriptions-item>
        <el-descriptions-item label="统计周期">{{ periodLabel }}</el-descriptions-item>
        <el-descriptions-item label="排名">第{{ selectedBuilding?.rank }}名</el-descriptions-item>
      </el-descriptions>
      
      <el-divider content-position="left">能耗趋势</el-divider>
      <div class="detail-chart" ref="detailChartRef"></div>
      
      <el-divider content-position="left">优化建议</el-divider>
      <div class="suggestions">
        <div class="suggestion-item" v-for="(s, i) in suggestions" :key="i">
          <div class="suggestion-icon" :class="s.type">
            <el-icon v-if="s.type === 'warning'"><Warning /></el-icon>
            <el-icon v-else><CircleCheck /></el-icon>
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">{{ s.title }}</div>
            <div class="suggestion-desc">{{ s.description }}</div>
            <div class="suggestion-saving" v-if="s.saving">预计节省: ¥{{ s.saving }}/月</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { TrendCharts, Money, Download, Warning, CircleCheck } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

const barChartRef = ref(null)
const detailChartRef = ref(null)
let barChart = null
let detailChart = null

const selectedPeriod = ref('day')
const selectedEnergyType = ref('electricity')
const detailVisible = ref(false)
const selectedBuilding = ref(null)

const rankingData = ref([
  { id: 1, building: 'A栋', electricity: 1456.8, water: 45.6, gas: 28.5, totalCost: 1856.5, percent: 95, trend: 'down', change: '-5.2%', rank: 1 },
  { id: 2, building: 'B栋', electricity: 1256.2, water: 38.2, gas: 25.3, totalCost: 1589.3, percent: 82, trend: 'up', change: '+2.5%', rank: 2 },
  { id: 3, building: 'C栋', electricity: 956.5, water: 32.5, gas: 18.9, totalCost: 1185.2, percent: 65, trend: 'down', change: '-8.3%', rank: 3 },
  { id: 4, building: 'D栋', electricity: 785.3, water: 28.4, gas: 15.2, totalCost: 956.8, percent: 52, trend: 'down', change: '-3.1%', rank: 4 },
  { id: 5, building: 'E栋', electricity: 652.4, water: 22.3, gas: 12.5, totalCost: 789.5, percent: 42, trend: 'up', change: '+1.2%', rank: 5 }
])

const compareData = ref([
  { building: 'A栋', electricity: 1456.8, electricityCost: 1497.6, electricityTrend: 'down', electricityChange: '5.2%', water: 45.6, waterCost: 182.4, waterTrend: 'up', waterChange: '3.1%', gas: 28.5, gasCost: 176.5, gasTrend: 'down', gasChange: '2.8%', totalCost: 1856.5 },
  { building: 'B栋', electricity: 1256.2, electricityCost: 1291.4, electricityTrend: 'up', electricityChange: '2.5%', water: 38.2, waterCost: 152.8, waterTrend: 'down', waterChange: '1.5%', gas: 25.3, gasCost: 156.9, gasTrend: 'up', gasChange: '4.2%', totalCost: 1601.1 },
  { building: 'C栋', electricity: 956.5, electricityCost: 983.2, electricityTrend: 'down', electricityChange: '8.3%', water: 32.5, waterCost: 130.0, waterTrend: 'down', waterChange: '4.2%', gas: 18.9, gasCost: 117.2, gasTrend: 'down', gasChange: '6.1%', totalCost: 1230.4 }
])

const suggestions = ref([
  { type: 'warning', title: '照明系统优化', description: '建议将A栋走廊照明更换为LED灯，并安装人体感应开关，预计可减少20%照明能耗', saving: 1500 },
  { type: 'success', title: '空调温控优化', description: '当前空调温控策略合理，建议保持现有设置，定期维护空调系统以保持能效', saving: 0 },
  { type: 'warning', title: '峰谷用电优化', description: '建议将部分非关键设备的运行时间调整至谷时段（23:00-08:00），利用峰谷电价差降低成本', saving: 2000 }
])

const periodLabel = computed(() => {
  const labels = { day: '今日', week: '本周', month: '本月', year: '本年' }
  return labels[selectedPeriod.value] || '今日'
})

const topBuilding = computed(() => {
  return rankingData.value[0]?.building || '-'
})

const bottomBuilding = computed(() => {
  return rankingData.value[rankingData.value.length - 1]?.building || '-'
})

const optimizationSpace = computed(() => {
  return '28'
})

const getProgressColor = (index) => {
  const colors = ['#F56C6C', '#E6A23C', '#409EFF', '#67C23A', '#909399']
  return colors[index] || '#909399'
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
      data: ['A栋', 'B栋', 'C栋', 'D栋', 'E栋']
    },
    yAxis: {
      type: 'value',
      name: '单位用量'
    },
    series: [
      {
        name: '用电',
        type: 'bar',
        data: [1456, 1256, 956, 785, 652],
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '用水',
        type: 'bar',
        data: [45, 38, 32, 28, 22],
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '用气',
        type: 'bar',
        data: [28, 25, 18, 15, 12],
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  barChart.setOption(option)
}

const initDetailChart = () => {
  if (!detailChartRef.value) return
  
  detailChart = echarts.init(detailChartRef.value)
  
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
      data: ['1月', '2月', '3月', '4月', '5月']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '用电',
        type: 'line',
        smooth: true,
        data: [1200, 1350, 1180, 1420, 1456],
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '用水',
        type: 'line',
        smooth: true,
        data: [38, 42, 35, 40, 45],
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '用气',
        type: 'line',
        smooth: true,
        data: [22, 25, 20, 26, 28],
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  detailChart.setOption(option)
}

const viewDetail = (item) => {
  selectedBuilding.value = item
  detailVisible.value = true
}

const exportRanking = () => {
  ElMessage.success('能耗排名报告导出成功')
}

watch(detailVisible, (val) => {
  if (val) {
    setTimeout(() => {
      initDetailChart()
    }, 100)
  }
})

onMounted(() => {
  initBarChart()
  
  window.addEventListener('resize', () => {
    barChart?.resize()
    detailChart?.resize()
  })
})
</script>

<style scoped>
.energy-ranking {
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

.ranking-card, .chart-card, .summary-card, .compare-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #e4e7ed;
}

.ranking-item.rank-1 {
  border-left-color: #F56C6C;
  background: linear-gradient(90deg, rgba(245, 108, 108, 0.05) 0%, transparent 100%);
}

.ranking-item.rank-2 {
  border-left-color: #E6A23C;
  background: linear-gradient(90deg, rgba(230, 162, 60, 0.05) 0%, transparent 100%);
}

.ranking-item.rank-3 {
  border-left-color: #409EFF;
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.05) 0%, transparent 100%);
}

.rank-number {
  width: 50px;
  text-align: center;
}

.medal-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  color: #fff;
}

.medal-icon.medal-1 {
  background: linear-gradient(135deg, #F56C6C, #F08080);
}

.medal-icon.medal-2 {
  background: linear-gradient(135deg, #E6A23C, #E8A65A);
}

.medal-icon.medal-3 {
  background: linear-gradient(135deg, #409EFF, #64B5F6);
}

.number {
  font-size: 18px;
  font-weight: bold;
  color: #909399;
}

.rank-info {
  flex: 1;
}

.rank-building {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.rank-detail {
  display: flex;
  gap: 15px;
  font-size: 13px;
  color: #606266;
}

.detail-item {
  display: flex;
  align-items: center;
}

.rank-progress {
  width: 100px;
}

.percentage-value {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.percentage-label {
  font-size: 12px;
  color: #909399;
}

.rank-trend {
  text-align: center;
  width: 80px;
}

.trend-value {
  font-size: 16px;
  font-weight: bold;
}

.trend-value.up {
  color: #F56C6C;
}

.trend-value.down {
  color: #67C23A;
}

.trend-label {
  font-size: 12px;
  color: #909399;
}

.chart-container {
  height: 300px;
}

.detail-chart {
  height: 250px;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.summary-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.summary-title {
  font-size: 13px;
  color: #909399;
}

.summary-value {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.compare-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value {
  font-weight: bold;
}

.trend {
  font-size: 12px;
}

.trend.up {
  color: #F56C6C;
}

.trend.down {
  color: #67C23A;
}

.cost-value {
  color: #E6A23C;
  font-weight: bold;
}

.total-cost {
  font-size: 16px;
  font-weight: bold;
  color: #F56C6C;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.suggestion-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.suggestion-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.suggestion-icon.warning {
  background: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}

.suggestion-icon.success {
  background: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.suggestion-content {
  flex: 1;
}

.suggestion-title {
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.suggestion-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 5px;
}

.suggestion-saving {
  font-size: 13px;
  color: #67C23A;
  font-weight: bold;
}
</style>
