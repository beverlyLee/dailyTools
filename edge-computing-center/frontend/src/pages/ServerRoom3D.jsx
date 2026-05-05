import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Table,
  Progress,
  Button,
  Modal,
  Descriptions,
  Space,
  Select,
  Tooltip,
  Statistic,
} from 'antd';
import {
  ServerOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  HomeOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text as ThreeText } from '@react-three/drei';
import * as THREE from 'three';

const { Title, Text } = Typography;
const { Option } = Select;

const getStatusColor = (status) => {
  switch (status) {
    case 'online': return '#52c41a';
    case 'warning': return '#faad14';
    case 'critical': return '#ff4d4f';
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

function ServerRack({ position, rackId, servers, onServerClick, selectedServer }) {
  const rackRef = useRef();
  const isHovered = useRef(false);

  useFrame((state) => {
    if (rackRef.current) {
      const time = state.clock.getElapsedTime();
      rackRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0]) * 0.005;
    }
  });

  return (
    <group ref={rackRef} position={position}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 3, 0.8]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.3} />
      </mesh>
      
      <mesh position={[0, 1.5, 0.41]}>
        <boxGeometry args={[1.1, 2.9, 0.02]} />
        <meshStandardMaterial color="#0f0f1a" metalness={0.8} roughness={0.2} />
      </mesh>

      <group position={[0, 0.4, 0.42]}>
        {servers.map((server, index) => (
          <ServerUnit
            key={server.id}
            position={[0, index * 0.32, 0]}
            server={server}
            onClick={() => onServerClick(server)}
            isSelected={selectedServer?.id === server.id}
          />
        ))}
      </group>

      <ThreeText
        position={[0, 3.2, 0.42]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        机架 #{rackId}
      </ThreeText>
    </group>
  );
}

function ServerUnit({ position, server, onClick, isSelected }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const statusColor = getStatusColor(server.status);

  useFrame((state) => {
    if (meshRef.current) {
      if (server.status === 'online') {
        const pulse = (Math.sin(state.clock.getElapsedTime() * 4) + 1) / 2;
        meshRef.current.material.emissive = new THREE.Color(statusColor).multiplyScalar(
          isSelected ? 0.5 : hovered ? 0.3 : pulse * 0.1
        );
      }
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        castShadow
      >
        <boxGeometry args={[1.0, 0.3, 0.2]} />
        <meshStandardMaterial
          color={isSelected ? '#1890ff' : hovered ? '#333355' : '#252540'}
          metalness={0.6}
          roughness={0.3}
          emissive={isSelected ? '#1890ff' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      <mesh position={[-0.35, 0.05, 0.11]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={server.status === 'offline' ? 0 : 1}
        />
      </mesh>

      <mesh position={[-0.25, 0.05, 0.11]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshStandardMaterial
          color={server.cpu_usage > 80 ? '#ff4d4f' : '#52c41a'}
          emissive={server.cpu_usage > 80 ? '#ff4d4f' : '#52c41a'}
          emissiveIntensity={0.8}
        />
      </mesh>

      <ThreeText
        position={[0.1, 0.05, 0.11]}
        fontSize={0.08}
        color="#aaaacc"
        anchorX="left"
        anchorY="middle"
      >
        {server.name}
      </ThreeText>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#0a0a15" metalness={0.8} roughness={0.4} />
    </mesh>
  );
}

function GridOverlay() {
  return (
    <gridHelper args={[30, 30, '#1a1a30', '#101020']} position={[0, 0.01, 0]} />
  );
}

function RoomScene({ onServerClick, selectedServer }) {
  const serverRacks = [
    {
      rackId: 'A01',
      position: [-4, 0, -3],
      servers: [
        { id: 's1', name: 'BJ-WEB-01', status: 'online', cpu_usage: 45, memory_usage: 60 },
        { id: 's2', name: 'BJ-WEB-02', status: 'online', cpu_usage: 32, memory_usage: 45 },
        { id: 's3', name: 'BJ-DB-01', status: 'warning', cpu_usage: 78, memory_usage: 85 },
        { id: 's4', name: 'BJ-CACHE-01', status: 'online', cpu_usage: 15, memory_usage: 30 },
      ],
    },
    {
      rackId: 'A02',
      position: [-1.5, 0, -3],
      servers: [
        { id: 's5', name: 'BJ-WEB-03', status: 'online', cpu_usage: 55, memory_usage: 55 },
        { id: 's6', name: 'BJ-WEB-04', status: 'online', cpu_usage: 42, memory_usage: 50 },
        { id: 's7', name: 'BJ-API-01', status: 'critical', cpu_usage: 92, memory_usage: 90 },
        { id: 's8', name: 'BJ-MQ-01', status: 'online', cpu_usage: 25, memory_usage: 35 },
      ],
    },
    {
      rackId: 'B01',
      position: [1.5, 0, -3],
      servers: [
        { id: 's9', name: 'SH-WEB-01', status: 'online', cpu_usage: 38, memory_usage: 48 },
        { id: 's10', name: 'SH-WEB-02', status: 'online', cpu_usage: 45, memory_usage: 52 },
        { id: 's11', name: 'SH-DB-01', status: 'online', cpu_usage: 60, memory_usage: 70 },
        { id: 's12', name: 'SH-CACHE-01', status: 'online', cpu_usage: 20, memory_usage: 28 },
      ],
    },
    {
      rackId: 'B02',
      position: [4, 0, -3],
      servers: [
        { id: 's13', name: 'SG-WEB-01', status: 'online', cpu_usage: 50, memory_usage: 55 },
        { id: 's14', name: 'SG-API-01', status: 'online', cpu_usage: 65, memory_usage: 60 },
        { id: 's15', name: 'SG-DB-01', status: 'offline', cpu_usage: 0, memory_usage: 0 },
        { id: 's16', name: 'SG-CACHE-01', status: 'online', cpu_usage: 30, memory_usage: 40 },
      ],
    },
  ];

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 10, 12]} fov={50} />
      <OrbitControls
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={5}
        maxDistance={30}
      />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} />
      
      <Environment preset="city" />
      
      <Floor />
      <GridOverlay />
      
      {serverRacks.map((rack) => (
        <ServerRack
          key={rack.rackId}
          rackId={rack.rackId}
          position={rack.position}
          servers={rack.servers}
          onServerClick={onServerClick}
          selectedServer={selectedServer}
        />
      ))}
    </>
  );
}

function ServerRoom3D() {
  const [selectedServer, setSelectedServer] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [cameraView, setCameraView] = useState('default');

  const allServers = [
    { id: 's1', name: 'BJ-WEB-01', rack: 'A01', status: 'online', cpu_usage: 45, memory_usage: 60, ip: '192.168.1.10', uptime: '15天 3小时' },
    { id: 's2', name: 'BJ-WEB-02', rack: 'A01', status: 'online', cpu_usage: 32, memory_usage: 45, ip: '192.168.1.11', uptime: '15天 3小时' },
    { id: 's3', name: 'BJ-DB-01', rack: 'A01', status: 'warning', cpu_usage: 78, memory_usage: 85, ip: '192.168.1.12', uptime: '15天 3小时' },
    { id: 's4', name: 'BJ-CACHE-01', rack: 'A01', status: 'online', cpu_usage: 15, memory_usage: 30, ip: '192.168.1.13', uptime: '15天 3小时' },
    { id: 's5', name: 'BJ-WEB-03', rack: 'A02', status: 'online', cpu_usage: 55, memory_usage: 55, ip: '192.168.1.20', uptime: '12天 8小时' },
    { id: 's6', name: 'BJ-WEB-04', rack: 'A02', status: 'online', cpu_usage: 42, memory_usage: 50, ip: '192.168.1.21', uptime: '12天 8小时' },
    { id: 's7', name: 'BJ-API-01', rack: 'A02', status: 'critical', cpu_usage: 92, memory_usage: 90, ip: '192.168.1.22', uptime: '12天 8小时' },
    { id: 's8', name: 'BJ-MQ-01', rack: 'A02', status: 'online', cpu_usage: 25, memory_usage: 35, ip: '192.168.1.23', uptime: '12天 8小时' },
    { id: 's9', name: 'SH-WEB-01', rack: 'B01', status: 'online', cpu_usage: 38, memory_usage: 48, ip: '192.168.2.10', uptime: '20天 2小时' },
    { id: 's10', name: 'SH-WEB-02', rack: 'B01', status: 'online', cpu_usage: 45, memory_usage: 52, ip: '192.168.2.11', uptime: '20天 2小时' },
    { id: 's11', name: 'SH-DB-01', rack: 'B01', status: 'online', cpu_usage: 60, memory_usage: 70, ip: '192.168.2.12', uptime: '20天 2小时' },
    { id: 's12', name: 'SH-CACHE-01', rack: 'B01', status: 'online', cpu_usage: 20, memory_usage: 28, ip: '192.168.2.13', uptime: '20天 2小时' },
    { id: 's13', name: 'SG-WEB-01', rack: 'B02', status: 'online', cpu_usage: 50, memory_usage: 55, ip: '192.168.3.10', uptime: '7天 5小时' },
    { id: 's14', name: 'SG-API-01', rack: 'B02', status: 'online', cpu_usage: 65, memory_usage: 60, ip: '192.168.3.11', uptime: '7天 5小时' },
    { id: 's15', name: 'SG-DB-01', rack: 'B02', status: 'offline', cpu_usage: 0, memory_usage: 0, ip: '192.168.3.12', uptime: '0' },
    { id: 's16', name: 'SG-CACHE-01', rack: 'B02', status: 'online', cpu_usage: 30, memory_usage: 40, ip: '192.168.3.13', uptime: '7天 5小时' },
  ];

  const handleServerClick = (server) => {
    const fullServer = allServers.find(s => s.id === server.id);
    if (fullServer) {
      setSelectedServer(fullServer);
      setDetailModalVisible(true);
    }
  };

  const columns = [
    {
      title: '服务器名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Text strong onClick={() => handleServerClick(record)} style={{ cursor: 'pointer' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '机架',
      dataIndex: 'rack',
      key: 'rack',
      render: (rack) => <Tag color="blue">#{rack}</Tag>,
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
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: 'CPU使用率',
      dataIndex: 'cpu_usage',
      key: 'cpu_usage',
      render: (value) => (
        <Progress
          percent={value}
          size="small"
          strokeColor={
            value > 80 ? '#ff4d4f' : value > 60 ? '#faad14' : '#52c41a'
          }
        />
      ),
    },
    {
      title: '内存使用率',
      dataIndex: 'memory_usage',
      key: 'memory_usage',
      render: (value) => (
        <Progress
          percent={value}
          size="small"
          strokeColor={
            value > 80 ? '#ff4d4f' : value > 60 ? '#faad14' : '#52c41a'
          }
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleServerClick(record)}
        />
      ),
    },
  ];

  const stats = [
    { label: '总服务器', value: allServers.length, icon: <ServerOutlined />, color: '#1890ff' },
    { label: '在线', value: allServers.filter(s => s.status === 'online').length, color: '#52c41a' },
    { label: '警告', value: allServers.filter(s => s.status === 'warning').length, color: '#faad14' },
    { label: '离线/紧急', value: allServers.filter(s => s.status === 'critical' || s.status === 'offline').length, color: '#ff4d4f' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>3D机房视图</Title>
        <Space>
          <Select
            value={cameraView}
            onChange={setCameraView}
            style={{ width: 150 }}
          >
            <Option value="default">默认视图</Option>
            <Option value="top">俯视图</Option>
            <Option value="front">正视图</Option>
            <Option value="side">侧视图</Option>
          </Select>
          <Button icon={<ZoomInOutlined />}>放大</Button>
          <Button icon={<ZoomOutOutlined />}>缩小</Button>
          <Button icon={<HomeOutlined />}>重置</Button>
          <Button icon={<ReloadOutlined />}>刷新</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {stats.map((stat, index) => (
          <Col span={6} key={index}>
            <Card>
              <Statistic
                title={stat.label}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <div className="three-container">
              <Canvas shadows>
                <RoomScene
                  onServerClick={handleServerClick}
                  selectedServer={selectedServer}
                />
              </Canvas>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="服务器列表">
            <Table
              columns={columns}
              dataSource={allServers}
              rowKey="id"
              pagination={{ pageSize: 8 }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={`服务器详情 - ${selectedServer?.name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedServer && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="服务器名称">{selectedServer.name}</Descriptions.Item>
              <Descriptions.Item label="所在机架">
                <Tag color="blue">#{selectedServer.rack}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="IP地址">{selectedServer.ip}</Descriptions.Item>
              <Descriptions.Item label="运行时间">{selectedServer.uptime}</Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={getStatusColor(selectedServer.status)}>
                  {getStatusText(selectedServer.status)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Title level={5}>资源使用情况</Title>
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Card size="small" title="CPU使用率">
                    <Progress
                      type="circle"
                      percent={selectedServer.cpu_usage}
                      strokeColor={
                        selectedServer.cpu_usage > 80 ? '#ff4d4f' :
                        selectedServer.cpu_usage > 60 ? '#faad14' : '#52c41a'
                      }
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="内存使用率">
                    <Progress
                      type="circle"
                      percent={selectedServer.memory_usage}
                      strokeColor={
                        selectedServer.memory_usage > 80 ? '#ff4d4f' :
                        selectedServer.memory_usage > 60 ? '#faad14' : '#52c41a'
                      }
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default ServerRoom3D;
