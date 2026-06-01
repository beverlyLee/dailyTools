'use client';

import { useState, useCallback } from 'react';
import { Upload, File, X, Check, AlertCircle } from 'lucide-react';
import { ParseResult } from '@/types/transaction';
import { parseCSVFile } from '@/lib/parser';

interface FileUploadProps {
  onParseComplete: (result: ParseResult) => void;
}

export default function FileUpload({ onParseComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('请上传CSV格式的账单文件');
      return;
    }

    setError(null);
    setUploadedFile(file);
    setIsParsing(true);

    try {
      const result = await parseCSVFile(file);
      if (result.success) {
        onParseComplete(result);
      } else {
        setError(result.error || '解析失败');
      }
    } catch (err) {
      setError('文件解析过程中发生错误');
    } finally {
      setIsParsing(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
  };

  return (
    <div className="w-full">
      {!uploadedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary hover:bg-gray-50'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-gray-800 mb-2">
              拖放CSV文件到这里，或点击上传
            </p>
            <p className="text-sm text-gray-500">
              支持微信支付账单和支付宝账单的CSV文件
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <File className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(uploadedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isParsing ? (
                <div className="flex items-center gap-2 text-primary">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">解析中...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-500">
                  <Check className="w-5 h-5" />
                  <span className="text-sm">解析完成</span>
                </div>
              )}
              <button
                onClick={clearFile}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm font-medium text-gray-700 mb-2">📋 如何导出账单？</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• 微信：我 → 服务 → 钱包 → 账单 → 右上角"..." → 导出账单 → 选择CSV格式</li>
          <li>• 支付宝：我的 → 账单 → 右上角"..." → 开具交易流水证明 → 用于个人对账 → 选择CSV格式</li>
        </ul>
      </div>
    </div>
  );
}
