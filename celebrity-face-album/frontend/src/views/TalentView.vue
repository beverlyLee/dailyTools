<template>
  <div class="talent-view">
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="header-title">
          <el-icon size="24" color="#909399"><User /></el-icon>
          <h2>人才库</h2>
        </div>
        <div class="header-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索姓名、职位、公司..."
            style="width: 300px; margin-right: 10px;"
            clearable
            @keyup.enter="searchTalents"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="searchTalents">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="list-card" shadow="hover">
      <el-table
        :data="filteredTalents"
        style="width: 100%"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="姓名" width="120">
          <template #default="scope">
            <div class="talent-name">
              <el-avatar :size="40" style="background-color: #409EFF; margin-right: 10px;">
                {{ scope.row.name.charAt(0) }}
              </el-avatar>
              <div>
                <div class="name-text">{{ scope.row.name }}</div>
                <div class="gender-text">{{ scope.row.gender || '未填写' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="130">
          <template #default="scope">
            <el-tag v-if="scope.row.phone" type="info" size="small">
              {{ scope.row.phone }}
            </el-tag>
            <span v-else class="empty-text">未填写</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180">
          <template #default="scope">
            <span v-if="scope.row.email">{{ scope.row.email }}</span>
            <span v-else class="empty-text">未填写</span>
          </template>
        </el-table-column>
        <el-table-column prop="education_level" label="学历" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.education_level" type="success" size="small">
              {{ scope.row.education_level }}
            </el-tag>
            <span v-else class="empty-text">未知</span>
          </template>
        </el-table-column>
        <el-table-column prop="work_years" label="工作年限" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.work_years && scope.row.work_years > 0" type="warning" size="small">
              {{ scope.row.work_years }}年
            </el-tag>
            <span v-else class="empty-text">应届生</span>
          </template>
        </el-table-column>
        <el-table-column prop="current_position" label="当前职位" width="150">
          <template #default="scope">
            <span v-if="scope.row.current_position">{{ scope.row.current_position }}</span>
            <span v-else class="empty-text">未填写</span>
          </template>
        </el-table-column>
        <el-table-column prop="current_company" label="当前公司" min-width="150">
          <template #default="scope">
            <span v-if="scope.row.current_company">{{ scope.row.current_company }}</span>
            <span v-else class="empty-text">未填写</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="入库时间" width="170">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="viewDetail(scope.row)">
              详情
            </el-button>
            <el-button type="warning" link size="small" @click="matchWithJob(scope.row)">
              匹配
            </el-button>
            <el-button type="danger" link size="small" @click="deleteTalent(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-if="filteredTalents.length === 0 && !loading" description="暂无人才数据" />
      
      <div v-if="selectedTalents.length > 0" class="batch-actions">
        <span>已选择 <el-tag type="primary">{{ selectedTalents.length }}</el-tag> 人</span>
        <el-button type="primary" @click="batchMatch">
          <el-icon><TrendCharts /></el-icon>
          批量匹配
        </el-button>
        <el-button type="danger" @click="batchDelete">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>
    </el-card>

    <!-- 查看简历详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="简历详情" width="800px">
      <el-descriptions :column="2" border v-if="currentTalent">
        <el-descriptions-item label="姓名">
          <el-tag type="primary">{{ currentTalent.name || '未填写' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="性别">
          {{ currentTalent.gender || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="电话">
          {{ currentTalent.phone || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          {{ currentTalent.email || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="现居地址">
          {{ currentTalent.current_address || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="最高学历">
          <el-tag type="success">{{ currentTalent.education_level || '未填写' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="专业">
          {{ currentTalent.major || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="毕业院校">
          {{ currentTalent.university || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="工作年限">
          <el-tag type="warning">{{ currentTalent.work_years || 0 }}年</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前职位">
          {{ currentTalent.current_position || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="当前公司">
          {{ currentTalent.current_company || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="期望薪资">
          <el-tag type="danger">{{ currentTalent.expected_salary || '未填写' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="期望职位">
          {{ currentTalent.expected_position || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="入库时间">
          {{ formatDate(currentTalent.created_at) }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider>技能信息</el-divider>
      <div class="skills-container">
        <el-tag
          v-for="(skill, index) in currentTalent?.skills"
          :key="index"
          style="margin: 5px;"
        >
          {{ skill.skill_name }}
          <span v-if="skill.proficiency" class="proficiency">
            ({{ skill.proficiency }})
          </span>
        </el-tag>
        <span v-if="!currentTalent?.skills || currentTalent.skills.length === 0" class="empty-text">
          暂无技能信息
        </span>
      </div>
      
      <el-divider>工作经历</el-divider>
      <el-timeline v-if="currentTalent?.work_experiences && currentTalent.work_experiences.length > 0">
        <el-timeline-item
          v-for="(exp, index) in currentTalent.work_experiences"
          :key="index"
          :timestamp="formatDateRange(exp.start_date, exp.end_date, exp.is_current)"
          placement="top"
        >
          <el-card shadow="hover">
            <h4>{{ exp.company_name || '未知公司' }}</h4>
            <p><strong>职位：</strong>{{ exp.position || '未知职位' }}</p>
            <p v-if="exp.description">
              <strong>工作描述：</strong>{{ exp.description }}
            </p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无工作经历" :image-size="60" />
      
      <el-divider>教育经历</el-divider>
      <el-timeline v-if="currentTalent?.educations && currentTalent.educations.length > 0">
        <el-timeline-item
          v-for="(edu, index) in currentTalent.educations"
          :key="index"
          :timestamp="formatDateRange(edu.start_date, edu.end_date, false)"
          placement="top"
        >
          <el-card shadow="hover">
            <h4>{{ edu.university || '未知学校' }}</h4>
            <p><strong>学历：</strong>{{ edu.degree || '未知学历' }}</p>
            <p><strong>专业：</strong>{{ edu.major || '未知专业' }}</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无教育经历" :image-size="60" />
      
      <el-divider>匹配历史</el-divider>
      <el-table
        :data="matchHistory"
        style="width: 100%"
        v-loading="loadingHistory"
        size="small"
      >
        <el-table-column prop="total_score" label="匹配分数" width="120">
          <template #default="scope">
            <el-progress 
              :percentage="scope.row.total_score" 
              :color="getScoreColor(scope.row.total_score)"
              :stroke-width="12"
              :text-inside="true"
            />
          </template>
        </el-table-column>
        <el-table-column prop="skill_score" label="技能得分" width="100">
          <template #default="scope">
            {{ scope.row.skill_score }}分
          </template>
        </el-table-column>
        <el-table-column prop="experience_score" label="经验得分" width="100">
          <template #default="scope">
            {{ scope.row.experience_score }}分
          </template>
        </el-table-column>
        <el-table-column prop="education_score" label="学历得分" width="100">
          <template #default="scope">
            {{ scope.row.education_score }}分
          </template>
        </el-table-column>
        <el-table-column prop="other_score" label="其他得分" width="100">
          <template #default="scope">
            {{ scope.row.other_score }}分
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="匹配时间" width="170">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 匹配岗位对话框 -->
    <el-dialog v-model="showMatchDialog" title="选择岗位进行匹配" width="500px">
      <el-form label-width="80px">
        <el-form-item label="选择岗位">
          <el-select
            v-model="selectedJobId"
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
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMatchDialog = false">取消</el-button>
        <el-button type="primary" :loading="matching" @click="doMatch">
          开始匹配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  User, Search, Refresh, TrendCharts, Delete 
} from '@element-plus/icons-vue'
import { resumeApi, jobApi, matchApi } from '@/api'

const loading = ref(false)
const loadingHistory = ref(false)
const matching = ref(false)
const talentList = ref([])
const jobList = ref([])
const matchHistory = ref([])
const searchKeyword = ref('')
const selectedTalents = ref([])
const currentTalent = ref(null)
const showDetailDialog = ref(false)
const showMatchDialog = ref(false)
const selectedJobId = ref(null)

const filteredTalents = computed(() => {
  if (!searchKeyword.value) {
    return talentList.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return talentList.value.filter(talent => {
    return (
      (talent.name && talent.name.toLowerCase().includes(keyword)) ||
      (talent.current_position && talent.current_position.toLowerCase().includes(keyword)) ||
      (talent.current_company && talent.current_company.toLowerCase().includes(keyword)) ||
      (talent.major && talent.major.toLowerCase().includes(keyword))
    )
  })
})

const loadTalentList = async () => {
  loading.value = true
  try {
    const talents = await resumeApi.getList(0, 100)
    talentList.value = talents || []
  } catch (error) {
    console.error('加载人才列表失败:', error)
    ElMessage.error('加载人才列表失败')
  } finally {
    loading.value = false
  }
}

const loadJobList = async () => {
  try {
    const jobs = await jobApi.getList(0, 100)
    jobList.value = jobs || []
  } catch (error) {
    console.error('加载岗位列表失败:', error)
  }
}

const searchTalents = () => {
  ElMessage.info(`搜索关键词: ${searchKeyword.value}`)
}

const resetSearch = () => {
  searchKeyword.value = ''
}

const handleSelectionChange = (selection) => {
  selectedTalents.value = selection
}

const viewDetail = async (row) => {
  loadingHistory.value = true
  try {
    const detail = await resumeApi.getDetail(row.id)
    currentTalent.value = detail || row
    
    // 加载匹配历史
    const history = await matchApi.getResumeHistory(row.id)
    matchHistory.value = history || []
  } catch (error) {
    console.error('加载简历详情失败:', error)
    currentTalent.value = row
    matchHistory.value = []
  } finally {
    loadingHistory.value = false
  }
  showDetailDialog.value = true
}

const matchWithJob = (row) => {
  currentTalent.value = row
  selectedJobId.value = null
  showMatchDialog.value = true
}

const batchMatch = () => {
  if (selectedTalents.value.length === 0) {
    ElMessage.warning('请先选择要匹配的人才')
    return
  }
  currentTalent.value = selectedTalents.value[0]
  selectedJobId.value = null
  showMatchDialog.value = true
}

const doMatch = async () => {
  if (!selectedJobId.value) {
    ElMessage.warning('请选择岗位')
    return
  }
  
  matching.value = true
  
  try {
    let resumeIds = []
    if (selectedTalents.value.length > 0) {
      resumeIds = selectedTalents.value.map(t => t.id)
    } else if (currentTalent.value) {
      resumeIds = [currentTalent.value.id]
    }
    
    if (resumeIds.length === 0) {
      ElMessage.warning('没有可匹配的简历')
      return
    }
    
    await matchApi.match(resumeIds, selectedJobId.value)
    ElMessage.success('匹配成功')
    showMatchDialog.value = false
  } catch (error) {
    console.error('匹配失败:', error)
    ElMessage.error('匹配失败')
  } finally {
    matching.value = false
  }
}

const deleteTalent = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除人才"${row.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await resumeApi.delete(row.id)
    talentList.value = talentList.value.filter(t => t.id !== row.id)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const batchDelete = async () => {
  if (selectedTalents.value.length === 0) {
    ElMessage.warning('请先选择要删除的人才')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedTalents.value.length} 位人才吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    for (const talent of selectedTalents.value) {
      await resumeApi.delete(talent.id)
    }
    
    talentList.value = talentList.value.filter(t => !selectedTalents.value.some(st => st.id === t.id))
    selectedTalents.value = []
    ElMessage.success('批量删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const formatDate = (date) => {
  if (!date) return '未知'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatDateRange = (startDate, endDate, isCurrent) => {
  const formatDate = (date) => {
    if (!date) return '未知'
    const d = new Date(date)
    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  }
  
  const start = formatDate(startDate)
  const end = isCurrent ? '至今' : formatDate(endDate)
  
  return `${start} - ${end}`
}

const getScoreColor = (score) => {
  if (score >= 80) return '#67C23A'
  if (score >= 60) return '#E6A23C'
  return '#F56C6C'
}

onMounted(() => {
  loadTalentList()
  loadJobList()
})
</script>

<style scoped>
.talent-view {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.list-card {
  border-radius: 12px;
  border: none;
}

.talent-name {
  display: flex;
  align-items: center;
}

.name-text {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.gender-text {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.empty-text {
  color: #909399;
  font-size: 14px;
}

.batch-actions {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #EBEEF5;
  display: flex;
  align-items: center;
  gap: 15px;
}

.skills-container {
  display: flex;
  flex-wrap: wrap;
}

.proficiency {
  font-size: 12px;
  color: #909399;
  margin-left: 5px;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 13px;
  color: #909399;
}

:deep(.el-card) {
  border-radius: 8px;
}

:deep(.el-card h4) {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
}

:deep(.el-card p) {
  margin: 5px 0;
  font-size: 14px;
  color: #606266;
}
</style>
