import Link from 'next/link';
import { Shield, Mic, Bell, Settings, AlertTriangle, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Mic,
      title: '持续声音监听',
      description: 'Kiosk 模式下持续监测环境声音，主动发现异常事件',
      color: 'text-blue-400',
      bg: 'bg-blue-900/30',
    },
    {
      icon: AlertTriangle,
      title: '智能异常检测',
      description: '自动识别跌倒、呼救、哭泣等危险声音',
      color: 'text-orange-400',
      bg: 'bg-orange-900/30',
    },
    {
      icon: Bell,
      title: '多级告警通知',
      description: '根据危险级别，依次通知子女、邻居、社区医院',
      color: 'text-red-400',
      bg: 'bg-red-900/30',
    },
    {
      icon: Settings,
      title: '灵活配置管理',
      description: '可自定义联系人、告警灵敏度等参数',
      color: 'text-purple-400',
      bg: 'bg-purple-900/30',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-400" />
            <span className="text-xl font-bold text-white">老人安全监护</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/alerts"
              className="px-4 py-2 text-gray-400 hover:text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <Bell className="w-5 h-5" />
              告警历史
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 text-gray-400 hover:text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              设置
            </Link>
            <Link
              href="/kiosk"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <Mic className="w-5 h-5" />
              启动监护
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/50 text-green-300 rounded-full text-sm mb-6">
              <Shield className="w-4 h-4" />
              24小时安全守护
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              让独居老人
              <span className="text-green-400">更安全</span>
              <br />
              让家人
              <span className="text-blue-400">更安心</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed">
              智能声音监护系统，24小时持续监听老人居家环境，
              一旦检测到跌倒、呼救等异常声音，立即通知紧急联系人。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/kiosk"
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-2xl transition-all transform hover:scale-105 flex items-center gap-2"
              >
                启动安全监护
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                href="/settings"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white text-lg font-bold rounded-2xl transition-all flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                系统设置
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">核心功能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`${feature.bg} border border-gray-800 rounded-3xl p-8 transition-all hover:transform hover:scale-105`}
            >
              <div className={`${feature.color} mb-4`}>
                <feature.icon className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-12 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">快速开始</h2>
              <ol className="space-y-4 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                  <span>点击「启动安全监护」进入 Kiosk 模式</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                  <span>允许浏览器访问麦克风权限</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                  <span>点击「模拟跌倒声」测试告警流程</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                  <span>系统自动通知预设紧急联系人</span>
                </li>
              </ol>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 bg-gray-800 rounded-full flex items-center justify-center border-4 border-green-500 animate-pulse-slow">
                  <Bell className="w-32 h-32 text-green-400" />
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-red-600 rounded-full flex items-center justify-center animate-bounce-slow">
                  <AlertTriangle className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500">
          <p>老人居家安全声音监护系统 v1.0.0</p>
          <p className="mt-2 text-sm">守护每一位独居老人的安全</p>
        </div>
      </footer>
    </div>
  );
}
