import Link from 'next/link';
import { Github, MapPin, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">旅行规划</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              智能旅行规划系统，基于先进的 AI 算法为您优化旅行路线，
              最大化预算利用，让每一次旅行都完美无忧。
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  首页
                </Link>
              </li>
              <li>
                <Link href="/planner" className="text-gray-400 hover:text-white transition-colors">
                  行程规划
                </Link>
              </li>
              <li>
                <Link href="/cities" className="text-gray-400 hover:text-white transition-colors">
                  城市探索
                </Link>
              </li>
              <li>
                <Link href="/itineraries" className="text-gray-400 hover:text-white transition-colors">
                  我的行程
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">联系我们</h3>
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-primary-400" />
                <span className="text-gray-400">contact@travel-planner.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-primary-400" />
                <span className="text-gray-400">+86 123 4567 8900</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} 智能旅行规划系统. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
