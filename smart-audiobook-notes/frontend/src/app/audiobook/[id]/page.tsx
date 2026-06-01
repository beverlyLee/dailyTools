'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { audiobookApi, AudiobookDetail, Chapter, KeyPoint } from '@/lib/api';
import MindMapView from '@/components/MindMapView';
import { Loader2, Clock, BookOpen, Lightbulb, ArrowLeft, Network } from 'lucide-react';

export default function AudiobookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const audiobookId = parseInt(params.id as string);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState<AudiobookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await audiobookApi.getDetail(audiobookId);
        setData(result);
        
        if (result.audiobook.status === 'pending' || result.audiobook.status === 'processing') {
          setProcessing(true);
        } else {
          setProcessing(false);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || '获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(() => {
      if (processing) {
        fetchData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [audiobookId, processing]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600">{error || '加载失败'}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          返回首页
        </button>
      </div>
    );
  }

  const { audiobook, notes } = data;
  const isProcessing = audiobook.status === 'pending' || audiobook.status === 'processing';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回首页
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {audiobook.original_filename}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                时长: {audiobook.duration}
              </span>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              audiobook.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : audiobook.status === 'failed'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {audiobook.status === 'completed'
              ? '处理完成'
              : audiobook.status === 'failed'
              ? '处理失败'
              : '处理中...'}
          </span>
        </div>
      </div>

      {isProcessing ? (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            正在处理音频...
          </h2>
          <p className="text-gray-600">
            系统正在进行音频切片、转写和智能笔记生成，请稍候。
          </p>
        </div>
      ) : notes ? (
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <BookOpen className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">{notes.topic}</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">{notes.summary}</p>
          </div>

          {notes.chapters && notes.chapters.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <BookOpen className="w-5 h-5 text-primary-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">章节摘要</h2>
              </div>
              <div className="space-y-4">
                {notes.chapters.map((chapter: Chapter) => (
                  <div
                    key={chapter.id}
                    className="border-l-4 border-primary-400 pl-4 py-2"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {chapter.title}
                      </h3>
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                        {chapter.formatted_time}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{chapter.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notes.key_points && notes.key_points.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <Lightbulb className="w-5 h-5 text-primary-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">
                  核心观点 ({notes.key_points.length} 个)
                </h2>
              </div>
              <div className="space-y-3">
                {notes.key_points.map((kp: KeyPoint) => (
                  <div
                    key={kp.id}
                    className="flex items-start space-x-3 bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-medium">
                      {kp.order_index !== undefined ? kp.order_index + 1 : notes.key_points!.indexOf(kp) + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800">{kp.content}</p>
                      <span className="text-xs text-gray-500 mt-1 inline-block">
                        时间戳: {kp.formatted_time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notes.mind_map && notes.mind_map.nodes && notes.mind_map.nodes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <Network className="w-5 h-5 text-primary-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">知识图谱</h2>
              </div>
              <MindMapView
                nodesData={notes.mind_map.nodes}
                edgesData={notes.mind_map.edges}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-600">暂无笔记数据</p>
        </div>
      )}
    </div>
  );
}
