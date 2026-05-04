<template>
  <div class="resume-view">
    <el-card class="upload-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span><el-icon color="#409EFF"><Upload /></el-icon> 上传简历</span>
        </div>
      </template>
      
      <el-upload
        class="upload-dragger"
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
        :on-exceed="handleExceed"
        :file-list="fileList"
        accept=".pdf,.doc,.docx"
      >
        <el-icon class="el-icon--upload" size="48"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 PDF、DOC、DOCX 格式，单个文件不超过 10MB
          </div>
        </template>
      </el-upload>
      
      <div v-if="uploadedFile" class="file-info">
        <el-alert
          :title="`已选择文件: ${uploadedFile.name}`"
          type="success"
          :closable="false"
          show-icon
        >
          <template #default>
            <span>文件大小: {{ formatFileSize(uploadedFile.size) }}</span>
          </template>
        </el-alert>
        
        <div class="upload-actions">
          <el-button type="primary" :loading="parsing" @click="uploadAndParse">
            <el-icon v-if="!parsing"><Upload /></el-icon>
            <el-icon v-else class="is-loading"><Loading /></el-icon>
            {{ parsing ? '解析中...' : '上传并解析' }}
          </el-button>
          <el-button @click="clearFile">
            重新选择
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card v-if="parsedData" class="result-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span><el-icon color="#67C23A"><CircleCheck /></el-icon> 解析结果</span>
          <el-button type="primary" size="small" @click="saveResume">
            <el-icon><Plus /></el-icon>
            保存到人才库
          </el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="姓名">
              <el-tag type="primary">{{ parsedData.name || '未识别' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="性别">
              {{ parsedData.gender || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="电话">
              {{ parsedData.phone || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">
              {{ parsedData.email || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="现居地址">
              {{ parsedData.current_address || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="出生日期">
              {{ parsedData.date_of_birth || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="最高学历">
              <el-tag type="success">{{ parsedData.education_level || '未识别' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="专业">
              {{ parsedData.major || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="毕业院校">
              {{ parsedData.university || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="工作年限">
              <el-tag type="warning">{{ parsedData.work_years || 0 }}年</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="当前职位">
              {{ parsedData.current_position || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="当前公司">
              {{ parsedData.current_company || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="期望薪资">
              <el-tag type="danger">{{ parsedData.expected_salary || '未识别' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="期望职位">
              {{ parsedData.expected_position || '未识别' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        
        <el-tab-pane label="技能信息" name="skills">
          <el-empty v-if="!parsedData.skills || parsedData.skills.length === 0" description="未识别到技能信息" />
          <div v-else class="skills-container">
            <el-tag
              v-for="(skill, index) in parsedData.skills"
              :key="index"
              :type="getSkillTagType(skill.proficiency)"
              closable
              class="skill-tag"
            >
              {{ skill.skill_name }}
              <span v-if="skill.proficiency" class="proficiency">
                ({{ skill.proficiency }})
              </span>
              <span v-if="skill.years && skill.years > 0" class="years">
                {{ skill.years }}年
              </span>
            </el-tag>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="工作经历" name="experience">
          <el-empty v-if="!parsedData.work_experiences || parsedData.work_experiences.length === 0" description="未识别到工作经历" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="(exp, index) in parsedData.work_experiences"
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
        </el-tab-pane>
        
        <el-tab-pane label="教育经历" name="education">
          <el-empty v-if="!parsedData.educations || parsedData.educations.length === 0" description="未识别到教育经历" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="(edu, index) in parsedData.educations"
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
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Upload, UploadFilled, CircleCheck, Plus, Loading 
} from '@element-plus/icons-vue'
import { resumeApi } from '@/api'

const fileList = ref([])
const uploadedFile = ref(null)
const parsing = ref(false)
const parsedData = ref(null)
const activeTab = ref('basic')

const handleFileChange = (file) => {
  uploadedFile.value = file.raw
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

const clearFile = () => {
  fileList.value = []
  uploadedFile.value = null
  parsedData.value = null
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const uploadAndParse = async () => {
  if (!uploadedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  
  parsing.value = true
  
  try {
    // 上传文件
    const uploadResult = await resumeApi.upload(uploadedFile.value)
    
    if (uploadResult.success) {
      // 解析简历
      const parseResult = await resumeApi.parse(
        uploadResult.file_path,
        uploadResult.file_type
      )
      
      if (parseResult.success) {
        parsedData.value = parseResult.data
        ElMessage.success('简历解析成功')
      } else {
        ElMessage.error(parseResult.message || '解析失败')
      }
    } else {
      ElMessage.error(uploadResult.message || '上传失败')
    }
  } catch (error) {
    console.error('上传解析失败:', error)
    ElMessage.error('上传解析失败，请稍后重试')
  } finally {
    parsing.value = false
  }
}

const saveResume = async () => {
  if (!parsedData.value) {
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '确定要将此简历保存到人才库吗？',
      '确认保存',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    // 简历已经在解析时保存到数据库了
    ElMessage.success('简历已保存到人才库')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('保存失败:', error)
    }
  }
}

const getSkillTagType = (proficiency) => {
  if (!proficiency) return ''
  const level = proficiency.toLowerCase()
  if (level.includes('精通') || level.includes('专家')) return 'danger'
  if (level.includes('熟练') || level.includes('良好')) return 'primary'
  if (level.includes('了解') || level.includes('基础')) return 'info'
  return ''
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
</script>

<style scoped>
.resume-view {
  max-width: 1200px;
  margin: 0 auto;
}

.upload-card, .result-card {
  border-radius: 12px;
  border: none;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.upload-dragger {
  width: 100%;
}

:deep(.el-upload-dragger) {
  border-radius: 8px;
  padding: 40px;
}

.file-info {
  margin-top: 20px;
}

.upload-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.skills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 20px 0;
}

.skill-tag {
  font-size: 14px;
  padding: 8px 16px;
}

.proficiency, .years {
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
