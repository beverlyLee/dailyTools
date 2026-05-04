import React, { useState, useRef } from 'react';
import type { UploadFile } from '../types';

interface DragDropUploadProps {
  onFileSelect: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  title?: string;
  hint?: string;
  files?: UploadFile[];
}

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileSelect,
  accept = '*/*',
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  title = '拖拽文件到此处或点击选择',
  hint = '支持 CSV、图片格式，单个文件不超过 10MB',
  files = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      validateAndSelectFiles(droppedFiles);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      validateAndSelectFiles(selectedFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateAndSelectFiles = (fileList: FileList) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (文件过大)`);
        continue;
      }
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isValidType = 
        accept === '*/*' ||
        accept.includes(fileExtension || '') ||
        file.type.startsWith('image/') ||
        fileExtension === 'csv';
      
      if (!isValidType) {
        invalidFiles.push(`${file.name} (不支持的格式)`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (invalidFiles.length > 0) {
      alert(`以下文件无法上传：\n${invalidFiles.join('\n')}`);
    }

    if (validFiles.length > 0) {
      const dt = new DataTransfer();
      validFiles.forEach(f => dt.items.add(f));
      onFileSelect(dt.files);
    }
  };

  const getStatusBadge = (status: UploadFile['status']) => {
    const statusMap = {
      pending: { text: '等待上传', color: '#ffa726' },
      uploading: { text: '上传中', color: '#42a5f5' },
      success: { text: '已完成', color: '#66bb6a' },
      error: { text: '失败', color: '#ef5350' },
    };
    const info = statusMap[status];
    return (
      <span style={{ color: info.color, fontWeight: 500 }}>
        {info.text}
      </span>
    );
  };

  return (
    <div>
      <div
        className={`upload-area ${isDragging ? 'dragover' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
        />
        <div className="upload-icon">📁</div>
        <div className="upload-text">{title}</div>
        <div className="upload-hint">{hint}</div>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <div>
                <span className="file-name">{file.name}</span>
                <span className="file-type" style={{ marginLeft: 10 }}>
                  {file.type}
                </span>
              </div>
              <div>
                {file.status === 'uploading' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="progress-bar" style={{ width: 100, height: 8, margin: 0 }}>
                      <div 
                        className="progress-fill" 
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <span style={{ fontSize: 12, color: '#666' }}>{file.progress}%</span>
                  </div>
                ) : (
                  getStatusBadge(file.status)
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
