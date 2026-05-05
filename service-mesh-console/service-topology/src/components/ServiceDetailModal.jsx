import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Descriptions,
  Spin,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { getServiceInstances } from '../api/topology';

const ServiceDetailModal = ({ visible, onCancel, service }) => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && service) {
      fetchServiceInstances();
    }
  }, [visible, service]);

  const fetchServiceInstances = async () => {
    if (!service) return;

    setLoading(true);
    try {
      const data = await getServiceInstances(service.serviceName);
      setInstances(data);
    } catch (error) {
      message.error('获取服务实例失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'running':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'degraded':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'error':
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <WarningOutlined style={{ color: '#bfbfbf' }} />;
    }
  };

  const getStatusTag = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'running':
        return <Tag color="success">健康</Tag>;
      case 'degraded':
        return <Tag color="warning">降级</Tag>;
      case 'error':
      case 'failed':
        return <Tag color="error">错误</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  const instanceColumns = [
    {
      title: '实例ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Pod名称',
      dataIndex: 'podName',
      key: 'podName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '命名空间',
      dataIndex: 'namespace',
      key: 'namespace',
      width: 100,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port',
      width: 80,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: '节点',
      dataIndex: 'node',
      key: 'node',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {getStatusIcon(service?.status)}
          <span>服务详情: {service?.serviceName}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={null}
      className="service-detail-modal"
    >
      {service && (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={4} size="small">
              <Descriptions.Item label="服务名称">{service.serviceName}</Descriptions.Item>
              <Descriptions.Item label="命名空间">{service.namespace}</Descriptions.Item>
              <Descriptions.Item label="版本">{service.version}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(service.status)}
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag>{service.type === 'gateway' ? '网关' : '服务'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="实例数">{service.instances}</Descriptions.Item>
              {service.labels && Object.entries(service.labels).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  <Tag size="small">{value}</Tag>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>

          {service.metrics && (
            <Card title="流量指标" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={4}>
                  <Card size="small">
                    <Statistic
                      title="请求量 (QPS)"
                      value={service.metrics.requestsPerSec}
                      precision={1}
                      prefix={<ArrowUpOutlined />}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small">
                    <Statistic
                      title="总请求数"
                      value={service.metrics.requestsTotal}
                      formatter={(value) => value.toLocaleString()}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small">
                    <Statistic
                      title="错误率"
                      value={service.metrics.errorRate * 100}
                      precision={2}
                      suffix="%"
                      prefix={<PercentageOutlined />}
                      valueStyle={{
                        color: service.metrics.errorRate > 0.05 ? '#cf1322' : '#3f8600',
                      }}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small">
                    <Statistic
                      title="总错误数"
                      value={service.metrics.errorsTotal}
                      formatter={(value) => value.toLocaleString()}
                      valueStyle={{
                        color: service.metrics.errorsTotal > 0 ? '#cf1322' : 'inherit',
                      }}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small">
                    <Statistic
                      title="平均延迟"
                      value={service.metrics.avgLatencyMs}
                      precision={1}
                      suffix="ms"
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small">
                    <Statistic
                      title="P99延迟"
                      value={service.metrics.p99LatencyMs}
                      precision={1}
                      suffix="ms"
                      prefix={<ArrowDownOutlined />}
                      valueStyle={{
                        color: service.metrics.p99LatencyMs > 500 ? '#cf1322' : 'inherit',
                      }}
                    />
                  </Card>
                </Col>
              </Row>
            </Card>
          )}

          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>服务实例列表</span>
                <Tag color="blue">{instances.length} 个实例</Tag>
              </div>
            }
            size="small"
          >
            <Spin spinning={loading}>
              <Table
                columns={instanceColumns}
                dataSource={instances}
                rowKey="id"
                size="small"
                pagination={{
                  pageSize: 5,
                  showSizeChanger: false,
                  showQuickJumper: false,
                }}
                scroll={{ x: 1000 }}
              />
            </Spin>
          </Card>
        </>
      )}
    </Modal>
  );
};

export default ServiceDetailModal;
