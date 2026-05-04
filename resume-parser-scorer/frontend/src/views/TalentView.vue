<template>
  <div class="talent-view">
    <el-card class="list-card">
      <template #header>
        <div class="header-row">
          <span class="card-title">人才库管理</span>
          <div class="header-actions">
            <el-select
              v-model="selectedJobId"
              placeholder="选择岗位进行匹配"
              filterable
              style="width: 200px; margin-right: 10px;"
            >
              <el-option
                v-for="job in jobList"
                :key="job.id"
                :label="job.position_name"
                :value="job.id"
              />
            </el-select>
            <el-button 
              type="primary" 
              :disabled="!selectedJobId || selectedResumes.length === 0"
              @click="batchMatch"
              :loading="matching"
            >
              <el-icon><Connection /></el-icon>
              批量匹配
            </el-button>
            <el-button 
              type="danger" 
              :disabled="selectedResumes.length === 0"
              @click="batchDelete"
              :loading="deleting"
            >
              <el-icon><Delete /></el-icon>
              批量删除
            </el-button>
          </div>
        </div>
      </template>

      <el-input
        v-model="searchKeyword"
        placeholder="搜索姓名、公司、职位..."
        style="margin-bottom: 20px; width: 400px;"
        clearable
        @keyup.enter="loadResumes"
        @clear="loadResumes"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
        <template #append>
          <el-button type="primary" @click="loadResumes">
            <el-icon><Search /></el-icon>
          </el-button>
        </template>
      </el-input>

      <el-table
        :data="resumeList"
        style="width: 100%"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" width="100">
          <template #default="scope">
            <span class="name-tag">{{ scope.row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="80" />
        <el-table-column prop="education_level" label="学历" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.education_level" :type="getEduTagType(scope.row.education_level)" size="small">
              {{ scope.row.education_level }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="work_years" label="工作年限" width="100">
          <template #default="scope">
            {{ scope.row.work_years ? scope.row.work_years + '年' : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="current_position" label="当前职位" min-width="150" show-overflow-tooltip />
        <el-table-column prop="current_company" label="当前公司" min-width="150" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="viewDetail(scope.row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button type="warning" link size="small" @click="matchSingle(scope.row)">
              <el-icon><Connection /></el-icon>
              匹配
            </el-button>
            <el-button type="danger" link size="small" @click="deleteResume(scope.row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end;"
        @size-change="loadResumes"
        @current-change="loadResumes"
      />
    </el-card>

    <el-dialog
      v-model="detailVisible"
      title="简历详情"
      width="900px"
    >
      <el-descriptions :column="3" border v-if="currentResume">
        <el-descriptions-item label="姓名">{{ currentResume.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ currentResume.gender || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ currentResume.phone || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ currentResume.email || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="现居地址">{{ currentResume.current_address || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="工作年限">{{ currentResume.work_years || 0 }}年</el-descriptions-item>
        <el-descriptions-item label="最高学历">{{ currentResume.education_level || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="专业">{{ currentResume.major || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="毕业院校">{{ currentResume.university || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="当前职位">{{ currentResume.current_position || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="当前公司">{{ currentResume.current_company || '未提取' }}</el-descriptions-item>
        <el-descriptions-item label="期望薪资">{{ currentResume.expected_salary || '未提取' }}</el-descriptions-item>
      </el-descriptions>

      <el-tabs v-model="detailTab" style="margin-top: 20px;">
        <el-tab-pane label="技能标签" name="skills">
          <el-empty v-if="!currentResume?.skills || currentResume.skills.length === 0" description="暂无技能信息" />
          <div v-else class="skills-container">
            <el-tag
              v-for="(skill, index) in currentResume.skills"
              :key="index"
              :type="skillTagTypes[index % skillTagTypes.length]"
              size="large"
              effect="dark"
              class="skill-tag"
            >
              {{ skill.skill_name }}
              <span v-if="skill.years > 0" class="skill-years">({{ skill.years }}年)</span>
            </el-tag>
          </div>
        </el-tab-pane>

        <el-tab-pane label="工作经历" name="experience">
          <el-empty v-if="!currentResume?.work_experiences || currentResume.work_experiences.length === 0" description="暂无工作经历" />
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
                <p class="description" v-if="exp.description">{{ exp.description }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <el-tab-pane label="教育经历" name="education">
          <el-empty v-if="!currentResume?.educations || currentResume.educations.length === 0" description="暂无教育经历" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="(edu, index) in currentResume.educations"
              :key="index"
              :timestamp="formatDateRange(edu.start_date, edu.end_date, false)"
              placement="top"
              type="success"
            >
              <el-card shadow="hover">
                <h4>{{ edu.university }}</h4>
                <p class="degree">{{ edu.degree }} · {{ edu.major }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <el-tab-pane label="匹配历史" name="match">
          <el-empty v-if="matchHistory.length === 0" description="暂无匹配记录" />
          <el-table v-else :data="matchHistory" stripe>
            <el-table-column label="岗位名称" prop="position_name" />
            <el-table-column label="总分" width="100">
              <template #default="scope">
                <el-progress
                  :percentage="Math.round(scope.row.total_score)"
                  :color="getScoreColor(scope.row.total_score)"
                  :stroke-width="16"
                />
              </template>
            </el-table-column>
            <el-table-column label="技能分" prop="skill_score" width="80" />
            <el-table-column label="经验分" prop="experience_score" width="80" />
            <el-table-column label="学历分" prop="education_score" width="80" />
            <el-table-column label="其他分" prop="other_score" width="80" />
            <el-table-column label="匹配时间" prop="created_at" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog
      v-model="matchDialogVisible"
      title="选择岗位进行匹配"
      width="500px"
    >
      <el-select
        v-model="matchJobId"
        placeholder="请选择岗位"
        style="width: 100%;"
        filterable
      >
        <el-option
          v-for="job in jobList"
          :key="job.id"
          :label="job.position_name"
          :value="job.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="matchDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!matchJobId" @click="executeMatch">
          开始匹配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, View, Connection, Delete 
} from '@element-plus/icons-vue'
import { resumeApi, jobApi, matchApi } from '../api'

const resumeList = ref([])
const jobList = ref([])
const loading = ref(false)
const matching = ref(false)
const deleting = ref(false)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const selectedResumes = ref([])
const selectedJobId = ref(null)

const detailVisible = ref(false)
const detailTab = ref('skills')
const currentResume = ref(null)
const matchHistory = ref([])

const matchDialogVisible = ref(false)
const matchJobId = ref(null)
const matchResumeId = ref(null)

const skillTagTypes = ['primary', 'success', 'info', 'warning', 'danger']

const loadResumes = async () => {
  loading.value = true
  try {
    const res = await resumeApi.list(
      (currentPage.value - 1) * pageSize.value,
      pageSize.value,
      searchKeyword.value
    )
    resumeList.value = res.data
    total.value = res.data.length < pageSize.value 
      ? (currentPage.value - 1) * pageSize.value + res.data.length 
      : currentPage.value * pageSize.value + 1
  } catch (error) {
    console.error('加载简历列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadJobs = async () => {
  try {
    const res = await jobApi.list(0, 100)
    jobList.value = res.data
  } catch (error) {
    console.error('加载岗位列表失败:', error)
  }
}

const handleSelectionChange = (selection) => {
  selectedResumes.value = selection
}

const getEduTagType = (level) => {
  const types = {
    '高中': 'info',
    '大专': 'warning',
    '本科': 'primary',
    '硕士': 'success',
    '博士': 'danger'
  }
  return types[level] || 'info'
}

const getScoreColor = (score) => {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

const viewDetail = async (row) => {
  try {
    const res = await resumeApi.get(row.id)
    currentResume.value = res.data
    
    const historyRes = await matchApi.history(row.id)
    matchHistory.value = historyRes.data.history || []
    
    detailVisible.value = true
  } catch (error) {
    console.error('获取简历详情失败:', error)
  }
}

const matchSingle = (row) => {
  matchResumeId.value = row.id
  matchJobId.value = null
  matchDialogVisible.value = true
}

const executeMatch = async () => {
  if (!matchJobId.value) {
    ElMessage.warning('请选择岗位')
    return
  }

  matching.value = true
  try {
    const res = await matchApi.calculate(matchResumeId.value, matchJobId.value)
    
    if (res.data.success) {
      ElMessage.success('匹配完成')
      matchDialogVisible.value = false
    }
  } catch (error) {
    console.error('匹配失败:', error)
  } finally {
    matching.value = false
  }
}

const batchMatch = async () => {
  if (!selectedJobId.value) {
    ElMessage.warning('请先选择岗位')
    return
  }

  if (selectedResumes.value.length === 0) {
    ElMessage.warning('请选择要匹配的简历')
    return
  }

  matching.value = true
  try {
    const resumeIds = selectedResumes.value.map(r => r.id)
    const res = await matchApi.batch(resumeIds, selectedJobId.value)
    
    ElMessage.success(`匹配完成，共 ${res.data.results.length} 份简历`)
  } catch (error) {
    console.error('批量匹配失败:', error)
  } finally {
    matching.value = false
  }
}

const deleteResume = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除简历「${row.name}」吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await resumeApi.delete(row.id)
    ElMessage.success('删除成功')
    loadResumes()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

const batchDelete = async () => {
  if (selectedResumes.value.length === 0) {
    ElMessage.warning('请选择要删除的简历')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedResumes.value.length} 份简历吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    deleting.value = true
    for (const resume of selectedResumes.value) {
      await resumeApi.delete(resume.id)
    }
    
    ElMessage.success('批量删除成功')
    selectedResumes.value = []
    loadResumes()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
    }
  } finally {
    deleting.value = false
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  if (typeof date === 'string') {
    return date.substring(0, 19).replace('T', ' ')
  }
  return new Date(date).toLocaleString('zh-CN')
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
  loadResumes()
  loadJobs()
})
</script>

<style scoped>
.talent-view {
  max-width: 1400px;
  margin: 0 auto;
}

.list-card {
  border-radius: 12px;
  border: none;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.name-tag {
  color: #409EFF;
  font-weight: 500;
}

.skills-container {
  padding: 10px;
}

.skill-tag {
  margin: 5px;
}

.skill-years {
  margin-left: 5px;
  opacity: 0.8;
}

h4 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 16px;
}

.position, .degree {
  margin: 0 0 8px 0;
  color: #409EFF;
  font-size: 14px;
}

.description {
  margin: 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

:deep(.el-descriptions__label) {
  width: 100px;
}
</style>
