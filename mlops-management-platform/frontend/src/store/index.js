import { createPinia } from 'pinia'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const currentRoute = ref('experiments')

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const setCurrentRoute = (route) => {
    currentRoute.value = route
  }

  return {
    sidebarCollapsed,
    currentRoute,
    toggleSidebar,
    setCurrentRoute
  }
})

export const useExperimentsStore = defineStore('experiments', () => {
  const experiments = ref([])
  const currentExperiment = ref(null)
  const runs = ref([])
  const selectedRuns = ref([])
  const loading = ref(false)

  const setExperiments = (data) => {
    experiments.value = data
  }

  const setCurrentExperiment = (exp) => {
    currentExperiment.value = exp
  }

  const setRuns = (data) => {
    runs.value = data
  }

  const setSelectedRuns = (data) => {
    selectedRuns.value = data
  }

  const setLoading = (status) => {
    loading.value = status
  }

  return {
    experiments,
    currentExperiment,
    runs,
    selectedRuns,
    loading,
    setExperiments,
    setCurrentExperiment,
    setRuns,
    setSelectedRuns,
    setLoading
  }
})

export const useModelsStore = defineStore('models', () => {
  const models = ref([])
  const currentModel = ref(null)
  const loading = ref(false)

  const setModels = (data) => {
    models.value = data
  }

  const setCurrentModel = (model) => {
    currentModel.value = model
  }

  const setLoading = (status) => {
    loading.value = status
  }

  return {
    models,
    currentModel,
    loading,
    setModels,
    setCurrentModel,
    setLoading
  }
})

export const useMonitoringStore = defineStore('monitoring', () => {
  const services = ref([])
  const currentService = ref(null)
  const metrics = ref({})
  const rollbackHistory = ref([])
  const loading = ref(false)
  const autoRefresh = ref(true)

  const setServices = (data) => {
    services.value = data
  }

  const setCurrentService = (service) => {
    currentService.value = service
  }

  const setMetrics = (data) => {
    metrics.value = data
  }

  const setRollbackHistory = (data) => {
    rollbackHistory.value = data
  }

  const setLoading = (status) => {
    loading.value = status
  }

  const toggleAutoRefresh = () => {
    autoRefresh.value = !autoRefresh.value
  }

  return {
    services,
    currentService,
    metrics,
    rollbackHistory,
    loading,
    autoRefresh,
    setServices,
    setCurrentService,
    setMetrics,
    setRollbackHistory,
    setLoading,
    toggleAutoRefresh
  }
})

const pinia = createPinia()

export default pinia
