import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: '监控仪表盘' }
  },
  {
    path: '/thresholds',
    name: 'Thresholds',
    component: () => import('@/views/ThresholdsView.vue'),
    meta: { title: '阈值配置' }
  },
  {
    path: '/checks',
    name: 'Checks',
    component: () => import('@/views/ChecksView.vue'),
    meta: { title: '稳态检查' }
  },
  {
    path: '/circuit-breaker',
    name: 'CircuitBreaker',
    component: () => import('@/views/CircuitBreakerView.vue'),
    meta: { title: '熔断管理' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '监视器'} - 稳态指标监视器`
  next()
})

export default router
