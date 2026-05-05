import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  List,
  Tag,
  Button,
  Space,
  Statistic,
  message,
  Modal,
  Descriptions,
  Progress,
  Badge,
  Timeline,
  Alert,
} from 'antd';
import {
  ShoppingCartOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { getReplenishmentSuggestions, approveReplenishment } from '../api/demand';

const { confirm } = Modal;

const urgencyConfig = {
  critical: { color: 'red', text: '紧急', icon: <ExclamationCircleOutlined /> },
  high: { color: 'orange', text: '高', icon: <WarningOutlined /> },
  low: { color: 'blue', text: '低', icon: <ClockCircleOutlined /> },
};

const statusConfig = {
  pending: { text: '待审批', color: 'warning' },
  review: { text: '审核中', color: 'processing' },
  approved: { text: '已批准', color: 'success' },
};

const ReplenishmentPage = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await getReplenishmentSuggestions();
      setSuggestions(response.data);
    } catch (error) {
      message.error('加载补货建议失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (suggestion) => {
    confirm({
      title: '确认批准补货',
      content: `确认批准 ${suggestion.productName} 的补货建议？\n建议补货数量: ${suggestion.recommendedQty} 件`,
      okText: '确认批准',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await approveReplenishment(suggestion.id);
          message.success(`补货建议已批准，采购单号: ${response.data.purchaseOrderId}`);
          fetchSuggestions();
        } catch (error) {
          message.error('批准失败');
        }
      },
    });
  };

  const handleViewDetail = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setDetailModalVisible(true);
  };

  const stats = {
    total: suggestions.length,
    critical: suggestions.filter((s) => s.urgency === 'critical').length,
    high: suggestions.filter((s) => s.urgency === 'high').length,
    pending: suggestions.filter((s) => s.status === 'pending').length,
  };

  const getStockPercentage = (current, max) => {
    return Math.min((current / max) * 100, 100);
  };

  const getStockStatusColor = (current, min) => {
    if (current === 0) return 'exception';
    if (current < min) return 'active';
    return 'success';
  };

  const renderSuggestionCard = (suggestion) => {
    const urgency = urgencyConfig[suggestion.urgency] || urgencyConfig.low;
    const status = statusConfig[suggestion.status] || statusConfig.pending;

    return (
      <Card
        className={`replenishment-card ${suggestion.urgency}`}
        size="small"
      >
        <Row gutter={16}>
          <Col span={6}>
            <Space direction="vertical" size="small">
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                {suggestion.productName}
              </span>
              <Tag color="default">{suggestion.sku}</Tag>
              <Tag color={urgency.color}>
                {urgency.icon} {urgency.text}
              </Tag>
            </Space>
          </Col>
          <Col span={4}>
            <Statistic
              title="当前库存"
              value={suggestion.currentStock}
              valueStyle={{ fontSize: 20 }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="安全线"
              value={suggestion.minStockLevel}
              valueStyle={{ fontSize: 20, color: '#faad14' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="建议补货"
              value={suggestion.recommendedQty}
              valueStyle={{ fontSize: 20, color: '#1890ff' }}
            />
          </Col>
          <Col span={3}>
            <div style={{ marginTop: 8 }}>
              <Tag color={status.color}>{status.text}</Tag>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              创建时间: {suggestion.createdAt}
            </div>
          </Col>
          <Col span={3}>
            <Space direction="vertical" size="small">
              <Button
                type="link"
                size="small"
                onClick={() => handleViewDetail(suggestion)}
              >
                查看详情
              </Button>
              {suggestion.status === 'pending' && (
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(suggestion)}
                >
                  批准
                </Button>
              )}
            </Space>
          </Col>
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Progress
              percent={getStockPercentage(suggestion.currentStock, suggestion.maxStockLevel)}
              status={getStockStatusColor(suggestion.currentStock, suggestion.minStockLevel)}
              format={() => `${suggestion.currentStock}/${suggestion.maxStockLevel}`}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="补货建议总数"
              value={stats.total}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="紧急补货"
              value={stats.critical}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="高优先级"
              value={stats.high}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批"
              value={stats.pending}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title="补货建议列表"
            extra={
              <Button icon={<ReloadOutlined />} onClick={fetchSuggestions} loading={loading}>
                刷新
              </Button>
            }
          >
            {suggestions.length === 0 ? (
              <Alert
                message="暂无补货建议"
                description="所有商品库存充足，无需补货"
                type="success"
                showIcon
              />
            ) : (
              suggestions.map((suggestion) => (
                <div key={suggestion.id} style={{ marginBottom: 16 }}>
                  {renderSuggestionCard(suggestion)}
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="补货建议详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          selectedSuggestion?.status === 'pending' ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                handleApprove(selectedSuggestion);
                setDetailModalVisible(false);
              }}
            >
              批准补货
            </Button>
          ) : null
        }
        width={700}
      >
        {selectedSuggestion && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="产品名称">
                {selectedSuggestion.productName}
              </Descriptions.Item>
              <Descriptions.Item label="SKU">
                {selectedSuggestion.sku}
              </Descriptions.Item>
              <Descriptions.Item label="仓库">
                {selectedSuggestion.warehouse}
              </Descriptions.Item>
              <Descriptions.Item label="紧急程度">
                <span className={`urgency-badge ${selectedSuggestion.urgency}`}>
                  {urgencyConfig[selectedSuggestion.urgency]?.text}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="当前库存">
                {selectedSuggestion.currentStock} 件
              </Descriptions.Item>
              <Descriptions.Item label="安全线">
                {selectedSuggestion.minStockLevel} 件
              </Descriptions.Item>
              <Descriptions.Item label="建议补货数量">
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  {selectedSuggestion.recommendedQty} 件
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="预计到货时间">
                {selectedSuggestion.estimatedArrival}
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={statusConfig[selectedSuggestion.status]?.color}>
                  {statusConfig[selectedSuggestion.status]?.text}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Card title="原因说明" size="small" style={{ marginBottom: 16 }}>
              <p>{selectedSuggestion.reason}</p>
            </Card>

            <Card title="库存趋势" size="small">
              <Timeline mode="left">
                <Timeline.Item color="green">
                  当前库存: {selectedSuggestion.currentStock} 件
                </Timeline.Item>
                <Timeline.Item color="orange">
                  安全线: {selectedSuggestion.minStockLevel} 件
                </Timeline.Item>
                <Timeline.Item color="blue">
                  建议补货: +{selectedSuggestion.recommendedQty} 件
                </Timeline.Item>
                <Timeline.Item color="green">
                  预计到货: {selectedSuggestion.estimatedArrival}
                </Timeline.Item>
              </Timeline>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReplenishmentPage;
