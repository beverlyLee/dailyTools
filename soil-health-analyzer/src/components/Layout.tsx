import { NavLink, Outlet } from 'react-router-dom'
import { Sprout, FlaskConical, ClipboardList, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/', icon: Sprout, label: '首页仪表盘' },
  { to: '/assessment', icon: FlaskConical, label: '健康指数评价' },
  { to: '/prescription', icon: ClipboardList, label: '改良处方生成' },
  { to: '/tracking', icon: TrendingUp, label: '地力演变追踪' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-earth-500 text-earth-50 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="font-serif text-xl font-bold tracking-wide flex items-center gap-2">
            <Sprout className="w-6 h-6 text-soil-green-light" />
            土壤健康诊断
          </h1>
          <p className="text-xs text-earth-200 mt-1">Soil Health Analyzer</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-earth-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-earth-300 text-center">
            数字化土壤改良方案
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
