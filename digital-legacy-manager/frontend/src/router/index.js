import { route } from 'quasar/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth'

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  Router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    
    if (to.meta.requiresAuth) {
      const isAuthenticated = await authStore.checkAuthStatus()
      if (!isAuthenticated) {
        next('/login')
        return
      }
    }
    
    if ((to.path === '/login' || to.path === '/register') && authStore.isLoggedIn) {
      next('/dashboard')
      return
    }
    
    next()
  })

  return Router
})
