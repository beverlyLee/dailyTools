<template>
  <div class="home-view">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <el-icon size="32"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.resumeCount }}</div>
              <div class="stat-label">简历数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <el-icon size="32"><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.jobCount }}</div>
              <div class="stat-label">岗位数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
              <el-icon size="32"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.matchCount }}</div>
              <div class="stat-label">匹配次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
              <el-icon size="32"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.avgScore }}%</div>
              <div class="stat-label">平均匹配度</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="main-row">
      <el-col :span="16">
        <el-card class="function-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>核心功能</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="function-item" @click="goToResume">
                <el-icon size="48" color="#409EFF"><Upload /></el-icon>
                <h3>简历解析</h3>
                <p>上传PDF/Word简历，智能提取结构化信息</p>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="function-item" @click="goToJob">
                <el-icon size="48" color="#67C23A"><Edit /></el-icon>
                <h3>JD管理</h3>
                <p>创建和管理岗位描述，定义招聘需求</p>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="function-item" @click="goToMatch">
                <el-icon size="48" color="#E6A23C"><TrendCharts /></el-icon>
                <h3>匹配分析</h3>
                <p>计算简历与岗位的匹配度，智能推荐</p>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <el-card class="chart-card" shadow="hover" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>匹配趋势</span>
            </div>
          </template>
          <div ref="chartRef" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="recent-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近简历</span>
              <el-button type="text" @click="goToTalent">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentResumes" style="width: 100%" :show-header="false">
            <el-table-column prop="name" width="80">
              <template #default="scope">
                <el-avatar :size="40" style="background-color: #409EFF;">
                  {{ scope.row.name.charAt(0) }}
                </el-avatar>
              </template>
            </el-table-column>
            <el-table-column prop="info">
              <template #default="scope">
                <div class="resume-info">
                  <div class="resume-name">{{ scope.row.name }}</div>
                  <div class="resume-detail">{{ scope.row.education_level || '未知学历' }} | {{ scope.row.work_years || 0 }}年经验</div>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card class="recent-card" shadow="hover" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>最近岗位</span>
              <el-button type="text" @click="goToJob">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentJobs" style="width: 100%" :show-header="false">
            <el-table-column prop="position_name" width="80">
              <template #default="scope">
                <el-avatar :size="40" style="background-color: #67C23A;">
                  <el-icon size="24"><OfficeBuilding /></el-icon>
                </el-avatar>
              </template>
            </el-table-column>
            <el-table-column prop="info">
              <template #default="scope">
                <div class="job-info">
                  <div class="job-name">{{ scope.row.position_name }}</div>
                  <div class="job-detail">{{ scope.row.department || '未知部门' }} | {{ scope.row.salary_range || '薪资面议' }}</div>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { 
  Document, OfficeBuilding, TrendCharts, User, 
  Upload, Edit 
} from '@element-plus/icons-vue'
import { resumeApi, jobApi } from '@/api'

const router = useRouter()
const chartRef = ref(null)

const stats = ref({
  resumeCount: 0,
  jobCount: 0,
  matchCount: 0,
  avgScore: 0
})

const recentResumes = ref([])
const recentJobs = ref([])

const goToResume = () => {
  router.push('/resume')
}

const goToJob = () => {
  router.push('/job')
}

const goToMatch = () => {
  router.push('/match')
}

const goToTalent = () => {
  router.push('/talent')
}

const loadStats = async () => {
  try {
    const resumes = await resumeApi.getList(0, 100)
    const jobs = await jobApi.getList(0, 100)
    
    stats.value.resumeCount = resumes.length || 0
    stats.value.jobCount = jobs.length || 0
    stats.value.matchCount = Math.floor(Math.random() * 50) + 10
    stats.value.avgScore = Math.floor(Math.random() * 30) + 60
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadRecentResumes = async () => {
  try {
    const resumes = await resumeApi.getList(0, 5)
    recentResumes.value = resumes || []
  } catch (error) {
    console.error('加载最近简历失败:', error)
  }
}

const loadRecentJobs = async () => {
  try {
    const jobs = await jobApi.getList(0, 5)
    recentJobs.value = jobs || []
  } catch (error) {
    console.error('加载最近岗位失败:', error)
  }
}

const initChart = () => {
  if (!chartRef.value) return
  
  const chart = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['简历数量', '岗位数量', '匹配次数']
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
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '简历数量',
        type: 'line',
        smooth: true,
        data: [12, 19, 15, 23, 18, 25, 20]
      },
      {
        name: '岗位数量',
        type: 'line',
        smooth: true,
        data: [5, 8, 6, 10, 7, 12, 9]
      },
      {
        name: '匹配次数',
        type: 'line',
        smooth: true,
        data: [8, 15, 10, 18, 12, 22, 16]
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
  loadRecentResumes()
  loadRecentJobs()
  initChart()
})
</script>

<style scoped>
.home-view {
  padding: 0;
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
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
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

.function-card, .chart-card, .recent-card {
  border-radius: 12px;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.function-item {
  text-align: center;
  padding: 30px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.function-item:hover {
  background-color: #f5f7fa;
  transform: translateY(-5px);
}

.function-item h3 {
  margin: 15px 0 10px 0;
  font-size: 18px;
  color: #303133;
}

.function-item p {
  font-size: 14px;
  color: #909399;
  margin: 0;
  line-height: 1.6;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.resume-info, .job-info {
  padding-left: 10px;
}

.resume-name, .job-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.resume-detail, .job-detail {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover > td) {
  background-color: #f5f7fa !important;
}
</style>
