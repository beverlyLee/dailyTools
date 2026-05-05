import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Space,
  Select,
  Empty,
  message,
  Modal,
  Descriptions,
  Badge,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { getAlerts, acknowledgeAlert } from '../api/logistics';

const { Option } = Select;
const { confirm } = Modal;

const severityConfig = {
  high: { color: 'red', text: '高' },
  medium: { color: 'orange', text: '中' },
  low: { color: 'blue', text: '低' },
};

const typeConfig = {
  delay: { icon: <ExclamationCircleOutlined />, text: '订单延迟' },
  inventory: { icon: <InfoCircleOutlined />, text: '库存异常' },
  carrier: { icon: <BellOutlined />, text: '承运商异常' },
};

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await getAlerts();
      setAlerts(response.data);
    } catch (error) {
      message.error('加载告警数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = (alert) => {
    confirm({
      title: '确认告警',
      content: `确认处理告警: ${alert.title}?`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await acknowledgeAlert(alert.id);
          message.success('告警已确认');
          fetchAlerts();
        } catch (error) {
          message.error('确认告警失败');
        }
      },
    });
  };

  const handleViewDetail = (alert) => {
    setSelectedAlert(alert);
    setDetailModalVisible(true);
  };

  const filteredAlerts = alerts.filter((alert) => {
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'active' && !alert.acknowledged) ||
      (filterStatus === 'acknowledged' && alert.acknowledged);
    return severityMatch && statusMatch;
  });

  const renderAlertItem = (alert) => {
    const severity = severityConfig[alert.severity] || severityConfig.low;
    const type = typeConfig[alert.type] || { icon: <BellOutlined />, text: '未知' };

    return (
      <List.Item
        actions={[
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetail(alert)}
          >
            详情
          </Button>,
          !alert.acknowledged && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleAcknowledge(alert)}
            >
              确认
            </Button>
          ),
        ]}
      >
        <List.Item.Meta
          avatar={
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: severity.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 20,
              }}
            >
              {type.icon}
            </div>
          }
          title={
            <Space>
              <span>{alert.title}</span>
              <Tag color={severity.color}>{severity.text}</Tag>
              {alert.acknowledged ? (
                <Badge status="default" text="已确认" />
              ) : (
                <Badge status="processing" text="待处理" />
              )}
            </Space>
          }
          description={
            <div>
              <p>{alert.description}</p>
              <Space>
                <Tag>{type.text}</Tag>
                <span style={{ color: '#999' }}>创建时间: {alert.createdAt}</span>
              </Space>
            </div>
          }
        />
      </List.Item>
    );
  };

  return (
    <div>
      <Card
        title="异常预警"
        extra={
          <Space>
            <Select
              value={filterSeverity}
              onChange={setFilterSeverity}
              style={{ width: 120 }}
            >
              <Option value="all">全部级别</Option>
              <Option value="high">高</Option>
              <Option value="medium">中</Option>
              <Option value="low">低</Option>
            </Select>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="active">待处理</Option>
              <Option value="acknowledged">已确认</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAlerts}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {filteredAlerts.length === 0 ? (
          <Empty description="暂无告警信息" />
        ) : (
          <List
            className="alerts-panel"
            itemLayout="horizontal"
            dataSource={filteredAlerts}
            renderItem={renderAlertItem}
          />
        )}
      </Card>

      <Modal
        title="告警详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedAlert && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="告警标题">
              {selectedAlert.title}
            </Descriptions.Item>
            <Descriptions.Item label="告警级别">
              <Tag color={severityConfig[selectedAlert.severity].color}>
                {severityConfig[selectedAlert.severity].text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="告警类型">
              <Tag>{typeConfig[selectedAlert.type]?.text || '未知'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedAlert.acknowledged ? (
                <Badge status="default" text="已确认" />
              ) : (
                <Badge status="processing" text="待处理" />
              )}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedAlert.description}
            </Descriptions.Item>
            <Descriptions.Item label="关联实体ID">
              {selectedAlert.entityId}
            </Descriptions.Item>
            <Descriptions.Item label="关联实体类型">
              {selectedAlert.entityType}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {selectedAlert.createdAt}
            </Descriptions.Item>
            {selectedAlert.acknowledged && (
              <>
                <Descriptions.Item label="确认人">
                  {selectedAlert.acknowledgedBy || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="确认时间">
                  {selectedAlert.acknowledgedAt || '-'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AlertsPage;
