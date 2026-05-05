import { createRouter, createWebHashHistory } from 'vue-router'
import CashierView from '../views/CashierView.vue'
import InventoryView from '../views/InventoryView.vue'
import ReportView from '../views/ReportView.vue'
import SettingView from '../views/SettingView.vue'

const routes = [
  {
    path: '/',
    redirect: '/cashier'
  },
  {
    path: '/cashier',
    name: 'cashier',
    component: CashierView
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: InventoryView
  },
  {
    path: '/report',
    name: 'report',
    component: ReportView
  },
  {
    path: '/setting',
    name: 'setting',
    component: SettingView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
