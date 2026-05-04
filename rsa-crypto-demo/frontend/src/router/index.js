import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import KeyGenerationView from '../views/KeyGenerationView.vue'
import CalculatorView from '../views/CalculatorView.vue'
import CryptoView from '../views/CryptoView.vue'
import HistoryView from '../views/HistoryView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '首页' }
  },
  {
    path: '/key-generation',
    name: 'key-generation',
    component: KeyGenerationView,
    meta: { title: '密钥生成向导' }
  },
  {
    path: '/calculator',
    name: 'calculator',
    component: CalculatorView,
    meta: { title: '大整数计算器' }
  },
  {
    path: '/crypto',
    name: 'crypto',
    component: CryptoView,
    meta: { title: '加密解密' }
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView,
    meta: { title: '历史记录' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} - RSA 密码学算法演示应用`
  next()
})

export default router
