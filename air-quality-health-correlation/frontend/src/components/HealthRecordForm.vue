<template>
  <div class="health-record-form">
    <h3>{{ editingRecord ? '编辑健康记录' : '添加健康记录' }}</h3>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="date">日期</label>
        <input
          type="date"
          id="date"
          v-model="formData.date"
          required
        />
      </div>
      <div class="form-group">
        <label for="isSick">是否生病</label>
        <select id="isSick" v-model="formData.isSick">
          <option :value="false">健康</option>
          <option :value="true">生病</option>
        </select>
      </div>
      <div class="form-group" v-if="formData.isSick">
        <label for="symptoms">症状</label>
        <input
          type="text"
          id="symptoms"
          v-model="formData.symptoms"
          placeholder="例如：咳嗽、头痛"
        />
      </div>
      <div class="form-group" v-if="formData.isSick">
        <label for="severity">严重程度 (1-5)</label>
        <input
          type="number"
          id="severity"
          v-model.number="formData.severity"
          min="1"
          max="5"
        />
      </div>
      <div class="form-group">
        <label for="notes">备注</label>
        <textarea
          id="notes"
          v-model="formData.notes"
          rows="2"
          placeholder="其他备注信息"
        ></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          {{ editingRecord ? '更新' : '添加' }}
        </button>
        <button type="button" class="btn btn-secondary" @click="handleCancel">
          取消
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { healthRecordApi } from '../services/api'

const props = defineProps({
  editingRecord: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['saved', 'cancelled'])

const today = new Date().toISOString().split('T')[0]

const formData = ref({
  date: today,
  isSick: false,
  symptoms: '',
  severity: 1,
  notes: ''
})

const resetForm = () => {
  formData.value = {
    date: today,
    isSick: false,
    symptoms: '',
    severity: 1,
    notes: ''
  }
}

watch(
  () => props.editingRecord,
  (record) => {
    if (record) {
      formData.value = {
        date: record.date ? record.date.split('T')[0] : today,
        isSick: record.isSick || false,
        symptoms: record.symptoms || '',
        severity: record.severity || 1,
        notes: record.notes || ''
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

const handleSubmit = async () => {
  try {
    if (props.editingRecord) {
      await healthRecordApi.update(props.editingRecord.id, formData.value)
    } else {
      await healthRecordApi.create(formData.value)
    }
    emit('saved')
    resetForm()
  } catch (error) {
    console.error('Error saving health record:', error)
    alert('保存失败，请重试')
  }
}

const handleCancel = () => {
  resetForm()
  emit('cancelled')
}
</script>

<style scoped>
.health-record-form {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.health-record-form h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #1f2937;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}
</style>
