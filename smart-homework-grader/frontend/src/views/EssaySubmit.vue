<template>
  <div class="essay-submit-container">
    <el-card class="submit-card">
      <template #header>
        <div class="card-header">
          <span>提交作文</span>
          <el-radio-group v-model="submitMode" size="small">
            <el-radio-button label="text">在线编辑</el-radio-button>
            <el-radio-button label="image">图片上传</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="作文标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入作文标题" />
        </el-form-item>

        <el-form-item v-if="submitMode === 'text'" label="作文内容" prop="content">
          <div class="editor-container">
            <div ref="quillEditor" class="quill-editor"></div>
          </div>
        </el-form-item>

        <el-form-item v-if="submitMode === 'image'" label="上传图片">
          <el-upload
            class="image-uploader"
            drag
            :auto-upload="false"
            :on-change="handleImageChange"
            :limit="1"
            accept=".jpg,.jpeg,.png,.gif,.bmp"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将试卷图片拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                只能上传 jpg/jpeg/png/gif/bmp 文件，系统将进行OCR识别
              </div>
            </template>
          </el-upload>

          <div v-if="ocrText" class="ocr-result">
            <div class="ocr-header">
              <span>OCR识别结果</span>
              <el-tag type="success" size="small">识别成功</el-tag>
            </div>
            <el-input
              v-model="ocrText"
              type="textarea"
              :rows="8"
              placeholder="识别出的文本内容..."
            />
            <div class="ocr-actions">
              <el-button type="primary" @click="useOCRText">使用此文本</el-button>
              <el-button @click="clearOCR">清除</el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            提交并批改
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-dialog v-model="resultVisible" title="批改结果" width="80%">
      <div v-if="gradingResult" class="grading-result">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="score-card">
              <template #header>
                <span>综合评分</span>
              </template>
              <div class="total-score">
                <span class="score-value">{{ gradingResult.total_score }}</span>
                <span class="score-unit">分</span>
              </div>
              <el-progress 
                :percentage="gradingResult.total_score" 
                :color="getScoreColor(gradingResult.total_score)"
                :stroke-width="15"
              />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="dimensions-card">
              <template #header>
                <span>分项评分</span>
              </template>
              <div class="dimension-item">
                <div class="dimension-header">
                  <span>内容立意</span>
                  <span class="score">{{ gradingResult.content_score }}分</span>
                </div>
                <el-progress 
                  :percentage="gradingResult.content_score" 
                  :stroke-width="10"
                  status="exception"
                />
              </div>
              <div class="dimension-item">
                <div class="dimension-header">
                  <span>语言表达</span>
                  <span class="score">{{ gradingResult.language_score }}分</span>
                </div>
                <el-progress 
                  :percentage="gradingResult.language_score" 
                  :stroke-width="10"
                  status="exception"
                />
              </div>
              <div class="dimension-item">
                <div class="dimension-header">
                  <span>结构层次</span>
                  <span class="score">{{ gradingResult.structure_score }}分</span>
                </div>
                <el-progress 
                  :percentage="gradingResult.structure_score" 
                  :stroke-width="10"
                  status="exception"
                />
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-card class="comments-card" style="margin-top: 20px;">
          <template #header>
            <span>批改评语</span>
          </template>
          <div class="comment-section">
            <h4>总体评价</h4>
            <p>{{ gradingResult.overall_comment }}</p>
          </div>
          <el-divider />
          <div class="comment-section">
            <h4>分项评价</h4>
            <div class="sub-comment">
              <el-tag type="primary">内容立意</el-tag>
              <span>{{ gradingResult.content_comment }}</span>
            </div>
            <div class="sub-comment">
              <el-tag type="success">语言表达</el-tag>
              <span>{{ gradingResult.language_comment }}</span>
            </div>
            <div class="sub-comment">
              <el-tag type="warning">结构层次</el-tag>
              <span>{{ gradingResult.structure_comment }}</span>
            </div>
          </div>
          <el-divider />
          <div class="comment-section">
            <h4>改进建议</h4>
            <p style="white-space: pre-line;">{{ gradingResult.suggestions }}</p>
          </div>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="resultVisible = false">关闭</el-button>
        <el-button type="primary" @click="viewEssayDetail">查看详情</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { essayApi } from '../api'

const router = useRouter()

const quillEditor = ref(null)
const formRef = ref(null)
const submitMode = ref('text')
const submitting = ref(false)
const resultVisible = ref(false)
const gradingResult = ref(null)
const essayId = ref(null)
const ocrText = ref('')
const selectedImage = ref(null)

const form = ref({
  title: '',
  content: ''
})

const rules = {
  title: [
    { required: true, message: '请输入作文标题', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入作文内容', trigger: 'blur' }
  ]
}

let quill = null

onMounted(() => {
  nextTick(() => {
    initQuill()
  })
})

const initQuill = () => {
  if (!quillEditor.value) return
  
  quill = new Quill(quillEditor.value, {
    theme: 'snow',
    placeholder: '请在这里输入您的作文内容...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
      ]
    }
  })

  quill.on('text-change', () => {
    form.value.content = quill.root.innerHTML
  })
}

const handleImageChange = (file) => {
  selectedImage.value = file.raw
  performOCR()
}

const performOCR = async () => {
  if (!selectedImage.value) return
  
  try {
    const formData = new FormData()
    formData.append('image', selectedImage.value)
    
    const response = await essayApi.uploadImage(formData)
    
    if (response.data.success) {
      ocrText.value = response.data.text
      ElMessage.success('OCR识别成功')
    } else {
      ElMessage.error('OCR识别失败：' + response.data.error)
    }
  } catch (error) {
    ElMessage.error('OCR识别出错：' + error.message)
  }
}

const useOCRText = () => {
  if (quill) {
    quill.root.innerHTML = ocrText.value
    form.value.content = ocrText.value
  }
  submitMode.value = 'text'
  ElMessage.success('已将识别内容填入编辑器')
}

const clearOCR = () => {
  ocrText.value = ''
  selectedImage.value = null
}

const handleSubmit = async () => {
  if (!form.value.title.trim()) {
    ElMessage.warning('请输入作文标题')
    return
  }
  
  const content = submitMode.value === 'text' 
    ? form.value.content 
    : ocrText.value
  
  if (!content || !content.trim()) {
    ElMessage.warning('请输入作文内容')
    return
  }
  
  submitting.value = true
  
  try {
    const response = await essayApi.submit({
      title: form.value.title,
      content: content,
      student_id: 1
    })
    
    if (response.data.success) {
      essayId.value = response.data.essay_id
      gradingResult.value = response.data.grading
      resultVisible.value = true
      ElMessage.success('作文提交成功，已完成批改')
    } else {
      ElMessage.error('提交失败：' + response.data.error)
    }
  } catch (error) {
    ElMessage.error('提交出错：' + error.message)
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.value = {
    title: '',
    content: ''
  }
  ocrText.value = ''
  selectedImage.value = null
  if (quill) {
    quill.setText('')
  }
}

const getScoreColor = (score) => {
  if (score >= 90) return '#67c23a'
  if (score >= 80) return '#409eff'
  if (score >= 70) return '#e6a23c'
  if (score >= 60) return '#909399'
  return '#f56c6c'
}

const viewEssayDetail = () => {
  resultVisible.value = false
  if (essayId.value) {
    router.push(`/essay/${essayId.value}`)
  }
}
</script>

<style scoped>
.essay-submit-container {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.quill-editor {
  min-height: 400px;
}

.image-uploader {
  width: 100%;
}

.ocr-result {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.ocr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 500;
}

.ocr-actions {
  margin-top: 10px;
  text-align: right;
}

.grading-result {
  padding: 10px;
}

.score-card {
  text-align: center;
}

.total-score {
  margin: 20px 0;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  color: #409eff;
}

.score-unit {
  font-size: 20px;
  color: #909399;
}

.dimension-item {
  margin-bottom: 15px;
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.score {
  font-weight: bold;
  color: #409eff;
}

.comment-section h4 {
  margin-bottom: 10px;
  color: #303133;
}

.sub-comment {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.sub-comment .el-tag {
  flex-shrink: 0;
}

.sub-comment span {
  color: #606266;
  line-height: 1.6;
}
</style>
