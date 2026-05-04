import React from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  GlobalOutlined,
  FileTextOutlined,
  ScanOutlined,
  HomeOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import HomePage from '../pages/HomePage';
import ApplicationsPage from '../pages/ApplicationsPage';
import QueryPage from '../pages/QueryPage';
import ChecklistPage from '../pages/ChecklistPage';
import OCRPage from '../pages/OCRPage';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/applications',
      icon: <ProfileOutlined />,
      label: 'My Applications',
    },
    {
      key: '/query',
      icon: <GlobalOutlined />,
      label: 'Track Status',
    },
    {
      key: '/checklist',
      icon: <FileTextOutlined />,
      label: 'Document Checklist',
    },
    {
      key: '/ocr',
      icon: <ScanOutlined />,
      label: 'OCR Preview',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="dark"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          <GlobalOutlined style={{ marginRight: 8 }} />
          Visa Tracker
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout style={{ marginLeft: 200 }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0 }}>Global Visa Tracker</h2>
          <div style={{ color: '#666' }}>
            Track your visa applications worldwide
          </div>
        </Header>

        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/query" element={<QueryPage />} />
            <Route path="/checklist" element={<ChecklistPage />} />
            <Route path="/ocr" element={<OCRPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
