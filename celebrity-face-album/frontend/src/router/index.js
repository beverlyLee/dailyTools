import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ResumeView from '../views/ResumeView.vue'
import JobView from '../views/JobView.vue'
import MatchView from '../views/MatchView.vue'
import TalentView from '../views/TalentView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/resume',
    name: 'resume',
    component: ResumeView
  },
  {
    path: '/job',
    name: 'job',
    component: JobView
  },
  {
    path: '/match',
    name: 'match',
    component: MatchView
  },
  {
    path: '/talent',
    name: 'talent',
    component: TalentView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
