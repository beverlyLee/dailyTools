'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, AlertCircle, Loader2 } from 'lucide-react';
import { videoApi, UploadResponse } from '@/lib/api';

interface FileUploadProps {
  onUploadSuccess: (videoId: number) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (!file.type.startsWith('video/')) {
        setError('请上传视频文件');
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result: UploadResponse = await videoApi.upload(selectedFile);
      setProgress(100);
      
      setTimeout(() => {
        onUploadSuccess(result.video_id);
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.detail || '上传失败，请重试');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload
          className={`mx-auto h-16 w-16 mb-4 ${
            isDragActive ? 'text-primary-500' : 'text-gray-400'
          }`}
        />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          {isDragActive ? '释放文件以上传' : '拖放视频文件到这里'}
        </h3>
        <p className="text-gray-500 text-sm">
          或点击选择文件，支持 MP4、AVI、MOV、MKV、WebM 格式
        </p>
      </div>

      {selectedFile && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Video className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                开始处理
              </button>
            )}
          </div>

          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                <span className="text-sm text-gray-600">正在上传和处理...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
