import { createRouter, createWebHistory } from 'vue-router'
import ODESolver from '../views/ODESolver.vue'
import HousingPredictor from '../views/HousingPredictor.vue'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/ode-solver',
    name: 'ODESolver',
    component: ODESolver,
    meta: { title: '常微分方程求解器' }
  },
  {
    path: '/housing-predictor',
    name: 'HousingPredictor',
    component: HousingPredictor,
    meta: { title: '房价预测器' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '方程求解与数据预测系统'
  next()
})

export default router
