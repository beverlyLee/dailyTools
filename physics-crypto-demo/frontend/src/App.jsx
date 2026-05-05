import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  ExperimentOutlined,
  LockOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import HomePage from './pages/HomePage'
import FluidSimulationPage from './pages/FluidSimulationPage'
import RSADemoPage from './pages/RSADemoPage'

const { Header, Sider, Content } = Layout

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer, borderRadiusLG }
  } = theme.useToken()

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>
    },
    {
      key: '/fluid',
      icon: <ExperimentOutlined />,
      label: <Link to="/fluid">流体模拟</Link>
    },
    {
      key: '/rsa',
      icon: <LockOutlined />,
      label: <Link to="/rsa">RSA 演示</Link>
    }
  ]

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div
          style={{
            height: 32,
            margin: 16,
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {collapsed ? 'PCD' : '物理 & 密码学演示'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/']}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
        style={{
          padding: 0,
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center'
        }}
        >
        {React.createElement(
          collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
          {
            className: 'trigger',
            onClick: () => setCollapsed(!collapsed),
            style: { padding: '0 24px', fontSize: 18, cursor: 'pointer' }
          }
        )}
        <span style={{ fontSize: 18, fontWeight: 600 }}>
          物理模拟与密码学演示系统
        </span>
        </Header>
        <Content
        style={{
          margin: '24px 16px',
          padding: 24,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: borderRadiusLG
        }}
        >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/fluid" element={<FluidSimulationPage />} />
          <Route path="/rsa" element={<RSADemoPage />} />
        </Routes>
        </Content>
      </Layout>
      </Layout>
    </Router>
  )
}

export default App
