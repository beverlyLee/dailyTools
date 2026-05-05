import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { healthApi } from '../services/api'

function Layout() {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    checkBackend()
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkBackend = async () => {
    try {
      await healthApi.ping()
      setBackendStatus('online')
    } catch {
      setBackendStatus('offline')
    }
  }

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/simulation', label: '物理模拟', icon: '⚛️' },
    { path: '/game-solver', label: '博弈求解', icon: '🎮' },
    { path: '/trajectory', label: '轨迹回放', icon: '📊' },
  ]

  return (
    <div className="app-layout">
      <header className="app-header">
        <NavLink to="/" className="app-logo">
          <span className="app-logo-icon">🔬</span>
          <span className="app-logo-text">物理模拟与博弈论求解平台</span>
        </NavLink>

        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="nav-link"
              end={item.path === '/'}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-md">
          <div className="flex items-center gap-sm">
            <div
              className="badge"
              style={{
                background: backendStatus === 'online' 
                  ? 'rgba(76, 175, 80, 0.2)' 
                  : 'rgba(244, 67, 54, 0.2)',
                color: backendStatus === 'online' 
                  ? 'var(--success-color)' 
                  : 'var(--danger-color)'
              }}
            >
              {backendStatus === 'online' ? '● 后端在线' : '○ 后端离线'}
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
