<template>
  <div class="match-view">
    <el-card class="select-card">
      <template #header>
        <span class="card-title">选择岗位进行匹配</span>
      </template>
      
      <el-form label-width="100px">
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="选择岗位">
              <el-select
                v-model="selectedJobId"
                placeholder="请选择岗位"
                style="width: 100%;"
                filterable
                @change="onJobChange"
              >
                <el-option
                  v-for="job in jobList"
                  :key="job.id"
                  :label="job.position_name"
                  :value="job.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="操作">
              <el-button type="primary" @click="startMatch" :loading="matching">
                <el-icon><Connection /></el-icon>
                开始匹配
              </el-button>
              <el-button type="success" @click="matchAll" :loading="matching">
                <el-icon><DataAnalysis /></el-icon>
                匹配全部
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-collapse v-model="activeCollapse" style="margin-top: 20px;" v-if="selectedJob">
        <el-collapse-item title="岗位详情" name="1">
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="岗位名称">{{ selectedJob.position_name }}</el-descriptions-item>
            <el-descriptions-item label="所属部门">{{ selectedJob.department || '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="工作地点">{{ selectedJob.location || '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="薪资范围">{{ selectedJob.salary_range || '未设置' }}</el-descriptions-item>
            <el-descriptions-item label="学历要求">{{ selectedJob.education_requirement || '不限' }}</el-descriptions-item>
            <el-descriptions-item label="经验要求">{{ selectedJob.work_years_requirement || '不限' }}</el-descriptions-item>
            <el-descriptions-item label="所需技能" :span="3">
              {{ selectedJob.required_skills || '未设置' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <el-card class="result-card" v-if="matchResults.length > 0">
      <template #header>
        <div class="header-row">
          <span class="card-title">匹配结果</span>
          <span class="result-count">共匹配 {{ matchResults.length }} 份简历</span>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="8">
          <div ref="chartRef" class="radar-chart"></div>
        </el-col>
        <el-col :span="16">
          <el-table :data="matchResults" stripe style="width: 100%">
            <el-table-column label="排名" width="70" type="index">
              <template #default="scope">
                <el-tag v-if="scope.$index < 3" :type="getRankType(scope.$index)" effect="dark">
                  {{ scope.$index + 1 }}
                </el-tag>
                <span v-else>{{ scope.$index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="resume_name" label="姓名" width="100" />
            <el-table-column prop="total_score" label="总分" width="100">
              <template #default="scope">
                <el-progress
                  :percentage="Math.round(scope.row.total_score)"
                  :color="getScoreColor(scope.row.total_score)"
                  :stroke-width="18"
                />
              </template>
            </el-table-column>
            <el-table-column prop="skill_score" label="技能分" width="90">
              <template #default="scope">
                <span class="score-badge skill">{{ Math.round(scope.row.skill_score) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="experience_score" label="经验分" width="90">
              <template #default="scope">
                <span class="score-badge experience">{{ Math.round(scope.row.experience_score) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="education_score" label="学历分" width="90">
              <template #default="scope">
                <span class="score-badge education">{{ Math.round(scope.row.education_score) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="other_score" label="其他分" width="90">
              <template #default="scope">
                <span class="score-badge other">{{ Math.round(scope.row.other_score) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="viewResumeDetail(scope.row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </el-card>

    <el-dialog v-model="detailVisible" title="简历匹配详情" width="900px">
      <el-descriptions :column="3" border v-if="currentResume">
        <el-descriptions-item label="姓名">{{ currentResume.name }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ currentResume.phone || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ currentResume.email || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="最高学历">{{ currentResume.education_level || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="工作年限">{{ currentResume.work_years || 0 }}年</el-descriptions-item>
        <el-descriptions-item label="当前职位">{{ currentResume.current_position || '未提取' }}</el-descriptions-item>
      </el-descriptions>

      <el-tabs v-model="detailTab" style="margin-top: 20px;">
        <el-tab-pane label="匹配分数" name="score">
          <div ref="detailChartRef" class="detail-chart"></div>
        </el-tab-pane>
        <el-tab-pane label="技能标签" name="skills">
          <el-empty v-if="!currentResume.skills || currentResume.skills.length === 0" description="暂无技能信息" />
          <div v-else class="skills-container">
            <el-tag
              v-for="(skill, index) in currentResume.skills"
              :key="index"
              size="large"
              effect="dark"
              class="skill-tag"
            >
              {{ skill.skill_name }}
            </el-tag>
          </div>
        </el-tab-pane>
        <el-tab-pane label="工作经历" name="experience">
          <el-empty v-if="!currentResume.work_experiences || currentResume.work_experiences.length === 0" description="暂无工作经历" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="(exp, index) in currentResume.work_experiences"
              :key="index"
              :timestamp="formatDateRange(exp.start_date, exp.end_date, exp.is_current)"
              placement="top"
            >
              <el-card shadow="hover">
                <h4>{{ exp.company_name }}</h4>
                <p class="position">{{ exp.position }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Connection, DataAnalysis 
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { resumeApi, jobApi, matchApi } from '../api'

const jobList = ref([])
const selectedJobId = ref(null)
const selectedJob = ref(null)
const activeCollapse = ref([])
const matching = ref(false)
const matchResults = ref([])
const chartRef = ref(null)
const detailChartRef = ref(null)
const detailVisible = ref(false)
const detailTab = ref('score')
const currentResume = ref(null)
const currentMatchResult = ref(null)

const loadJobs = async () => {
  try {
    const res = await jobApi.list(0, 100)
    jobList.value = res.data
  } catch (error) {
    console.error('加载岗位列表失败:', error)
  }
}

const onJobChange = (jobId) => {
  selectedJob.value = jobList.value.find(j => j.id === jobId)
  activeCollapse.value = ['1']
}

const startMatch = async () => {
  if (!selectedJobId.value) {
    ElMessage.warning('请先选择岗位')
    return
  }

  matching.value = true
  try {
    const resumeRes = await resumeApi.list(0, 100)
    const resumeIds = resumeRes.data.map(r => r.id)
    
    if (resumeIds.length === 0) {
      ElMessage.warning('人才库中没有简历')
      return
    }

    const matchRes = await matchApi.batch(resumeIds, selectedJobId.value)
    matchResults.value = matchRes.data.results.map(r => ({
      ...r,
      resume_name: resumeRes.data.find(re => re.id === r.resume_id)?.name || '未知'
    }))
    
    ElMessage.success(`匹配完成，共 ${matchResults.value.length} 份简历`)
    
    nextTick(() => {
      initRadarChart()
    })
  } catch (error) {
    console.error('匹配失败:', error)
  } finally {
    matching.value = false
  }
}

const matchAll = async () => {
  if (!selectedJobId.value) {
    ElMessage.warning('请先选择岗位')
    return
  }

  matching.value = true
  try {
    const resumeRes = await resumeApi.list(0, 100)
    
    if (resumeRes.data.length === 0) {
      ElMessage.warning('人才库中没有简历')
      return
    }

    const matchRes = await matchApi.matchAll(selectedJobId.value)
    matchResults.value = matchRes.data.results.map(r => ({
      ...r,
      resume_name: resumeRes.data.find(re => re.id === r.resume_id)?.name || '未知'
    }))
    
    ElMessage.success(`匹配完成，共 ${matchResults.value.length} 份简历`)
    
    nextTick(() => {
      initRadarChart()
    })
  } catch (error) {
    console.error('匹配失败:', error)
  } finally {
    matching.value = false
  }
}

const getRankType = (index) => {
  const types = ['danger', 'warning', 'success']
  return types[index] || ''
}

const getScoreColor = (score) => {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

const viewResumeDetail = async (row) => {
  currentMatchResult.value = row
  try {
    const res = await resumeApi.get(row.resume_id)
    currentResume.value = res.data
    detailVisible.value = true
    
    nextTick(() => {
      initDetailChart()
    })
  } catch (error) {
    console.error('获取简历详情失败:', error)
  }
}

const initRadarChart = () => {
  if (!chartRef.value || matchResults.value.length === 0) return
  
  const chart = echarts.init(chartRef.value)
  
  const topResults = matchResults.value.slice(0, 5)
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      data: topResults.map(r => r.resume_name)
    },
    radar: {
      indicator: [
        { name: '总分', max: 100 },
        { name: '技能', max: 100 },
        { name: '经验', max: 100 },
        { name: '学历', max: 100 },
        { name: '其他', max: 100 }
      ]
    },
    series: [{
      type: 'radar',
      data: topResults.map(r => ({
        value: [r.total_score, r.skill_score, r.experience_score, r.education_score, r.other_score],
        name: r.resume_name
      }))
    }]
  }
  
  chart.setOption(option)
}

const initDetailChart = () => {
  if (!detailChartRef.value || !currentMatchResult.value) return
  
  const chart = echarts.init(detailChartRef.value)
  
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
      data: ['技能匹配', '经验匹配', '教育匹配', '其他因素'],
      axisLabel: {
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      max: 100,
      name: '匹配分数'
    },
    series: [{
      name: '分数',
      type: 'bar',
      data: [
        { value: Math.round(currentMatchResult.value.skill_score), itemStyle: { color: '#409EFF' } },
        { value: Math.round(currentMatchResult.value.experience_score), itemStyle: { color: '#67c23a' } },
        { value: Math.round(currentMatchResult.value.education_score), itemStyle: { color: '#e6a23c' } },
        { value: Math.round(currentMatchResult.value.other_score), itemStyle: { color: '#909399' } }
      ],
      barWidth: '50%',
      label: {
        show: true,
        position: 'top',
        fontSize: 16,
        fontWeight: 'bold'
      }
    }]
  }
  
  chart.setOption(option)
}

const formatDateRange = (start, end, isCurrent) => {
  const format = (date) => {
    if (!date) return '未知'
    if (typeof date === 'string') {
      return date.substring(0, 7)
    }
    return `${date.year}-${String(date.month).padStart(2, '0')}`
  }
  
  const startStr = format(start)
  const endStr = isCurrent ? '至今' : format(end)
  
  return `${startStr} - ${endStr}`
}

onMounted(() => {
  loadJobs()
})

window.addEventListener('resize', () => {
  if (chartRef.value) {
    const chart = echarts.getInstanceByDom(chartRef.value)
    if (chart) chart.resize()
  }
  if (detailChartRef.value) {
    const chart = echarts.getInstanceByDom(detailChartRef.value)
    if (chart) chart.resize()
  }
})
</script>

<style scoped>
.match-view {
  max-width: 1400px;
  margin: 0 auto;
}

.select-card, .result-card {
  border-radius: 12px;
  border: none;
  margin-bottom: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-count {
  font-size: 14px;
  color: #909399;
}

.radar-chart {
  width: 100%;
  height: 400px;
}

.detail-chart {
  width: 100%;
  height: 350px;
}

.score-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  color: #fff;
  font-weight: 500;
}

.score-badge.skill {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.score-badge.experience {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.score-badge.education {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.score-badge.other {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.skills-container {
  padding: 10px;
}

.skill-tag {
  margin: 5px;
}

h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.position {
  margin: 0;
  color: #409EFF;
}

:deep(.el-descriptions__label) {
  width: 100px;
}
</style>
