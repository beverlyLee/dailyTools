<template>
  <div class="job-view">
    <el-card class="list-card">
      <template #header>
        <div class="header-row">
          <span class="card-title">岗位管理</span>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            新建岗位
          </el-button>
        </div>
      </template>

      <el-input
        v-model="searchKeyword"
        placeholder="搜索岗位名称或部门..."
        style="margin-bottom: 20px; width: 300px;"
        clearable
        @keyup.enter="loadJobs"
        @clear="loadJobs"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-table :data="jobList" style="width: 100%" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="position_name" label="岗位名称" min-width="180">
          <template #default="scope">
            <span class="position-name">{{ scope.row.position_name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="所属部门" width="120" />
        <el-table-column prop="location" label="工作地点" width="120" />
        <el-table-column prop="salary_range" label="薪资范围" width="120" />
        <el-table-column prop="education_requirement" label="学历要求" width="100" />
        <el-table-column prop="work_years_requirement" label="经验要求" width="100" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="viewJob(scope.row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button type="primary" link size="small" @click="editJob(scope.row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="deleteJob(scope.row)">
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
        @size-change="loadJobs"
        @current-change="loadJobs"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="formData"
        :rules="formRules"
        ref="formRef"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="岗位名称" prop="position_name">
              <el-input v-model="formData.position_name" placeholder="请输入岗位名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属部门">
              <el-input v-model="formData.department" placeholder="请输入所属部门" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工作地点">
              <el-input v-model="formData.location" placeholder="请输入工作地点" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="薪资范围">
              <el-input v-model="formData.salary_range" placeholder="例如：15-25K" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="学历要求">
              <el-select v-model="formData.education_requirement" placeholder="请选择学历要求" style="width: 100%">
                <el-option label="不限" value="" />
                <el-option label="高中" value="高中" />
                <el-option label="大专" value="大专" />
                <el-option label="本科" value="本科" />
                <el-option label="硕士" value="硕士" />
                <el-option label="博士" value="博士" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经验要求">
              <el-select v-model="formData.work_years_requirement" placeholder="请选择经验要求" style="width: 100%">
                <el-option label="不限" value="" />
                <el-option label="应届毕业生" value="应届" />
                <el-option label="1年以上" value="1年以上" />
                <el-option label="1-3年" value="1-3年" />
                <el-option label="3-5年" value="3-5年" />
                <el-option label="5-10年" value="5-10年" />
                <el-option label="10年以上" value="10年以上" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="所需技能">
          <el-input
            v-model="formData.required_skills"
            type="textarea"
            :rows="3"
            placeholder="请输入所需技能，例如：必须: Python、Java、Vue；优先: React、Go；加分: 英语"
          />
        </el-form-item>

        <el-form-item label="岗位职责">
          <el-input
            v-model="formData.responsibilities"
            type="textarea"
            :rows="4"
            placeholder="请输入岗位职责"
          />
        </el-form-item>

        <el-form-item label="任职要求">
          <el-input
            v-model="formData.requirements"
            type="textarea"
            :rows="4"
            placeholder="请输入任职要求"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailVisible"
      title="岗位详情"
      width="700px"
    >
      <el-descriptions :column="2" border v-if="currentJob">
        <el-descriptions-item label="岗位名称">{{ currentJob.position_name }}</el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ currentJob.department || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="工作地点">{{ currentJob.location || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="薪资范围">{{ currentJob.salary_range || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="学历要求">{{ currentJob.education_requirement || '不限' }}</el-descriptions-item>
        <el-descriptions-item label="经验要求">{{ currentJob.work_years_requirement || '不限' }}</el-descriptions-item>
        <el-descriptions-item label="所需技能" :span="2">
          {{ currentJob.required_skills || '未设置' }}
        </el-descriptions-item>
        <el-descriptions-item label="岗位职责" :span="2">
          {{ currentJob.responsibilities || '未设置' }}
        </el-descriptions-item>
        <el-descriptions-item label="任职要求" :span="2">
          {{ currentJob.requirements || '未设置' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, Search, View, Edit, Delete 
} from '@element-plus/icons-vue'
import { jobApi } from '../api'

const jobList = ref([])
const loading = ref(false)
const saving = ref(false)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const dialogVisible = ref(false)
const detailVisible = ref(false)
const dialogTitle = ref('新建岗位')
const isEdit = ref(false)
const currentJob = ref(null)
const formRef = ref(null)

const formData = reactive({
  position_name: '',
  department: '',
  location: '',
  salary_range: '',
  required_skills: '',
  education_requirement: '',
  work_years_requirement: '',
  responsibilities: '',
  requirements: ''
})

const formRules = {
  position_name: [
    { required: true, message: '请输入岗位名称', trigger: 'blur' }
  ]
}

const loadJobs = async () => {
  loading.value = true
  try {
    const res = await jobApi.list(
      (currentPage.value - 1) * pageSize.value,
      pageSize.value,
      searchKeyword.value
    )
    jobList.value = res.data
    total.value = res.data.length < pageSize.value 
      ? (currentPage.value - 1) * pageSize.value + res.data.length 
      : currentPage.value * pageSize.value + 1
  } catch (error) {
    console.error('加载岗位列表失败:', error)
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  dialogTitle.value = '新建岗位'
  resetForm()
  dialogVisible.value = true
}

const resetForm = () => {
  formData.position_name = ''
  formData.department = ''
  formData.location = ''
  formData.salary_range = ''
  formData.required_skills = ''
  formData.education_requirement = ''
  formData.work_years_requirement = ''
  formData.responsibilities = ''
  formData.requirements = ''
}

const viewJob = (row) => {
  currentJob.value = row
  detailVisible.value = true
}

const editJob = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑岗位'
  currentJob.value = row
  
  formData.position_name = row.position_name
  formData.department = row.department || ''
  formData.location = row.location || ''
  formData.salary_range = row.salary_range || ''
  formData.required_skills = row.required_skills || ''
  formData.education_requirement = row.education_requirement || ''
  formData.work_years_requirement = row.work_years_requirement || ''
  formData.responsibilities = row.responsibilities || ''
  formData.requirements = row.requirements || ''
  
  dialogVisible.value = true
}

const deleteJob = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除岗位「${row.position_name}」吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await jobApi.delete(row.id)
    ElMessage.success('删除成功')
    loadJobs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        if (isEdit.value) {
          await jobApi.update(currentJob.value.id, formData)
          ElMessage.success('更新成功')
        } else {
          await jobApi.create(formData)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadJobs()
      } catch (error) {
        console.error('保存失败:', error)
      } finally {
        saving.value = false
      }
    }
  })
}

const formatDate = (date) => {
  if (!date) return '-'
  if (typeof date === 'string') {
    return date.substring(0, 19).replace('T', ' ')
  }
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadJobs()
})
</script>

<style scoped>
.job-view {
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

.position-name {
  color: #409EFF;
  font-weight: 500;
}

:deep(.el-descriptions__label) {
  width: 100px;
}
</style>
