import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  PipelineOutlined,
  DatabaseOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import PipelineDesigner from './pages/PipelineDesigner';
import ArtifactsManager from './pages/ArtifactsManager';
import SettingsPage from './pages/SettingsPage';

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/pipeline',
      icon: <PipelineOutlined />,
      label: '流水线设计器',
    },
    {
      key: '/artifacts',
      icon: <DatabaseOutlined />,
      label: '构建产物',
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
            {collapsed ? 'CI' : 'CI/CD Workbench'}
          </div>
          <Menu
            theme="dark"
            defaultSelectedKeys={['/pipeline']}
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
              <Route path="/" element={<Navigate to="/pipeline" replace />} />
              <Route path="/pipeline" element={<PipelineDesigner />} />
              <Route path="/artifacts" element={<ArtifactsManager />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
