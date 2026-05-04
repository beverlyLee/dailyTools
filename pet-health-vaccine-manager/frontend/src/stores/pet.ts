import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAppwriteService } from '@/services/appwriteService'

interface Vaccine {
  id: number
  name: string
  date: string
  status: 'pending' | 'scheduled' | 'completed'
  notes?: string
}

interface VaccinePlan {
  id: number
  petName: string
  petType: string
  templateId: number
  vaccines: Vaccine[]
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
}

interface Reminder {
  id: number
  petName: string
  vaccineName: string
  date: string
}

const appwriteService = useAppwriteService()

export const usePetStore = defineStore('pet', () => {
  const vaccinePlans = ref<VaccinePlan[]>([])
  const reminders = ref<Reminder[]>([])

  // 获取疫苗计划列表
  const getVaccinePlans = async (): Promise<VaccinePlan[]> => {
    try {
      // 尝试从 Appwrite 获取数据
      const data = await appwriteService.getDocuments('vaccine_plans')
      vaccinePlans.value = data as VaccinePlan[]
      return vaccinePlans.value
    } catch (error) {
      console.error('获取疫苗计划失败:', error)
      // 如果失败，尝试从本地存储获取
      return getLocalVaccinePlans()
    }
  }

  // 添加疫苗计划
  const addVaccinePlan = async (plan: Omit<VaccinePlan, 'id' | 'createdAt'>): Promise<VaccinePlan> => {
    const newPlan: VaccinePlan = {
      ...plan,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }

    try {
      // 尝试保存到 Appwrite
      await appwriteService.createDocument('vaccine_plans', newPlan)
      vaccinePlans.value.unshift(newPlan)
      saveLocalVaccinePlans()
      return newPlan
    } catch (error) {
      console.error('添加疫苗计划失败:', error)
      // 如果失败，保存到本地存储
      vaccinePlans.value.unshift(newPlan)
      saveLocalVaccinePlans()
      return newPlan
    }
  }

  // 更新疫苗计划
  const updateVaccinePlan = async (plan: VaccinePlan): Promise<void> => {
    const index = vaccinePlans.value.findIndex(p => p.id === plan.id)
    if (index !== -1) {
      try {
        // 尝试更新到 Appwrite
        await appwriteService.updateDocument('vaccine_plans', plan.id.toString(), plan)
        vaccinePlans.value[index] = plan
        saveLocalVaccinePlans()
      } catch (error) {
        console.error('更新疫苗计划失败:', error)
        // 如果失败，更新本地存储
        vaccinePlans.value[index] = plan
        saveLocalVaccinePlans()
      }
    }
  }

  // 删除疫苗计划
  const deleteVaccinePlan = async (id: number): Promise<void> => {
    const index = vaccinePlans.value.findIndex(p => p.id === id)
    if (index !== -1) {
      try {
        // 尝试从 Appwrite 删除
        await appwriteService.deleteDocument('vaccine_plans', id.toString())
        vaccinePlans.value.splice(index, 1)
        saveLocalVaccinePlans()
      } catch (error) {
        console.error('删除疫苗计划失败:', error)
        // 如果失败，从本地存储删除
        vaccinePlans.value.splice(index, 1)
        saveLocalVaccinePlans()
      }
    }
  }

  // 获取疫苗提醒
  const getVaccineReminders = async (): Promise<Reminder[]> => {
    try {
      // 首先确保疫苗计划已加载
      if (vaccinePlans.value.length === 0) {
        await getVaccinePlans()
      }

      // 从疫苗计划中提取即将到期的提醒
      const now = new Date()
      const upcomingReminders: Reminder[] = []

      vaccinePlans.value.forEach(plan => {
        plan.vaccines.forEach(vaccine => {
          if (vaccine.status === 'pending' || vaccine.status === 'scheduled') {
            const vaccineDate = new Date(vaccine.date)
            const diffDays = Math.ceil((vaccineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

            // 只显示未来30天内的提醒
            if (diffDays >= 0 && diffDays <= 30) {
              upcomingReminders.push({
                id: vaccine.id,
                petName: plan.petName,
                vaccineName: vaccine.name,
                date: vaccine.date
              })
            }
          }
        })
      })

      // 按日期排序
      upcomingReminders.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })

      reminders.value = upcomingReminders
      return reminders.value
    } catch (error) {
      console.error('获取疫苗提醒失败:', error)
      return []
    }
  }

  // 从本地存储获取疫苗计划
  const getLocalVaccinePlans = (): VaccinePlan[] => {
    try {
      const data = uni.getStorageSync('vaccine_plans')
      if (data) {
        vaccinePlans.value = data as VaccinePlan[]
        return vaccinePlans.value
      }
    } catch (error) {
      console.error('从本地存储获取疫苗计划失败:', error)
    }
    return []
  }

  // 保存疫苗计划到本地存储
  const saveLocalVaccinePlans = (): void => {
    try {
      uni.setStorageSync('vaccine_plans', vaccinePlans.value)
    } catch (error) {
      console.error('保存疫苗计划到本地存储失败:', error)
    }
  }

  return {
    vaccinePlans,
    reminders,
    getVaccinePlans,
    addVaccinePlan,
    updateVaccinePlan,
    deleteVaccinePlan,
    getVaccineReminders
  }
})
