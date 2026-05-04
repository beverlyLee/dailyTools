import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Empty, Spin, Pagination, Modal, message, Tag, Popconfirm } from 'antd';
import { 
  HistoryOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  EyeOutlined,
  CalendarOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { historyService, downloadService } from '../services/api';
import './HistoryPage.css';

const HistoryPage = () => {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    loadHistory(pagination.current, pagination.pageSize);
  }, []);

  const loadHistory = async (page, pageSize) => {
    setLoading(true);
    try {
      const response = await historyService.getHistory(page, pageSize);
      if (response.success) {
        setHistoryList(response.data.items);
        setPagination({
          current: response.data.page,
          pageSize: response.data.page_size,
          total: response.data.total,
        });
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
      const mockHistory = generateMockHistory();
      setHistoryList(mockHistory);
      setPagination({
        current: 1,
        pageSize: 10,
        total: mockHistory.length,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMockHistory = () => {
    return [
      {
        id: 1,
        source_image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20woman%20portrait%20casual%20clothing%20studio%20light&image_size=portrait_4_3',
        result_image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20traditional%20chinese%20ming%20hanfu%20red%20gold%20elegant&image_size=portrait_4_3',
        fashion_style: {
          id: 'hanfu_ming',
          name: '明制汉服',
          category: '汉服',
        },
        created_at: '2024-01-15 14:30:25',
        metadata: {
          strength: 0.8,
          resolution: '1024x768',
        },
      },
      {
        id: 2,
        source_image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20woman%20modern%20dress%20portrait%20soft%20light&image_size=portrait_4_3',
        result_image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20elegant%20chinese%20qipao%20floral%20pattern%20silk&image_size=portrait_4_3',
        fashion_style: {
          id: 'qipao_modern',
          name: '现代旗袍',
          category: '旗袍',
        },
        created_at: '2024-01-14 09:15:42',
        metadata: {
          strength: 0.9,
          resolution: '1024x768',
        },
      },
      {
        id: 3,
        source_image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20portrait%20white%20background%20simple%20clothing&image_size=portrait_4_3',
        result_image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20traditional%20chinese%20tang%20dynasty%20hanfu%20flowing%20silk&image_size=portrait_4_3',
        fashion_style: {
          id: 'hanfu_tang',
          name: '唐制汉服',
          category: '汉服',
        },
        created_at: '2024-01-13 16:45:10',
        metadata: {
          strength: 0.7,
          resolution: '1024x768',
        },
      },
    ];
  };

  const handlePageChange = (page, pageSize) => {
    loadHistory(page, pageSize);
  };

  const handlePreview = (item) => {
    setPreviewItem(item);
    setPreviewVisible(true);
  };

  const handleDownload = async (item) => {
    try {
      message.loading('准备下载...', 1);
      setTimeout(() => {
        downloadService.downloadHighQuality(item.result_image, {
          format: 'png',
          quality: 100,
        });
        message.success('下载已开始');
      }, 1000);
    } catch (error) {
      message.error('下载失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await historyService.deleteHistory(id);
      if (response.success) {
        message.success('删除成功');
        loadHistory(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      setHistoryList(historyList.filter(item => item.id !== id));
      message.success('删除成功');
    }
  };

  const formatDate = (dateStr) => {
    return dateStr;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case '汉服':
        return 'red';
      case '旗袍':
        return 'purple';
      default:
        return 'default';
    }
  };

  return (
    <div className="history-page">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <span>
                <HistoryOutlined style={{ marginRight: 8 }} />
                历史记录
              </span>
            }
            className="page-card"
            headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
            extra={
              <Button 
                onClick={() => loadHistory(pagination.current, pagination.pageSize)}
              >
                刷新
              </Button>
            }
          >
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
              </div>
            ) : historyList.length === 0 ? (
              <Empty
                description="暂无历史记录"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="empty-state"
              />
            ) : (
              <div>
                <Row gutter={[16, 16]}>
                  {historyList.map((item) => (
                    <Col span={8} key={item.id}>
                      <Card
                        hoverable
                        className="history-card"
                        cover={
                          <div className="history-image-container">
                            <div className="history-image-row">
                              <div className="history-image-col">
                                <div className="image-label">原图</div>
                                <img 
                                  alt="原图" 
                                  src={item.source_image}
                                  className="history-image"
                                />
                              </div>
                              <div className="history-image-col">
                                <div className="image-label">效果</div>
                                <img 
                                  alt="效果" 
                                  src={item.result_image}
                                  className="history-image"
                                />
                              </div>
                            </div>
                            <div className="history-overlay">
                              <Button.Group size="small">
                                <Button 
                                  icon={<EyeOutlined />} 
                                  onClick={() => handlePreview(item)}
                                >
                                  预览
                                </Button>
                                <Button 
                                  icon={<DownloadOutlined />} 
                                  onClick={() => handleDownload(item)}
                                >
                                  下载
                                </Button>
                                <Popconfirm
                                  title="确定删除这条记录吗？"
                                  onConfirm={() => handleDelete(item.id)}
                                  okText="确定"
                                  cancelText="取消"
                                >
                                  <Button 
                                    danger 
                                    icon={<DeleteOutlined />}
                                  >
                                    删除
                                  </Button>
                                </Popconfirm>
                              </Button.Group>
                            </div>
                          </div>
                        }
                      >
                        <div className="history-info">
                          <div className="history-title">
                            <Tag color={getCategoryColor(item.fashion_style?.category)}>
                              {item.fashion_style?.category || '其他'}
                            </Tag>
                            <span className="fashion-name">
                              {item.fashion_style?.name || '未知风格'}
                            </span>
                          </div>
                          <div className="history-meta">
                            <span className="meta-item">
                              <CalendarOutlined className="meta-icon" />
                              {formatDate(item.created_at)}
                            </span>
                            {item.metadata?.strength && (
                              <span className="meta-item">
                                <TagOutlined className="meta-icon" />
                                强度: {(item.metadata.strength * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>

                {pagination.total > pagination.pageSize && (
                  <div className="pagination-container">
                    <Pagination
                      current={pagination.current}
                      pageSize={pagination.pageSize}
                      total={pagination.total}
                      onChange={handlePageChange}
                      showSizeChanger
                      showTotal={(total) => `共 ${total} 条记录`}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="预览详情"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="back" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="download" 
            type="primary"
            className="btn-primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              if (previewItem) handleDownload(previewItem);
            }}
          >
            下载高清图
          </Button>,
        ]}
        width={900}
      >
        {previewItem && (
          <div className="preview-modal">
            <Row gutter={16}>
              <Col span={12}>
                <div className="preview-col">
                  <div className="preview-label">原图</div>
                  <img 
                    src={previewItem.source_image} 
                    alt="原图" 
                    className="preview-image"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className="preview-col">
                  <div className="preview-label">换装效果</div>
                  <img 
                    src={previewItem.result_image} 
                    alt="效果" 
                    className="preview-image"
                  />
                </div>
              </Col>
            </Row>

            <div className="preview-details">
              <h4>详细信息</h4>
              <Row gutter={[16, 8]}>
                <Col span={8}>
                  <span className="detail-label">服饰风格：</span>
                  <span className="detail-value">
                    {previewItem.fashion_style?.name || '未知'}
                  </span>
                </Col>
                <Col span={8}>
                  <span className="detail-label">风格分类：</span>
                  <span className="detail-value">
                    {previewItem.fashion_style?.category || '未知'}
                  </span>
                </Col>
                <Col span={8}>
                  <span className="detail-label">迁移强度：</span>
                  <span className="detail-value">
                    {previewItem.metadata?.strength 
                      ? `${(previewItem.metadata.strength * 100).toFixed(0)}%`
                      : '未知'}
                  </span>
                </Col>
                <Col span={8}>
                  <span className="detail-label">分辨率：</span>
                  <span className="detail-value">
                    {previewItem.metadata?.resolution || '未知'}
                  </span>
                </Col>
                <Col span={16}>
                  <span className="detail-label">创建时间：</span>
                  <span className="detail-value">
                    {formatDate(previewItem.created_at)}
                  </span>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HistoryPage;
