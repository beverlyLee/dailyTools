const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { 
        path: 'dashboard', 
        component: () => import('pages/DashboardPage.vue'),
        meta: { title: 'Dashboard' }
      },
      { 
        path: 'assets', 
        component: () => import('pages/AssetsPage.vue'),
        meta: { title: 'Assets' }
      },
      { 
        path: 'assets/new', 
        component: () => import('pages/AssetEditPage.vue'),
        meta: { title: 'New Asset' }
      },
      { 
        path: 'assets/:id', 
        component: () => import('pages/AssetDetailPage.vue'),
        meta: { title: 'Asset Detail' }
      },
      { 
        path: 'dead-mans-switch', 
        component: () => import('pages/DeadMansSwitchPage.vue'),
        meta: { title: 'Dead Man\'s Switch' }
      }
    ]
  },
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
    meta: { title: 'Login' }
  },
  {
    path: '/register',
    component: () => import('pages/RegisterPage.vue'),
    meta: { title: 'Register' }
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
