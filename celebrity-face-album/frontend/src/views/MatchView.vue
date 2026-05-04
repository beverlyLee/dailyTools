<template>
  <div class="match-view">
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="header-title">
          <el-icon size="24" color="#E6A23C"><TrendCharts /></el-icon>
          <h2>匹配分析</h2>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="select-card" shadow="hover">
          <template #header>
            <span class="card-title">选择岗位</span>
          </template>
          
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
            >
              <span style="float: left">{{ job.position_name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ job.department || '未知部门' }}
              </span>
            </el-option>
          </el-select>
          
          <el-descriptions v-if="selectedJob" :column="1" border style="margin-top: 20px;">
            <el-descriptions-item label="岗位名称">
              <el-tag type="primary">{{ selectedJob.position_name }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="所属部门">
              {{ selectedJob.department || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="工作地点">
              {{ selectedJob.location || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="薪资范围">
              <el-tag type="warning">{{ selectedJob.salary_range || '薪资面议' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="学历要求">
              {{ selectedJob.education_requirement || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="经验要求">
              {{ selectedJob.work_years_requirement || '未填写' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card class="resume-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>选择简历进行匹配</span>
              <div>
                <el-button 
                  type="primary" 
                  :disabled="!selectedJobId || selectedResumes.length === 0"
                  :loading="matching"
                  @click="doMatch"
                >
                  <el-icon><TrendCharts /></el-icon>
                  开始匹配
                </el-button>
              </div>
            </div>
          </template>
          
          <el-table
            :data="resumeList"
            style="width: 100%"
            v-loading="loading"
            @selection-change="handleSelectionChange"
            stripe
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" label="姓名" width="100">
              <template #default="scope">
                <div class="resume-name">
                  <el-avatar :size="32" style="background-color: #409EFF; margin-right: 8px;">
                    {{ scope.row.name.charAt(0) }}
                  </el-avatar>
                  <span>{{ scope.row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="gender" label="性别" width="80" />
            <el-table-column prop="education_level" label="学历" width="100" />
            <el-table-column prop="work_years" label="工作年限" width="100">
              <template #default="scope">
                <el-tag v-if="scope.row.work_years" type="warning" size="small">
                  {{ scope.row.work_years }}年
                </el-tag>
                <span v-else class="empty-text">未知</span>
              </template>
            </el-table-column>
            <el-table-column prop="current_position" label="当前职位" width="150">
              <template #default="scope">
                {{ scope.row.current_position || '未填写' }}
              </template>
            </el-table-column>
            <el-table-column prop="current_company" label="当前公司" min-width="150">
              <template #default="scope">
                {{ scope.row.current_company || '未填写' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="viewResume(scope.row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <el-empty v-if="resumeList.length === 0 && !loading" description="暂无简历数据，请先上传简历" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 匹配结果 -->
    <el-card v-if="matchResults.length > 0" class="result-card" shadow="hover" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span><el-icon color="#67C23A"><CircleCheck /></el-icon> 匹配结果</span>
          <el-button type="primary" size="small" @click="exportResults">
            <el-icon><Download /></el-icon>
            导出结果
          </el-button>
        </div>
      </template>
      
      <el-table :data="sortedMatchResults" style="width: 100%" stripe>
        <el-table-column prop="rank" label="排名" width="80">
          <template #default="scope">
            <el-tag v-if="scope.$index === 0" type="danger" size="small">
              第{{ scope.$index + 1 }}名
            </el-tag>
            <el-tag v-else-if="scope.$index === 1" type="warning" size="small">
              第{{ scope.$index + 1 }}名
            </el-tag>
            <el-tag v-else-if="scope.$index === 2" type="primary" size="small">
              第{{ scope.$index + 1 }}名
            </el-tag>
            <span v-else>第{{ scope.$index + 1 }}名</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" width="120">
          <template #default="scope">
            <div class="result-name">
              <el-avatar :size="36" style="background-color: #409EFF; margin-right: 10px;">
                {{ scope.row.resume.name.charAt(0) }}
              </el-avatar>
              <div>
                <div class="name-text">{{ scope.row.resume.name }}</div>
                <div class="sub-text">
                  {{ scope.row.resume.education_level || '未知学历' }} | 
                  {{ scope.row.resume.work_years || 0 }}年经验
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total_score" label="总分" width="120">
          <template #default="scope">
            <el-progress 
              :percentage="scope.row.match_result.total_score" 
              :color="getScoreColor(scope.row.match_result.total_score)"
              :stroke-width="18"
              :text-inside="true"
            />
          </template>
        </el-table-column>
        <el-table-column label="分项得分" min-width="300">
          <template #default="scope">
            <div class="score-detail">
              <div class="score-item">
                <span class="score-label">技能</span>
                <el-progress 
                  :percentage="scope.row.match_result.skill_score" 
                  :color="#409EFF"
                  :stroke-width="10"
                  :show-text="true"
                />
              </div>
              <div class="score-item">
                <span class="score-label">经验</span>
                <el-progress 
                  :percentage="scope.row.match_result.experience_score" 
                  :color="#67C23A"
                  :stroke-width="10"
                  :show-text="true"
                />
              </div>
              <div class="score-item">
                <span class="score-label">学历</span>
                <el-progress 
                  :percentage="scope.row.match_result.education_score" 
                  :color="#E6A23C"
                  :stroke-width="10"
                  :show-text="true"
                />
              </div>
              <div class="score-item">
                <span class="score-label">其他</span>
                <el-progress 
                  :percentage="scope.row.match_result.other_score" 
                  :color="#909399"
                  :stroke-width="10"
                  :show-text="true"
                />
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="viewMatchDetail(scope.row)">
              查看详情
            </el-button>
            <el-button type="danger" link size="small" @click="deleteMatchResult(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 查看简历详情对话框 -->
    <el-dialog v-model="showResumeDetail" title="简历详情" width="700px">
      <el-descriptions :column="2" border v-if="currentResume">
        <el-descriptions-item label="姓名">
          <el-tag type="primary">{{ currentResume.name || '未填写' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="性别">
          {{ currentResume.gender || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="电话">
          {{ currentResume.phone || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          {{ currentResume.email || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="最高学历">
          <el-tag type="success">{{ currentResume.education_level || '未填写' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="专业">
          {{ currentResume.major || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="工作年限">
          <el-tag type="warning">{{ currentResume.work_years || 0 }}年</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前职位">
          {{ currentResume.current_position || '未填写' }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider>技能信息</el-divider>
      <div class="skills-container">
        <el-tag
          v-for="(skill, index) in currentResume.skills"
          :key="index"
          style="margin: 5px;"
        >
          {{ skill.skill_name }}
        </el-tag>
        <span v-if="!currentResume.skills || currentResume.skills.length === 0" class="empty-text">
          暂无技能信息
        </span>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  TrendCharts, CircleCheck, Download 
} from '@element-plus/icons-vue'
import { resumeApi, jobApi, matchApi } from '@/api'

const loading = ref(false)
const matching = ref(false)
const jobList = ref([])
const resumeList = ref([])
const matchResults = ref([])
const selectedJobId = ref(null)
const selectedJob = ref(null)
const selectedResumes = ref([])
const showResumeDetail = ref(false)
const currentResume = ref(null)

const sortedMatchResults = computed(() => {
  return [...matchResults.value].sort((a, b) => {
    return b.match_result.total_score - a.match_result.total_score
  })
})

const loadJobList = async () => {
  try {
    const jobs = await jobApi.getList(0, 100)
    jobList.value = jobs || []
  } catch (error) {
    console.error('加载岗位列表失败:', error)
  }
}

const loadResumeList = async () => {
  loading.value = true
  try {
    const resumes = await resumeApi.getList(0, 100)
    resumeList.value = resumes || []
  } catch (error) {
    console.error('加载简历列表失败:', error)
  } finally {
    loading.value = false
  }
}

const onJobChange = (jobId) => {
  const job = jobList.value.find(j => j.id === jobId)
  selectedJob.value = job || null
  // 清空之前的匹配结果
  matchResults.value = []
}

const handleSelectionChange = (selection) => {
  selectedResumes.value = selection
}

const viewResume = (row) => {
  currentResume.value = row
  showResumeDetail.value = true
}

const doMatch = async () => {
  if (!selectedJobId.value || selectedResumes.value.length === 0) {
    ElMessage.warning('请选择岗位和简历进行匹配')
    return
  }
  
  matching.value = true
  
  try {
    const resumeIds = selectedResumes.value.map(r => r.id)
    const results = await matchApi.match(resumeIds, selectedJobId.value)
    
    if (results && results.length > 0) {
      // 获取匹配结果的详细信息
      const detailResults = await matchApi.getJobResults(selectedJobId.value, 0)
      matchResults.value = detailResults || results.map(r => ({
        resume: selectedResumes.value.find(res => res.id === r.resume_id) || {},
        match_result: r
      }))
      
      ElMessage.success(`匹配完成，共 ${results.length} 份简历`)
    } else {
      ElMessage.warning('未获取到匹配结果')
    }
  } catch (error) {
    console.error('匹配失败:', error)
    ElMessage.error('匹配失败，请稍后重试')
  } finally {
    matching.value = false
  }
}

const getScoreColor = (score) => {
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  return '#F56C6C'
}

const viewMatchDetail = (row) => {
  currentResume.value = row.resume
  showResumeDetail.value = true
}

const deleteMatchResult = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${row.resume.name}"的匹配结果吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await matchApi.delete(row.match_result.id)
    matchResults.value = matchResults.value.filter(r => r.match_result.id !== row.match_result.id)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const exportResults = () => {
  ElMessage.info('导出功能开发中...')
}

onMounted(() => {
  loadJobList()
  loadResumeList()
})
</script>

<style scoped>
.match-view {
  max-width: 1400px;
  margin: 0 auto;
}

.header-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: none;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.select-card, .resume-card, .result-card {
  border-radius: 12px;
  border: none;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resume-name {
  display: flex;
  align-items: center;
}

.empty-text {
  color: #909399;
  font-size: 14px;
}

.result-name {
  display: flex;
  align-items: center;
}

.name-text {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.sub-text {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.score-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-label {
  width: 40px;
  font-size: 12px;
  color: #606266;
}

.skills-container {
  display: flex;
  flex-wrap: wrap;
}
</style>
