<template>
  <div class="resume-view">
    <el-card class="upload-card">
      <template #header>
        <span class="card-title">简历上传解析</span>
      </template>
      
      <el-upload
        class="resume-uploader"
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
        accept=".pdf,.doc,.docx"
        :file-list="fileList"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 PDF、DOC、DOCX 格式文件，单个文件不超过 20MB
          </div>
        </template>
      </el-upload>

      <div class="action-area" v-if="fileList.length > 0">
        <el-button type="primary" :loading="parsing" @click="parseResume" size="large">
          <el-icon><Document /></el-icon>
          开始解析
        </el-button>
      </div>
    </el-card>

    <el-card class="result-card" v-if="parsedData">
      <template #header>
        <div class="header-row">
          <span class="card-title">解析结果</span>
          <el-button type="primary" @click="saveResume">
            <el-icon><Check /></el-icon>
            保存到人才库
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="姓名">{{ parsedData.name }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ parsedData.gender || '未知' }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ parsedData.phone || '未提取' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ parsedData.email || '未提取' }}</el-descriptions-item>
            <el-descriptions-item label="现居地址">{{ parsedData.current_address || '未提取' }}</el-descriptions-item>
            <el-descriptions-item label="工作年限">{{ parsedData.work_years || 0 }}年</el-descriptions-item>
            <el-descriptions-item label="最高学历">{{ parsedData.education_level || '未提取' }}</el-descriptions-item>
            <el-descriptions-item label="专业">{{ parsedData.major || '未提取' }}</el-descriptions-item>
            <el-descriptions-item label="毕业院校">{{ parsedData.university || '未提取' }}</el-descriptions-item>
            <el-descriptions-item label="当前职位">{{ parsedData.current_position || '未提取' }}</el-descriptions-item>
            <el-descriptions-item label="当前公司">{{ parsedData.current_company || '未提取' }}</el-descriptions-item>
            <el-descriptions-item label="期望薪资">{{ parsedData.expected_salary || '未提取' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="技能列表" name="skills">
          <el-empty v-if="!parsedData.skills || parsedData.skills.length === 0" description="未提取到技能信息" />
          <el-tag
            v-for="(skill, index) in parsedData.skills"
            :key="index"
            :type="tagTypes[index % tagTypes.length]"
            size="large"
            effect="dark"
            class="skill-tag"
          >
            {{ skill.skill_name }}
            <span v-if="skill.years > 0" class="skill-years">({{ skill.years }}年)</span>
          </el-tag>
        </el-tab-pane>

        <el-tab-pane label="工作经历" name="experience">
          <el-empty v-if="!parsedData.work_experiences || parsedData.work_experiences.length === 0" description="未提取到工作经历" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="(exp, index) in parsedData.work_experiences"
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
          <el-empty v-if="!parsedData.educations || parsedData.educations.length === 0" description="未提取到教育经历" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="(edu, index) in parsedData.educations"
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
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  UploadFilled, Document, Check 
} from '@element-plus/icons-vue'
import { resumeApi } from '../api'

const fileList = ref([])
const parsing = ref(false)
const parsedData = ref(null)
const activeTab = ref('basic')
const filePath = ref('')
const fileType = ref('')

const tagTypes = ['primary', 'success', 'info', 'warning', 'danger']

const handleFileChange = (file) => {
  fileList.value = [file]
}

const parseResume = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先选择文件')
    return
  }

  const file = fileList.value[0].raw
  parsing.value = true

  try {
    const uploadRes = await resumeApi.upload(file)
    filePath.value = uploadRes.data.file_path
    fileType.value = uploadRes.data.file_type

    const parseRes = await resumeApi.parse(filePath.value, fileType.value)
    
    if (parseRes.data.success) {
      parsedData.value = parseRes.data.data
      ElMessage.success('简历解析成功')
    } else {
      ElMessage.error(parseRes.data.message || '解析失败')
    }
  } catch (error) {
    console.error('解析失败:', error)
  } finally {
    parsing.value = false
  }
}

const saveResume = async () => {
  if (!parsedData.value) {
    ElMessage.warning('没有可保存的解析结果')
    return
  }

  try {
    await resumeApi.save(parsedData.value, filePath.value, fileType.value)
    ElMessage.success('已保存到人才库')
  } catch (error) {
    console.error('保存失败:', error)
  }
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

.resume-uploader {
  width: 100%;
}

:deep(.el-upload-dragger) {
  padding: 60px 20px;
}

:deep(.el-upload-dragger .el-icon--upload) {
  font-size: 60px;
  color: #409EFF;
}

:deep(.el-upload__text) {
  font-size: 16px;
  margin-top: 20px;
}

:deep(.el-upload__text em) {
  color: #409EFF;
  font-style: normal;
}

.action-area {
  margin-top: 20px;
  text-align: center;
}

.skill-tag {
  margin: 5px;
}

.skill-years {
  margin-left: 5px;
  opacity: 0.8;
}

:deep(.el-descriptions__label) {
  width: 100px;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 14px;
  color: #909399;
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
</style>
