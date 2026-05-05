import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import MapView from '../views/MapView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/map',
    name: 'map',
    component: MapView
  },
  {
    path: '/security/video',
    name: 'video',
    component: () => import('../views/security/VideoMonitor.vue')
  },
  {
    path: '/security/access',
    name: 'access',
    component: () => import('../views/security/AccessControl.vue')
  },
  {
    path: '/security/fire',
    name: 'fire',
    component: () => import('../views/security/FireSystem.vue')
  },
  {
    path: '/security/alarm',
    name: 'alarm',
    component: () => import('../views/security/AlarmHandling.vue')
  },
  {
    path: '/energy/dashboard',
    name: 'energyDashboard',
    component: () => import('../views/energy/EnergyDashboard.vue')
  },
  {
    path: '/energy/peak',
    name: 'peak',
    component: () => import('../views/energy/PeakValleyAnalysis.vue')
  },
  {
    path: '/energy/ranking',
    name: 'ranking',
    component: () => import('../views/energy/EnergyRanking.vue')
  },
  {
    path: '/energy/report',
    name: 'report',
    component: () => import('../views/energy/OptimizationReport.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
