import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Upload,
  Input,
  Space,
  message,
  Modal,
  Empty,
  Popconfirm,
  Descriptions,
  List
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  SearchOutlined,
  ClearOutlined,
  FileTextOutlined,
  PlusOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { documentApi } from '../services/api';
import { Document } from '../types';
import dayjs from 'dayjs';

const { Search } = Input;
const { TextArea } = Input;

const KnowledgeBasePage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [addTextVisible, setAddTextVisible] = useState(false);
  const [addTextForm] = Input.useForm?.() || [{}];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentApi.getDocuments();
      setDocuments(res.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    
    try {
      const res = await documentApi.uploadDocuments([file]);
      if (res.uploaded_files && res.uploaded_files.length > 0) {
        message.success(`文件 ${file.name} 上传成功`);
        onSuccess?.('ok');
        loadDocuments();
      } else {
        const error = res.failed_files?.[0]?.reason || '上传失败';
        message.error(`上传失败: ${error}`);
        onError?.(new Error(error));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      message.error('上传失败');
      onError?.(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await documentApi.deleteDocument(documentId);
      message.success('删除成功');
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      message.error('删除失败');
    }
  };

  const handleClearAll = async () => {
    try {
      await documentApi.clearAllDocuments();
      message.success('已清空所有文档');
      loadDocuments();
    } catch (error) {
      console.error('Failed to clear documents:', error);
      message.error('清空失败');
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchVisible(false);
      return;
    }
    
    setLoading(true);
    try {
      const res = await documentApi.searchDocuments(query, 5);
      setSearchResults(res.results || []);
      setSearchVisible(true);
    } catch (error) {
      console.error('Search failed:', error);
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddText = async (values: any) => {
    try {
      await documentApi.addTextDocument(values.content, values.source || 'manual');
      message.success('添加成功');
      setAddTextVisible(false);
      loadDocuments();
    } catch (error) {
      console.error('Failed to add text:', error);
      message.error('添加失败');
    }
  };

  const uploadProps = {
    customRequest: handleUpload,
    multiple: true,
    accept: '.txt,.md,.pdf,.docx',
    showUploadList: false,
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 280,
      render: (text: string) => <code style={{ fontSize: 12 }}>{text}</code>,
    },
    {
      title: '来源',
      key: 'source',
      render: (_: any, record: Document) => (
        <Tag color="blue">{record.metadata?.source || '未知'}</Tag>
      ),
    },
    {
      title: '类型',
      key: 'type',
      render: (_: any, record: Document) => (
        <Tag>{record.metadata?.type || 'text'}</Tag>
      ),
    },
    {
      title: '内容预览',
      dataIndex: 'preview',
      key: 'preview',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Document) => (
        <Space>
          <Popconfirm
            title="确定删除该文档？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title="知识库管理"
            extra={
              <Space>
                <Search
                  placeholder="搜索知识库..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  style={{ width: 400 }}
                  onSearch={handleSearch}
                  loading={loading}
                />
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setAddTextVisible(true)}
                >
                  添加文本
                </Button>
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    上传文件
                  </Button>
                </Upload>
                <Popconfirm
                  title="确定清空所有文档？"
                  onConfirm={handleClearAll}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<ClearOutlined />}>
                    清空全部
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            {searchVisible && searchResults.length > 0 ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Button type="link" onClick={() => setSearchVisible(false)}>
                    返回全部文档
                  </Button>
                  <span style={{ color: '#666' }}>
                    找到 {searchResults.length} 条相关结果
                  </span>
                </div>
                <List
                  dataSource={searchResults}
                  renderItem={(item: any, index: number) => (
                    <List.Item>
                      <Card size="small" style={{ width: '100%' }}>
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="相似度">
                            <Tag color={item.similarity > 0.7 ? 'green' : 'orange'}>
                              {(item.similarity * 100).toFixed(1)}%
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="来源">
                            {item.metadata?.source || '未知'}
                          </Descriptions.Item>
                          <Descriptions.Item label="内容">
                            <div style={{ whiteSpace: 'pre-wrap' }}>{item.content}</div>
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </List.Item>
                  )}
                />
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={documents}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                locale={{
                  emptyText: (
                    <Empty
                      description="暂无文档，请上传文件或添加文本"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="支持的文件格式">
            <List>
              <List.Item>
                <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                <strong>.txt</strong> - 纯文本文件
              </List.Item>
              <List.Item>
                <FileTextOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                <strong>.md</strong> - Markdown 文件
              </List.Item>
              <List.Item>
                <FileTextOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
                <strong>.pdf</strong> - PDF 文档
              </List.Item>
              <List.Item>
                <FileTextOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                <strong>.docx</strong> - Word 文档
              </List.Item>
            </List>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="使用说明">
            <List>
              <List.Item>
                1. 上传企业产品文档（支持 Markdown、PDF、Word 等格式）
              </List.Item>
              <List.Item>
                2. 系统会自动将文档向量化并存储到 FAISS 向量数据库
              </List.Item>
              <List.Item>
                3. 用户提问时，系统会从知识库中检索相关信息
              </List.Item>
              <List.Item>
                4. 结合检索到的信息和本地大模型生成回答
              </List.Item>
              <List.Item>
                5. 如果知识库中没有相关信息，系统会自动创建工单
              </List.Item>
            </List>
          </Card>
        </Col>
      </Row>

      <Modal
        title="添加文本内容"
        open={addTextVisible}
        onCancel={() => setAddTextVisible(false)}
        onOk={() => {
          const contentInput = document.querySelector('textarea[placeholder="请输入文本内容..."]') as HTMLTextAreaElement;
          const sourceInput = document.querySelector('input[placeholder="请输入来源标识（可选）"]') as HTMLInputElement;
          if (contentInput && contentInput.value.trim()) {
            handleAddText({
              content: contentInput.value,
              source: sourceInput?.value || 'manual'
            });
          } else {
            message.warning('请输入文本内容');
          }
        }}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            文本内容 <span style={{ color: 'red' }}>*</span>
          </label>
          <TextArea
            rows={8}
            placeholder="请输入文本内容..."
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            来源标识
          </label>
          <Input
            placeholder="请输入来源标识（可选）"
            style={{ width: '100%' }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default KnowledgeBasePage;
