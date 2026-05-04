<template>
  <view class="container">
    <view class="form-section">
      <view class="form-item">
        <view class="form-label">
          <text class="required">*</text>
          <text>植物名称</text>
        </view>
        <input 
          class="form-input" 
          type="text" 
          v-model="formData.name" 
          placeholder="请输入植物名称"
          maxlength="50"
        />
      </view>

      <view class="form-item">
        <view class="form-label">
          <text class="required">*</text>
          <text>植物类型</text>
        </view>
        <picker 
          :value="plantTypeIndex" 
          :range="plantTypes" 
          @change="onPlantTypeChange"
          @cancel="onPlantTypeCancel"
        >
          <view class="form-picker">
            <text v-if="formData.plant_type" class="picker-text">{{ formData.plant_type }}</text>
            <text v-else class="picker-placeholder">请选择植物类型</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <view class="form-label">
          <text class="required">*</text>
          <text>种植日期</text>
        </view>
        <picker 
          mode="date" 
          :value="formData.planting_date" 
          :start="startDate" 
          :end="endDate"
          @change="onDateChange"
        >
          <view class="form-picker">
            <text v-if="formData.planting_date" class="picker-text">{{ formData.planting_date }}</text>
            <text v-else class="picker-placeholder">请选择种植日期</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <view class="form-label">
          <text>种植位置</text>
        </view>
        <input 
          class="form-input" 
          type="text" 
          v-model="formData.location" 
          placeholder="请输入种植位置（如：阳台、花园等）"
          maxlength="200"
        />
      </view>

      <view class="form-item form-item-textarea">
        <view class="form-label">
          <text>备注</text>
        </view>
        <textarea 
          class="form-textarea" 
          v-model="formData.notes" 
          placeholder="请输入备注信息"
          maxlength="500"
        />
        <view class="char-count">{{ formData.notes.length }}/500</view>
      </view>
    </view>

    <view class="action-footer">
      <view class="cancel-btn" @click="goBack" v-if="!isEdit">
        <text>取消</text>
      </view>
      <view class="submit-btn" :class="{ 'btn-disabled': !canSubmit }" @click="submitForm">
        <text>{{ isEdit ? '保存修改' : '添加植物' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      plantId: null,
      isEdit: false,
      plantTypes: ['番茄', '黄瓜', '苹果', '葡萄', '其他'],
      plantTypeIndex: -1,
      startDate: '2000-01-01',
      endDate: '',
      formData: {
        name: '',
        plant_type: '',
        planting_date: '',
        location: '',
        notes: ''
      }
    }
  },
  computed: {
    canSubmit() {
      return this.formData.name && this.formData.plant_type && this.formData.planting_date
    }
  },
  onLoad(options) {
    const today = new Date()
    this.endDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    if (options.id) {
      this.plantId = parseInt(options.id)
      this.isEdit = true
      this.loadPlantData()
    }
  },
  methods: {
    async loadPlantData() {
      try {
        const plant = await api.plantApi.getById(this.plantId)
        
        this.formData = {
          name: plant.name || '',
          plant_type: plant.plant_type || '',
          planting_date: plant.planting_date ? plant.planting_date.substring(0, 10) : '',
          location: plant.location || '',
          notes: plant.notes || ''
        }
        
        const typeIndex = this.plantTypes.indexOf(this.formData.plant_type)
        if (typeIndex !== -1) {
          this.plantTypeIndex = typeIndex
        }
      } catch (error) {
        console.error('加载植物数据失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    onPlantTypeChange(e) {
      this.plantTypeIndex = e.detail.value
      this.formData.plant_type = this.plantTypes[e.detail.value]
    },
    onPlantTypeCancel() {
      this.plantTypeIndex = -1
      this.formData.plant_type = ''
    },
    onDateChange(e) {
      this.formData.planting_date = e.detail.value
    },
    goBack() {
      uni.navigateBack()
    },
    async submitForm() {
      if (!this.canSubmit) {
        uni.showToast({
          title: '请填写必填项',
          icon: 'none'
        })
        return
      }

      uni.showLoading({ title: this.isEdit ? '保存中...' : '添加中...' })

      try {
        const plantData = {
          name: this.formData.name,
          plant_type: this.formData.plant_type,
          planting_date: this.formData.planting_date + 'T00:00:00',
          location: this.formData.location,
          notes: this.formData.notes
        }

        if (this.isEdit) {
          await api.plantApi.update(this.plantId, plantData)
          uni.showToast({
            title: '保存成功',
            icon: 'success'
          })
        } else {
          await api.plantApi.create(plantData)
          uni.showToast({
            title: '添加成功',
            icon: 'success'
          })
        }

        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      } catch (error) {
        console.error('提交失败:', error)
        uni.showToast({
          title: error.message || '提交失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F8F8F8;
  padding: 30rpx;
  padding-bottom: 140rpx;
}

.form-section {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}

.form-item {
  padding: 30rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.form-item:last-child {
  border-bottom: none;
}

.form-item-textarea {
  padding-bottom: 20rpx;
}

.form-label {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.required {
  color: #C62828;
  font-size: 28rpx;
  margin-right: 8rpx;
}

.form-label text:last-child {
  font-size: 30rpx;
  color: #333333;
}

.form-input {
  width: 100%;
  font-size: 30rpx;
  color: #333333;
  padding: 16rpx 0;
}

.form-input::placeholder {
  color: #999999;
}

.form-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}

.picker-text {
  font-size: 30rpx;
  color: #333333;
}

.picker-placeholder {
  font-size: 30rpx;
  color: #999999;
}

.picker-arrow {
  font-size: 32rpx;
  color: #CCCCCC;
}

.form-textarea {
  width: 100%;
  height: 200rpx;
  font-size: 30rpx;
  color: #333333;
  padding: 16rpx 0;
  line-height: 1.6;
}

.form-textarea::placeholder {
  color: #999999;
}

.char-count {
  text-align: right;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

.action-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 30rpx;
  background-color: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.cancel-btn {
  flex: 1;
  padding: 28rpx;
  text-align: center;
  background-color: #F5F5F5;
  border-radius: 12rpx;
}

.cancel-btn text {
  font-size: 32rpx;
  color: #666666;
}

.submit-btn {
  flex: 1;
  padding: 28rpx;
  text-align: center;
  background-color: #2B9939;
  border-radius: 12rpx;
}

.submit-btn.btn-disabled {
  background-color: #CCCCCC;
}

.submit-btn text {
  font-size: 32rpx;
  color: #FFFFFF;
}

.submit-btn.btn-disabled text {
  color: #FFFFFF;
}
</style>
