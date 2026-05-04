import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from 'boot/axios'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthenticated = ref(false)

  const isLoggedIn = computed(() => isAuthenticated.value)
  const currentUser = computed(() => user.value)

  async function checkAuthStatus() {
    try {
      const response = await api.get('/auth/status')
      if (response.data.authenticated) {
        user.value = response.data.user
        isAuthenticated.value = true
        await recordHeartbeat()
      } else {
        user.value = null
        isAuthenticated.value = false
      }
      return response.data.authenticated
    } catch (error) {
      user.value = null
      isAuthenticated.value = false
      return false
    }
  }

  async function login(username, password) {
    try {
      const response = await api.post('/login', { username, password })
      if (response.data.success) {
        user.value = response.data.user
        isAuthenticated.value = true
        return { success: true }
      }
      return { success: false, error: 'Login failed' }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed'
      return { success: false, error: errorMessage }
    }
  }

  async function register(username, password) {
    try {
      const response = await api.post('/register', { username, password })
      if (response.data.success) {
        return { success: true }
      }
      return { success: false, error: 'Registration failed' }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed'
      return { success: false, error: errorMessage }
    }
  }

  async function logout() {
    try {
      await api.post('/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      user.value = null
      isAuthenticated.value = false
    }
  }

  async function recordHeartbeat() {
    try {
      await api.post('/heartbeat')
    } catch (error) {
      console.error('Heartbeat error:', error)
    }
  }

  return {
    user,
    isAuthenticated,
    isLoggedIn,
    currentUser,
    checkAuthStatus,
    login,
    register,
    logout,
    recordHeartbeat
  }
})
