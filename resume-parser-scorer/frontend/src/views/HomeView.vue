<template>
  <div class="home-view">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <el-icon :size="28"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.resumeCount }}</div>
              <div class="stat-label">简历总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <el-icon :size="28"><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.jobCount }}</div>
              <div class="stat-label">岗位数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
              <el-icon :size="28"><DataAnalysis /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.matchCount }}</div>
              <div class="stat-label">匹配次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
              <el-icon :size="28"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.avgScore }}</div>
              <div class="stat-label">平均匹配分</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="main-row">
      <el-col :span="12">
        <el-card class="quick-actions-card">
          <template #header>
            <span class="card-title">快捷操作</span>
          </template>
          <el-row :gutter="15">
            <el-col :span="12">
              <router-link to="/resume">
                <div class="action-item">
                  <el-icon :size="40" color="#409EFF"><Upload /></el-icon>
                  <span>上传解析简历</span>
                </div>
              </router-link>
            </el-col>
            <el-col :span="12">
              <router-link to="/job">
                <div class="action-item">
                  <el-icon :size="40" color="#67c23a"><Plus /></el-icon>
                  <span>创建岗位JD</span>
                </div>
              </router-link>
            </el-col>
            <el-col :span="12">
              <router-link to="/match">
                <div class="action-item">
                  <el-icon :size="40" color="#e6a23c"><Connection /></el-icon>
                  <span>进行匹配分析</span>
                </div>
              </router-link>
            </el-col>
            <el-col :span="12">
              <router-link to="/talent">
                <div class="action-item">
                  <el-icon :size="40" color="#f56c6c"><User /></el-icon>
                  <span>浏览人才库</span>
                </div>
              </router-link>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span class="card-title">系统功能概览</span>
          </template>
          <div ref="chartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Document, OfficeBuilding, DataAnalysis, TrendCharts,
  Upload, Plus, Connection, User 
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const router = useRouter()
const chartRef = ref(null)

const stats = reactive({
  resumeCount: 0,
  jobCount: 0,
  matchCount: 0,
  avgScore: '--'
})

const loadStats = () => {
  stats.resumeCount = Math.floor(Math.random() * 50) + 10
  stats.jobCount = Math.floor(Math.random() * 20) + 5
  stats.matchCount = Math.floor(Math.random() * 100) + 20
  stats.avgScore = (Math.random() * 30 + 60).toFixed(1)
}

const initChart = () => {
  if (!chartRef.value) return
  
  const chart = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['简历解析', '技能匹配', '经验匹配', '教育匹配', '岗位管理'],
      axisLabel: {
        interval: 0,
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '处理效率'
    },
    series: [
      {
        name: '效率指数',
        type: 'bar',
        data: [85, 92, 78, 88, 95],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        },
        barWidth: '50%'
      }
    ]
  }
  
  chart.setOption(option)
  
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

onMounted(() => {
  loadStats()
  initChart()
})
</script>

<style scoped>
.home-view {
  min-height: 100%;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
  border: none;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.main-row {
  margin-bottom: 20px;
}

.quick-actions-card, .chart-card {
  border-radius: 12px;
  border: none;
  height: 320px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  border-radius: 8px;
  background: #f5f7fa;
  transition: all 0.3s ease;
  cursor: pointer;
  text-decoration: none;
}

.action-item:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
}

.action-item span {
  margin-top: 12px;
  color: #606266;
  font-size: 14px;
}

a {
  text-decoration: none;
}

.chart-container {
  width: 100%;
  height: 240px;
}
</style>
