'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, History, Sparkles, ArrowRight, Loader2, Clock, FileText, Image } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { videoApi, Video as VideoType } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [recentVideos, setRecentVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentVideos();
  }, []);

  const loadRecentVideos = async () => {
    try {
      const response = await videoApi.list(0, 5);
      setRecentVideos(response.videos);
    } catch (error) {
      console.error('Failed to load recent videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (videoId: number) => {
    router.push(`/video/${videoId}`);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: '等待中', className: 'bg-yellow-100 text-yellow-700' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-700' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
      failed: { label: '失败', className: 'bg-red-100 text-red-700' },
    };
    const { label, className } = config[status] || config.pending;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">视频关键帧摘要应用</h1>
                <p className="text-sm text-gray-500">AI 驱动的智能视频分析与摘要工具</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">语音转文字</h3>
              <p className="text-sm text-gray-500">Whisper 模型本地化 ASR</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Image className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">关键帧提取</h3>
              <p className="text-sm text-gray-500">场景切换检测技术</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">智能摘要</h3>
              <p className="text-sm text-gray-500">TextRank 算法提取</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">上传视频</h2>
              <p className="text-gray-500 mb-8">
                上传长视频，系统将自动进行语音转文字、关键帧提取和内容摘要
              </p>
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
              <div className="flex items-center space-x-2 mb-6">
                <History className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">最近处理</h2>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : recentVideos.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">暂无处理记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentVideos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => router.push(`/video/${video.id}`)}
                      className="p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-gray-50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Video className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {video.original_filename}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0 ml-2" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{video.duration}</span>
                        {getStatusBadge(video.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
