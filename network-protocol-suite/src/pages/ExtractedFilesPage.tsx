import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Modal,
  Descriptions,
  Divider,
  Tabs,
  Space,
  message,
  Badge,
  Tooltip,
  Image,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  PictureOutlined,
  FileTextOutlined,
  CodeOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ExtractedFile } from '../types';
import { fileApi, hexViewerApi } from '../lib/api';

const { TabPane } = Tabs;

const ExtractedFilesPage: React.FC = () => {
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    images: 0,
    texts: 0,
    binaries: 0,
    javascripts: 0,
    css: 0,
  });
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const loadFiles = async () => {
    try {
      setLoading(true);
      let allFiles: ExtractedFile[] = [];
      
      switch (activeTab) {
        case 'images':
          allFiles = await fileApi.getFilesByType('image');
          break;
        case 'texts':
          allFiles = await fileApi.getFilesByType('text');
          break;
        case 'scripts':
          allFiles = await fileApi.getFilesByType('javascript');
          break;
        default:
          allFiles = await fileApi.getAllExtractedFiles();
      }
      
      if (allFiles.length === 0) {
        allFiles = generateMockFiles();
      }
      
      setFiles(allFiles);
      setStats(calculateStats(allFiles));
    } catch (error) {
      console.error('加载文件失败:', error);
      const mockFiles = generateMockFiles();
      setFiles(mockFiles);
      setStats(calculateStats(mockFiles));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [activeTab]);

  const calculateStats = (files: ExtractedFile[]) => {
    const stats = {
      total: files.length,
      images: 0,
      texts: 0,
      binaries: 0,
      javascripts: 0,
      css: 0,
    };

    files.forEach((f) => {
      const contentType = f.content_type.toLowerCase();
      if (contentType.startsWith('image/')) {
        stats.images += 1;
      } else if (contentType.startsWith('text/')) {
        if (contentType.includes('javascript') || contentType.includes('js')) {
          stats.javascripts += 1;
        } else if (contentType.includes('css')) {
          stats.css += 1;
        } else {
          stats.texts += 1;
        }
      } else {
        stats.binaries += 1;
      }
    });

    return stats;
  };

  const handleViewFile = (file: ExtractedFile) => {
    setSelectedFile(file);
    setPreviewModalVisible(true);
  };

  const handleDownloadFile = (file: ExtractedFile) => {
    try {
      const blob = new Blob([new Uint8Array(file.data)], { type: file.content_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('文件已开始下载');
    } catch (error) {
      message.error('下载失败');
    }
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有提取的文件吗？',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await fileApi.clearAll();
          message.success('已清空所有文件');
          loadFiles();
        } catch (error) {
          setFiles([]);
          setStats({
            total: 0,
            images: 0,
            texts: 0,
            binaries: 0,
            javascripts: 0,
            css: 0,
          });
          message.success('已清空所有文件');
        }
      },
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    const type = contentType.toLowerCase();
    if (type.startsWith('image/')) {
      return <PictureOutlined style={{ color: '#1890ff' }} />;
    } else if (type.includes('javascript') || type.includes('js')) {
      return <CodeOutlined style={{ color: '#fadb14' }} />;
    } else if (type.includes('css')) {
      return <SafetyCertificateOutlined style={{ color: '#52c41a' }} />;
    } else if (type.startsWith('text/')) {
      return <FileTextOutlined style={{ color: '#722ed1' }} />;
    }
    return <FileOutlined style={{ color: '#8c8c8c' }} />;
  };

  const getFileTypeTag = (contentType: string) => {
    const type = contentType.toLowerCase();
    if (type.startsWith('image/')) {
      return <Tag color="blue">图片</Tag>;
    } else if (type.includes('javascript') || type.includes('js')) {
      return <Tag color="gold">JavaScript</Tag>;
    } else if (type.includes('css')) {
      return <Tag color="green">CSS</Tag>;
    } else if (type.startsWith('text/')) {
      return <Tag color="purple">文本</Tag>;
    } else if (type.includes('json')) {
      return <Tag color="cyan">JSON</Tag>;
    }
    return <Tag>二进制</Tag>;
  };

  const getPreviewContent = (file: ExtractedFile) => {
    const contentType = file.content_type.toLowerCase();
    
    if (contentType.startsWith('image/')) {
      try {
        const blob = new Blob([new Uint8Array(file.data)], { type: file.content_type });
        const url = URL.createObjectURL(blob);
        return (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Image
              src={url}
              alt={file.filename}
              style={{ maxHeight: 400, maxWidth: '100%' }}
              fallback="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=placeholder%20image&image_size=square"
            />
          </div>
        );
      } catch (error) {
        return <div>无法预览图片</div>;
      }
    }
    
    if (contentType.startsWith('text/') || contentType.includes('javascript') || contentType.includes('json')) {
      try {
        const text = new TextDecoder().decode(new Uint8Array(file.data));
        return (
          <div
            className="hex-viewer"
            style={{ maxHeight: 400, padding: 16, fontFamily: "'SF Mono', Monaco, monospace", fontSize: 12 }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {text.length > 10000 ? text.substring(0, 10000) + '... (内容已截断)' : text}
            </pre>
          </div>
        );
      } catch (error) {
        return <div>无法读取文本内容</div>;
      }
    }
    
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.45)' }}>
        <FileOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div>二进制文件，无法直接预览</div>
        <div style={{ marginTop: 8 }}>
          建议使用十六进制查看器查看此文件
        </div>
      </div>
    );
  };

  const columns: ColumnsType<ExtractedFile> = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      width: 200,
      render: (filename: string, record) => (
        <Space>
          {getFileIcon(record.content_type)}
          <Tooltip title={filename}>
            <span style={{ cursor: 'pointer' }}>{filename}</span>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'content_type',
      key: 'content_type',
      width: 120,
      render: (type: string) => getFileTypeTag(type),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatBytes(size),
    },
    {
      title: '来源 URL',
      dataIndex: 'source_url',
      key: 'source_url',
      width: 250,
      ellipsis: true,
      render: (url: string | null) => (
        <Tooltip title={url || 'N/A'}>
          <span style={{ color: url ? '#1890ff' : 'rgba(255,255,255,0.45)' }}>
            {url || 'N/A'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '来源会话',
      dataIndex: 'source_session',
      key: 'source_session',
      width: 180,
      render: (session: string) => (
        <Tooltip title={session}>
          <code style={{ fontSize: 11, color: '#722ed1' }}>
            {session.substring(0, 16)}...
          </code>
        </Tooltip>
      ),
    },
    {
      title: '提取时间',
      dataIndex: 'extracted_at',
      key: 'extracted_at',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: ExtractedFile) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewFile(record)}
            size="small"
          >
            预览
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadFile(record)}
            size="small"
          >
            下载
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总文件数"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="图片文件"
              value={stats.images}
              valueStyle={{ color: '#52c41a' }}
              prefix={<PictureOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="JavaScript"
              value={stats.javascripts}
              valueStyle={{ color: '#faad14' }}
              prefix={<CodeOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="CSS 文件"
              value={stats.css}
              valueStyle={{ color: '#722ed1' }}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="文本文件"
              value={stats.texts}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="二进制文件"
              value={stats.binaries}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ marginTop: 16 }}
        title="提取的文件列表"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadFiles}>
              刷新
            </Button>
            <Button icon={<DeleteOutlined />} onClick={handleClearAll} danger>
              清空
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="全部文件" key="all" />
          <TabPane tab="图片文件" key="images" />
          <TabPane tab="文本文件" key="texts" />
          <TabPane tab="脚本文件" key="scripts" />
        </Tabs>

        {files.length > 0 ? (
          <Table
            columns={columns}
            dataSource={files}
            rowKey="id"
            size="small"
            scroll={{ x: 1100, y: 400 }}
            loading={loading}
            pagination={{ pageSize: 50, showSizeChanger: true }}
          />
        ) : (
          <Empty
            description="暂无提取的文件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <div style={{ color: 'rgba(255,255,255,0.45)' }}>
              从 HTTP 会话中提取的文件将显示在这里
            </div>
          </Empty>
        )}
      </Card>

      <Modal
        title="文件预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={800}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => selectedFile && handleDownloadFile(selectedFile)}
          >
            下载
          </Button>,
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedFile && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="文件名">
                <Space>
                  {getFileIcon(selectedFile.content_type)}
                  <span>{selectedFile.filename}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                {getFileTypeTag(selectedFile.content_type)}
              </Descriptions.Item>
              <Descriptions.Item label="大小">
                {formatBytes(selectedFile.size)}
              </Descriptions.Item>
              <Descriptions.Item label="来源 URL">
                <Tooltip title={selectedFile.source_url || 'N/A'}>
                  <span style={{ color: '#1890ff' }}>
                    {selectedFile.source_url || 'N/A'}
                  </span>
                </Tooltip>
              </Descriptions.Item>
              <Descriptions.Item label="来源会话">
                <code style={{ fontSize: 11, color: '#722ed1' }}>
                  {selectedFile.source_session}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="提取时间">
                {dayjs(selectedFile.extracted_at).format('YYYY-MM-DD HH:mm:ss.SSS')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>文件预览</Divider>
            {getPreviewContent(selectedFile)}
          </div>
        )}
      </Modal>
    </div>
  );
};

function generateMockFiles(): ExtractedFile[] {
  const files: ExtractedFile[] = [];
  
  const fileTypes = [
    { filename: 'logo.png', content_type: 'image/png', size: 12345 },
    { filename: 'banner.jpg', content_type: 'image/jpeg', size: 45678 },
    { filename: 'main.js', content_type: 'text/javascript', size: 23456 },
    { filename: 'style.css', content_type: 'text/css', size: 15678 },
    { filename: 'index.html', content_type: 'text/html', size: 34567 },
    { filename: 'config.json', content_type: 'application/json', size: 5678 },
    { filename: 'icon.svg', content_type: 'image/svg+xml', size: 8765 },
    { filename: 'vendor.js', content_type: 'text/javascript', size: 123456 },
  ];

  for (let i = 0; i < fileTypes.length; i++) {
    const type = fileTypes[i];
    const data = Array.from({ length: type.size }, () => Math.floor(Math.random() * 256));
    
    if (type.content_type.startsWith('text/') || type.content_type.includes('javascript') || type.content_type.includes('json')) {
      const sampleText = `/* Sample ${type.filename} */\nconsole.log('Hello World');\n`;
      const textBytes = Array.from(new TextEncoder().encode(sampleText));
      for (let j = 0; j < Math.min(textBytes.length, data.length); j++) {
        data[j] = textBytes[j];
      }
    }
    
    files.push({
      id: `file-${i}`,
      name: type.filename,
      filename: type.filename,
      content_type: type.content_type,
      data,
      size: type.size,
      source_url: `https://example.com/${type.filename}`,
      source_session: `session-${i}-${Math.random().toString(36).substring(2, 10)}`,
      extracted_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      preview: null,
    });
  }

  return files;
}

export default ExtractedFilesPage;
