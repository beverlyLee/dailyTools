import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import PasswordManager from './pages/PasswordManager/index.vue'
import RegexTester from './pages/RegexTester/index.vue'

const routes = [
  { path: '/', redirect: '/password-manager' },
  { path: '/password-manager', component: PasswordManager },
  { path: '/regex-tester', component: RegexTester },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')
