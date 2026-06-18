import { createRouter, createWebHistory } from 'vue-router';
import ScanPage from '@/pages/ScanPage.vue';
import LabelCheckPage from '@/pages/LabelCheckPage.vue';
import ReportPage from '@/pages/ReportPage.vue';
import BlacklistPage from '@/pages/BlacklistPage.vue';

const routes = [
  {
    path: '/',
    name: 'scan',
    component: ScanPage
  },
  {
    path: '/label-check',
    name: 'label-check',
    component: LabelCheckPage
  },
  {
    path: '/report',
    name: 'report',
    component: ReportPage
  },
  {
    path: '/blacklist',
    name: 'blacklist',
    component: BlacklistPage
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
