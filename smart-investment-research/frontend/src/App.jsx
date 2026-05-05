import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { 
  LineChartOutlined, 
  GlobalOutlined, 
  HomeOutlined 
} from '@ant-design/icons'
import NewsSentiment from './pages/NewsSentiment'
import IndustryMap from './pages/IndustryMap'

const { Header, Content, Sider } = Layout

function App() {
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/news-sentiment',
      icon: <LineChartOutlined />,
      label: <Link to="/news-sentiment">新闻舆情监控</Link>,
    },
    {
      key: '/industry-map',
      icon: <GlobalOutlined />,
      label: <Link to="/industry-map">产业链图谱</Link>,
    },
  ]

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={(value) => setCollapsed(value)}
        >
          <div style={{ 
            height: 32, 
            margin: 16, 
            background: 'rgba(255, 255, 255, 0.2)', 
            color: 'white', 
            textAlign: 'center', 
            lineHeight: '32px',
            fontSize: collapsed ? '12px' : '16px'
          }}>
            {collapsed ? '投研' : '智能投研系统'}
          </div>
          <Menu 
            theme="dark" 
            defaultSelectedKeys={['/']} 
            mode="inline" 
            items={menuItems}
          />
        </Sider>
        <Layout>
          <Header style={{ 
            padding: 0, 
            background: '#fff',
            fontSize: '20px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            智能投研与舆情分析系统
          </Header>
          <Content style={{ margin: '16px' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/news-sentiment" element={<NewsSentiment />} />
              <Route path="/industry-map" element={<IndustryMap />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  )
}

function HomePage() {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '50px', 
      background: '#fff', 
      borderRadius: '8px'
    }}>
      <h1>欢迎使用智能投研与舆情分析系统</h1>
      <p>
        该系统包含两个主要子系统：
      </p>
      <ul style={{ 
        listStyleType: 'none', 
        padding: 0, 
        marginTop: '20px', 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px'
      }}>
        <li style={{ 
          background: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px', 
          width: '300px'
        }}>
          <h3>新闻舆情监控</h3>
          <p>7x24 小时监控财经媒体和社交平台，基于情感分析判断利好/利空，自动生成舆情热度榜</p>
        </li>
        <li style={{ 
          background: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px', 
          width: '300px'
        }}>
          <h3>产业链图谱</h3>
          <p>构建上下游产业关系图，穿透查询股东和关联方，关联上市公司财务数据进行估值对比</p>
        </li>
      </ul>
    </div>
  )
}

export default App
