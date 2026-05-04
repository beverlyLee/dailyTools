<template>
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">记录列表</h3>
      <div class="filter-controls">
        <select v-model="filterType" class="form-select" style="width: auto; padding: 0.5rem; font-size: 0.9rem;">
          <option value="">全部类型</option>
          <option v-for="(label, type) in allTypeOptions" :key="type" :value="type">
            {{ label }}
          </option>
        </select>
      </div>
    </div>
    
    <div v-if="filteredRecords.length === 0" class="empty-state">
      <p>暂无记录</p>
      <p style="font-size: 0.9rem; color: #999;">添加您的第一条碳排放记录开始追踪</p>
    </div>
    
    <div v-else class="records-list">
      <div 
        v-for="record in filteredRecords" 
        :key="record.id" 
        class="record-item"
      >
        <div class="record-info">
          <div class="record-header">
            <span class="record-type" :class="{ 'custom-type': isCustomType(record.type) }">
              {{ getTypeLabel(record.type) }}
              <span v-if="isCustomType(record.type)" class="custom-badge">自定义</span>
            </span>
            <span class="record-date">{{ formatDate(record.date) }}</span>
          </div>
          <div class="record-details">
            <p class="record-subtype">{{ getSubtypeName(record) }}</p>
            <p class="record-amount">{{ record.amount }} {{ record.unit }}</p>
          </div>
          <p v-if="record.note" class="record-note">{{ record.note }}</p>
        </div>
        <div class="record-carbon">
          <p class="carbon-value">{{ record.carbon_emission.toFixed(2) }}</p>
          <p class="carbon-unit">kg CO₂</p>
        </div>
        <button 
          class="btn btn-danger delete-btn"
          @click="deleteRecord(record.id)"
          title="删除记录"
        >
          ×
        </button>
      </div>
    </div>
    
    <div v-if="records.length > 0" class="records-summary">
      <p>共 {{ records.length }} 条记录</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCarbonStore } from '../stores/carbonStore'

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['recordDeleted'])

const store = useCarbonStore()
const filterType = ref('')

const typeLabels = {
  transport: '出行',
  diet: '饮食',
  home: '家庭能源',
  shopping: '购物'
}

const allTypeOptions = computed(() => {
  const options = { ...typeLabels }
  
  props.records.forEach(record => {
    if (!options[record.type] && isCustomType(record.type)) {
      options[record.type] = getTypeLabel(record.type)
    }
  })
  
  return options
})

const filteredRecords = computed(() => {
  if (!filterType.value) {
    return props.records
  }
  return props.records.filter(record => record.type === filterType.value)
})

const isCustomType = (type) => {
  return type && type.startsWith('custom_')
}

const isCustomSubtype = (subtype) => {
  return subtype && subtype.startsWith('custom_')
}

const getTypeLabel = (type) => {
  if (typeLabels[type]) return typeLabels[type]
  if (isCustomType(type)) {
    return type.replace('custom_', '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }
  return type
}

const getSubtypeName = (record) => {
  if (isCustomSubtype(record.subtype)) {
    if (record.custom_data && record.custom_data.customSubtypeName) {
      return record.custom_data.customSubtypeName
    }
    return record.subtype.replace('custom_', '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }
  
  const factors = store.emissionFactors
  if (factors && factors[record.type] && factors[record.type][record.subtype]) {
    return factors[record.type][record.subtype].name
  }
  return record.subtype
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

const deleteRecord = async (id) => {
  if (confirm('确定要删除这条记录吗？')) {
    try {
      await store.deleteRecord(id)
      emit('recordDeleted')
    } catch (error) {
      console.error('删除记录失败:', error)
      alert('删除记录失败: ' + error.message)
    }
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.filter-controls {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.records-list {
  max-height: 400px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
}

.record-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.record-info {
  flex: 1;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.record-type {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #666;
}

.record-type.custom-type {
  background-color: #eef2ff;
  color: #4f46e5;
}

.custom-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  background-color: #4f46e5;
  color: white;
  border-radius: 3px;
}

.record-date {
  font-size: 0.85rem;
  color: #999;
}

.record-details {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.record-subtype {
  font-weight: 500;
  margin: 0;
}

.record-amount {
  color: #666;
  margin: 0;
  font-size: 0.9rem;
}

.record-note {
  font-size: 0.85rem;
  color: #999;
  margin: 0.5rem 0 0 0;
  font-style: italic;
}

.record-carbon {
  text-align: right;
  margin-right: 1rem;
}

.carbon-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #667eea;
  margin: 0;
}

.carbon-unit {
  font-size: 0.75rem;
  color: #999;
  margin: 0;
}

.delete-btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
  font-size: 1.25rem;
  line-height: 1;
  border-radius: 50%;
  background-color: #fef2f2;
  color: #ef4444;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.delete-btn:hover {
  background-color: #ef4444;
  color: white;
}

.records-summary {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}
</style>
