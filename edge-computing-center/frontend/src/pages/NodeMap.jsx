import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Modal,
  Descriptions,
  Table,
  Progress,
  Button,
  Statistic,
  Empty,
  Spin,
  Space,
  Popconfirm,
} from 'antd';
import {
  GlobalOutlined,
  DesktopOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  TerminalOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { nodeAPI, electronAPI } from '../utils/api';

const { Title, Text } = Typography;

function NodeMap() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeStats, setNodeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [sshModalVisible, setSshModalVisible] = useState(false);
  const [pingResults, setPingResults] = useState({});

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await nodeAPI.getAll();
      setNodes(response.data || []);
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      setNodes([
        {
          id: 'node-beijing-01',
          name: '北京节点-01',
          description: '北京数据中心边缘节点',
          ip_address: '192.168.1.10',
          ssh_port: 22,
          ssh_user: 'admin',
          location: {
            latitude: 39.9042,
            longitude: 116.4074,
            city: '北京',
            country: '中国',
            region: '华北',
          },
          status: 'online',
          tags: ['production', 'high-availability'],
        },
        {
          id: 'node-shanghai-01',
          name: '上海节点-01',
          description: '上海数据中心边缘节点',
          ip_address: '192.168.2.20',
          ssh_port: 22,
          ssh_user: 'admin',
          location: {
            latitude: 31.2304,
            longitude: 121.4737,
            city: '上海',
            country: '中国',
            region: '华东',
          },
          status: 'warning',
          tags: ['production', 'high-availability'],
        },
        {
          id: 'node-singapore-01',
          name: '新加坡节点-01',
          description: '新加坡数据中心边缘节点',
          ip_address: '192.168.3.30',
          ssh_port: 22,
          ssh_user: 'ubuntu',
          location: {
            latitude: 1.3521,
            longitude: 103.8198,
            city: '新加坡',
            country: '新加坡',
            region: '东南亚',
          },
          status: 'online',
          tags: ['global', 'high-availability'],
        },
        {
          id: 'node-tokyo-01',
          name: '东京节点-01',
          description: '东京数据中心边缘节点',
          ip_address: '192.168.4.40',
          ssh_port: 22,
          ssh_user: 'ubuntu',
          location: {
            latitude: 35.6762,
            longitude: 139.6503,
            city: '东京',
            country: '日本',
            region: '东亚',
          },
          status: 'online',
          tags: ['global', 'high-availability'],
        },
        {
          id: 'node-frankfurt-01',
          name: '法兰克福节点-01',
          description: '法兰克福数据中心边缘节点',
          ip_address: '192.168.5.50',
          ssh_port: 22,
          ssh_user: 'root',
          location: {
            latitude: 50.1109,
            longitude: 8.6821,
            city: '法兰克福',
            country: '德国',
            region: '欧洲',
          },
          status: 'critical',
          tags: ['global', 'high-availability'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#52c41a';
      case 'warning': return '#faad14';
      case 'critical': return '#ff4d4f';
      case 'offline': return '#bfbfbf';
      default: return '#bfbfbf';
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      online: '在线',
      warning: '警告',
      critical: '紧急',
      offline: '离线',
    };
    return statusMap[status] || status;
  };

  const getMapOption = () => {
    const geoData = nodes.map(node => ({
      name: node.name,
      value: [node.location.longitude, node.location.latitude, 100],
      status: node.status,
      nodeId: node.id,
    }));

    return {
      backgroundColor: '#001529',
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          if (params.data) {
            const node = nodes.find(n => n.id === params.data.nodeId);
            if (node) {
              return `
                <div style="padding: 8px;">
                  <div style="font-weight: bold; margin-bottom: 8px;">${node.name}</div>
                  <div>状态: <span style="color: ${getStatusColor(node.status)}">${getStatusText(node.status)}</span></div>
                  <div>IP: ${node.ip_address}</div>
                  <div>位置: ${node.location.city}, ${node.location.country}</div>
                </div>
              `;
            }
          }
          return params.name;
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: 100,
        inRange: {
          color: ['#52c41a', '#faad14', '#ff4d4f'],
        },
      },
      geo: {
        map: 'world',
        roam: true,
        zoom: 1.2,
        center: [100, 30],
        label: {
          show: false,
        },
        itemStyle: {
          areaColor: '#003166',
          borderColor: '#006699',
        },
        emphasis: {
          itemStyle: {
            areaColor: '#004d80',
          },
        },
      },
      series: [
        {
          name: '边缘节点',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: geoData.map(item => ({
            name: item.name,
            value: item.value,
            status: item.status,
            nodeId: item.nodeId,
          })),
          symbolSize: (value, params) => {
            switch (params.data.status) {
              case 'online': return 18;
              case 'warning': return 22;
              case 'critical': return 26;
              default: return 18;
            }
          },
          itemStyle: {
            color: (params) => getStatusColor(params.data.status),
            shadowBlur: 10,
            shadowColor: (params) => getStatusColor(params.data.status),
          },
          emphasis: {
            label: {
              show: true,
              formatter: '{b}',
              color: '#fff',
            },
          },
        },
        {
          name: '节点脉冲',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: geoData.filter(d => d.status !== 'offline').map(item => ({
            name: item.name,
            value: item.value,
            status: item.status,
            nodeId: item.nodeId,
          })),
          symbolSize: 10,
          showEffectOn: 'render',
          rippleEffect: {
            brushType: 'stroke',
            scale: 4,
          },
          itemStyle: {
            color: (params) => getStatusColor(params.data.status),
            shadowBlur: 10,
            shadowColor: (params) => getStatusColor(params.data.status),
          },
        },
      ],
    };
  };

  const handleNodeClick = async (node) => {
    setSelectedNode(node);
    setLoading(true);
    try {
      const response = await nodeAPI.getStats(node.id);
      setNodeStats(response.data?.stats || {
        cpu_usage: 20 + Math.random() * 60,
        memory_usage: 30 + Math.random() * 50,
        disk_usage: 40 + Math.random() * 40,
        temperature: 35 + Math.random() * 25,
        network_in: Math.random() * 100,
        network_out: Math.random() * 50,
      });
    } catch (error) {
      setNodeStats({
        cpu_usage: 20 + Math.random() * 60,
        memory_usage: 30 + Math.random() * 50,
        disk_usage: 40 + Math.random() * 40,
        temperature: 35 + Math.random() * 25,
        network_in: Math.random() * 100,
        network_out: Math.random() * 50,
      });
    } finally {
      setLoading(false);
      setDetailModalVisible(true);
    }
  };

  const handlePing = async (node) => {
    setPingResults(prev => ({ ...prev, [node.id]: 'pinging' }));
    try {
      const result = await electronAPI.pingNode(node.ip_address);
      setPingResults(prev => ({ ...prev, [node.id]: result }));
    } catch (error) {
      setPingResults(prev => ({ ...prev, [node.id]: { success: false, error: error.message } }));
    }
  };

  const columns = [
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Text strong onClick={() => handleNodeClick(record)} style={{ cursor: 'pointer' }}>
          <span className={`status-dot status-dot-${record.status}`} />
          {text}
        </Text>
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
      title: 'SSH端口',
      dataIndex: 'ssh_port',
      key: 'ssh_port',
    },
    {
      title: '位置',
      key: 'location',
      render: (_, record) => (
        <span>
          <GlobalOutlined style={{ marginRight: 8 }} />
          {record.location?.city}, {record.location?.country}
        </span>
      ),
    },
    {
      title: '延迟',
      key: 'latency',
      render: (_, record) => {
        const result = pingResults[record.id];
        if (result === 'pinging') {
          return <Spin size="small" />;
        }
        if (result?.success) {
          return <Text>{result.latency?.toFixed(1)} ms</Text>;
        }
        return (
          <Button type="link" onClick={() => handlePing(record)}>
            测试
          </Button>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleNodeClick(record)}
          />
          <Button
            type="text"
            icon={<TerminalOutlined />}
            onClick={() => {
              setSelectedNode(record);
              setSshModalVisible(true);
            }}
          />
          <Popconfirm title="确定要删除此节点吗？" onConfirm={() => {}}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>边缘节点地理分布图</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchNodes}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />}>
            添加节点
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总节点数"
              value={nodes.length}
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在线节点"
              value={nodes.filter(n => n.status === 'online').length}
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="警告节点"
              value={nodes.filter(n => n.status === 'warning').length}
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="紧急节点"
              value={nodes.filter(n => n.status === 'critical').length}
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="全球节点分布地图">
            <div className="node-map-container">
              <ReactECharts
                option={getMapOption()}
                style={{ height: '100%', width: '100%' }}
                onEvents={{
                  'click': (params) => {
                    if (params.data && params.data.nodeId) {
                      const node = nodes.find(n => n.id === params.data.nodeId);
                      if (node) {
                        handleNodeClick(node);
                      }
                    }
                  },
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="节点列表">
            <Table
              columns={columns}
              dataSource={nodes}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={`节点详情 - ${selectedNode?.name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="ssh" icon={<TerminalOutlined />} onClick={() => {
            setDetailModalVisible(false);
            setSshModalVisible(true);
          }}>
            SSH连接
          </Button>,
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedNode && (
          <Spin spinning={loading}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="节点名称">{selectedNode.name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(selectedNode.status)}>
                  {getStatusText(selectedNode.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="IP地址">{selectedNode.ip_address}</Descriptions.Item>
              <Descriptions.Item label="SSH端口">{selectedNode.ssh_port}</Descriptions.Item>
              <Descriptions.Item label="SSH用户">{selectedNode.ssh_user}</Descriptions.Item>
              <Descriptions.Item label="标签">
                {selectedNode.tags?.map((tag, i) => (
                  <Tag key={i}>{tag}</Tag>
                ))}
              </Descriptions.Item>
              <Descriptions.Item label="位置" span={2}>
                <GlobalOutlined /> {selectedNode.location?.city}, {selectedNode.location?.country}
                ({selectedNode.location?.latitude}, {selectedNode.location?.longitude})
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedNode.description}
              </Descriptions.Item>
            </Descriptions>

            {nodeStats && (
              <>
                <div style={{ marginTop: 24, marginBottom: 16 }}>
                  <Title level={5}>资源监控</Title>
                </div>
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <div className="metric-card">
                      <Progress
                        type="circle"
                        percent={Math.round(nodeStats.cpu_usage || 0)}
                        strokeColor={
                          nodeStats.cpu_usage > 80 ? '#ff4d4f' :
                          nodeStats.cpu_usage > 60 ? '#faad14' : '#52c41a'
                        }
                      />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>CPU使用率</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="metric-card">
                      <Progress
                        type="circle"
                        percent={Math.round(nodeStats.memory_usage || 0)}
                        strokeColor={
                          nodeStats.memory_usage > 80 ? '#ff4d4f' :
                          nodeStats.memory_usage > 60 ? '#faad14' : '#52c41a'
                        }
                      />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>内存使用率</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="metric-card">
                      <Progress
                        type="circle"
                        percent={Math.round(nodeStats.disk_usage || 0)}
                        strokeColor={
                          nodeStats.disk_usage > 80 ? '#ff4d4f' :
                          nodeStats.disk_usage > 60 ? '#faad14' : '#52c41a'
                        }
                      />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>磁盘使用率</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={6}>
                    <div className="metric-card">
                      <div style={{ fontSize: 32, fontWeight: 'bold', color: 
                        nodeStats.temperature > 70 ? '#ff4d4f' :
                        nodeStats.temperature > 60 ? '#faad14' : '#52c41a'
                      }}>
                        {(nodeStats.temperature || 0).toFixed(1)}°C
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Text strong>温度</Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </>
            )}
          </Spin>
        )}
      </Modal>

      <Modal
        title={`SSH终端 - ${selectedNode?.name}`}
        open={sshModalVisible}
        onCancel={() => setSshModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setSshModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedNode && (
          <>
            <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="主机">{selectedNode.ip_address}</Descriptions.Item>
              <Descriptions.Item label="端口">{selectedNode.ssh_port}</Descriptions.Item>
              <Descriptions.Item label="用户">{selectedNode.ssh_user}</Descriptions.Item>
            </Descriptions>
            <div className="ssh-terminal">
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">连接到 {selectedNode.ip_address}...</Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Welcome to {selectedNode.name}</Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Last login: {new Date().toLocaleString()}</Text>
              </div>
              <div style={{ marginTop: 16 }}>
                <Text>{selectedNode.ssh_user}@{selectedNode.name}:~$ </Text>
                <input
                  className="ssh-terminal-input"
                  placeholder="输入命令..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      console.log('Executing:', e.target.value);
                    }
                  }}
                />
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default NodeMap;
