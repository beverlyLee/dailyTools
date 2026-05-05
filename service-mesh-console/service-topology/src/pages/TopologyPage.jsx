import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, message, Alert, Button, Space } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import TopologyGraph from '../components/TopologyGraph';
import ServiceDetailModal from '../components/ServiceDetailModal';
import { getTopology, pollTopology } from '../api/topology';

const TopologyPage = () => {
  const [topology, setTopology] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchTopology();

    if (autoRefresh) {
      const stopPolling = pollTopology(5000, ({ topology: newTopology, error }) => {
        if (error) {
          console.error('轮询失败:', error);
          return;
        }
        setTopology(newTopology);
      });

      return () => stopPolling();
    }
  }, [autoRefresh]);

  const fetchTopology = async () => {
    setLoading(true);
    try {
      const data = await getTopology();
      setTopology(data);
    } catch (error) {
      message.error('获取拓扑图失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node) => {
    setSelectedService(node);
    setDetailModalVisible(true);
  };

  const handleDetailModalClose = () => {
    setDetailModalVisible(false);
    setSelectedService(null);
  };

  // 计算统计数据
  const getStats = () => {
    if (!topology) {
      return {
        totalServices: 0,
        healthyServices: 0,
        degradedServices: 0,
        errorServices: 0,
        abnormalLinks: 0,
      };
    }

    const healthyServices = topology.nodes.filter(
      (n) => n.status === 'healthy'
    ).length;
    const degradedServices = topology.nodes.filter(
      (n) => n.status === 'degraded'
    ).length;
    const errorServices = topology.nodes.filter(
      (n) => n.status === 'error'
    ).length;
    const abnormalLinks = topology.edges.filter((e) => e.isAbnormal).length;

    return {
      totalServices: topology.nodes.length,
      healthyServices,
      degradedServices,
      errorServices,
      abnormalLinks,
    };
  };

  const stats = getStats();

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card
            size="small"
            title={
              <Space>
                <span>服务拓扑图</span>
                {stats.abnormalLinks > 0 && (
                  <Alert
                    message={`检测到 ${stats.abnormalLinks} 条异常链路`}
                    type="error"
                    showIcon
                    style={{ display: 'inline-flex', margin: 0, padding: '4px 12px' }}
                  />
                )}
              </Space>
            }
            extra={
              <Space>
                <Button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  type={autoRefresh ? 'primary' : 'default'}
                >
                  {autoRefresh ? '自动刷新中' : '开启自动刷新'}
                </Button>
                <Button icon={<ReloadOutlined />} onClick={fetchTopology}>
                  刷新
                </Button>
              </Space>
            }
          >
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Statistic
                  title="总服务数"
                  value={stats.totalServices}
                  prefix={<ArrowUpOutlined />}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="健康服务"
                  value={stats.healthyServices}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="降级服务"
                  value={stats.degradedServices}
                  prefix={<WarningOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="异常服务"
                  value={stats.errorServices}
                  prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="异常链路"
                  value={stats.abnormalLinks}
                  prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  valueStyle={{ color: stats.abnormalLinks > 0 ? '#ff4d4f' : 'inherit' }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="平均延迟"
                  value={topology ? topology.nodes.reduce((sum, n) => sum + (n.metrics?.avgLatencyMs || 0), 0) / topology.nodes.length : 0}
                  precision={1}
                  suffix="ms"
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>

            <div className="legend-container" style={{ marginBottom: 16 }}>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#52c41a' }} />
                <span>健康服务</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#faad14' }} />
                <span>降级服务</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ff4d4f' }} />
                <span>异常服务</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#1890ff', height: 3 }} />
                <span>正常链路</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ff4d4f', height: 3, width: 16 }} />
                <span>异常链路（5xx/高延迟）</span>
              </div>
            </div>

            <Spin spinning={loading}>
              {topology ? (
                <TopologyGraph
                  topology={topology}
                  onNodeClick={handleNodeClick}
                  selectedNode={selectedService}
                />
              ) : (
                <div
                  style={{
                    height: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e8e8e8',
                    borderRadius: 4,
                  }}
                >
                  <p>暂无拓扑数据</p>
                </div>
              )}
            </Spin>
          </Card>
        </Col>
      </Row>

      <ServiceDetailModal
        visible={detailModalVisible}
        onCancel={handleDetailModalClose}
        service={selectedService}
      />
    </div>
  );
};

export default TopologyPage;
