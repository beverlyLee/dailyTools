import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  UploadOutlined,
  HistoryOutlined,
  SettingOutlined,
  PictureOutlined
} from '@ant-design/icons';
import RestorationCanvas from './pages/RestorationCanvas';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

const { Header, Content, Sider } = Layout;

const menuItems = [
  {
    key: 'canvas',
    icon: <UploadOutlined />,
    label: '照片修复',
  },
  {
    key: 'history',
    icon: <HistoryOutlined />,
    label: '修复历史',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
];

function App() {
  const [currentPage, setCurrentPage] = useState('canvas');

  const handleMenuClick = (e) => {
    setCurrentPage(e.key);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'canvas':
        return <RestorationCanvas />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <RestorationCanvas />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <PictureOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#001529' }}>
          老照片超分辨率修复系统
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            onClick={handleMenuClick}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
              borderRadius: 8,
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;
