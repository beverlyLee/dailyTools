import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  DashboardOutlined,
  CloudServerOutlined,
  SettingOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import DashboardPage from './pages/DashboardPage'
import DeploymentEditor from './pages/DeploymentEditor'
import SettingsPage from './pages/SettingsPage'

const { Header, Sider, Content } = Layout

interface MenuItem {
  key: string
  icon: React.ReactNode
  label: string
  path: string
}

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: '资源仪表盘',
    path: '/',
  },
  {
    key: 'deployment',
    icon: <CloudServerOutlined />,
    label: '应用部署',
    path: '/deployment',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '设置',
    path: '/settings',
  },
]

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const getSelectedKeys = () => {
    const item = menuItems.find(m => m.path === location.pathname)
    return item ? [item.key] : ['dashboard']
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 12 : 16,
          fontWeight: 'bold',
        }}>
          {collapsed ? <AppstoreOutlined /> : '云原生控制台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: <Link to={item.path}>{item.label}</Link>,
          }))}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <h2 style={{ marginLeft: 24, fontSize: 18 }}>
            {menuItems.find(m => m.path === location.pathname)?.label || '资源仪表盘'}
          </h2>
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
            <Route path="/" element={<DashboardPage />} />
            <Route path="/deployment" element={<DeploymentEditor />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
