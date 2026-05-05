import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  PictureOutlined,
  SoundOutlined,
  BarChartOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'
import ImageGenerationPage from './pages/ImageGenerationPage'
import MusicGenerationPage from './pages/MusicGenerationPage'
import ChartGenerationPage from './pages/ChartGenerationPage'
import './App.css'

const { Header, Content, Sider } = Layout

function App() {
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/image',
      icon: <PictureOutlined />,
      label: <Link to="/image">智能图像生成</Link>,
    },
    {
      key: '/music',
      icon: <SoundOutlined />,
      label: <Link to="/music">智能音乐生成</Link>,
    },
    {
      key: '/chart',
      icon: <BarChartOutlined />,
      label: <Link to="/chart">智能图表生成</Link>,
    },
  ]

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">
          <PictureOutlined style={{ fontSize: '24px' }} />
          <span>智能图像与生成式AI平台</span>
        </div>
      </Header>
      <Layout>
        <Sider
          width={200}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{
              height: '100%',
              borderRight: 0,
              paddingTop: '16px',
            }}
            items={menuItems}
          />
        </Sider>
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/image" replace />} />
            <Route path="/image" element={<ImageGenerationPage />} />
            <Route path="/music" element={<MusicGenerationPage />} />
            <Route path="/chart" element={<ChartGenerationPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
