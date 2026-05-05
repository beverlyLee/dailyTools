import { defineConfig } from 'umi';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [
    {
      path: '/',
      component: '@/layouts/BasicLayout',
      routes: [
        { path: '/', redirect: '/dashboard' },
        {
          path: '/dashboard',
          name: '仪表盘',
          icon: 'dashboard',
          component: '@/pages/Dashboard',
        },
        {
          path: '/contract-review',
          name: '合同智能审查',
          icon: 'file-search',
          routes: [
            {
              path: '/contract-review/upload',
              name: '上传合同',
              component: '@/pages/ContractReview/Upload',
            },
            {
              path: '/contract-review/history',
              name: '审查历史',
              component: '@/pages/ContractReview/History',
            },
            {
              path: '/contract-review/templates',
              name: '模板管理',
              component: '@/pages/ContractReview/Templates',
            },
          ],
        },
        {
          path: '/esignature-reminder',
          name: '电子签章与履约提醒',
          icon: 'safety-certificate',
          routes: [
            {
              path: '/esignature-reminder/sign',
              name: '电子签章',
              component: '@/pages/ESignatureReminder/Sign',
            },
            {
              path: '/esignature-reminder/contracts',
              name: '合同管理',
              component: '@/pages/ESignatureReminder/Contracts',
            },
            {
              path: '/esignature-reminder/reminders',
              name: '履约提醒',
              component: '@/pages/ESignatureReminder/Reminder',
            },
          ],
        },
      ],
    },
  ],
  fastRefresh: {},
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
  title: '智能合同全生命周期管理平台',
  locale: {
    default: 'zh-CN',
    antd: true,
    title: true,
    baseNavigator: true,
    baseSeparator: '-',
  },
  layout: {
    name: '智能合同全生命周期管理平台',
    locale: true,
    logo: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
  },
  request: {
    dataField: 'data',
  },
});
