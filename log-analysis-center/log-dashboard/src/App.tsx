import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/Dashboard';
import { SearchPage } from '@/pages/Search';
import { AlertsPage } from '@/pages/Alerts';
import { RulesPage } from '@/pages/Rules';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/rules" element={<RulesPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
