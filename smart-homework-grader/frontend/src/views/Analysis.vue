<template>
  <div class="analysis-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>选择班级</span>
          <el-select v-model="selectedClassId" placeholder="请选择班级" @change="loadAnalysis" style="width: 200px;">
            <el-option 
              v-for="cls in classes" 
              :key="cls.id" 
              :label="cls.name" 
              :value="cls.id" 
            />
          </el-select>
        </div>
      </template>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background-color: #ecf5ff;">
            <el-icon :size="24" style="color: #409eff;"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ overview?.student_count || 0 }}</div>
            <div class="stat-label">学生人数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background-color: #f0f9eb;">
            <el-icon :size="24" style="color: #67c23a;"><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ overview?.essay_count || 0 }}</div>
            <div class="stat-label">作文总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background-color: #fdf6ec;">
            <el-icon :size="24" style="color: #e6a23c;"><Star /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ overview?.average_score || 0 }}</div>
            <div class="stat-label">班级平均分</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-icon" style="background-color: #fef0f0;">
            <el-icon :size="24" style="color: #f56c6c;"><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ errorStats?.total_errors || 0 }}</div>
            <div class="stat-label">检测错误数</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>分数分布</span>
          </template>
          <div ref="scoreDistChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>错误类型分布</span>
          </template>
          <div ref="errorTypeChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>三维度平均得分</span>
          </template>
          <div ref="dimensionChart" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>学生排名</span>
          </template>
          <el-table :data="studentRanking" style="width: 100%">
            <el-table-column prop="rank" label="排名" width="80">
              <template #default="scope">
                <el-tag 
                  :type="scope.row.rank <= 3 ? 'warning' : 'info'" 
                  size="small"
                >
                  第{{ scope.row.rank }}名
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="student_name" label="学生姓名" width="120" />
            <el-table-column prop="essay_count" label="作文数" width="80" />
            <el-table-column prop="average_score" label="平均分">
              <template #default="scope">
                <span :style="{ color: getScoreColor(scope.row.average_score) }">
                  {{ scope.row.average_score }}分
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="highest_score" label="最高分" width="80">
              <template #default="scope">
                <el-tag type="success" size="small">{{ scope.row.highest_score }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px;">
      <template #header>
        <span>常见错误分析</span>
      </template>
      <el-row :gutter="20">
        <el-col :span="8" v-for="(error, index) in commonErrors" :key="index">
          <div class="error-item">
            <div class="error-header">
              <el-tag :type="getSeverityType(error[1])" size="small">{{ error[0] }}</el-tag>
              <span class="error-count">{{ error[1] }}次</span>
            </div>
            <el-progress 
              :percentage="Math.min((error[1] / maxErrorCount) * 100, 100)" 
              :stroke-width="10"
              :show-text="false"
            />
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { classApi, analysisApi } from '../api'

const classes = ref([
  { id: 1, name: '高三(1)班' },
  { id: 2, name: '初二(3)班' },
  { id: 3, name: '六年级(2)班' }
])

const selectedClassId = ref(1)

const overview = ref({
  student_count: 45,
  essay_count: 156,
  average_score: 82.5
})

const errorStats = ref({
  total_errors: 89,
  error_types: {
    '错别字': 35,
    '的地得': 25,
    '成语使用': 15,
    '句式问题': 14
  }
})

const studentRanking = ref([
  { rank: 1, student_name: '王五', essay_count: 15, average_score: 92, highest_score: 98 },
  { rank: 2, student_name: '钱七', essay_count: 13, average_score: 88, highest_score: 95 },
  { rank: 3, student_name: '张三', essay_count: 12, average_score: 85, highest_score: 92 },
  { rank: 4, student_name: '李四', essay_count: 10, average_score: 78, highest_score: 85 },
  { rank: 5, student_name: '赵六', essay_count: 8, average_score: 72, highest_score: 80 },
])

const commonErrors = ref([
  ['错别字', 35],
  ['的地得使用', 25],
  ['成语误用', 15],
  ['句式冗长', 14],
  ['标点错误', 10],
  ['语病', 8]
])

const scoreDistChart = ref(null)
const errorTypeChart = ref(null)
const dimensionChart = ref(null)

const maxErrorCount = computed(() => {
  if (commonErrors.value.length === 0) return 1
  return Math.max(...commonErrors.value.map(e => e[1]))
})

onMounted(() => {
  loadAnalysis()
})

const loadAnalysis = async () => {
  try {
    const [overviewRes, errorsRes, studentsRes, dimensionsRes] = await Promise.all([
      analysisApi.getClassOverview(selectedClassId.value),
      analysisApi.getClassErrors(selectedClassId.value),
      analysisApi.getClassStudents(selectedClassId.value),
      analysisApi.getClassDimensions(selectedClassId.value)
    ])
    
    if (overviewRes.data) {
      overview.value = overviewRes.data
    }
    if (errorsRes.data) {
      errorStats.value = errorsRes.data
    }
    if (studentsRes.data?.students) {
      studentRanking.value = studentsRes.data.students.map((s, i) => ({
        ...s,
        rank: i + 1
      }))
    }
  } catch (error) {
    console.log('使用模拟数据')
  }
  
  nextTick(() => {
    initCharts()
  })
}

const initCharts = () => {
  initScoreDistChart()
  initErrorTypeChart()
  initDimensionChart()
}

const initScoreDistChart = () => {
  if (!scoreDistChart.value) return
  
  const chart = echarts.init(scoreDistChart.value)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}人 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center'
    },
    series: [{
      name: '分数分布',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
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
      data: [
        { value: 8, name: '优秀(90+)', itemStyle: { color: '#67c23a' } },
        { value: 15, name: '良好(80-89)', itemStyle: { color: '#409eff' } },
        { value: 12, name: '中等(70-79)', itemStyle: { color: '#e6a23c' } },
        { value: 7, name: '及格(60-69)', itemStyle: { color: '#909399' } },
        { value: 3, name: '不及格(<60)', itemStyle: { color: '#f56c6c' } }
      ]
    }]
  }
  
  chart.setOption(option)
}

const initErrorTypeChart = () => {
  if (!errorTypeChart.value) return
  
  const chart = echarts.init(errorTypeChart.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'value',
      name: '次数'
    },
    yAxis: {
      type: 'category',
      data: ['句式问题', '成语使用', '的地得', '错别字']
    },
    series: [{
      type: 'bar',
      data: [
        { value: 14, itemStyle: { color: '#909399' } },
        { value: 15, itemStyle: { color: '#e6a23c' } },
        { value: 25, itemStyle: { color: '#409eff' } },
        { value: 35, itemStyle: { color: '#f56c6c' } }
      ],
      label: {
        show: true,
        position: 'right'
      }
    }]
  }
  
  chart.setOption(option)
}

const initDimensionChart = () => {
  if (!dimensionChart.value) return
  
  const chart = echarts.init(dimensionChart.value)
  
  const option = {
    tooltip: {},
    radar: {
      indicator: [
        { name: '内容立意', max: 100 },
        { name: '语言表达', max: 100 },
        { name: '结构层次', max: 100 }
      ],
      radius: '60%'
    },
    series: [{
      type: 'radar',
      data: [{
        value: [85, 78, 83],
        name: '班级平均分',
        areaStyle: {
          color: 'rgba(64, 158, 255, 0.3)'
        },
        lineStyle: {
          color: '#409eff'
        },
        itemStyle: {
          color: '#409eff'
        }
      }]
    }]
  }
  
  chart.setOption(option)
}

const getScoreColor = (score) => {
  if (!score) return '#909399'
  if (score >= 90) return '#67c23a'
  if (score >= 80) return '#409eff'
  if (score >= 70) return '#e6a23c'
  if (score >= 60) return '#909399'
  return '#f56c6c'
}

const getSeverityType = (count) => {
  if (count >= 30) return 'danger'
  if (count >= 20) return 'warning'
  if (count >= 10) return 'info'
  return 'success'
}
</script>

<style scoped>
.analysis-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.error-item {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.error-count {
  font-weight: bold;
  color: #606266;
}
</style>
