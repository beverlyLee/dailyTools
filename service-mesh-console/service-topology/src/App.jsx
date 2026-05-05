import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  NetworkOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import TopologyPage from './pages/TopologyPage';
import MetricsPage from './pages/MetricsPage';
import SettingsPage from './pages/SettingsPage';

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/topology',
      icon: <NetworkOutlined />,
      label: '服务拓扑图',
    },
    {
      key: '/metrics',
      icon: <BarChartOutlined />,
      label: '流量监控',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
        >
          <div
            style={{
              height: 32,
              margin: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            {collapsed ? '拓扑' : '服务拓扑流量图'}
          </div>
          <Menu
            theme="dark"
            defaultSelectedKeys={['/topology']}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => (window.location.hash = key)}
          />
        </Sider>
        <Layout>
          <Header style={{ padding: 0, background: colorBgContainer }} />
          <Content
            style={{
              margin: '24px 16px',
              padding: 24,
              minHeight: 280,
              background: colorBgContainer,
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/topology" replace />} />
              <Route path="/topology" element={<TopologyPage />} />
              <Route path="/metrics" element={<MetricsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
