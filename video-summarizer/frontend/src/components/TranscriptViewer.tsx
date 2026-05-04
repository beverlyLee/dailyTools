'use client';

import React, { useState } from 'react';
import { TranscriptSegment } from '@/lib/api';
import { FileText, Play, Clock } from 'lucide-react';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  fullText: string;
  onSegmentClick?: (segment: TranscriptSegment) => void;
}

export default function TranscriptViewer({
  segments,
  fullText,
  onSegmentClick,
}: TranscriptViewerProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'full'>('timeline');
  const [selectedSegment, setSelectedSegment] = useState<TranscriptSegment | null>(null);

  const handleSegmentClick = (segment: TranscriptSegment) => {
    setSelectedSegment(segment);
    onSegmentClick?.(segment);
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>暂无字幕/转写文本</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary-600" />
            <span>语音转写文本 ({segments.length} 个片段)</span>
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              时间轴视图
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                viewMode === 'full'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              全文视图
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {viewMode === 'timeline' ? (
          <div className="space-y-3">
            {segments.map((segment, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedSegment?.start_time === segment.start_time
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSegmentClick(segment)}
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    <Clock className="h-3 w-3" />
                    <span>{segment.formatted_time}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {segment.text}
                  </p>
                </div>
                <Play className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {fullText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
