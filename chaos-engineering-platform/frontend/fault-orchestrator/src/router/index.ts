import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/experiments'
  },
  {
    path: '/experiments',
    name: 'Experiments',
    component: () => import('@/views/ExperimentsView.vue'),
    meta: { title: '实验列表' }
  },
  {
    path: '/orchestrator',
    name: 'Orchestrator',
    component: () => import('@/views/OrchestratorView.vue'),
    meta: { title: '故障编排' }
  },
  {
    path: '/orchestrator/:id',
    name: 'OrchestratorEdit',
    component: () => import('@/views/OrchestratorView.vue'),
    meta: { title: '编辑实验' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '混沌工程'} - 故障场景编排器`
  next()
})

export default router
