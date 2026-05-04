<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 20px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; font-weight: 500;">票据上传识别</span>
          <el-radio-group v-model="documentType" size="small">
            <el-radio-button label="invoice">增值税发票</el-radio-button>
            <el-radio-button label="train">火车票</el-radio-button>
            <el-radio-button label="air">机票</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      
      <el-upload
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        accept="image/*,.pdf"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持上传图片格式（jpg、png、jpeg），请确保票据清晰可见
          </div>
        </template>
      </el-upload>
      
      <div v-if="uploading" style="text-align: center; margin-top: 20px;">
        <el-progress :percentage="uploadProgress" :status="uploadStatus" />
        <p style="margin-top: 10px; color: #909399;">{{ uploadMessage }}</p>
      </div>
      
      <div v-if="extractedData" style="margin-top: 20px;">
        <el-divider>识别结果 <el-tag type="success">可编辑</el-tag></el-divider>
        
        <el-form
          ref="formRef"
          :model="editForm"
          label-width="140px"
          label-position="right"
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="发票代码" v-if="documentType === 'invoice'">
                <el-input v-model="editForm.invoice_code" placeholder="请输入发票代码" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="发票号码" v-if="documentType === 'invoice'">
                <el-input v-model="editForm.invoice_number" placeholder="请输入发票号码" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="车票号码" v-if="documentType === 'train'">
                <el-input v-model="editForm.ticket_number" placeholder="请输入车票号码" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="车次" v-if="documentType === 'train'">
                <el-input v-model="editForm.train_number" placeholder="请输入车次" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="机票号码" v-if="documentType === 'air'">
                <el-input v-model="editForm.ticket_number" placeholder="请输入机票号码" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="航班号" v-if="documentType === 'air'">
                <el-input v-model="editForm.flight_number" placeholder="请输入航班号" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开票日期" v-if="documentType === 'invoice'">
                <el-input v-model="editForm.invoice_date" placeholder="请输入开票日期" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="出发时间" v-if="documentType === 'train' || documentType === 'air'">
                <el-input v-model="editForm.departure_time" placeholder="请输入出发时间" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-divider>金额信息</el-divider>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="金额">
                <el-input-number v-model="editForm.amount" :precision="2" :min="0" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8" v-if="documentType === 'invoice' || documentType === 'air'">
              <el-form-item label="税额">
                <el-input-number v-model="editForm.tax_amount || editForm.tax" :precision="2" :min="0" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="价税合计">
                <el-input-number v-model="editForm.total_amount || editForm.price" :precision="2" :min="0" style="width: 100%;" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-divider>购销方/乘客信息</el-divider>
          
          <template v-if="documentType === 'invoice'">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="销售方名称">
                  <el-input v-model="editForm.seller_name" placeholder="请输入销售方名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="销售方税号">
                  <el-input v-model="editForm.seller_tax_id" placeholder="请输入销售方税号" />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="购买方名称">
                  <el-input v-model="editForm.buyer_name" placeholder="请输入购买方名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="购买方税号">
                  <el-input v-model="editForm.buyer_tax_id" placeholder="请输入购买方税号" />
                </el-form-item>
              </el-col>
            </el-row>
          </template>
          
          <template v-if="documentType === 'train'">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="出发站">
                  <el-input v-model="editForm.departure_station" placeholder="请输入出发站" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="到达站">
                  <el-input v-model="editForm.arrival_station" placeholder="请输入到达站" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="座位类型">
                  <el-input v-model="editForm.seat_class" placeholder="请输入座位类型" />
                </el-form-item>
              </el-col>
            </el-row>
          </template>
          
          <template v-if="documentType === 'air'">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="出发机场">
                  <el-input v-model="editForm.departure_airport" placeholder="请输入出发机场" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="到达机场">
                  <el-input v-model="editForm.arrival_airport" placeholder="请输入到达机场" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="舱位类型">
                  <el-input v-model="editForm.cabin_class" placeholder="请输入舱位类型" />
                </el-form-item>
              </el-col>
            </el-row>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="12" v-if="documentType === 'train' || documentType === 'air'">
              <el-form-item label="乘客姓名">
                <el-input v-model="editForm.passenger_name" placeholder="请输入乘客姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="documentType === 'train' || documentType === 'air'">
              <el-form-item label="身份证号">
                <el-input v-model="editForm.id_number" placeholder="请输入身份证号" />
              </el-form-item>
            </el-col>
          </el-row>
          
        </el-form>
        
        <div style="margin-top: 30px; text-align: center;">
          <el-button type="primary" @click="validateCurrentData" :loading="validating">
            <el-icon style="margin-right: 5px;"><Checked /></el-icon>
            开始核验
          </el-button>
          <el-button type="success" @click="saveData" :loading="saving" style="margin-left: 20px;">
            <el-icon style="margin-right: 5px;"><DocumentAdd /></el-icon>
            保存票据
          </el-button>
          <el-button @click="resetForm" style="margin-left: 20px;">
            重置
          </el-button>
        </div>
      </div>
      
      <div v-if="validationResult" style="margin-top: 30px;">
        <el-divider>核验结果</el-divider>
        
        <el-alert
          :title="validationResult.summary"
          :type="validationResult.overall_status === 'passed' ? 'success' : 'error'"
          show-icon
          style="margin-bottom: 20px;"
        />
        
        <el-row :gutter="20">
          <el-col :span="8" v-for="(item, index) in validationResult.validations" :key="index">
            <el-card shadow="hover">
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 500;">{{ item.name }}</span>
                  <el-tag :type="getValidationType(item)">
                    {{ getValidationStatus(item) }}
                  </el-tag>
                </div>
              </template>
              <p>{{ item.result.message }}</p>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Checked, DocumentAdd } from '@element-plus/icons-vue'
import { uploadAndExtract, validateInvoice, saveInvoice } from '../api'

const documentType = ref('invoice')
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadStatus = ref('')
const uploadMessage = ref('')
const extractedData = ref(null)
const editForm = reactive({})
const validating = ref(false)
const validationResult = ref(null)
const saving = ref(false)
const currentFile = ref(null)

const handleFileChange = async (file) => {
  currentFile.value = file.raw
  uploading.value = true
  uploadProgress.value = 10
  uploadMessage.value = '正在上传文件...'
  uploadStatus.value = ''
  
  try {
    uploadProgress.value = 30
    uploadMessage.value = '正在进行OCR版面分析...'
    
    const result = await uploadAndExtract(currentFile.value, documentType.value)
    
    uploadProgress.value = 100
    uploadStatus.value = 'success'
    uploadMessage.value = '识别完成！'
    
    if (result.success) {
      extractedData.value = result.extracted_data
      Object.assign(editForm, result.extracted_data)
      editForm.image_path = result.image_path
      validationResult.value = null
    }
    
  } catch (error) {
    uploadStatus.value = 'exception'
    uploadMessage.value = '识别失败: ' + (error.response?.data?.detail || error.message)
    ElMessage.error('识别失败，请重试')
  } finally {
    uploading.value = false
  }
}

const validateCurrentData = async () => {
  validating.value = true
  try {
    const result = await validateInvoice(editForm, documentType.value)
    validationResult.value = result
    
    if (result.overall_status === 'passed') {
      ElMessage.success('所有校验通过！')
    } else {
      ElMessage.warning('校验存在问题，请检查')
    }
  } catch (error) {
    ElMessage.error('校验失败: ' + (error.response?.data?.detail || error.message))
  } finally {
    validating.value = false
  }
}

const saveData = async () => {
  saving.value = true
  try {
    const result = await saveInvoice(editForm, documentType.value)
    if (result.success) {
      ElMessage.success('保存成功！ID: ' + result.id)
      resetForm()
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + (error.response?.data?.detail || error.message))
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  extractedData.value = null
  validationResult.value = null
  Object.keys(editForm).forEach(key => delete editForm[key])
  currentFile.value = null
}

const getValidationType = (item) => {
  if (item.type === 'authenticity') {
    return item.result.verified ? 'success' : 'danger'
  } else if (item.type === 'title_match') {
    return item.result.matched ? 'success' : 'warning'
  } else if (item.type === 'duplicate_check') {
    return item.result.is_duplicate ? 'danger' : 'success'
  }
  return 'info'
}

const getValidationStatus = (item) => {
  if (item.type === 'authenticity') {
    return item.result.verified ? '通过' : '不通过'
  } else if (item.type === 'title_match') {
    return item.result.matched ? '一致' : '不一致'
  } else if (item.type === 'duplicate_check') {
    return item.result.is_duplicate ? '重复' : '正常'
  }
  return '未知'
}
</script>

<style scoped>
.el-upload-dragger {
  padding: 40px !important;
}
</style>
