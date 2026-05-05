<template>
  <div class="optimization-report">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="summary-card">
          <template #header>
            <div class="card-header">
              <span>能耗优化报告概览</span>
              <div class="report-actions">
                <el-date-picker
                  v-model="reportPeriod"
                  type="month"
                  placeholder="选择月份"
                  size="small"
                  style="width: 150px;"
                />
                <el-button type="primary" size="small" @click="generateReport">
                  <el-icon><Refresh /></el-icon> 生成报告
                </el-button>
                <el-button type="success" size="small" @click="exportPDF">
                  <el-icon><Download /></el-icon> 导出PDF
                </el-button>
              </div>
            </div>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon" style="background: rgba(64, 158, 255, 0.1);">
                  <el-icon :size="30" :color="'#409EFF'"><Lightning /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ reportSummary.totalElectricity }} kWh</div>
                  <div class="stat-label">总用电量</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon" style="background: rgba(230, 162, 60, 0.1);">
                  <el-icon :size="30" :color="'#E6A23C'"><Money /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">¥{{ reportSummary.totalCost }}</div>
                  <div class="stat-label">总费用</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon" style="background: rgba(103, 194, 58, 0.1);">
                  <el-icon :size="30" :color="'#67C23A'"><TrendCharts /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ reportSummary.savings }}%</div>
                  <div class="stat-label">优化空间</div>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon" style="background: rgba(245, 108, 108, 0.1);">
                  <el-icon :size="30" :color="'#F56C6C'"><Coin /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">¥{{ reportSummary.estimatedSavings }}</div>
                  <div class="stat-label">预计节省</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card class="recommendations-card">
          <template #header>
            <span>优化建议</span>
          </template>
          
          <div class="recommendations-list">
            <div 
              v-for="(item, index) in recommendations" 
              :key="item.id"
              class="recommendation-item"
              :class="'priority-' + item.priority"
            >
              <div class="recommendation-header">
                <div class="recommendation-title">
                  <span class="priority-tag" :class="'priority-' + item.priority">
                    {{ getPriorityLabel(item.priority) }}
                  </span>
                  <span class="title">{{ item.title }}</span>
                </div>
                <div class="recommendation-meta">
                  <el-tag :type="getCategoryTag(item.category)" size="small">{{ getCategoryLabel(item.category) }}</el-tag>
                  <span class="saving-estimate">预计节省: ¥{{ item.saving }}/月</span>
                </div>
              </div>
              
              <div class="recommendation-content">
                <div class="description">{{ item.description }}</div>
                
                <el-collapse v-model="expandedItems">
                  <el-collapse-item :name="item.id">
                    <template #title>
                      <span class="collapse-title">详细方案</span>
                    </template>
                    <div class="detail-content">
                      <p><strong>问题分析：</strong>{{ item.analysis }}</p>
                      <p><strong>解决方案：</strong></p>
                      <ul>
                        <li v-for="(step, i) in item.steps" :key="i">{{ step }}</li>
                      </ul>
                      <p><strong>预期效果：</strong>{{ item.expectedResult }}</p>
                      <p><strong>投资回报期：</strong>{{ item.roi }}</p>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </div>
              
              <div class="recommendation-actions">
                <el-button type="primary" size="small" @click="acceptRecommendation(item)">
                  采纳建议
                </el-button>
                <el-button type="warning" size="small" @click="scheduleTask(item)">
                  安排任务
                </el-button>
                <el-button type="info" size="small" @click="ignoreRecommendation(item)">
                  忽略
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="analysis-card">
          <template #header>
            <span>能耗分析</span>
          </template>
          <div class="chart-container" ref="analysisChartRef"></div>
        </el-card>
        
        <el-card class="quick-actions-card" style="margin-top: 20px;">
          <template #header>
            <span>快速操作</span>
          </template>
          <div class="quick-actions">
            <div class="action-item" @click="viewEnergyTrend">
              <div class="action-icon" style="background: rgba(64, 158, 255, 0.1);">
                <el-icon :size="24" :color="'#409EFF'"><TrendCharts /></el-icon>
              </div>
              <span>查看趋势</span>
            </div>
            <div class="action-item" @click="comparePeriod">
              <div class="action-icon" style="background: rgba(103, 194, 58, 0.1);">
                <el-icon :size="24" :color="'#67C23A'"><DataAnalysis /></el-icon>
              </div>
              <span>周期对比</span>
            </div>
            <div class="action-item" @click="viewAbnormalData">
              <div class="action-icon" style="background: rgba(245, 108, 108, 0.1);">
                <el-icon :size="24" :color="'#F56C6C'"><Warning /></el-icon>
              </div>
              <span>异常数据</span>
            </div>
            <div class="action-item" @click="setTargets">
              <div class="action-icon" style="background: rgba(230, 162, 60, 0.1);">
                <el-icon :size="24" :color="'#E6A23C'"><Target /></el-icon>
              </div>
              <span>设定目标</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card class="history-card">
          <template #header>
            <span>历史优化记录</span>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in historyRecords"
              :key="index"
              :timestamp="item.time"
              :type="item.type"
              placement="top"
            >
              <el-card>
                <h4>{{ item.action }}</h4>
                <p>{{ item.description }}</p>
                <div class="record-meta">
                  <el-tag v-if="item.status === 'completed'" type="success" size="small">已完成</el-tag>
                  <el-tag v-else-if="item.status === 'in_progress'" type="primary" size="small">进行中</el-tag>
                  <el-tag v-else type="info" size="small">计划中</el-tag>
                  <span class="record-effect" v-if="item.saving">节省: ¥{{ item.saving }}</span>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { 
  Refresh, 
  Download, 
  Lightning, 
  Money, 
  TrendCharts, 
  Coin,
  DataAnalysis,
  Warning,
  Target
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

const analysisChartRef = ref(null)
let analysisChart = null

const reportPeriod = ref(new Date())
const expandedItems = ref([1])

const reportSummary = ref({
  totalElectricity: '45,682.5',
  totalCost: '46,852.8',
  savings: 28,
  estimatedSavings: '13,118.8'
})

const recommendations = ref([
  {
    id: 1,
    priority: 'high',
    category: 'electricity',
    title: '峰谷用电优化 - 转移设备运行时间',
    saving: 3500,
    description: '当前高峰时段用电占比达65%，建议将部分非关键设备转移至谷时段运行，利用峰谷电价差降低成本。',
    analysis: '当前用电高峰时段（9:00-12:00，17:00-22:00）用电量占比过高，高峰电价是谷时段的3.5倍，存在较大优化空间。',
    steps: [
      '1. 识别可转移的设备：数据中心备份任务、非关键生产设备、充电设施等',
      '2. 制定转移方案：将10-15%的负荷转移至谷时段（23:00-08:00）',
      '3. 安装智能控制设备：实现定时启停功能',
      '4. 监控效果：持续监测用电数据，评估优化效果'
    ],
    expectedResult: '预计可减少高峰时段用电量15%，每月节省电费约3500元，年节省约42000元。',
    roi: '3个月'
  },
  {
    id: 2,
    priority: 'high',
    category: 'hvac',
    title: '空调系统优化 - 调整运行策略',
    saving: 2800,
    description: '空调系统能耗占总用电量30%，建议优化运行时间、调整温度设置，并定期维护以提高能效。',
    analysis: 'A栋空调系统存在过度制冷现象，温度设置过低，运行时间过长，建议根据人员活动规律调整运行策略。',
    steps: [
      '1. 调整温度设置：夏季26°C，冬季20°C',
      '2. 优化运行时间：提前30分钟启动，提前30分钟关闭',
      '3. 分区控制：根据各区域人员密度调整空调运行',
      '4. 定期维护：清洗滤网、检查冷媒压力'
    ],
    expectedResult: '预计可减少空调能耗20%，每月节省电费约2800元。',
    roi: '1个月'
  },
  {
    id: 3,
    priority: 'medium',
    category: 'lighting',
    title: '照明系统升级 - LED改造+智能控制',
    saving: 1500,
    description: '部分区域仍使用传统荧光灯，建议更换为LED灯并安装人体感应开关，减少无效照明能耗。',
    analysis: '走廊、卫生间、停车场等区域照明常亮，存在大量无效能耗，建议安装智能控制系统。',
    steps: [
      '1. 更换LED灯具：将荧光灯更换为LED，节能60%以上',
      '2. 安装感应开关：走廊、卫生间安装人体感应或声控开关',
      '3. 分区控制：各区域独立控制，避免无人时照明',
      '4. 充分利用自然光：调整百叶窗，减少日间人工照明'
    ],
    expectedResult: '预计可减少照明能耗40%，每月节省电费约1500元。',
    roi: '6个月'
  },
  {
    id: 4,
    priority: 'medium',
    category: 'water',
    title: '用水系统优化 - 漏水检测+节水改造',
    saving: 800,
    description: '水管存在微漏现象，建议进行漏水检测并安装节水器具，减少水资源浪费。',
    analysis: '近期用水量异常增加，可能存在管道漏水或器具老化问题，建议全面检查。',
    steps: [
      '1. 漏水检测：使用专业设备检测管道泄漏点',
      '2. 修复泄漏：及时修复发现的漏水点',
      '3. 更换节水器具：安装节水龙头、节水马桶等',
      '4. 安装智能水表：实时监测用水数据'
    ],
    expectedResult: '预计可减少用水量15%，每月节省水费约800元。',
    roi: '4个月'
  },
  {
    id: 5,
    priority: 'low',
    category: 'equipment',
    title: '设备能效提升 - 淘汰高能耗设备',
    saving: 500,
    description: '部分设备使用年限较长，能效较低，建议制定设备更新计划，逐步淘汰高能耗设备。',
    analysis: 'A栋3层服务器机房设备使用超过8年，能效比已降至2.5以下，建议考虑设备更新。',
    steps: [
      '1. 设备能效评估：全面评估现有设备能效等级',
      '2. 制定更新计划：优先更新能效最低的设备',
      '3. 选择高能效替代品：选择一级能效产品',
      '4. 申请政府补贴：利用节能补贴政策降低成本'
    ],
    expectedResult: '预计可减少设备能耗10%，每月节省电费约500元。',
    roi: '12个月'
  }
])

const historyRecords = ref([
  {
    time: '2024-05-01 14:30',
    type: 'success',
    action: 'LED照明改造完成',
    description: 'A栋走廊荧光灯全部更换为LED灯，并安装人体感应开关',
    status: 'completed',
    saving: 1200
  },
  {
    time: '2024-04-20 09:00',
    type: 'primary',
    action: '空调运行策略调整',
    description: '根据人员活动规律调整空调运行时间和温度设置',
    status: 'in_progress',
    saving: null
  },
  {
    time: '2024-04-10 16:00',
    type: 'warning',
    action: '峰谷用电优化方案制定',
    description: '制定设备运行时间转移方案，计划将数据中心备份任务转移至谷时段',
    status: 'in_progress',
    saving: null
  },
  {
    time: '2024-03-25 10:00',
    type: 'info',
    action: '设备能效评估完成',
    description: '完成所有设备能效评估，识别出5台高能耗待更新设备',
    status: 'completed',
    saving: null
  }
])

const getPriorityLabel = (priority) => {
  const labels = { high: '高优先级', medium: '中优先级', low: '低优先级' }
  return labels[priority] || priority
}

const getCategoryLabel = (category) => {
  const labels = { 
    electricity: '用电优化', 
    hvac: '空调系统', 
    lighting: '照明系统', 
    water: '用水系统',
    equipment: '设备优化'
  }
  return labels[category] || category
}

const getCategoryTag = (category) => {
  const tags = { 
    electricity: 'primary', 
    hvac: 'danger', 
    lighting: 'warning', 
    water: 'success',
    equipment: 'info'
  }
  return tags[category] || 'info'
}

const initAnalysisChart = () => {
  if (!analysisChartRef.value) return
  
  analysisChart = echarts.init(analysisChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['当前能耗', '优化后能耗']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['用电', '用水', '用气', '维护', '其他']
    },
    yAxis: {
      type: 'value',
      name: '元'
    },
    series: [
      {
        name: '当前能耗',
        type: 'bar',
        data: [28500, 8200, 5600, 3200, 1352],
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '优化后能耗',
        type: 'bar',
        data: [21000, 6800, 4800, 3200, 1352],
        itemStyle: { color: '#67C23A' }
      }
    ]
  }
  
  analysisChart.setOption(option)
}

const generateReport = () => {
  ElMessage.success('报告生成成功')
}

const exportPDF = () => {
  ElMessage.success('PDF导出成功')
}

const acceptRecommendation = (item) => {
  ElMessage.success(`已采纳建议：${item.title}`)
}

const scheduleTask = (item) => {
  ElMessage.info(`安排任务：${item.title}`)
}

const ignoreRecommendation = (item) => {
  ElMessage.info(`已忽略建议：${item.title}`)
}

const viewEnergyTrend = () => {
  ElMessage.info('查看能耗趋势')
}

const comparePeriod = () => {
  ElMessage.info('周期对比')
}

const viewAbnormalData = () => {
  ElMessage.info('查看异常数据')
}

const setTargets = () => {
  ElMessage.info('设定目标')
}

onMounted(() => {
  initAnalysisChart()
  
  window.addEventListener('resize', () => {
    analysisChart?.resize()
  })
})
</script>

<style scoped>
.optimization-report {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-card, .recommendations-card, .analysis-card, .quick-actions-card, .history-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.recommendation-item {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #e4e7ed;
}

.recommendation-item.priority-high {
  border-left-color: #F56C6C;
  background: linear-gradient(90deg, rgba(245, 108, 108, 0.05) 0%, transparent 100%);
}

.recommendation-item.priority-medium {
  border-left-color: #E6A23C;
  background: linear-gradient(90deg, rgba(230, 162, 60, 0.05) 0%, transparent 100%);
}

.recommendation-item.priority-low {
  border-left-color: #909399;
}

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.recommendation-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.priority-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.priority-tag.priority-high {
  background: rgba(245, 108, 108, 0.1);
  color: #F56C6C;
}

.priority-tag.priority-medium {
  background: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}

.priority-tag.priority-low {
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
}

.title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.recommendation-meta {
  display: flex;
  align-items: center;
  gap: 15px;
}

.saving-estimate {
  font-size: 13px;
  color: #67C23A;
  font-weight: bold;
}

.recommendation-content {
  margin-bottom: 15px;
}

.description {
  color: #606266;
  line-height: 1.6;
}

.detail-content {
  padding: 15px;
  background: #fff;
  border-radius: 4px;
}

.detail-content p {
  margin-bottom: 10px;
}

.detail-content ul {
  padding-left: 20px;
  margin-bottom: 10px;
}

.detail-content li {
  margin-bottom: 5px;
}

.collapse-title {
  color: #409EFF;
}

.recommendation-actions {
  display: flex;
  gap: 10px;
}

.chart-container {
  height: 300px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-item:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
}

.action-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
}

.record-effect {
  font-size: 13px;
  color: #67C23A;
  font-weight: bold;
}
</style>
