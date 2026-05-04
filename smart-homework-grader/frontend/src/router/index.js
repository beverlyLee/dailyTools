import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'EssaySubmit',
    component: () => import('../views/EssaySubmit.vue'),
    meta: { title: '作文提交' }
  },
  {
    path: '/essays',
    name: 'EssayList',
    component: () => import('../views/EssayList.vue'),
    meta: { title: '我的作文' }
  },
  {
    path: '/essay/:id',
    name: 'EssayDetail',
    component: () => import('../views/EssayDetail.vue'),
    meta: { title: '作文详情' }
  },
  {
    path: '/classes',
    name: 'ClassManagement',
    component: () => import('../views/ClassManagement.vue'),
    meta: { title: '班级管理' }
  },
  {
    path: '/class/:id',
    name: 'ClassDetail',
    component: () => import('../views/ClassDetail.vue'),
    meta: { title: '班级详情' }
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('../views/Analysis.vue'),
    meta: { title: '学情分析' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '中文作文智能批改系统'
  next()
})

export default router
