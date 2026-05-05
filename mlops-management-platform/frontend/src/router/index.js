import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/experiments'
  },
  {
    path: '/experiments',
    name: 'Experiments',
    component: () => import('../views/Experiments.vue'),
    meta: { title: '实验管理' }
  },
  {
    path: '/experiments/:experimentId/runs',
    name: 'ExperimentRuns',
    component: () => import('../views/ExperimentRuns.vue'),
    meta: { title: '实验运行' }
  },
  {
    path: '/runs/:runId',
    name: 'RunDetails',
    component: () => import('../views/RunDetails.vue'),
    meta: { title: '运行详情' }
  },
  {
    path: '/models',
    name: 'Models',
    component: () => import('../views/Models.vue'),
    meta: { title: '模型管理' }
  },
  {
    path: '/models/:modelName',
    name: 'ModelDetails',
    component: () => import('../views/ModelDetails.vue'),
    meta: { title: '模型详情' }
  },
  {
    path: '/monitoring',
    name: 'Monitoring',
    component: () => import('../views/Monitoring.vue'),
    meta: { title: '服务监控' }
  },
  {
    path: '/monitoring/:serviceName',
    name: 'ServiceDetails',
    component: () => import('../views/ServiceDetails.vue'),
    meta: { title: '服务详情' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - MLOps Platform` : 'MLOps Platform'
  next()
})

export default router
