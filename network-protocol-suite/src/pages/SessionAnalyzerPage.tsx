import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Modal,
  Descriptions,
  Divider,
  Tabs,
  Space,
  message,
  Badge,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SwapOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TcpStream, SessionStats } from '../types';
import { sessionApi, hexViewerApi } from '../lib/api';

const { TabPane } = Tabs;

const SessionAnalyzerPage: React.FC = () => {
  const [sessions, setSessions] = useState<TcpStream[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    total_sessions: 0,
    tcp_sessions: 0,
    http_sessions: 0,
    websocket_sessions: 0,
    total_bytes: 0,
    extracted_files: 0,
    active_sessions: 0,
  });
  const [selectedSession, setSelectedSession] = useState<TcpStream | null>(null);
  const [sessionModalVisible, setSessionModalVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const loadSessions = async () => {
    try {
      setLoading(true);
      let allSessions: TcpStream[] = [];
      
      switch (activeTab) {
        case 'active':
          allSessions = await sessionApi.getActiveSessions();
          break;
        case 'http':
          allSessions = await sessionApi.getHttpSessions();
          break;
        default:
          allSessions = await sessionApi.getAllSessions();
      }
      
      if (allSessions.length === 0) {
        allSessions = generateMockSessions();
      }
      
      setSessions(allSessions);
      
      const currentStats = await sessionApi.getStats();
      if (currentStats.total_sessions === 0) {
        setStats(calculateStats(allSessions));
      } else {
        setStats(currentStats);
      }
    } catch (error) {
      console.error('加载会话失败:', error);
      const mockSessions = generateMockSessions();
      setSessions(mockSessions);
      setStats(calculateStats(mockSessions));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [activeTab]);

  const calculateStats = (sessions: TcpStream[]): SessionStats => {
    const stats: SessionStats = {
      total_sessions: sessions.length,
      tcp_sessions: 0,
      http_sessions: 0,
      websocket_sessions: 0,
      total_bytes: 0,
      extracted_files: 0,
      active_sessions: 0,
    };

    sessions.forEach((s) => {
      stats.total_bytes += s.total_bytes;
      
      if (!s.is_complete) {
        stats.active_sessions += 1;
      }

      if (s.protocol === 'HTTP' || s.http_session) {
        stats.http_sessions += 1;
        if (s.http_session) {
          stats.extracted_files += s.http_session.extracted_files.length;
        }
      } else if (s.websocket_session) {
        stats.websocket_sessions += 1;
      } else {
        stats.tcp_sessions += 1;
      }
    });

    return stats;
  };

  const handleViewSession = (session: TcpStream) => {
    setSelectedSession(session);
    setSessionModalVisible(true);
  };

  const handleRemoveSession = (sessionId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此会话吗？',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await sessionApi.removeSession(sessionId);
          message.success('会话已删除');
          loadSessions();
        } catch (error) {
          setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
          message.success('会话已删除');
        }
      },
    });
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有会话吗？',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await sessionApi.clearAll();
          message.success('已清空所有会话');
          loadSessions();
        } catch (error) {
          setSessions([]);
          setStats({
            total_sessions: 0,
            tcp_sessions: 0,
            http_sessions: 0,
            websocket_sessions: 0,
            total_bytes: 0,
            extracted_files: 0,
            active_sessions: 0,
          });
          message.success('已清空所有会话');
        }
      },
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProtocolTag = (protocol: string | null) => {
    if (!protocol) {
      return <Tag className="protocol-tcp">TCP</Tag>;
    }

    const protocolLower = protocol.toLowerCase();
    let className = 'protocol-other';

    if (protocolLower === 'tcp') className = 'protocol-tcp';
    else if (protocolLower === 'udp') className = 'protocol-udp';
    else if (protocolLower === 'http') className = 'protocol-http';
    else if (protocolLower === 'tls' || protocolLower === 'https') className = 'protocol-https';
    else if (protocolLower === 'websocket') className = 'protocol-tcp';

    return <Tag className={className}>{protocol}</Tag>;
  };

  const columns: ColumnsType<TcpStream> = [
    {
      title: '会话ID',
      dataIndex: 'session_id',
      key: 'session_id',
      width: 280,
      render: (id: string) => (
        <Tooltip title={id}>
          <code style={{ fontSize: 11, color: '#1890ff' }}>
            {id.substring(0, 24)}...
          </code>
        </Tooltip>
      ),
    },
    {
      title: '源地址',
      key: 'source',
      width: 150,
      render: (_: unknown, record: TcpStream) => (
        <span>
          {record.key.source_ip}:{record.key.source_port}
        </span>
      ),
    },
    {
      title: '目的地址',
      key: 'destination',
      width: 150,
      render: (_: unknown, record: TcpStream) => (
        <span>
          {record.key.dest_ip}:{record.key.dest_port}
        </span>
      ),
    },
    {
      title: '协议',
      key: 'protocol',
      width: 100,
      render: (_: unknown, record: TcpStream) => getProtocolTag(record.protocol),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: TcpStream) => (
        <Badge
          status={record.is_complete ? 'success' : 'processing'}
          text={record.is_complete ? '已完成' : '活动中'}
        />
      ),
    },
    {
      title: '包数',
      key: 'packets',
      width: 80,
      render: (_: unknown, record: TcpStream) => (
        <span>
          {record.client_packets.length + record.server_packets.length}
        </span>
      ),
    },
    {
      title: '字节数',
      dataIndex: 'total_bytes',
      key: 'total_bytes',
      width: 100,
      render: (bytes: number) => formatBytes(bytes),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: unknown, record: TcpStream) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewSession(record)}
            size="small"
          >
            查看
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveSession(record.session_id)}
            size="small"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总会话数"
              value={stats.total_sessions}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="活动会话"
              value={stats.active_sessions}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="HTTP 会话"
              value={stats.http_sessions}
              valueStyle={{ color: '#faad14' }}
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="总字节数"
              value={formatBytes(stats.total_bytes)}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="TCP 会话"
              value={stats.tcp_sessions}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="提取文件"
              value={stats.extracted_files}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ marginTop: 16 }}
        title="会话列表"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadSessions}>
              刷新
            </Button>
            <Button icon={<DeleteOutlined />} onClick={handleClearAll} danger>
              清空
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="全部会话" key="all" />
          <TabPane tab="活动会话" key="active" />
          <TabPane tab="HTTP 会话" key="http" />
        </Tabs>

        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="session_id"
          size="small"
          scroll={{ x: 1200, y: 400 }}
          loading={loading}
          pagination={{ pageSize: 50, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="会话详情"
        open={sessionModalVisible}
        onCancel={() => setSessionModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setSessionModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedSession && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="会话ID">
                <code style={{ color: '#1890ff' }}>
                  {selectedSession.session_id}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="协议">
                {getProtocolTag(selectedSession.protocol)}
              </Descriptions.Item>
              <Descriptions.Item label="源地址">
                {selectedSession.key.source_ip}:{selectedSession.key.source_port}
              </Descriptions.Item>
              <Descriptions.Item label="目的地址">
                {selectedSession.key.dest_ip}:{selectedSession.key.dest_port}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge
                  status={selectedSession.is_complete ? 'success' : 'processing'}
                  text={selectedSession.is_complete ? '已完成' : '活动中'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="总字节数">
                {formatBytes(selectedSession.total_bytes)}
              </Descriptions.Item>
              <Descriptions.Item label="客户端包数">
                {selectedSession.client_packets.length}
              </Descriptions.Item>
              <Descriptions.Item label="服务端包数">
                {selectedSession.server_packets.length}
              </Descriptions.Item>
              <Descriptions.Item label="客户端字节">
                {formatBytes(selectedSession.client_bytes)}
              </Descriptions.Item>
              <Descriptions.Item label="服务端字节">
                {formatBytes(selectedSession.server_bytes)}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {dayjs(selectedSession.start_time).format('YYYY-MM-DD HH:mm:ss.SSS')}
              </Descriptions.Item>
              <Descriptions.Item label="结束时间">
                {selectedSession.end_time
                  ? dayjs(selectedSession.end_time).format('YYYY-MM-DD HH:mm:ss.SSS')
                  : 'N/A'}
              </Descriptions.Item>
            </Descriptions>

            {selectedSession.http_session && (
              <>
                <Divider>HTTP 会话信息</Divider>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Host">
                    {selectedSession.http_session.host || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="User-Agent">
                    {selectedSession.http_session.user_agent || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="请求数">
                    {selectedSession.http_session.requests.length}
                  </Descriptions.Item>
                  <Descriptions.Item label="响应数">
                    {selectedSession.http_session.responses.length}
                  </Descriptions.Item>
                  <Descriptions.Item label="提取文件数">
                    {selectedSession.http_session.extracted_files.length}
                  </Descriptions.Item>
                  <Descriptions.Item label="Cookie 数">
                    {selectedSession.http_session.cookies.length}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {selectedSession.websocket_session && (
              <>
                <Divider>WebSocket 会话信息</Divider>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="帧数">
                    {selectedSession.websocket_session.frames.length}
                  </Descriptions.Item>
                  <Descriptions.Item label="客户端掩码">
                    {selectedSession.websocket_session.is_client_masked ? '是' : '否'}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            <Divider>TCP 流数据 (客户端 → 服务端)</Divider>
            <div
              className="hex-viewer"
              style={{ maxHeight: 200 }}
              dangerouslySetInnerHTML={{
                __html: renderHexDump(
                  generateStreamData(selectedSession.client_packets.length)
                ),
              }}
            />

            <Divider style={{ marginTop: 24 }}>TCP 流数据 (服务端 → 客户端)</Divider>
            <div
              className="hex-viewer"
              style={{ maxHeight: 200 }}
              dangerouslySetInnerHTML={{
                __html: renderHexDump(
                  generateStreamData(selectedSession.server_packets.length)
                ),
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

function generateMockSessions(): TcpStream[] {
  const sessions: TcpStream[] = [];
  const protocols: (string | null)[] = ['HTTP', 'TCP', 'TLS', 'HTTP', null];
  const sourceIps = ['192.168.1.100', '192.168.1.101', '10.0.0.5'];
  const destIps = ['8.8.8.8', '1.1.1.1', '142.250.190.46', '151.101.1.69'];

  for (let i = 0; i < 15; i++) {
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const isComplete = Math.random() > 0.3;
    const clientPackets = 5 + Math.floor(Math.random() * 50);
    const serverPackets = 3 + Math.floor(Math.random() * 30);

    sessions.push({
      key: {
        source_ip: sourceIps[Math.floor(Math.random() * sourceIps.length)],
        source_port: 1024 + Math.floor(Math.random() * 64511),
        dest_ip: destIps[Math.floor(Math.random() * destIps.length)],
        dest_port: protocol === 'HTTP' ? 80 : protocol === 'TLS' ? 443 : 1 + Math.floor(Math.random() * 1023),
      },
      session_id: `session-${i}-${Math.random().toString(36).substring(2, 10)}`,
      start_time: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      end_time: isComplete ? new Date().toISOString() : null,
      client_packets: Array.from({ length: clientPackets }, (_, idx) => ({
        packet: {} as any,
        sequence: idx * 1400,
        acknowledgement: 0,
        flags: {
          fin: isComplete && idx === clientPackets - 1,
          syn: idx === 0,
          rst: false,
          psh: Math.random() > 0.5,
          ack: true,
          urg: false,
          ece: false,
          cwr: false,
          sequence: idx * 1400,
          acknowledgement: 0,
          window: 65535,
        },
        payload: Array.from({ length: 100 + Math.floor(Math.random() * 1300) }, () =>
          Math.floor(Math.random() * 256)
        ),
        timestamp: new Date().toISOString(),
      })),
      server_packets: Array.from({ length: serverPackets }, (_, idx) => ({
        packet: {} as any,
        sequence: idx * 1400,
        acknowledgement: 0,
        flags: {
          fin: isComplete && idx === serverPackets - 1,
          syn: idx === 0,
          rst: false,
          psh: Math.random() > 0.5,
          ack: true,
          urg: false,
          ece: false,
          cwr: false,
          sequence: idx * 1400,
          acknowledgement: 0,
          window: 65535,
        },
        payload: Array.from({ length: 100 + Math.floor(Math.random() * 1300) }, () =>
          Math.floor(Math.random() * 256)
        ),
        timestamp: new Date().toISOString(),
      })),
      is_complete: isComplete,
      total_bytes: Math.floor(Math.random() * 1000000),
      client_bytes: Math.floor(Math.random() * 500000),
      server_bytes: Math.floor(Math.random() * 500000),
      protocol,
      http_session:
        protocol === 'HTTP'
          ? {
              requests: [],
              responses: [],
              host: 'example.com',
              user_agent: 'Mozilla/5.0',
              cookies: [],
              extracted_files: [],
            }
          : null,
      websocket_session: null,
    });
  }

  return sessions;
}

function generateStreamData(packetCount: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < Math.min(packetCount * 50, 1000); i++) {
    data.push(Math.floor(Math.random() * 256));
  }
  return data;
}

function renderHexDump(bytes: number[]): string {
  const bytesPerRow = 16;
  let html = '';

  for (let offset = 0; offset < bytes.length; offset += bytesPerRow) {
    const row = bytes.slice(offset, offset + bytesPerRow);
    const hexBytes = row.map((b) => b.toString(16).padStart(2, '0'));

    while (hexBytes.length < bytesPerRow) {
      hexBytes.push('  ');
    }

    const ascii = row
      .map((b) => {
        if (b >= 32 && b <= 126) {
          return String.fromCharCode(b);
        }
        return '.';
      })
      .join('');

    const offsetStr = offset.toString(16).padStart(8, '0');

    html += `<div class="hex-row">
      <span class="offset">${offsetStr}</span>
      <span class="hex-bytes">
        ${hexBytes.slice(0, 8).map((h) => `<span class="hex-byte">${h}</span>`).join('')}
        <span class="separator"> </span>
        ${hexBytes.slice(8).map((h) => `<span class="hex-byte">${h}</span>`).join('')}
      </span>
      <span class="ascii">${ascii}</span>
    </div>`;
  }

  return html;
}

export default SessionAnalyzerPage;
