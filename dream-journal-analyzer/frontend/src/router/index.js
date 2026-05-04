import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: '梦境日记',
      showTabBar: true
    }
  },
  {
    path: '/add',
    name: 'AddDream',
    component: () => import('@/views/AddDreamView.vue'),
    meta: {
      title: '记录梦境',
      showTabBar: false
    }
  },
  {
    path: '/analysis',
    name: 'Analysis',
    component: () => import('@/views/AnalysisView.vue'),
    meta: {
      title: '梦境分析',
      showTabBar: true
    }
  },
  {
    path: '/detail/:id',
    name: 'DreamDetail',
    component: () => import('@/views/DreamDetailView.vue'),
    meta: {
      title: '梦境详情',
      showTabBar: false
    }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '梦境日记';
  next();
});

export default router;
