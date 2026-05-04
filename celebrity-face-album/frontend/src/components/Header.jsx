import React from 'react'
import { Layout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { HomeOutlined, PictureOutlined, UserOutlined } from '@ant-design/icons'

const { Header: AntHeader } = Layout

function Header() {
  const location = useLocation()
  
  const getSelectedKey = () => {
    if (location.pathname === '/') return 'home'
    if (location.pathname.startsWith('/album')) return 'album'
    if (location.pathname.startsWith('/celebrity')) return 'album'
    return 'home'
  }

  return (
    <AntHeader style={{ display: 'flex', alignItems: 'center', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginRight: '48px' }}>
        👤 名人脸识别相册
      </div>
      <Menu
        theme="light"
        mode="horizontal"
        selectedKeys={[getSelectedKey()]}
        style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
      >
        <Menu.Item key="home" icon={<HomeOutlined />}>
          <Link to="/">首页</Link>
        </Menu.Item>
        <Menu.Item key="album" icon={<PictureOutlined />}>
          <Link to="/album">相册管理</Link>
        </Menu.Item>
      </Menu>
    </AntHeader>
  )
}

export default Header
