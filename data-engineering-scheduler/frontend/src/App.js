import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  ProjectOutlined,
  DashboardOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import DAGDesigner from './pages/DAGDesigner';
import QualityDashboard from './pages/QualityDashboard';
import SettingsPage from './pages/SettingsPage';

const { Header, Sider, Content } = Layout;

const App = () => {
  const location = useLocation();
  
  const menuItems = [
    {
      key: '/',
      icon: <ProjectOutlined />,
      label: <Link to="/">DAG 工作流设计器</Link>,
    },
    {
      key: '/quality',
      icon: <DashboardOutlined />,
      label: <Link to="/quality">数据质量监控台</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">系统设置</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#001529',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            marginRight: '40px',
          }}
        >
          数据工程调度平台
        </div>
      </Header>
      <Layout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Routes>
            <Route path="/" element={<DAGDesigner />} />
            <Route path="/quality" element={<QualityDashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
