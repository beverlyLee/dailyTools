import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Gauge,
  CloudRain,
  Droplets,
  FileText,
  CircleDollarSign,
  Calendar,
  Menu,
  X,
  RefreshCw,
  Sun,
  Moon,
  Bell,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

const menuItems = [
  { path: '/', label: '仪表盘', icon: Gauge },
  { path: '/weather', label: '气象融合', icon: CloudRain },
  { path: '/soil', label: '墒情模拟', icon: Droplets },
  { path: '/prescription', label: '灌溉处方', icon: FileText },
  { path: '/cost', label: '成本分析', icon: CircleDollarSign },
  { path: '/calendar', label: '农事日历', icon: Calendar },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { weather, weatherLoading, fetchWeather, userConfig, tasks } = useAppStore();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
        setMobileOpen(false);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const todayTasks = tasks.filter((t) =>
    dayjs(t.start).isSame(dayjs(), 'day')
  );
  const warningTasks = todayTasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );
  const hasRainWarning = weather?.hasEffectiveRain;

  const handleRefresh = async () => {
    await fetchWeather();
  };

  return (
    <div className="min-h-screen flex">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col',
          'glass-card rounded-none lg:rounded-r-2xl',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/20">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-green to-sky-blue flex items-center justify-center text-white font-bold">
                灌
              </div>
              <div>
                <h1 className="font-serif font-bold text-lg text-primary-green-dark dark:text-primary-green-light">
                  智慧灌溉
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Intelligent Irrigation
                </p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-primary-green to-sky-blue flex items-center justify-center text-white font-bold">
              灌
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {menuItems.map(({ path, label, icon: Icon }) => {
            const isActive =
              path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-gradient-to-r from-primary-green/20 to-sky-blue/20 text-primary-green-dark dark:text-primary-green-light shadow-sm'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors',
                    isActive
                      ? 'text-primary-green'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-primary-green'
                  )}
                />
                {sidebarOpen && (
                  <span className="font-medium text-sm whitespace-nowrap">
                    {label}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-green" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/20 hidden lg:block">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">收起侧边栏</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 glass-card rounded-none lg:rounded-none sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary-green" />
              <span className="font-medium">{userConfig.defaultCity}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500 dark:text-gray-400">
                {dayjs().format('YYYY年M月D日 dddd')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(hasRainWarning || warningTasks.length > 0) && (
              <button className="relative p-2 rounded-xl bg-amber/10 text-amber-dark hover:bg-amber/20 transition-colors">
                <Bell className="w-5 h-5 animate-pulse-soft" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={weatherLoading}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
              title="刷新天气"
            >
              <RefreshCw
                className={cn('w-5 h-5', weatherLoading && 'animate-spin')}
              />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {(hasRainWarning || warningTasks.length > 0) && (
          <div className="px-4 lg:px-6 py-2 space-y-1">
            {hasRainWarning && (
              <div className="glass-card px-4 py-2 rounded-xl bg-sky-blue/10 border-sky-blue/30 flex items-center gap-2 text-sm text-sky-blue-dark dark:text-sky-blue-light">
                <CloudRain className="w-4 h-4 flex-shrink-0" />
                <span>
                  预计未来有有效降雨（{weather?.totalExpectedRain}mm），
                  建议延后 {weather?.suggestedDelayDays} 天灌溉
                </span>
              </div>
            )}
            {warningTasks.length > 0 && (
              <div className="glass-card px-4 py-2 rounded-xl bg-primary-green/10 border-primary-green/30 flex items-center gap-2 text-sm text-primary-green-dark dark:text-primary-green-light cursor-pointer hover:bg-primary-green/15"
                onClick={() => navigate('/calendar')}
              >
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>今日有 {warningTasks.length} 个灌溉任务待处理</span>
              </div>
            )}
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
