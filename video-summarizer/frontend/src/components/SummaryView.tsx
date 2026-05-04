'use client';

import React from 'react';
import { Summary, KeyPoint } from '@/lib/api';
import { Sparkles, ListChecks, FileText } from 'lucide-react';

interface SummaryViewProps {
  summary: Summary | null;
}

export default function SummaryView({ summary }: SummaryViewProps) {
  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <Sparkles className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>正在生成摘要...</p>
        </div>
      </div>
    );
  }

  const keyPoints: KeyPoint[] = Array.isArray(summary.key_points) ? summary.key_points : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-700 flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary-600" />
          <span>视频内容摘要</span>
        </h3>
      </div>

      <div className="p-4 space-y-6">
        {summary.text && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-600">摘要概述</h4>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                {summary.text}
              </p>
            </div>
          </div>
        )}

        {keyPoints.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <ListChecks className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-600">关键要点</h4>
            </div>
            <ul className="space-y-3">
              {keyPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-gradient-to-r from-primary-50 to-white rounded-lg border border-primary-100"
                >
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700 text-sm">{point.text}</p>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-xs text-gray-400">
                        重要度: {(point.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
