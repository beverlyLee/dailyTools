import React, { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import GalleryPage from './pages/GalleryPage'
import { healthAPI } from './services/api'

const NavLink = ({ to, children }) => {
  const location = useLocation()
  const isActive = location.pathname === to
  
  return (
    <Link 
      to={to} 
      className={`nav-link ${isActive ? 'active' : ''}`}
    >
      {children}
    </Link>
  )
}

const AppContent = () => {
  const [apiStatus, setApiStatus] = useState('checking')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthAPI.check()
        setApiStatus('online')
      } catch (err) {
        setApiStatus('offline')
      }
    }
    
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">📷 老照片修复工具</h1>
          <nav className="nav-links">
            <NavLink to="/">图片修复</NavLink>
            <NavLink to="/gallery">我的作品集</NavLink>
          </nav>
        </div>
      </header>
      
      <main className="main-content">
        {apiStatus === 'offline' && (
          <div 
            className="card mb-4"
            style={{ 
              background: '#fef3c7', 
              border: '1px solid #fcd34d',
              padding: '1rem'
            }}
          >
            <div className="flex-between">
              <div>
                <strong style={{ color: '#92400e' }}>⚠️ 后端服务未连接</strong>
                <p style={{ color: '#78350f', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  请确保后端服务正在运行 (python run.py)，端口 8000
                </p>
              </div>
            </div>
          </div>
        )}
        
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
        </Routes>
      </main>
    </div>
  )
}

const App = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

export default App
