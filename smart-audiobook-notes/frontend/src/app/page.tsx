'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Uploader from '@/components/Uploader';
import { FileText, Brain, GitBranch, ArrowRight, Sparkles, Clock, Target } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const handleUploadSuccess = (audiobookId: number) => {
    router.push(`/audiobook/${audiobookId}`);
  };

  const features = [
    {
      icon: FileText,
      title: '智能转写',
      description: '自动将音频内容转换为文字，支持静音切分和分块处理',
    },
    {
      icon: Brain,
      title: '笔记生成',
      description: 'AI 自动提取关键信息，生成结构化的章节标题和核心要点',
    },
    {
      icon: GitBranch,
      title: '知识图谱',
      description: '可视化展示内容关系，帮助快速理解和回顾长音频内容',
    },
  ];

  return (
    <div className="py-12">
      <section className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-6">
          <Sparkles className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          智能音频笔记，让回顾更高效
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          上传 MP3/WAV 音频，AI 自动生成结构化笔记、时间戳和知识图谱，
          解决长音频信息密度低、回顾困难的痛点。
        </p>
      </section>

      <section className="mb-16">
        <Uploader onUploadSuccess={handleUploadSuccess} />
      </section>

      <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          );
        })}
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          使用流程
        </h2>
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">上传音频文件</h3>
              <p className="text-gray-600 text-sm mt-1">
                拖放或点击选择 MP3/WAV 格式的音频文件（如 10 分钟技术播客）
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">等待 AI 处理</h3>
              <p className="text-gray-600 text-sm mt-1">
                系统自动进行音频切片、语音转写、笔记生成和知识图谱构建
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">查看智能笔记</h3>
              <p className="text-gray-600 text-sm mt-1">
                浏览章节标题、核心要点（带时间戳）和可视化知识图谱
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
