import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ResumeView from '../views/ResumeView.vue'
import JobView from '../views/JobView.vue'
import MatchView from '../views/MatchView.vue'
import TalentView from '../views/TalentView.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/resume',
    name: 'Resume',
    component: ResumeView
  },
  {
    path: '/job',
    name: 'Job',
    component: JobView
  },
  {
    path: '/match',
    name: 'Match',
    component: MatchView
  },
  {
    path: '/talent',
    name: 'Talent',
    component: TalentView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
