'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Video, RefreshCw, AlertCircle, FileText, Image, Sparkles } from 'lucide-react';
import Timeline from '@/components/Timeline';
import TranscriptViewer from '@/components/TranscriptViewer';
import SummaryView from '@/components/SummaryView';
import { videoApi, VideoDetail, TranscriptSegment, Keyframe } from '@/lib/api';

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = parseInt(params.id as string, 10);

  const [videoData, setVideoData] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'transcript' | 'summary'>('timeline');

  const fetchVideoData = useCallback(async () => {
    try {
      const data = await videoApi.getDetail(videoId);
      setVideoData(data);
      setError(null);

      if (data.status === 'processing' || data.status === 'pending') {
        setPolling(true);
      } else {
        setPolling(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '获取视频信息失败');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchVideoData();
  }, [fetchVideoData]);

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(() => {
      fetchVideoData();
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, fetchVideoData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchVideoData();
  };

  const getStatusInfo = (status: string) => {
    const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: {
        label: '等待处理',
        color: 'text-yellow-600 bg-yellow-50',
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
      },
      processing: {
        label: '正在处理',
        color: 'text-blue-600 bg-blue-50',
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
      },
      completed: {
        label: '处理完成',
        color: 'text-green-600 bg-green-50',
        icon: <Sparkles className="h-5 w-5" />,
      },
      failed: {
        label: '处理失败',
        color: 'text-red-600 bg-red-50',
        icon: <AlertCircle className="h-5 w-5" />,
      },
    };
    return config[status] || config.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !videoData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">出错了</h2>
          <p className="text-gray-500 mb-6">{error || '视频不存在'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(videoData.status);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {videoData.original_filename}
                </h1>
                <p className="text-sm text-gray-500">时长: {videoData.duration}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${statusInfo.color}`}>
                {statusInfo.icon}
                <span className="text-sm font-medium">{statusInfo.label}</span>
              </div>
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="刷新"
              >
                <RefreshCw className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(videoData.status === 'processing' || videoData.status === 'pending') && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-800">视频正在处理中</p>
                <p className="text-xs text-blue-600">
                  系统正在进行语音转文字、关键帧提取和内容摘要，页面会自动刷新...
                </p>
              </div>
            </div>
          </div>
        )}

        {videoData.status === 'completed' && (
          <>
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'timeline'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Image className="h-4 w-4" />
                  <span>时间轴 & 关键帧</span>
                </button>
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'transcript'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>语音转文字</span>
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'summary'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>内容摘要</span>
                </button>
              </div>
            </div>

            {activeTab === 'timeline' && (
              <Timeline
                keyframes={videoData.keyframes || []}
                duration={videoData.duration}
              />
            )}

            {activeTab === 'transcript' && videoData.transcript && (
              <TranscriptViewer
                segments={videoData.transcript.segments || []}
                fullText={videoData.transcript.full_text}
              />
            )}

            {activeTab === 'summary' && (
              <SummaryView summary={videoData.summary} />
            )}
          </>
        )}

        {videoData.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">处理失败</h3>
            <p className="text-red-600 mb-4">
              {videoData.error_message || '视频处理过程中出现错误，请重试'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              重新上传
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
