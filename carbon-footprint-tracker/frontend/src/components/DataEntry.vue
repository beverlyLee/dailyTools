<template>
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">添加碳排放记录</h3>
    </div>
    
    <form @submit.prevent="submitRecord">
      <div class="form-group">
        <label class="form-label">记录类型</label>
        <select v-model="form.type" class="form-select" @change="onTypeChange">
          <option value="">请选择类型</option>
          <option v-for="(item, key) in typeOptions" :key="key" :value="key">
            {{ typeLabels[key] || key }}
          </option>
          <option value="custom">自定义类型</option>
        </select>
      </div>
      
      <div v-if="form.type === 'custom'" class="form-group custom-form-group">
        <label class="form-label">自定义类型名称</label>
        <input 
          type="text" 
          v-model="customTypeName" 
          class="form-input" 
          placeholder="请输入类型名称，如：娱乐"
        />
      </div>
      
      <div class="form-group" v-if="form.type">
        <label class="form-label">具体项目</label>
        <select v-model="form.subtype" class="form-select" @change="onSubtypeChange">
          <option value="">请选择项目</option>
          <option v-for="(item, key) in filteredSubtypeOptions" :key="key" :value="key">
            {{ item.name }} ({{ item.unit }})
          </option>
          <option value="custom">自定义项目</option>
        </select>
      </div>
      
      <div v-if="form.subtype === 'custom'" class="form-group custom-form-group">
        <div class="custom-input-row">
          <div class="custom-input-col">
            <label class="form-label">项目名称</label>
            <input 
              type="text" 
              v-model="customSubtypeName" 
              class="form-input" 
              placeholder="如：共享单车"
            />
          </div>
          <div class="custom-input-col">
            <label class="form-label">单位</label>
            <input 
              type="text" 
              v-model="customUnit" 
              class="form-input" 
              placeholder="如：公里"
            />
          </div>
          <div class="custom-input-col">
            <label class="form-label">排放因子</label>
            <input 
              type="number" 
              v-model.number="customFactor" 
              class="form-input" 
              placeholder="kg CO₂/单位"
              step="0.001"
              min="0"
            />
          </div>
        </div>
      </div>
      
      <div class="form-group" v-if="shouldShowAmountInput">
        <label class="form-label">数量 ({{ currentUnit }})</label>
        <input 
          type="number" 
          v-model.number="form.amount" 
          class="form-input" 
          placeholder="请输入数量"
          min="0"
          step="0.01"
        />
      </div>
      
      <div class="form-group" v-if="shouldShowCarbonPreview">
        <label class="form-label">预计碳排放量</label>
        <p class="carbon-preview">{{ calculatedCarbon }} kg CO₂</p>
        <p v-if="currentFactor > 0" class="factor-info">
          排放因子: {{ currentFactor.toFixed(3) }} kg CO₂/{{ currentUnit }}
        </p>
      </div>
      
      <div class="form-group">
        <label class="form-label">日期</label>
        <input 
          type="date" 
          v-model="form.date" 
          class="form-input"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">备注 (可选)</label>
        <textarea 
          v-model="form.note" 
          class="form-input" 
          rows="2"
          placeholder="添加备注..."
        ></textarea>
      </div>
      
      <button 
        type="submit" 
        class="btn btn-primary"
        :disabled="!isFormValid || isSubmitting"
      >
        {{ isSubmitting ? '提交中...' : '添加记录' }}
      </button>
      
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCarbonStore } from '../stores/carbonStore'

const store = useCarbonStore()

const form = ref({
  type: '',
  subtype: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  note: ''
})

const isSubmitting = ref(false)
const errorMessage = ref('')

const emissionFactors = ref({
  transport: {},
  diet: {},
  home: {},
  shopping: {}
})

const customTypeName = ref('')
const customSubtypeName = ref('')
const customUnit = ref('')
const customFactor = ref(0)

const typeLabels = {
  transport: '出行',
  diet: '饮食',
  home: '家庭能源',
  shopping: '购物'
}

const typeOptions = computed(() => {
  return Object.keys(emissionFactors.value).reduce((acc, key) => {
    if (emissionFactors.value[key] && typeof emissionFactors.value[key] === 'object') {
      acc[key] = emissionFactors.value[key]
    }
    return acc
  }, {})
})

const loadEmissionFactors = async () => {
  try {
    await store.fetchEmissionFactors()
    emissionFactors.value = store.emissionFactors
  } catch (error) {
    console.error('加载排放因子失败:', error)
  }
}

loadEmissionFactors()

const subtypeOptions = computed(() => {
  if (!form.value.type || form.value.type === 'custom') {
    return {}
  }
  if (!emissionFactors.value[form.value.type]) {
    return {}
  }
  return emissionFactors.value[form.value.type]
})

const filteredSubtypeOptions = computed(() => {
  const options = {}
  Object.entries(subtypeOptions.value).forEach(([key, item]) => {
    if (item && typeof item === 'object' && item.name && item.factor !== undefined) {
      options[key] = item
    }
  })
  return options
})

const currentUnit = computed(() => {
  if (form.value.subtype === 'custom') {
    return customUnit.value || '单位'
  }
  if (!form.value.subtype || !filteredSubtypeOptions.value[form.value.subtype]) {
    return ''
  }
  return filteredSubtypeOptions.value[form.value.subtype].unit
})

const currentFactor = computed(() => {
  if (form.value.subtype === 'custom') {
    return customFactor.value || 0
  }
  if (!form.value.subtype || !filteredSubtypeOptions.value[form.value.subtype]) {
    return 0
  }
  return filteredSubtypeOptions.value[form.value.subtype].factor
})

const shouldShowAmountInput = computed(() => {
  return (form.value.subtype && form.value.subtype !== '') || 
         (form.value.subtype === 'custom' && customSubtypeName.value)
})

const shouldShowCarbonPreview = computed(() => {
  return shouldShowAmountInput.value && form.value.amount > 0 && currentFactor.value > 0
})

const calculatedCarbon = computed(() => {
  if (!form.value.amount || form.value.amount <= 0 || currentFactor.value <= 0) {
    return '0.00'
  }
  return (form.value.amount * currentFactor.value).toFixed(2)
})

const isFormValid = computed(() => {
  const hasValidType = form.value.type && (
    form.value.type !== 'custom' || 
    customTypeName.value.trim() !== ''
  )
  
  const hasValidSubtype = form.value.subtype && (
    form.value.subtype !== 'custom' || 
    (customSubtypeName.value.trim() !== '' && 
     customUnit.value.trim() !== '' && 
     customFactor.value > 0)
  )
  
  return hasValidType && 
         hasValidSubtype && 
         form.value.amount > 0 && 
         form.value.date
})

const getActualType = () => {
  if (form.value.type === 'custom') {
    return 'custom_' + customTypeName.value.trim().toLowerCase().replace(/\s+/g, '_')
  }
  return form.value.type
}

const getActualSubtype = () => {
  if (form.value.subtype === 'custom') {
    return 'custom_' + customSubtypeName.value.trim().toLowerCase().replace(/\s+/g, '_')
  }
  return form.value.subtype
}

const getCustomFactorData = () => {
  if (form.value.type === 'custom' || form.value.subtype === 'custom') {
    return {
      customTypeName: form.value.type === 'custom' ? customTypeName.value.trim() : null,
      customSubtypeName: form.value.subtype === 'custom' ? customSubtypeName.value.trim() : null,
      customUnit: form.value.subtype === 'custom' ? customUnit.value.trim() : null,
      customFactor: form.value.subtype === 'custom' ? customFactor.value : null
    }
  }
  return null
}

const onTypeChange = () => {
  form.value.subtype = ''
  form.value.amount = 0
  customTypeName.value = ''
  customSubtypeName.value = ''
  customUnit.value = ''
  customFactor.value = 0
}

const onSubtypeChange = () => {
  form.value.amount = 0
  if (form.value.subtype !== 'custom') {
    customSubtypeName.value = ''
    customUnit.value = ''
    customFactor.value = 0
  }
}

const submitRecord = async () => {
  if (!isFormValid.value) {
    errorMessage.value = '请填写所有必填字段'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const recordData = {
      type: getActualType(),
      subtype: getActualSubtype(),
      amount: form.value.amount,
      date: form.value.date,
      note: form.value.note || null
    }
    
    const customData = getCustomFactorData()
    if (customData) {
      recordData.customData = customData
    }
    
    if (form.value.subtype === 'custom') {
      recordData.unit = customUnit.value.trim()
      recordData.carbon_emission = form.value.amount * customFactor.value
    }

    await store.addRecord(recordData)

    form.value.subtype = ''
    form.value.amount = 0
    form.value.note = ''
    customTypeName.value = ''
    customSubtypeName.value = ''
    customUnit.value = ''
    customFactor.value = 0
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error.message || '添加记录失败'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}

.custom-form-group {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px dashed #ddd;
}

.custom-input-row {
  display: flex;
  gap: 1rem;
}

.custom-input-col {
  flex: 1;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.form-input, .form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #5a6fd8;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.carbon-preview {
  font-size: 1.5rem;
  font-weight: 600;
  color: #667eea;
  margin: 0;
}

.factor-info {
  font-size: 0.85rem;
  color: #999;
  margin: 0.25rem 0 0 0;
}

.error-message {
  color: #ef4444;
  margin-top: 1rem;
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .custom-input-row {
    flex-direction: column;
  }
}
</style>
