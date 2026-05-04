import { createRouter, createWebHistory } from 'vue-router'
import DocumentList from '../views/DocumentList.vue'
import DocumentEditor from '../views/DocumentEditor.vue'

const routes = [
  {
    path: '/',
    redirect: '/documents'
  },
  {
    path: '/documents',
    name: 'DocumentList',
    component: DocumentList
  },
  {
    path: '/documents/:id',
    name: 'DocumentEditor',
    component: DocumentEditor
  },
  {
    path: '/editor',
    name: 'NewDocumentEditor',
    component: DocumentEditor
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
