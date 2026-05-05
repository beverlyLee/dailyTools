import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  FileTextOutlined,
  FilePdfOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import StoryEditor from './story-editor'
import ReportGenerator from './report-generator'

const { Header, Sider, Content } = Layout

const App: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
          <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['1']}
            items={[
              {
                key: '1',
                icon: <HomeOutlined />,
                label: <Link to="/">首页</Link>,
              },
              {
                key: '2',
                icon: <FileTextOutlined />,
                label: <Link to="/story-editor">数据故事编辑器</Link>,
              },
              {
                key: '3',
                icon: <FilePdfOutlined />,
                label: <Link to="/report-generator">参数化报告生成器</Link>,
              },
            ]}
          />
        </Sider>
        <Layout>
          <Header style={{ padding: 0, background: '#fff' }} />
          <Content style={{ margin: '0 16px' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/story-editor" element={<StoryEditor />} />
              <Route path="/report-generator" element={<ReportGenerator />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  )
}

const Home: React.FC = () => {
  return (
    <div style={{ padding: 24, minHeight: 360, background: '#fff', borderRadius: 6 }}>
      <h1>数据叙事平台</h1>
      <p>欢迎使用数据叙事平台，该平台包含以下功能模块：</p>
      <ul>
        <li><strong>数据故事编辑器</strong>：支持将图表、文字、图片组合成幻灯片式叙事，嵌入动态参数控件，实现数据与视图的联动</li>
        <li><strong>参数化报告生成器</strong>：基于模板生成可交互的 HTML 报告，支持导出为 PDF/PPTX，集成定时邮件推送功能</li>
      </ul>
    </div>
  )
}

export default App
