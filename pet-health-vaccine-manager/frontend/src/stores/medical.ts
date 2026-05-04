import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAppwriteService } from '@/services/appwriteService'

interface MedicalRecord {
  id: number
  petName: string
  type: string
  date: string
  notes: string
  photos: string[]
  createdAt: string
}

const appwriteService = useAppwriteService()

export const useMedicalStore = defineStore('medical', () => {
  const medicalRecords = ref<MedicalRecord[]>([])

  // 获取病历记录列表
  const getMedicalRecords = async (): Promise<MedicalRecord[]> => {
    try {
      // 尝试从 Appwrite 获取数据
      const data = await appwriteService.getDocuments('medical_records')
      medicalRecords.value = data as MedicalRecord[]
      return medicalRecords.value
    } catch (error) {
      console.error('获取病历记录失败:', error)
      // 如果失败，尝试从本地存储获取
      return getLocalMedicalRecords()
    }
  }

  // 添加病历记录
  const addMedicalRecord = async (record: Omit<MedicalRecord, 'id' | 'createdAt'>): Promise<MedicalRecord> => {
    const newRecord: MedicalRecord = {
      ...record,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }

    try {
      // 尝试保存到 Appwrite
      await appwriteService.createDocument('medical_records', newRecord)
      medicalRecords.value.unshift(newRecord)
      saveLocalMedicalRecords()
      return newRecord
    } catch (error) {
      console.error('添加病历记录失败:', error)
      // 如果失败，保存到本地存储
      medicalRecords.value.unshift(newRecord)
      saveLocalMedicalRecords()
      return newRecord
    }
  }

  // 更新病历记录
  const updateMedicalRecord = async (record: MedicalRecord): Promise<void> => {
    const index = medicalRecords.value.findIndex(r => r.id === record.id)
    if (index !== -1) {
      try {
        // 尝试更新到 Appwrite
        await appwriteService.updateDocument('medical_records', record.id.toString(), record)
        medicalRecords.value[index] = record
        saveLocalMedicalRecords()
      } catch (error) {
        console.error('更新病历记录失败:', error)
        // 如果失败，更新本地存储
        medicalRecords.value[index] = record
        saveLocalMedicalRecords()
      }
    }
  }

  // 删除病历记录
  const deleteMedicalRecord = async (id: number): Promise<void> => {
    const index = medicalRecords.value.findIndex(r => r.id === id)
    if (index !== -1) {
      try {
        // 尝试从 Appwrite 删除
        await appwriteService.deleteDocument('medical_records', id.toString())
        medicalRecords.value.splice(index, 1)
        saveLocalMedicalRecords()
      } catch (error) {
        console.error('删除病历记录失败:', error)
        // 如果失败，从本地存储删除
        medicalRecords.value.splice(index, 1)
        saveLocalMedicalRecords()
      }
    }
  }

  // 按宠物名称筛选病历记录
  const filterRecordsByPetName = (petName: string): MedicalRecord[] => {
    if (!petName) return medicalRecords.value
    return medicalRecords.value.filter(record => 
      record.petName.toLowerCase().includes(petName.toLowerCase())
    )
  }

  // 按类型筛选病历记录
  const filterRecordsByType = (type: string): MedicalRecord[] => {
    if (!type || type === 'all') return medicalRecords.value
    return medicalRecords.value.filter(record => record.type === type)
  }

  // 按日期范围筛选病历记录
  const filterRecordsByDateRange = (startDate: string, endDate: string): MedicalRecord[] => {
    return medicalRecords.value.filter(record => {
      const recordDate = new Date(record.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return recordDate >= start && recordDate <= end
    })
  }

  // 从本地存储获取病历记录
  const getLocalMedicalRecords = (): MedicalRecord[] => {
    try {
      const data = uni.getStorageSync('medical_records')
      if (data) {
        medicalRecords.value = data as MedicalRecord[]
        return medicalRecords.value
      }
    } catch (error) {
      console.error('从本地存储获取病历记录失败:', error)
    }
    return []
  }

  // 保存病历记录到本地存储
  const saveLocalMedicalRecords = (): void => {
    try {
      uni.setStorageSync('medical_records', medicalRecords.value)
    } catch (error) {
      console.error('保存病历记录到本地存储失败:', error)
    }
  }

  // 上传照片
  const uploadPhoto = async (filePath: string): Promise<string> => {
    try {
      // 尝试上传到 Appwrite 存储
      const fileId = await appwriteService.uploadFile(filePath)
      return fileId
    } catch (error) {
      console.error('上传照片失败:', error)
      // 如果失败，返回本地路径作为临时方案
      return filePath
    }
  }

  // 删除照片
  const deletePhoto = async (fileId: string): Promise<void> => {
    try {
      // 尝试从 Appwrite 存储删除
      await appwriteService.deleteFile(fileId)
    } catch (error) {
      console.error('删除照片失败:', error)
      // 如果失败，不做额外处理
    }
  }

  return {
    medicalRecords,
    getMedicalRecords,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    filterRecordsByPetName,
    filterRecordsByType,
    filterRecordsByDateRange,
    uploadPhoto,
    deletePhoto
  }
})
