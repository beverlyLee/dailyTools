import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { recordsApi } from '../api'

export const useCarbonStore = defineStore('carbon', () => {
  const records = ref([])
  const emissionFactors = ref({})
  const loading = ref(false)
  const error = ref(null)

  const todayCarbon = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return records.value
      .filter(record => record.date === today)
      .reduce((sum, record) => sum + record.carbon_emission, 0)
      .toFixed(2)
  })

  const monthlyCarbon = computed(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    return records.value
      .filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear
      })
      .reduce((sum, record) => sum + record.carbon_emission, 0)
      .toFixed(2)
  })

  const totalCarbon = computed(() => {
    return records.value
      .reduce((sum, record) => sum + record.carbon_emission, 0)
      .toFixed(2)
  })

  const fetchRecords = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await recordsApi.getAllRecords()
      records.value = data
    } catch (err) {
      error.value = err.message
      console.error('获取记录失败:', err)
    } finally {
      loading.value = false
    }
  }

  const addRecord = async (record) => {
    loading.value = true
    error.value = null
    try {
      const data = await recordsApi.addRecord(record)
      records.value.push(data)
      return data
    } catch (err) {
      error.value = err.message
      console.error('添加记录失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteRecord = async (id) => {
    loading.value = true
    error.value = null
    try {
      await recordsApi.deleteRecord(id)
      records.value = records.value.filter(record => record.id !== id)
    } catch (err) {
      error.value = err.message
      console.error('删除记录失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchEmissionFactors = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await recordsApi.getEmissionFactors()
      emissionFactors.value = data
    } catch (err) {
      error.value = err.message
      console.error('获取排放因子失败:', err)
    } finally {
      loading.value = false
    }
  }

  const getRecordsByType = (type) => {
    return records.value.filter(record => record.type === type)
  }

  const getRecordsByDateRange = (startDate, endDate) => {
    return records.value.filter(record => 
      record.date >= startDate && record.date <= endDate
    )
  }

  return {
    records,
    emissionFactors,
    loading,
    error,
    todayCarbon,
    monthlyCarbon,
    totalCarbon,
    fetchRecords,
    addRecord,
    deleteRecord,
    fetchEmissionFactors,
    getRecordsByType,
    getRecordsByDateRange
  }
})
