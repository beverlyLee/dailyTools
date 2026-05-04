import React, { useState } from 'react';
import { Layout, Menu, message } from 'antd';
import {
  UploadOutlined,
  ShopOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import MainPage from './pages/MainPage';
import StyleTransferPage from './pages/StyleTransferPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

const { Header, Content, Footer, Sider } = Layout;

function App() {
  const [currentPage, setCurrentPage] = useState('main');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [keypoints, setKeypoints] = useState(null);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleImageUpload = (image, kps) => {
    setUploadedImage(image);
    setKeypoints(kps);
    message.success('图片上传成功，已检测到关键点');
  };

  const menuItems = [
    {
      key: 'main',
      icon: <UploadOutlined />,
      label: '上传图片',
    },
    {
      key: 'style',
      icon: <ShopOutlined />,
      label: '风格换装',
      disabled: !uploadedImage,
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: '历史记录',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'main':
        return <MainPage onImageUpload={handleImageUpload} onNext={() => setCurrentPage('style')} />;
      case 'style':
        return <StyleTransferPage uploadedImage={uploadedImage} keypoints={keypoints} />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <MainPage onImageUpload={handleImageUpload} onNext={() => setCurrentPage('style')} />;
    }
  };

  return (
    <Layout className="app-layout">
      <Sider
        width={240}
        theme="light"
        style={{
          borderRight: '1px solid #DEB887',
          background: '#FFFAF0',
        }}
      >
        <div className="logo-container">
          <ShopOutlined className="logo-icon" />
          <span className="logo-text">国风服饰虚拟换装</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems}
          onClick={({ key }) => handlePageChange(key)}
          style={{
            background: 'transparent',
            borderRight: 'none',
          }}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div className="header-title">
            {currentPage === 'main' && '上传图片 - 开始您的国风体验'}
            {currentPage === 'style' && '风格换装 - 选择您喜欢的传统服饰'}
            {currentPage === 'history' && '历史记录 - 查看您的创作'}
            {currentPage === 'settings' && '系统设置'}
          </div>
        </Header>
        <Content className="app-content">
          {renderContent()}
        </Content>
        <Footer className="app-footer">
          国风服饰虚拟换装应用 ©2024 - 体验传统文化魅力
        </Footer>
      </Layout>
    </Layout>
  );
}

export default App;
