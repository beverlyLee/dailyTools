import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  List,
  Typography,
  Descriptions,
  Divider,
} from 'antd';
import {
  ServerOutlined,
  AppstoreOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { nodeAPI, deploymentAPI } from '../utils/api';

const { Title, Text } = Typography;

function Dashboard() {
  const [nodes, setNodes] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [nodesRes, deploysRes] = await Promise.all([
        nodeAPI.getAll(),
        deploymentAPI.getAll(),
      ]);
      setNodes(nodesRes.data || []);
      setDeployments(deploysRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setNodes([
        {
          id: 'node-1',
          name: '北京节点-01',
          status: 'online',
          ip_address: '192.168.1.10',
          location: { city: '北京', region: '华北' },
        },
        {
          id: 'node-2',
          name: '上海节点-01',
          status: 'warning',
          ip_address: '192.168.2.20',
          location: { city: '上海', region: '华东' },
        },
        {
          id: 'node-3',
          name: '新加坡节点-01',
          status: 'online',
          ip_address: '192.168.3.30',
          location: { city: '新加坡', region: '东南亚' },
        },
      ]);
      setDeployments([
        {
          id: 'deploy-1',
          app_name: 'Web应用服务',
          status: 'completed',
          progress: 100,
          strategy: 'canary',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'deploy-2',
          app_name: 'Redis缓存服务',
          status: 'running',
          progress: 65,
          strategy: 'rolling',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'running': return 'processing';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      online: '在线',
      warning: '警告',
      critical: '紧急',
      offline: '离线',
      running: '运行中',
      completed: '已完成',
      failed: '失败',
      pending: '等待中',
    };
    return statusMap[status] || status;
  };

  const statsCards = [
    {
      title: '总节点数',
      value: nodes.length,
      icon: <ServerOutlined />,
      color: '#1890ff',
    },
    {
      title: '在线节点',
      value: nodes.filter(n => n.status === 'online').length,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
    },
    {
      title: '应用数量',
      value: deployments.length,
      icon: <AppstoreOutlined />,
      color: '#722ed1',
    },
    {
      title: '告警节点',
      value: nodes.filter(n => n.status === 'warning' || n.status === 'critical').length,
      icon: <WarningOutlined />,
      color: '#faad14',
    },
  ];

  const cpuChartOption = {
    title: { text: 'CPU使用率趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['北京', '上海', '新加坡'], bottom: 10 },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: '北京',
        type: 'line',
        smooth: true,
        data: [45, 32, 58, 72, 65, 48, 42],
        areaStyle: { opacity: 0.3 },
      },
      {
        name: '上海',
        type: 'line',
        smooth: true,
        data: [38, 28, 45, 68, 55, 42, 35],
        areaStyle: { opacity: 0.3 },
      },
      {
        name: '新加坡',
        type: 'line',
        smooth: true,
        data: [52, 48, 65, 82, 75, 58, 50],
        areaStyle: { opacity: 0.3 },
      },
    ],
  };

  const nodeColumns = [
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span className={`status-dot status-dot-${record.status}`} />
          <Text strong>{text}</Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
    },
    {
      title: '位置',
      key: 'location',
      render: (_, record) => (
        <span>
          <GlobalOutlined style={{ marginRight: 8 }} />
          {record.location?.city || '-'}
        </span>
      ),
    },
  ];

  const deployColumns = [
    {
      title: '应用名称',
      dataIndex: 'app_name',
      key: 'app_name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '发布策略',
      dataIndex: 'strategy',
      key: 'strategy',
      render: (strategy) => (
        <Tag color="blue">
          {strategy === 'canary' ? '灰度发布' : strategy === 'rolling' ? '滚动更新' : '蓝绿发布'}
        </Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress, record) => (
        <Progress 
          percent={progress} 
          size="small"
          status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>系统概览</Title>
      
      <Row gutter={[16, 16]}>
        {statsCards.map((card, index) => (
          <Col span={6} key={index}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={
                  <span style={{ color: card.color, fontSize: 24 }}>
                    {card.icon}
                  </span>
                }
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="CPU使用率趋势" extra={<DeploymentUnitOutlined />}>
            <ReactECharts option={cpuChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="节点分布">
            <List
              dataSource={[
                { name: '华北区域', count: 2, color: '#1890ff' },
                { name: '华东区域', count: 1, color: '#52c41a' },
                { name: '东南亚', count: 1, color: '#722ed1' },
                { name: '欧洲', count: 1, color: '#faad14' },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={
                      <Progress 
                        percent={100} 
                        strokeColor={item.color}
                        showInfo={false}
                        size="small"
                        style={{ width: '60%', marginRight: 8 }}
                      />
                    }
                  />
                  <Text strong>{item.count} 个</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="边缘节点列表">
            <Table
              columns={nodeColumns}
              dataSource={nodes}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="最近发布任务">
            <Table
              columns={deployColumns}
              dataSource={deployments}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
