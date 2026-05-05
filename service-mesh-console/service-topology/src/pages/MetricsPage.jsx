import React, { useState, useEffect } from 'react';
import { Card, Table, Row, Col, Statistic, Tag, Spin, message } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { getMetrics } from '../api/topology';

const MetricsPage = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await getMetrics();
      setMetrics(data);
    } catch (error) {
      message.error('获取指标失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (metrics) => {
    const errorRate = metrics.errorRate;
    const p99Latency = metrics.p99LatencyMs;

    if (errorRate > 0.05 || p99Latency > 500) {
      return <Tag color="error">异常</Tag>;
    } else if (errorRate > 0.01 || p99Latency > 200) {
      return <Tag color="warning">警告</Tag>;
    }
    return <Tag color="success">健康</Tag>;
  };

  const columns = [
    {
      title: '服务名称',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 180,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => getStatusTag(record),
    },
    {
      title: 'QPS',
      dataIndex: 'requestsPerSec',
      key: 'requestsPerSec',
      width: 100,
      render: (value) => value.toFixed(1),
    },
    {
      title: '错误率',
      dataIndex: 'errorRate',
      key: 'errorRate',
      width: 120,
      render: (value) => {
        const percentage = (value * 100).toFixed(2);
        const color = value > 0.05 ? '#ff4d4f' : value > 0.01 ? '#faad14' : '#52c41a';
        return <span style={{ color, fontWeight: 'bold' }}>{percentage}%</span>;
      },
    },
    {
      title: '平均延迟',
      dataIndex: 'avgLatencyMs',
      key: 'avgLatencyMs',
      width: 120,
      render: (value) => `${value.toFixed(1)}ms`,
    },
    {
      title: 'P95延迟',
      dataIndex: 'p95LatencyMs',
      key: 'p95LatencyMs',
      width: 120,
      render: (value) => `${value.toFixed(1)}ms`,
    },
    {
      title: 'P99延迟',
      dataIndex: 'p99LatencyMs',
      key: 'p99LatencyMs',
      width: 120,
      render: (value) => {
        const color = value > 500 ? '#ff4d4f' : value > 200 ? '#faad14' : 'inherit';
        return <span style={{ color }}>{value.toFixed(1)}ms</span>;
      },
    },
    {
      title: '总请求数',
      dataIndex: 'requestsTotal',
      key: 'requestsTotal',
      width: 120,
      render: (value) => value.toLocaleString(),
    },
    {
      title: '总错误数',
      dataIndex: 'errorsTotal',
      key: 'errorsTotal',
      width: 100,
      render: (value) => {
        const color = value > 0 ? '#ff4d4f' : 'inherit';
        return <span style={{ color }}>{value.toLocaleString()}</span>;
      },
    },
  ];

  const getTotalStats = () => {
    if (metrics.length === 0) {
      return {
        totalQps: 0,
        totalRequests: 0,
        totalErrors: 0,
        avgErrorRate: 0,
        avgLatency: 0,
        abnormalCount: 0,
      };
    }

    const totalQps = metrics.reduce((sum, m) => sum + m.requestsPerSec, 0);
    const totalRequests = metrics.reduce((sum, m) => sum + m.requestsTotal, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorsTotal, 0);
    const avgErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    const avgLatency = metrics.reduce((sum, m) => sum + m.avgLatencyMs, 0) / metrics.length;
    const abnormalCount = metrics.filter(
      (m) => m.errorRate > 0.05 || m.p99LatencyMs > 500
    ).length;

    return {
      totalQps,
      totalRequests,
      totalErrors,
      avgErrorRate,
      avgLatency,
      abnormalCount,
    };
  };

  const stats = getTotalStats();

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总 QPS"
              value={stats.totalQps}
              precision={1}
              suffix="req/s"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总请求数"
              value={stats.totalRequests}
              formatter={(value) => value.toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="平均错误率"
              value={stats.avgErrorRate * 100}
              precision={2}
              suffix="%"
              prefix={<PercentageOutlined />}
              valueStyle={{
                color: stats.avgErrorRate > 0.05 ? '#cf1322' : '#3f8600',
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="平均延迟"
              value={stats.avgLatency}
              precision={1}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总错误数"
              value={stats.totalErrors}
              formatter={(value) => value.toLocaleString()}
              valueStyle={{
                color: stats.totalErrors > 0 ? '#cf1322' : 'inherit',
              }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="异常服务数"
              value={stats.abnormalCount}
              prefix={
                stats.abnormalCount > 0 ? (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                ) : (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                )
              }
              valueStyle={{
                color: stats.abnormalCount > 0 ? '#ff4d4f' : '#52c41a',
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="服务流量指标详情" size="small">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={metrics}
            rowKey="serviceName"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1200 }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default MetricsPage;
