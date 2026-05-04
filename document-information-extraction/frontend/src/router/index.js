import { createRouter, createWebHistory } from 'vue-router'
import UploadPage from '../views/UploadPage.vue'
import ListPage from '../views/ListPage.vue'

const routes = [
  {
    path: '/',
    redirect: '/upload'
  },
  {
    path: '/upload',
    name: 'Upload',
    component: UploadPage
  },
  {
    path: '/list',
    name: 'List',
    component: ListPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
