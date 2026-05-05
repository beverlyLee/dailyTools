import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import UIDesigner from '@/views/UIDesigner.vue'
import APITest from '@/views/APITest.vue'
import Scheduler from '@/views/Scheduler.vue'
import Reports from '@/views/Reports.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/ui-designer',
    name: 'UIDesigner',
    component: UIDesigner
  },
  {
    path: '/api-test',
    name: 'APITest',
    component: APITest
  },
  {
    path: '/scheduler',
    name: 'Scheduler',
    component: Scheduler
  },
  {
    path: '/reports',
    name: 'Reports',
    component: Reports
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
