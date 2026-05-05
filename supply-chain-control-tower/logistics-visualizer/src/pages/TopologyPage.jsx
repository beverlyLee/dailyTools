import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Select,
  Button,
  message,
} from 'antd';
import {
  TruckOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import TopologyGraph from '../components/TopologyGraph';
import { getTopology, getOrders, wsService } from '../api/logistics';

const { Option } = Select;

const TopologyPage = () => {
  const [topology, setTopology] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    inTransit: 0,
    delivered: 0,
    delayed: 0,
  });
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetchData();
    wsService.subscribe('orders');
    wsService.subscribe('alerts');

    wsService.on('orders_update', (msg) => {
      console.log('订单更新:', msg);
    });

    return () => {
      wsService.off('orders_update');
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topologyRes, ordersRes] = await Promise.all([
        getTopology(),
        getOrders(),
      ]);

      setTopology(topologyRes.data);

      const orders = ordersRes.data;
      setStats({
        totalOrders: orders.length,
        inTransit: orders.filter((o) => o.status === 'in_transit').length,
        delivered: orders.filter((o) => o.status === 'delivered').length,
        delayed: orders.filter((o) => o.status === 'delayed').length,
      });
    } catch (error) {
      message.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    message.info(`选中节点: ${node.name}`);
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={stats.totalOrders}
              prefix={<TruckOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运输中"
              value={stats.inTransit}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已送达"
              value={stats.delivered}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已延迟"
              value={stats.delayed}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <span>物流链路拓扑图</span>
                <Tag color="green">实时</Tag>
              </Space>
            }
            extra={
              <Space>
                <Select defaultValue="all" style={{ width: 150 }}>
                  <Option value="all">全部节点</Option>
                  <Option value="supplier">供应商</Option>
                  <Option value="warehouse">仓库</Option>
                  <Option value="carrier">承运商</Option>
                  <Option value="retailer">零售商</Option>
                </Select>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchData}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            }
          >
            <TopologyGraph
              topology={topology}
              onNodeClick={handleNodeClick}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {selectedNode && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="节点详情">
              <Row gutter={16}>
                <Col span={6}>
                  <p><strong>节点名称:</strong> {selectedNode.name}</p>
                  <p><strong>节点类型:</strong> {selectedNode.type}</p>
                  <p><strong>状态:</strong> {selectedNode.status}</p>
                  {selectedNode.location && (
                    <p><strong>位置:</strong> {selectedNode.location}</p>
                  )}
                </Col>
                {selectedNode.metrics && (
                  <>
                    <Col span={6}>
                      <p><strong>在途订单:</strong> {selectedNode.metrics.ordersInTransit}</p>
                      <p><strong>今日配送:</strong> {selectedNode.metrics.deliveredToday}</p>
                    </Col>
                    <Col span={6}>
                      <p><strong>准点率:</strong> {(selectedNode.metrics.onTimeRate * 100).toFixed(1)}%</p>
                      <p><strong>平均配送时间:</strong> {selectedNode.metrics.avgDeliveryTime}天</p>
                    </Col>
                  </>
                )}
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="图例说明">
            <Space size="large">
              <Space>
                <span className="status-dot healthy" style={{ display: 'inline-block' }} />
                <span>正常</span>
              </Space>
              <Space>
                <span className="status-dot degraded" style={{ display: 'inline-block' }} />
                <span>降级</span>
              </Space>
              <Space>
                <span className="status-dot error" style={{ display: 'inline-block' }} />
                <span>异常</span>
              </Space>
              <Space>
                <span>🏭 供应商</span>
              </Space>
              <Space>
                <span>🏠 仓库</span>
              </Space>
              <Space>
                <span>🚚 承运商</span>
              </Space>
              <Space>
                <span>🏪 零售商</span>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TopologyPage;
