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

const costumeLabels = {
  hanfu_ming: '明制汉服',
  hanfu_tang: '唐制汉服',
  qipao: '旗袍',
  qipao_modern: '改良旗袍',
  hanfu_song: '宋制汉服',
};

const detailLabels = {
  none: '无特殊细节',
  embroidery: '刺绣纹样',
  button: '传统盘扣',
  both: '刺绣+盘扣',
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
    link.download = `historical-try-on-${item.id}.png`;
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
            <span>创作历史</span>
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
              description="暂无创作历史记录"
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
                          alt="历史作品"
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
                            <Tag color="blue">{costumeLabels[item.costume_type] || item.costume_type}</Tag>
                            <Tag color="green">{detailLabels[item.detail_style] || item.detail_style}</Tag>
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
                total={100} // 暂时假设总数，实际应该从后端获取
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
        title="历史作品详情"
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
            
            <Card size="small" title="作品信息">
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>服饰类型：</strong>{costumeLabels[selectedItem.costume_type] || selectedItem.costume_type}</p>
                  <p><strong>细节风格：</strong>{detailLabels[selectedItem.detail_style] || selectedItem.detail_style}</p>
                </Col>
                <Col span={12}>
                  <p><strong>创建时间：</strong>{formatDate(selectedItem.created_at)}</p>
                  <p><strong>作品ID：</strong>{selectedItem.id}</p>
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
