import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, theme, Button, Dropdown, Space, Avatar, Tag } from 'antd';
import {
  MessageOutlined,
  DashboardOutlined,
  BookOutlined,
  RobotOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import './index.css';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/chat',
    icon: <MessageOutlined />,
    label: <Link to="/chat">智能客服</Link>,
  },
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/dashboard">工单管理</Link>,
  },
  {
    key: '/knowledge',
    icon: <BookOutlined />,
    label: <Link to="/knowledge">知识库</Link>,
  },
];

const userMenuItems = [
  {
    key: '1',
    icon: <UserOutlined />,
    label: '个人信息',
  },
  {
    key: '2',
    icon: <SettingOutlined />,
    label: '设置',
  },
  {
    type: 'divider' as const,
  },
  {
    key: '3',
    icon: <LogoutOutlined />,
    label: '退出登录',
    danger: true,
  },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/chat') return '/chat';
    return path;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="light"
        style={{
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {collapsed ? (
            <RobotOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <RobotOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 8 }} />
              <span style={{ fontSize: 18, fontWeight: 600 }}>智能客服系统</span>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          defaultOpenKeys={['sub1']}
          style={{ borderRight: 0 }}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {location.pathname === '/chat' && '智能客服对话'}
            {location.pathname === '/dashboard' && '工单管理后台'}
            {location.pathname === '/knowledge' && '知识库管理'}
            {(location.pathname === '/' || location.pathname === '') && '智能客服对话'}
          </div>
          <Space>
            <Tag color="blue">
              <RobotOutlined style={{ marginRight: 4 }} />
              AI Powered
            </Tag>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>管理员</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 0,
            minHeight: 280,
            background: '#f5f5f5',
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

const ChatPageWrapper: React.FC = () => {
  return <ChatPage />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <AppLayout>
            <ChatPageWrapper />
          </AppLayout>
        } />
        <Route path="/chat" element={
          <AppLayout>
            <ChatPageWrapper />
          </AppLayout>
        } />
        <Route path="/dashboard" element={
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        } />
        <Route path="/knowledge" element={
          <AppLayout>
            <KnowledgeBasePage />
          </AppLayout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
