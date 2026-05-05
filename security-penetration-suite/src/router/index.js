import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import VulnScannerView from '../views/VulnScannerView.vue';
import AssetAnalyzerView from '../views/AssetAnalyzerView.vue';
import ReportsView from '../views/ReportsView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { title: '首页' },
  },
  {
    path: '/vuln-scanner',
    name: 'VulnScanner',
    component: VulnScannerView,
    meta: { title: '漏洞扫描器' },
  },
  {
    path: '/asset-analyzer',
    name: 'AssetAnalyzer',
    component: AssetAnalyzerView,
    meta: { title: '资产分析器' },
  },
  {
    path: '/reports',
    name: 'Reports',
    component: ReportsView,
    meta: { title: '报告管理' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 安全渗透测试工具箱` : '安全渗透测试工具箱';
  next();
});

export default router;
