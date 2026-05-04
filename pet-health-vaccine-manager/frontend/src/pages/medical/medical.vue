<template>
  <view class="container">
    <view class="intro-card card">
      <text class="intro-title">病历记录</text>
      <text class="intro-desc">记录您宠物的健康状况和疫苗接种情况，上传疫苗本照片方便管理和查阅。</text>
    </view>

    <view class="add-record-section">
      <button class="btn-primary add-record-btn" @click="showAddRecordModal">
        <text class="add-icon">+</text>
        <text>添加病历记录</text>
      </button>
    </view>

    <view class="records-section" v-if="medicalRecords.length > 0">
      <view class="section-title">
        <text>我的病历记录</text>
      </view>
      <view class="record-list">
        <view class="record-card card" v-for="record in medicalRecords" :key="record.id">
          <view class="record-header">
            <view class="record-info">
              <text class="record-pet-name">{{ record.petName }}</text>
              <text class="record-type">{{ record.type }}</text>
            </view>
            <text class="record-date">{{ record.date }}</text>
          </view>
          
          <view class="record-content" v-if="record.notes">
            <text class="record-notes">{{ record.notes }}</text>
          </view>
          
          <view class="record-photos" v-if="record.photos && record.photos.length > 0">
            <view class="photo-grid">
              <view 
                class="photo-item" 
                v-for="(photo, index) in record.photos" 
                :key="index"
                @click="previewPhoto(photo)"
              >
                <image :src="photo" mode="aspectFill" class="photo-image"></image>
              </view>
            </view>
          </view>
          
          <view class="record-actions">
            <button class="btn-secondary action-btn" @click="viewRecordDetail(record)">查看详情</button>
            <button class="btn-secondary action-btn" @click="editRecord(record)">编辑</button>
            <button class="btn-secondary action-btn delete-btn" @click="deleteRecord(record)">删除</button>
          </view>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else>
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无病历记录</text>
      <text class="empty-desc">点击上方按钮添加第一条病历记录</text>
    </view>

    <!-- 添加/编辑病历记录弹窗 -->
    <view class="modal-overlay" v-if="showModal" @click="hideAddRecordModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingRecord ? '编辑病历记录' : '添加病历记录' }}</text>
          <text class="modal-close" @click="hideAddRecordModal">×</text>
        </view>
        
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">宠物名称</text>
            <input 
              class="form-input" 
              v-model="formData.petName" 
              placeholder="请输入宠物名称"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">记录类型</text>
            <picker 
              :value="recordTypeIndex" 
              :range="recordTypes" 
              @change="onRecordTypeChange"
            >
              <view class="picker-view">
                <text>{{ formData.type || '请选择记录类型' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="form-label">日期</text>
            <picker 
              mode="date" 
              :value="formData.date" 
              @change="onDateChange"
            >
              <view class="picker-view">
                <text>{{ formData.date || '请选择日期' }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="form-label">备注信息</text>
            <textarea 
              class="form-textarea" 
              v-model="formData.notes" 
              placeholder="请输入备注信息（可选）"
              :maxlength="500"
            />
            <text class="char-count">{{ formData.notes.length }}/500</text>
          </view>
          
          <view class="form-item">
            <text class="form-label">上传照片（疫苗本等）</text>
            <view class="upload-section">
              <view class="photo-grid">
                <view 
                  class="photo-item" 
                  v-for="(photo, index) in formData.photos" 
                  :key="index"
                >
                  <image :src="photo" mode="aspectFill" class="photo-image"></image>
                  <view class="photo-delete" @click="removePhoto(index)">
                    <text>×</text>
                  </view>
                </view>
                <view 
                  class="upload-btn" 
                  v-if="formData.photos.length < 9"
                  @click="uploadPhoto"
                >
                  <text class="upload-icon">+</text>
                  <text class="upload-text">添加照片</text>
                </view>
              </view>
              <text class="upload-hint">最多可上传9张照片，支持选择相册或拍照</text>
            </view>
          </view>
        </view>
        
        <view class="modal-footer">
          <button class="btn-secondary modal-btn" @click="hideAddRecordModal">取消</button>
          <button class="btn-primary modal-btn" @click="saveRecord">保存</button>
        </view>
      </view>
    </view>

    <!-- 照片预览弹窗 -->
    <view class="preview-overlay" v-if="showPreview" @click="closePreview">
      <image :src="previewImage" mode="aspectFit" class="preview-image"></image>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useMedicalStore } from '@/stores/medical'

const medicalStore = useMedicalStore()

interface MedicalRecord {
  id: number
  petName: string
  type: string
  date: string
  notes: string
  photos: string[]
  createdAt: string
}

const medicalRecords = ref<MedicalRecord[]>([])
const showModal = ref<boolean>(false)
const showPreview = ref<boolean>(false)
const previewImage = ref<string>('')
const editingRecord = ref<MedicalRecord | null>(null)

const recordTypes = ref<string[]>([
  '疫苗接种',
  '体检记录',
  '看病记录',
  '手术记录',
  '驱虫记录',
  '其他'
])

const recordTypeIndex = ref<number>(0)

const formData = reactive({
  petName: '',
  type: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
  photos: [] as string[]
})

const loadMedicalRecords = async () => {
  try {
    const records = await medicalStore.getMedicalRecords()
    medicalRecords.value = records
  } catch (error) {
    console.error('加载病历记录失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'error'
    })
  }
}

const showAddRecordModal = () => {
  editingRecord.value = null
  resetFormData()
  showModal.value = true
}

const hideAddRecordModal = () => {
  showModal.value = false
  resetFormData()
}

const resetFormData = () => {
  formData.petName = ''
  formData.type = ''
  formData.date = new Date().toISOString().split('T')[0]
  formData.notes = ''
  formData.photos = []
  recordTypeIndex.value = 0
}

const onRecordTypeChange = (e: any) => {
  recordTypeIndex.value = e.detail.value
  formData.type = recordTypes.value[e.detail.value]
}

const onDateChange = (e: any) => {
  formData.date = e.detail.value
}

const uploadPhoto = () => {
  uni.showActionSheet({
    itemList: ['从相册选择', '拍照'],
    success: (res) => {
      const sourceType = res.tapIndex === 0 ? ['album'] : ['camera']
      
      uni.chooseImage({
        count: 9 - formData.photos.length,
        sizeType: ['compressed'],
        sourceType: sourceType,
        success: (res) => {
          const tempFilePaths = res.tempFilePaths
          tempFilePaths.forEach(path => {
            if (formData.photos.length < 9) {
              formData.photos.push(path)
            }
          })
        },
        fail: (error) => {
          console.error('选择图片失败:', error)
          uni.showToast({
            title: '选择图片失败',
            icon: 'error'
          })
        }
      })
    }
  })
}

const removePhoto = (index: number) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这张照片吗？',
    success: (res) => {
      if (res.confirm) {
        formData.photos.splice(index, 1)
      }
    }
  })
}

const previewPhoto = (photo: string) => {
  previewImage.value = photo
  showPreview.value = true
}

const closePreview = () => {
  showPreview.value = false
  previewImage.value = ''
}

const saveRecord = async () => {
  if (!formData.petName.trim()) {
    uni.showToast({
      title: '请输入宠物名称',
      icon: 'none'
    })
    return
  }
  
  if (!formData.type) {
    uni.showToast({
      title: '请选择记录类型',
      icon: 'none'
    })
    return
  }
  
  try {
    if (editingRecord.value) {
      await medicalStore.updateMedicalRecord({
        ...editingRecord.value,
        petName: formData.petName,
        type: formData.type,
        date: formData.date,
        notes: formData.notes,
        photos: formData.photos
      })
      uni.showToast({
        title: '更新成功',
        icon: 'success'
      })
    } else {
      await medicalStore.addMedicalRecord({
        petName: formData.petName,
        type: formData.type,
        date: formData.date,
        notes: formData.notes,
        photos: formData.photos
      })
      uni.showToast({
        title: '添加成功',
        icon: 'success'
      })
    }
    
    hideAddRecordModal()
    loadMedicalRecords()
  } catch (error) {
    console.error('保存病历记录失败:', error)
    uni.showToast({
      title: '保存失败',
      icon: 'error'
    })
  }
}

const viewRecordDetail = (record: MedicalRecord) => {
  uni.navigateTo({
    url: `/pages/medical-detail/medical-detail?id=${record.id}`
  })
}

const editRecord = (record: MedicalRecord) => {
  editingRecord.value = record
  formData.petName = record.petName
  formData.type = record.type
  formData.date = record.date
  formData.notes = record.notes
  formData.photos = [...record.photos]
  
  const typeIndex = recordTypes.value.indexOf(record.type)
  recordTypeIndex.value = typeIndex !== -1 ? typeIndex : 0
  
  showModal.value = true
}

const deleteRecord = (record: MedicalRecord) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条病历记录吗？删除后无法恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await medicalStore.deleteMedicalRecord(record.id)
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
          loadMedicalRecords()
        } catch (error) {
          console.error('删除病历记录失败:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'error'
          })
        }
      }
    }
  })
}

// 页面加载时获取数据
onMounted(() => {
  loadMedicalRecords()
})
</script>

<style scoped>
.intro-card {
  margin-bottom: 30rpx;
}

.intro-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.intro-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.add-record-section {
  margin-bottom: 30rpx;
}

.add-record-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 30rpx;
  border-radius: 12rpx;
}

.add-icon {
  font-size: 40rpx;
  font-weight: bold;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
  padding-left: 10rpx;
  border-left: 6rpx solid #4A90D9;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-card {
  padding: 24rpx;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.record-info {
  display: flex;
  flex-direction: column;
}

.record-pet-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.record-type {
  font-size: 24rpx;
  color: #4A90D9;
  background-color: rgba(74, 144, 217, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  width: fit-content;
}

.record-date {
  font-size: 26rpx;
  color: #666;
}

.record-content {
  margin-bottom: 20rpx;
}

.record-notes {
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
}

.record-photos {
  margin-bottom: 20rpx;
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.photo-delete {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 32rpx;
  height: 32rpx;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-size: 24rpx;
}

.record-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  padding: 16rpx;
  font-size: 26rpx;
}

.delete-btn {
  color: #FF6B6B;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: #999;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-height: 90vh;
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.modal-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 20rpx;
  background-color: #f9f9f9;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
}

.picker-view {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 88rpx;
  padding: 0 20rpx;
  background-color: #f9f9f9;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
}

.picker-arrow {
  color: #999;
  font-size: 20rpx;
}

.form-textarea {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.upload-section {
  margin-top: 16rpx;
}

.upload-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #ccc;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f9f9f9;
}

.upload-icon {
  font-size: 48rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.upload-text {
  font-size: 24rpx;
  color: #999;
}

.upload-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  font-size: 28rpx;
}

.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.preview-image {
  width: 90%;
  height: auto;
  max-height: 90vh;
}
</style>
