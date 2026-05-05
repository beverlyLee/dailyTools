import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

const routes = [
  {
    path: '/',
    name: 'Timer',
    component: () => import('./views/TimerView.vue')
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('./views/TasksView.vue')
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('./views/StatsView.vue')
  },
  {
    path: '/diff',
    name: 'Diff',
    component: () => import('./views/DiffView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
