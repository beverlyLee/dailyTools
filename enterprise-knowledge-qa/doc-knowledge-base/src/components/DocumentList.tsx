'use client';

import { useState } from 'react';

interface Document {
  id: string;
  title: string;
  type: 'pdf' | 'word' | 'markdown';
  uploadDate: string;
  size: string;
  description: string;
  tags: string[];
}

export default function DocumentList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const mockDocuments: Document[] = [
    {
      id: '1',
      title: '企业年度报告 2024',
      type: 'pdf',
      uploadDate: '2024-05-01',
      size: '2.4 MB',
      description: '2024年度企业运营报告，包含财务数据、市场分析和未来规划。',
      tags: ['报告', '财务', '年度'],
    },
    {
      id: '2',
      title: '产品开发规范文档',
      type: 'word',
      uploadDate: '2024-04-15',
      size: '1.2 MB',
      description: '公司产品开发流程规范，包含需求分析、设计评审、开发测试等环节。',
      tags: ['开发', '规范', '流程'],
    },
    {
      id: '3',
      title: '技术架构文档',
      type: 'markdown',
      uploadDate: '2024-04-10',
      size: '0.5 MB',
      description: '系统技术架构设计文档，包含微服务架构、数据库设计、API接口规范等。',
      tags: ['技术', '架构', '微服务'],
    },
    {
      id: '4',
      title: '新员工入职手册',
      type: 'pdf',
      uploadDate: '2024-03-20',
      size: '3.1 MB',
      description: '新员工入职培训手册，包含公司介绍、规章制度、福利待遇等信息。',
      tags: ['人力资源', '培训', '入职'],
    },
  ];

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatType = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      pdf: { label: 'PDF', color: 'bg-red-100 text-red-800' },
      word: { label: 'Word', color: 'bg-blue-100 text-blue-800' },
      markdown: { label: 'Markdown', color: 'bg-gray-100 text-gray-800' },
    };
    return typeMap[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
  };

  const getTypeIcon = (type: string) => {
    if (type === 'pdf') {
      return (
        <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM9 13h2v2H9v-2zm-2 0H5v2h2v-2zm8 0h-2v2h2v-2zm-4 0h-2v2h2v-2z" />
        </svg>
      );
    } else if (type === 'word') {
      return (
        <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h2v4H8v-4zm3 0h2v4h-2v-4zm3 0h2v4h-2v-4z" />
        </svg>
      );
    } else {
      return (
        <svg className="h-6 w-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 3h8v2H8v-2zm0-6h5v2H8v-2z" />
        </svg>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选区域 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">搜索文档</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                name="search"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="搜索文档标题、描述或标签..."
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="type" className="sr-only">文档类型</label>
            <select
              id="type"
              name="type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">所有类型</option>
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
        </div>
      </div>

      {/* 文档列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">文档列表</h3>
          <span className="text-sm text-gray-500">{filteredDocuments.length} 个文档</span>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredDocuments.length === 0 ? (
            <li className="px-4 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到文档</h3>
              <p className="mt-1 text-sm text-gray-500">尝试调整搜索条件或筛选器</p>
            </li>
          ) : (
            filteredDocuments.map((doc) => (
              <li 
              key={doc.id} 
              className={`px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedDocument?.id === doc.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedDocument(selectedDocument?.id === doc.id ? null : doc)}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 pt-1">
                  {getTypeIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <div className="ml-2 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${formatType(doc.type).color}`}>
                        {formatType(doc.type).label}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{doc.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {doc.tags.map((tag, idx) => (
                        <span 
                        key={idx} 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{doc.size}</span>
                      <span>{doc.uploadDate}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedDocument?.id === doc.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      查看详情
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      下载
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      删除
                    </button>
                  </div>
                </div>
              )}
            </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

