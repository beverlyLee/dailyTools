'use client';

import { useState } from 'react';
import { Calendar, FileText, MapPin, Download, Trash2, Edit3, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { itineraryApi } from '@/lib/api';
import toast from 'react-hot-toast';

const sampleItineraries = [
  {
    id: '1',
    title: '北京三日精华游',
    city: '北京',
    start_date: '2024-06-01',
    end_date: '2024-06-03',
    total_budget: 3000,
    status: 'draft',
    created_at: '2024-05-01T10:00:00Z',
    items_count: 8,
  },
];

export default function ItinerariesPage() {
  const [itineraries, setItineraries] = useState(sampleItineraries);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExportPDF = async (id: string) => {
    setIsExporting(id);
    try {
      const blob = await itineraryApi.exportPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itinerary-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF 导出成功！');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('导出 PDF 失败，请重试');
    } finally {
      setIsExporting(null);
    }
  };

  const handleDelete = (id: string) => {
    setItineraries(itineraries.filter(i => i.id !== id));
    toast.success('行程已删除');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return { text: '草稿', class: 'bg-gray-100 text-gray-700' };
      case 'confirmed':
        return { text: '已确认', class: 'bg-green-100 text-green-700' };
      case 'completed':
        return { text: '已完成', class: 'bg-blue-100 text-blue-700' };
      default:
        return { text: status, class: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              我的行程
            </h1>
            <p className="text-gray-600">
              管理和查看您的所有旅行计划
            </p>
          </div>
          <Link
            href="/planner"
            className="btn-primary inline-flex items-center space-x-2 w-fit"
          >
            <Plus className="w-5 h-5" />
            <span>新建行程</span>
          </Link>
        </div>

        {itineraries.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              还没有行程
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              开始规划您的第一次旅行，让我们的智能算法为您生成最优方案
            </p>
            <Link
              href="/planner"
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>创建第一个行程</span>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map((itinerary) => {
              const statusBadge = getStatusBadge(itinerary.status);
              return (
                <div
                  key={itinerary.id}
                  className="card p-6 card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {itinerary.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        <span>{itinerary.city}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.class}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(itinerary.start_date)} - {formatDate(itinerary.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{itinerary.items_count} 个行程项</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-lg font-bold text-primary-600">
                      ¥{itinerary.total_budget}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleExportPDF(itinerary.id)}
                        disabled={isExporting === itinerary.id}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                        title="导出 PDF"
                      >
                        {isExporting === itinerary.id ? (
                          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                      <Link
                        href={`/planner`}
                        className="p-2 text-gray-500 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(itinerary.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            您可能喜欢的功能
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                探索更多城市
              </h3>
              <p className="text-gray-600 mb-4">
                发现世界各地的热门旅游城市，寻找您的下一个旅行目的地
              </p>
              <Link
                href="/cities"
                className="text-primary-600 font-medium flex items-center space-x-1 hover:underline"
              >
                <span>浏览城市</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="card p-6">
              <div className="w-12 h-12 bg-secondary-50 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-secondary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                智能规划行程
              </h3>
              <p className="text-gray-600 mb-4">
                使用先进的 AI 算法，为您的旅程生成最优路线和预算分配方案
              </p>
              <Link
                href="/planner"
                className="text-secondary-600 font-medium flex items-center space-x-1 hover:underline"
              >
                <span>开始规划</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="card p-6">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                导出精美 PDF
              </h3>
              <p className="text-gray-600 mb-4">
                将您的行程单导出为精美的 PDF 文档，方便打印和分享给朋友
              </p>
              <div className="text-purple-600 font-medium flex items-center space-x-1">
                <span>一键导出</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
