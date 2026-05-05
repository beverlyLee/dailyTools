import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  WifiOutlined,
  SwapOutlined,
  CodeOutlined,
  FileOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import PacketSnifferPage from './pages/PacketSnifferPage';
import SessionAnalyzerPage from './pages/SessionAnalyzerPage';
import HexViewerPage from './pages/HexViewerPage';
import ExtractedFilesPage from './pages/ExtractedFilesPage';
import { databaseApi } from './lib/api';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('sniffer');
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    const init = async () => {
      try {
        await databaseApi.init();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  const menuItems: MenuItem[] = [
    {
      key: 'sniffer',
      icon: <WifiOutlined />,
      label: '流量嗅探器',
    },
    {
      key: 'analyzer',
      icon: <SwapOutlined />,
      label: '会话分析器',
    },
    {
      key: 'hexviewer',
      icon: <CodeOutlined />,
      label: '十六进制查看',
    },
    {
      key: 'files',
      icon: <FileOutlined />,
      label: '提取的文件',
    },
  ];

  const renderContent = () => {
    switch (activeKey) {
      case 'sniffer':
        return <PacketSnifferPage />;
      case 'analyzer':
        return <SessionAnalyzerPage />;
      case 'hexviewer':
        return <HexViewerPage />;
      case 'files':
        return <ExtractedFilesPage />;
      default:
        return <PacketSnifferPage />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
      >
        <div
          style={{
            height: 64,
            margin: 16,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 12 : 16,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? 'NPS' : '网络协议分析'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[activeKey]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => setActiveKey(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {menuItems.find((item) => item && 'key' in item && item.key === activeKey)?.label}
          </div>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
        >
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
