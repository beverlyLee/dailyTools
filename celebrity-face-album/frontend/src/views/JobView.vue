<template>
  <div class="job-view">
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="header-title">
          <el-icon size="24" color="#67C23A"><OfficeBuilding /></el-icon>
          <h2>岗位管理</h2>
        </div>
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          新建岗位
        </el-button>
      </div>
    </el-card>

    <el-card class="list-card" shadow="hover">
      <el-table :data="jobList" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="position_name" label="岗位名称" width="200">
          <template #default="scope">
            <div class="position-name">
              <el-tag type="primary" size="small">{{ scope.row.position_name }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="所属部门" width="150" />
        <el-table-column prop="location" label="工作地点" width="120" />
        <el-table-column prop="salary_range" label="薪资范围" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.salary_range" type="warning" size="small">
              {{ scope.row.salary_range }}
            </el-tag>
            <span v-else class="empty-text">薪资面议</span>
          </template>
        </el-table-column>
        <el-table-column prop="education_requirement" label="学历要求" width="100" />
        <el-table-column prop="work_years_requirement" label="经验要求" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="viewJob(scope.row)">
              查看
            </el-button>
            <el-button type="warning" link size="small" @click="editJob(scope.row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="deleteJob(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-if="jobList.length === 0 && !loading" description="暂无岗位数据" />
    </el-card>

    <!-- 新建/编辑岗位对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingJob ? '编辑岗位' : '新建岗位'"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="jobFormRef"
        :model="jobForm"
        :rules="jobRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="岗位名称" prop="position_name">
              <el-input v-model="jobForm.position_name" placeholder="请输入岗位名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属部门" prop="department">
              <el-input v-model="jobForm.department" placeholder="请输入所属部门" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工作地点" prop="location">
              <el-input v-model="jobForm.location" placeholder="请输入工作地点" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="薪资范围" prop="salary_range">
              <el-input v-model="jobForm.salary_range" placeholder="例如：15K-25K" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="学历要求" prop="education_requirement">
              <el-select v-model="jobForm.education_requirement" placeholder="请选择学历要求" style="width: 100%;">
                <el-option label="不限" value="不限" />
                <el-option label="高中" value="高中" />
                <el-option label="大专" value="大专" />
                <el-option label="本科" value="本科" />
                <el-option label="硕士" value="硕士" />
                <el-option label="博士" value="博士" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经验要求" prop="work_years_requirement">
              <el-select v-model="jobForm.work_years_requirement" placeholder="请选择经验要求" style="width: 100%;">
                <el-option label="不限" value="不限" />
                <el-option label="应届毕业生" value="应届毕业生" />
                <el-option label="1年以内" value="1年以内" />
                <el-option label="1-3年" value="1-3年" />
                <el-option label="3-5年" value="3-5年" />
                <el-option label="5-10年" value="5-10年" />
                <el-option label="10年以上" value="10年以上" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="所需技能" prop="required_skills">
          <el-input
            v-model="jobForm.required_skills"
            type="textarea"
            :rows="3"
            placeholder="请输入所需技能，多个技能用逗号分隔，例如：Java, Spring Boot, MySQL"
          />
        </el-form-item>
        
        <el-form-item label="任职要求" prop="requirements">
          <el-input
            v-model="jobForm.requirements"
            type="textarea"
            :rows="4"
            placeholder="请输入任职要求"
          />
        </el-form-item>
        
        <el-form-item label="岗位职责" prop="responsibilities">
          <el-input
            v-model="jobForm.responsibilities"
            type="textarea"
            :rows="4"
            placeholder="请输入岗位职责"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveJob">
          {{ saving ? '保存中...' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看岗位详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="岗位详情"
      width="700px"
    >
      <el-descriptions :column="2" border v-if="currentJob">
        <el-descriptions-item label="岗位名称">
          <el-tag type="primary">{{ currentJob.position_name || '未填写' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="所属部门">
          {{ currentJob.department || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="工作地点">
          {{ currentJob.location || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="薪资范围">
          <el-tag type="warning">{{ currentJob.salary_range || '薪资面议' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="学历要求">
          {{ currentJob.education_requirement || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="经验要求">
          {{ currentJob.work_years_requirement || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">
          {{ formatDate(currentJob.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="所需技能" :span="2">
          <div class="skills-tags">
            <el-tag
              v-for="(skill, index) in parseSkills(currentJob.required_skills)"
              :key="index"
              size="small"
              style="margin: 3px;"
            >
              {{ skill }}
            </el-tag>
            <span v-if="!currentJob.required_skills" class="empty-text">未填写</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="任职要求" :span="2">
          <div class="text-content">
            {{ currentJob.requirements || '未填写' }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="岗位职责" :span="2">
          <div class="text-content">
            {{ currentJob.responsibilities || '未填写' }}
          </div>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { OfficeBuilding, Plus } from '@element-plus/icons-vue'
import { jobApi } from '@/api'

const loading = ref(false)
const saving = ref(false)
const jobList = ref([])
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const editingJob = ref(null)
const currentJob = ref(null)
const jobFormRef = ref(null)

const jobForm = reactive({
  position_name: '',
  department: '',
  location: '',
  salary_range: '',
  education_requirement: '',
  work_years_requirement: '',
  required_skills: '',
  requirements: '',
  responsibilities: ''
})

const jobRules = {
  position_name: [
    { required: true, message: '请输入岗位名称', trigger: 'blur' }
  ]
}

const loadJobList = async () => {
  loading.value = true
  try {
    const jobs = await jobApi.getList(0, 100)
    jobList.value = jobs || []
  } catch (error) {
    console.error('加载岗位列表失败:', error)
    ElMessage.error('加载岗位列表失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  jobForm.position_name = ''
  jobForm.department = ''
  jobForm.location = ''
  jobForm.salary_range = ''
  jobForm.education_requirement = ''
  jobForm.work_years_requirement = ''
  jobForm.required_skills = ''
  jobForm.requirements = ''
  jobForm.responsibilities = ''
  editingJob.value = null
}

const viewJob = (row) => {
  currentJob.value = row
  showDetailDialog.value = true
}

const editJob = (row) => {
  editingJob.value = row
  jobForm.position_name = row.position_name || ''
  jobForm.department = row.department || ''
  jobForm.location = row.location || ''
  jobForm.salary_range = row.salary_range || ''
  jobForm.education_requirement = row.education_requirement || ''
  jobForm.work_years_requirement = row.work_years_requirement || ''
  jobForm.required_skills = row.required_skills || ''
  jobForm.requirements = row.requirements || ''
  jobForm.responsibilities = row.responsibilities || ''
  showAddDialog.value = true
}

const deleteJob = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除岗位"${row.position_name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await jobApi.delete(row.id)
    ElMessage.success('删除成功')
    loadJobList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const saveJob = async () => {
  if (!jobFormRef.value) return
  
  await jobFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        if (editingJob.value) {
          await jobApi.update(editingJob.value.id, jobForm)
          ElMessage.success('更新成功')
        } else {
          await jobApi.create(jobForm)
          ElMessage.success('创建成功')
        }
        showAddDialog.value = false
        resetForm()
        loadJobList()
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error('保存失败')
      } finally {
        saving.value = false
      }
    }
  })
}

const formatDate = (date) => {
  if (!date) return '未知'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const parseSkills = (skillsStr) => {
  if (!skillsStr) return []
  return skillsStr.split(/[,，]/).map(s => s.trim()).filter(s => s)
}

onMounted(() => {
  loadJobList()
})
</script>

<style scoped>
.job-view {
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

.list-card {
  border-radius: 12px;
  border: none;
}

.position-name {
  display: flex;
  align-items: center;
}

.empty-text {
  color: #909399;
  font-size: 14px;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
}

.text-content {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #606266;
}
</style>
