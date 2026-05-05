import { createRouter, createWebHistory } from 'vue-router'
import EssayPage from '@/views/EssayPage.vue'
import DocumentPage from '@/views/DocumentPage.vue'
import HistoryPage from '@/views/HistoryPage.vue'

const routes = [
  {
    path: '/',
    redirect: '/essay'
  },
  {
    path: '/essay',
    name: 'Essay',
    component: EssayPage
  },
  {
    path: '/document',
    name: 'Document',
    component: DocumentPage
  },
  {
    path: '/history',
    name: 'History',
    component: HistoryPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
