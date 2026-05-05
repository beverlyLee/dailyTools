import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  SettingOutlined,
  ServerOutlined,
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import NodeMap from './pages/NodeMap';
import AppDeploy from './pages/AppDeploy';
import ServerRoom3D from './pages/ServerRoom3D';
import Settings from './pages/Settings';

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '概览',
    },
    {
      key: '/nodes',
      icon: <GlobalOutlined />,
      label: '节点地图',
    },
    {
      key: '/server-room',
      icon: <ServerOutlined />,
      label: '3D机房',
    },
    {
      key: '/apps',
      icon: <AppstoreOutlined />,
      label: '应用分发',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="dark"
        >
          <div style={{
            height: 64,
            margin: 16,
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? 12 : 16,
            fontWeight: 'bold',
          }}>
            {collapsed ? 'ECC' : '边缘计算管理中心'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['/dashboard']}
            items={menuItems}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              padding: 0,
              background: colorBgContainer,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 24,
              fontSize: 18,
              fontWeight: 600,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            <span>边缘计算管理中心</span>
          </Header>
          <Content
            style={{
              margin: '24px 16px',
              padding: 24,
              background: colorBgContainer,
              minHeight: 280,
              borderRadius: borderRadiusLG,
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/nodes" element={<NodeMap />} />
              <Route path="/server-room" element={<ServerRoom3D />} />
              <Route path="/apps" element={<AppDeploy />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;
