'use client';

import React, { useState } from 'react';
import { Keyframe } from '@/lib/api';
import { Clock, Image } from 'lucide-react';

interface TimelineProps {
  keyframes: Keyframe[];
  duration: string;
  onKeyframeClick?: (keyframe: Keyframe) => void;
}

export default function Timeline({ keyframes, duration, onKeyframeClick }: TimelineProps) {
  const [selectedKeyframe, setSelectedKeyframe] = useState<Keyframe | null>(null);

  const parseDuration = (durationStr: string): number => {
    const parts = durationStr.split(':');
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  };

  const totalDuration = parseDuration(duration);

  const handleKeyframeClick = (keyframe: Keyframe) => {
    setSelectedKeyframe(keyframe);
    onKeyframeClick?.(keyframe);
  };

  if (keyframes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <Image className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>暂无关键帧数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary-600" />
            <span>时间轴 ({keyframes.length} 个关键帧)</span>
          </h3>
          <span className="text-sm text-gray-500">总时长: {duration}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <div className="h-2 bg-gray-100 rounded-full mb-6">
            {keyframes.map((kf) => (
              <div
                key={kf.id}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150"
                style={{
                  left: `${(kf.timestamp / totalDuration) * 100}%`,
                  backgroundColor:
                    selectedKeyframe?.id === kf.id ? '#2563eb' : '#93c5fd',
                }}
                onClick={() => handleKeyframeClick(kf)}
                title={kf.formatted_time}
              />
            ))}
          </div>

          <div className="flex justify-between text-xs text-gray-400 mb-6">
            <span>00:00</span>
            <span>{duration}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex space-x-4 pb-2 min-w-max">
            {keyframes.map((kf) => (
              <div
                key={kf.id}
                className={`flex-shrink-0 w-40 cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-2 ${
                  selectedKeyframe?.id === kf.id
                    ? 'border-primary-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleKeyframeClick(kf)}
              >
                <div className="relative aspect-video bg-gray-100">
                  <img
                    src={`http://localhost:8000${kf.frame_path}`}
                    alt={`关键帧 ${kf.formatted_time}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
                    {kf.formatted_time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedKeyframe && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-4">
              <div className="w-48 flex-shrink-0">
                <img
                  src={`http://localhost:8000${selectedKeyframe.frame_path}`}
                  alt={`关键帧 ${selectedKeyframe.formatted_time}`}
                  className="w-full rounded-lg"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-700 mb-2">选中的关键帧</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">时间:</span> {selectedKeyframe.formatted_time}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">时间戳:</span> {selectedKeyframe.timestamp.toFixed(2)} 秒
                  </p>
                  {selectedKeyframe.description && (
                    <p className="text-gray-600">
                      <span className="font-medium">描述:</span> {selectedKeyframe.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
