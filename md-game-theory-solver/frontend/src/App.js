import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { ExperimentOutlined, CalculatorOutlined } from '@ant-design/icons';

import MDSimulatorPage from './pages/MDSimulatorPage';
import GameTheoryPage from './pages/GameTheoryPage';

const { Header, Sider, Content } = Layout;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/',
      icon: <ExperimentOutlined />,
      label: <Link to="/">分子动力学模拟器</Link>,
    },
    {
      key: '/game-theory',
      icon: <CalculatorOutlined />,
      label: <Link to="/game-theory">博弈论求解器</Link>,
    },
  ];

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          <div
            style={{
              height: 32,
              margin: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              textAlign: 'center',
              lineHeight: '32px',
              color: 'white',
              fontWeight: 'bold',
              fontSize: collapsed ? 12 : 16,
            }}
          >
            {collapsed ? 'MD-GT' : 'MD & GT 求解器'}
          </div>
          <Menu theme="dark" mode="inline" items={menuItems} />
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: '0 24px', fontSize: 18, fontWeight: 600 }}>
            分子动力学与博弈论求解系统
          </Header>
          <Content style={{ margin: '24px 16px', padding: 24, background: '#f0f2f5', minHeight: 280 }}>
            <Routes>
              <Route path="/" element={<MDSimulatorPage />} />
              <Route path="/game-theory" element={<GameTheoryPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
