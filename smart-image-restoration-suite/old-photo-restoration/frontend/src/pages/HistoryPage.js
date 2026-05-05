import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  List,
  Image,
  Button,
  Modal,
  Empty,
  Spin,
  message,
  Tag,
  Space,
  Popconfirm,
  Pagination
} from 'antd';
import {
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import axios from 'axios';

const modelLabels = {
  realesrgan_x4plus: 'Real-ESRGAN x4',
  realesrgan_x2plus: 'Real-ESRGAN x2',
  realesrgan_x8: 'Real-ESRGAN x8',
  swinir_lightweight_x4: 'SwinIR Lightweight x4',
  swinir_classical_x4: 'SwinIR Classical x4',
};

function HistoryPage() {
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [currentPage, pageSize]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/history/list', {
        params: { page: currentPage, size: pageSize }
      });
      if (response.data.success) {
        setHistoryList(response.data.items);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
      message.error('获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/history/${id}`);
      message.success('删除成功');
      fetchHistory();
    } catch (error) {
      console.error('Delete history error:', error);
      message.error('删除失败');
    }
  };

  const handlePreview = (item) => {
    setSelectedItem(item);
    setPreviewImage(item.result_image);
    setPreviewVisible(true);
  };

  const handleDownload = (item) => {
    if (!item.result_image) {
      message.warning('没有可下载的图片');
      return;
    }
    
    const link = document.createElement('a');
    link.href = item.result_image;
    link.download = `restored-photo-${item.id}.png`;
    link.click();
    message.success('下载已开始');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <Card 
        title={
          <Space>
            <HistoryOutlined />
            <span>修复历史</span>
          </Space>
        }
        extra={
          <Button onClick={fetchHistory} loading={loading}>
            刷新
          </Button>
        }
      >
        <Spin spinning={loading}>
          {historyList.length === 0 ? (
            <Empty
              description="暂无修复历史记录"
              style={{ padding: '60px 0' }}
            />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }}
              dataSource={historyList}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    hoverable
                    cover={
                      <div style={{ height: 200, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image
                          alt="修复结果"
                          src={item.result_image}
                          style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }}
                          preview={false}
                        />
                      </div>
                    }
                    actions={[
                      <Button 
                        type="text" 
                        icon={<EyeOutlined />} 
                        onClick={() => handlePreview(item)}
                      >
                        预览
                      </Button>,
                      <Button 
                        type="text" 
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(item)}
                      >
                        下载
                      </Button>,
                      <Popconfirm
                        title="确定要删除这条历史记录吗？"
                        onConfirm={() => handleDelete(item.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="text" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <Card.Meta
                      description={
                        <div>
                          <div style={{ marginBottom: '8px' }}>
                            <Tag color="blue">{modelLabels[item.model] || item.model}</Tag>
                            <Tag color="green">{item.scale}倍放大</Tag>
                            {item.enable_inpainting && <Tag color="gold">划痕修复</Tag>}
                            {item.enable_colorization && <Tag color="purple">智能上色</Tag>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {formatDate(item.created_at)}
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          )}
          
          {historyList.length > 0 && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={100}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }}
                showSizeChanger
                pageSizeOptions={['4', '8', '12', '16']}
                showTotal={(total) => `共 ${total} 条记录`}
              />
            </div>
          )}
        </Spin>
      </Card>

      <Modal
        title="修复历史详情"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="download" icon={<DownloadOutlined />} onClick={() => handleDownload(selectedItem)}>
            下载
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedItem && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Image
                width="100%"
                src={previewImage}
                style={{ maxHeight: 500, objectFit: 'contain' }}
              />
            </div>
            
            <Card size="small" title="修复信息">
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>使用模型：</strong>{modelLabels[selectedItem.model] || selectedItem.model}</p>
                  <p><strong>放大倍数：</strong>{selectedItem.scale}倍</p>
                </Col>
                <Col span={12}>
                  <p><strong>划痕修复：</strong>{selectedItem.enable_inpainting ? '已启用' : '未启用'}</p>
                  <p><strong>智能上色：</strong>{selectedItem.enable_colorization ? '已启用' : '未启用'}</p>
                  <p><strong>创建时间：</strong>{formatDate(selectedItem.created_at)}</p>
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default HistoryPage;
