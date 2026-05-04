'use client';

import Link from 'next/link';
import { MapPin, Calendar, DollarSign, FileText, Sparkles, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: '智能路径优化',
    description: '基于改进的 TSP 算法，支持时间窗约束，自动规划最优旅行路线，节省您的宝贵时间。',
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
  },
  {
    icon: DollarSign,
    title: '预算智能分配',
    description: '采用动态规划算法，在预算约束下最大化景点覆盖度，让每一分钱都物超所值。',
    color: 'text-secondary-600',
    bgColor: 'bg-secondary-50',
  },
  {
    icon: FileText,
    title: '一键导出 PDF',
    description: '使用 Puppeteer 将您的行程单导出为精美的 PDF 文档，方便打印和分享。',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    icon: Sparkles,
    title: '知识图谱推荐',
    description: '基于城市-景点-餐厅关系图谱，为您智能推荐附近的热门景点和美食餐厅。',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

const cities = [
  {
    id: 'beijing',
    name: '北京',
    country: '中国',
    attractions: 4,
    restaurants: 2,
    description: '千年古都，现代都市',
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>智能旅行规划</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                让每一次旅行
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">
                  都完美无忧
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                基于先进的 AI 算法，智能优化您的旅行路线，合理分配预算，
                让您的每一次出行都成为难忘的回忆。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/planner"
                  className="btn-primary flex items-center justify-center space-x-2 px-8 py-3 text-lg"
                >
                  <span>开始规划</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/cities"
                  className="btn-secondary flex items-center justify-center space-x-2 px-8 py-3 text-lg"
                >
                  <MapPin className="w-5 h-5" />
                  <span>探索城市</span>
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
                <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
                <div className="relative bg-white rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg">北京三日游</h3>
                    <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm">
                      已优化
                    </span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { time: '09:00', name: '故宫博物院', cost: '¥60', type: 'attraction' },
                      { time: '12:30', name: '全聚德烤鸭', cost: '¥200', type: 'restaurant' },
                      { time: '14:30', name: '颐和园', cost: '¥30', type: 'attraction' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${item.type === 'attraction' ? 'bg-primary-500' : 'bg-orange-500'}`} />
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.time}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{item.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              核心功能
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              采用先进的算法和技术，为您提供专业级的旅行规划服务
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="card p-6 card-hover"
                >
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              热门城市
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              探索世界各地的热门旅游城市，发现精彩的景点和美食
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map((city) => (
              <Link
                key={city.id}
                href={`/cities/${city.id}`}
                className="card p-6 card-hover group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {city.name}
                    </h3>
                    <p className="text-gray-500 text-sm">{city.description}</p>
                  </div>
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-600" />
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{city.attractions} 个景点</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{city.restaurants} 家餐厅</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            准备好开始您的完美旅行了吗？
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            只需几分钟，智能旅行规划系统将为您生成最优的旅行方案
          </p>
          <Link
            href="/planner"
            className="inline-flex items-center space-x-2 bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            <span>立即开始规划</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
