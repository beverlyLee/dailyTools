import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import Dashboard from './components/Dashboard.vue'
import Monitoring from './components/Monitoring.vue'
import SelfHealing from './components/SelfHealing.vue'
import Probes from './components/Probes.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/monitoring', component: Monitoring },
  { path: '/self-healing', component: SelfHealing },
  { path: '/probes', component: Probes }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
