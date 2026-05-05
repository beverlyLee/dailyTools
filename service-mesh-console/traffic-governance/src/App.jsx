import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  RocketOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import CanaryPage from './pages/CanaryPage';
import BlueGreenPage from './pages/BlueGreenPage';
import CircuitBreakerPage from './pages/CircuitBreakerPage';
import AccessControlPage from './pages/AccessControlPage';

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/canary',
      icon: <RocketOutlined />,
      label: '金丝雀发布',
    },
    {
      key: '/blue-green',
      icon: <SwapOutlined />,
      label: '蓝绿部署',
    },
    {
      key: '/circuit-breaker',
      icon: <ThunderboltOutlined />,
      label: '熔断降级',
    },
    {
      key: '/access-control',
      icon: <SafetyOutlined />,
      label: '黑白名单',
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
            {collapsed ? '治理' : '流量治理配置器'}
          </div>
          <Menu
            theme="dark"
            defaultSelectedKeys={['/canary']}
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
              <Route path="/" element={<Navigate to="/canary" replace />} />
              <Route path="/canary" element={<CanaryPage />} />
              <Route path="/blue-green" element={<BlueGreenPage />} />
              <Route path="/circuit-breaker" element={<CircuitBreakerPage />} />
              <Route path="/access-control" element={<AccessControlPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
