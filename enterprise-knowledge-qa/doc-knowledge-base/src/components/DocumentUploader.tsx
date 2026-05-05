'use client';

import { useState, useCallback, useRef } from 'react';

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadTime: Date;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
}

export default function DocumentUploader() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
  ];

  const allowedExtensions = ['.pdf', '.doc', '.docx', '.md'];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    
    fileArray.forEach(file => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
      
      if (!isValidType) {
        alert(`不支持的文件格式: ${file.name}`);
        return;
      }

      const newDocument: UploadedDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadTime: new Date(),
        status: 'uploading',
        progress: 0,
      };

      setDocuments(prev => [...prev, newDocument]);

      simulateUpload(newDocument.id);
    });
  };

  const simulateUpload = (docId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setDocuments(prev => prev.map(doc => 
          doc.id === docId 
            ? { ...doc, status: 'processing', progress: 100 } 
            : doc
        ));

        setTimeout(() => {
          setDocuments(prev => prev.map(doc => 
            doc.id === docId 
              ? { ...doc, status: 'completed' } 
              : doc
          ));
        }, 1500);
      }

      setDocuments(prev => prev.map(doc => 
        doc.id === docId 
          ? { ...doc, progress } 
          : doc
      ));
    }, 300);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${value} ${sizes[i]}`;
  };

  const getStatusBadge = (status: UploadedDocument['status']) => {
    const badges = {
      uploading: { text: '上传中', color: 'bg-blue-100 text-blue-800' },
      processing: { text: '处理中', color: 'bg-yellow-100 text-yellow-800' },
      completed: { text: '已完成', color: 'bg-green-100 text-green-800' },
      error: { text: '错误', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <div className="space-y-2">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-12m-4-16l4 4 4-4m4-8l-4 4-4-4m0 8l4 4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">
            拖拽文件到此处或点击选择
          </h3>
          <p className="text-sm text-gray-500">
            支持 PDF、Word（.doc, .docx）和 Markdown 格式
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.md"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {documents.length > 0 && (
        <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">上传的文档</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <div key={doc.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(doc.size)} • {doc.uploadTime.toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(doc.status)}
                </div>
              </div>
              {doc.status === 'uploading' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${doc.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
