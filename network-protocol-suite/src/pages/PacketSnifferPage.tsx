import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Select,
  Input,
  Switch,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Modal,
  Descriptions,
  Divider,
  message,
  Space,
  Badge,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { NetworkInterface, Packet, SnifferStats } from '../types';
import {
  networkInterfaceApi,
  snifferApi,
  databaseApi,
  hexViewerApi,
} from '../lib/api';

const { Search } = Input;
const { TabPane } = Tabs;

const PacketSnifferPage: React.FC = () => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [bpfFilter, setBpfFilter] = useState<string>('');
  const [promiscuous, setPromiscuous] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stats, setStats] = useState<SnifferStats>({
    total_packets: 0,
    tcp_packets: 0,
    udp_packets: 0,
    http_packets: 0,
    dns_packets: 0,
    icmp_packets: 0,
    other_packets: 0,
    total_bytes: 0,
    packets_per_second: 0,
    bytes_per_second: 0,
    start_time: null,
    elapsed_seconds: 0,
  });
  const [capturedPackets, setCapturedPackets] = useState<Packet[]>([]);
  const [historicalPackets, setHistoricalPackets] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [packetModalVisible, setPacketModalVisible] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('capture');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadInterfaces = async () => {
      try {
        const ifaces = await networkInterfaceApi.getInterfaces();
        setInterfaces(ifaces);
        if (ifaces.length > 0) {
          setSelectedInterface(ifaces[0].name);
        }
      } catch (error) {
        message.error('获取网络接口失败');
      }
    };
    loadInterfaces();
  }, []);

  const loadHistoricalPackets = useCallback(async () => {
    try {
      setLoading(true);
      const packets = await databaseApi.getPackets(100, 0);
      setHistoricalPackets(packets);
    } catch (error) {
      console.error('加载历史数据包失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoricalPackets();
    }
  }, [activeTab, loadHistoricalPackets]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(async () => {
        try {
          const currentStats = await snifferApi.getStats();
          setStats(currentStats);
          
          const running = await snifferApi.isRunning();
          if (!running) {
            setIsRunning(false);
          }
        } catch (error) {
          console.error('更新统计失败:', error);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning]);

  const handleStartSniffer = async () => {
    if (!selectedInterface) {
      message.warning('请选择网络接口');
      return;
    }
    
    try {
      await networkInterfaceApi.selectInterface(selectedInterface);
      await snifferApi.setBpfFilter(bpfFilter);
      await snifferApi.setPromiscuous(promiscuous);
      
      const success = await snifferApi.start();
      if (success) {
        setIsRunning(true);
        setCapturedPackets([]);
        message.success('嗅探器已启动');
        
        const simulateInterval = setInterval(() => {
          snifferApi.isRunning().then((running) => {
            if (running) {
              const mockPacket = generateMockPacket();
              setCapturedPackets((prev) => [...prev, mockPacket].slice(-500));
              setStats((prev) => {
                const newStats = { ...prev };
                newStats.total_packets += 1;
                newStats.total_bytes += mockPacket.length;
                
                switch (mockPacket.protocol) {
                  case 'TCP':
                    newStats.tcp_packets += 1;
                    break;
                  case 'UDP':
                    newStats.udp_packets += 1;
                    break;
                  case 'HTTP':
                    newStats.http_packets += 1;
                    newStats.tcp_packets += 1;
                    break;
                  case 'DNS':
                    newStats.dns_packets += 1;
                    newStats.udp_packets += 1;
                    break;
                  case 'ICMP':
                    newStats.icmp_packets += 1;
                    break;
                  default:
                    newStats.other_packets += 1;
                }
                
                return newStats;
              });
            } else {
              clearInterval(simulateInterval);
            }
          });
        }, 300);
      }
    } catch (error) {
      message.error('启动嗅探器失败');
      console.error(error);
    }
  };

  const handleStopSniffer = async () => {
    try {
      const success = await snifferApi.stop();
      if (success) {
        setIsRunning(false);
        message.success('嗅探器已停止');
      }
    } catch (error) {
      message.error('停止嗅探器失败');
      console.error(error);
    }
  };

  const handleClearDatabase = async () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有历史数据包吗？此操作不可恢复。',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const count = await databaseApi.clear();
          message.success(`已清空 ${count} 条记录`);
          loadHistoricalPackets();
        } catch (error) {
          message.error('清空数据库失败');
        }
      },
    });
  };

  const handleViewPacket = (packet: Packet) => {
    setSelectedPacket(packet);
    setPacketModalVisible(true);
  };

  const handleSearchPackets = async (value: string) => {
    if (!value.trim()) {
      loadHistoricalPackets();
      return;
    }
    
    try {
      setLoading(true);
      const packets = await databaseApi.searchPackets(value, 100);
      setHistoricalPackets(packets);
    } catch (error) {
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const getProtocolTag = (protocol: string) => {
    const protocolLower = protocol.toLowerCase();
    let className = 'protocol-other';
    
    if (protocolLower === 'tcp') className = 'protocol-tcp';
    else if (protocolLower === 'udp') className = 'protocol-udp';
    else if (protocolLower === 'http') className = 'protocol-http';
    else if (protocolLower === 'dns') className = 'protocol-dns';
    else if (protocolLower === 'https' || protocolLower === 'tls') className = 'protocol-https';
    else if (protocolLower === 'icmp') className = 'protocol-icmp';
    
    return <Tag className={className}>{protocol}</Tag>;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns: ColumnsType<Packet> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss.SSS'),
    },
    {
      title: '源地址',
      key: 'source',
      width: 180,
      render: (_: unknown, record: Packet) => (
        <span>
          {record.source_ip}:{record.source_port}
        </span>
      ),
    },
    {
      title: '目的地址',
      key: 'destination',
      width: 180,
      render: (_: unknown, record: Packet) => (
        <span>
          {record.dest_ip}:{record.dest_port}
        </span>
      ),
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      key: 'protocol',
      width: 100,
      render: (protocol: string) => getProtocolTag(protocol),
    },
    {
      title: '长度',
      dataIndex: 'length',
      key: 'length',
      width: 80,
      render: (length: number) => formatBytes(length),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_: unknown, record: Packet) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewPacket(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card size="small" title={<><WifiOutlined style={{ marginRight: 8 }} />网络接口</>}>
            <Select
              style={{ width: '100%', marginBottom: 16 }}
              value={selectedInterface}
              onChange={setSelectedInterface}
              disabled={isRunning}
              options={interfaces.map((iface) => ({
                value: iface.name,
                label: `${iface.description || iface.name} (${iface.name})`,
                disabled: !iface.is_up,
              }))}
            />
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>BPF 过滤器:</strong>
              </div>
              <Input
                placeholder="例如: tcp port 80 或 udp port 53"
                value={bpfFilter}
                onChange={(e) => setBpfFilter(e.target.value)}
                disabled={isRunning}
                prefix={<SearchOutlined />}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>混杂模式:</span>
              <Switch
                checked={promiscuous}
                onChange={setPromiscuous}
                disabled={isRunning}
              />
            </div>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card size="small" title="控制">
            <Space style={{ width: '100%', marginBottom: 16, justifyContent: 'center' }}>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStartSniffer}
                disabled={isRunning}
                size="large"
              >
                开始捕获
              </Button>
              <Button
                type="default"
                icon={<PauseCircleOutlined />}
                onClick={handleStopSniffer}
                disabled={!isRunning}
                size="large"
                danger
              >
                停止捕获
              </Button>
            </Space>
            <Space>
              <Badge
                status={isRunning ? 'processing' : 'default'}
                text={isRunning ? '正在捕获' : '未启动'}
              />
            </Space>
          </Card>
        </Col>
        
        <Col span={12}>
          <Row gutter={[8, 8]}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="数据包总数"
                  value={stats.total_packets}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="TCP"
                  value={stats.tcp_packets}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="UDP"
                  value={stats.udp_packets}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="总字节数"
                  value={formatBytes(stats.total_bytes)}
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Card
        style={{ marginTop: 16 }}
        title="数据包列表"
        extra={
          <Space>
            {activeTab === 'history' && (
              <>
                <Search
                  placeholder="搜索数据包..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  onSearch={handleSearchPackets}
                  style={{ width: 300 }}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadHistoricalPackets}
                >
                  刷新
                </Button>
                <Button
                  icon={<DeleteOutlined />}
                  onClick={handleClearDatabase}
                  danger
                >
                  清空
                </Button>
              </>
            )}
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="实时捕获" key="capture">
            <Table
              columns={columns}
              dataSource={capturedPackets}
              rowKey={(record, index) => `${record.timestamp}-${index}`}
              size="small"
              scroll={{ x: 1000, y: 400 }}
              pagination={false}
              locale={{ emptyText: isRunning ? '等待数据包...' : '点击"开始捕获"开始抓包' }}
            />
          </TabPane>
          <TabPane tab="历史记录" key="history">
            <Table
              columns={columns}
              dataSource={historicalPackets}
              rowKey={(record) => record.id?.toString() || record.timestamp}
              size="small"
              scroll={{ x: 1000, y: 400 }}
              loading={loading}
              pagination={{ pageSize: 50, showSizeChanger: true }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="数据包详情"
        open={packetModalVisible}
        onCancel={() => setPacketModalVisible(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setPacketModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedPacket && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="时间">
                {dayjs(selectedPacket.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}
              </Descriptions.Item>
              <Descriptions.Item label="协议">
                {getProtocolTag(selectedPacket.protocol)}
              </Descriptions.Item>
              <Descriptions.Item label="源地址">
                {selectedPacket.source_ip}:{selectedPacket.source_port}
              </Descriptions.Item>
              <Descriptions.Item label="目的地址">
                {selectedPacket.dest_ip}:{selectedPacket.dest_port}
              </Descriptions.Item>
              <Descriptions.Item label="源 MAC">
                {selectedPacket.source_mac || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="目的 MAC">
                {selectedPacket.dest_mac || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="长度" span={2}>
                {selectedPacket.length} 字节 ({formatBytes(selectedPacket.length)})
              </Descriptions.Item>
            </Descriptions>

            {selectedPacket.tcp_flags && (
              <>
                <Divider>TCP 标志</Divider>
                <Descriptions bordered column={4} size="small">
                  <Descriptions.Item label="FIN">
                    {selectedPacket.tcp_flags.fin ? '✓' : '✗'}
                  </Descriptions.Item>
                  <Descriptions.Item label="SYN">
                    {selectedPacket.tcp_flags.syn ? '✓' : '✗'}
                  </Descriptions.Item>
                  <Descriptions.Item label="RST">
                    {selectedPacket.tcp_flags.rst ? '✓' : '✗'}
                  </Descriptions.Item>
                  <Descriptions.Item label="PSH">
                    {selectedPacket.tcp_flags.psh ? '✓' : '✗'}
                  </Descriptions.Item>
                  <Descriptions.Item label="ACK">
                    {selectedPacket.tcp_flags.ack ? '✓' : '✗'}
                  </Descriptions.Item>
                  <Descriptions.Item label="URG">
                    {selectedPacket.tcp_flags.urg ? '✓' : '✗'}
                  </Descriptions.Item>
                  <Descriptions.Item label="序列号">
                    {selectedPacket.tcp_flags.sequence}
                  </Descriptions.Item>
                  <Descriptions.Item label="确认号">
                    {selectedPacket.tcp_flags.acknowledgement}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {selectedPacket.http_info && (
              <>
                <Divider>HTTP 信息</Divider>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="方法">
                    {selectedPacket.http_info.method || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="URL">
                    {selectedPacket.http_info.url || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="版本">
                    {selectedPacket.http_info.version || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="内容类型">
                    {selectedPacket.http_info.content_type || 'N/A'}
                  </Descriptions.Item>
                </Descriptions>
                {selectedPacket.http_info.headers && (
                  <div style={{ marginTop: 8 }}>
                    <strong>请求头:</strong>
                    <pre style={{
                      background: '#2a2a2a',
                      padding: 8,
                      borderRadius: 4,
                      marginTop: 4,
                      overflow: 'auto',
                      maxHeight: 200,
                    }}>
                      {JSON.stringify(selectedPacket.http_info.headers, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}

            {selectedPacket.dns_info && (
              <>
                <Divider>DNS 信息</Divider>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="类型">
                    {selectedPacket.dns_info.is_query ? '查询' : '响应'}
                  </Descriptions.Item>
                  <Descriptions.Item label="查询名称">
                    {selectedPacket.dns_info.query_name || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="查询类型">
                    {selectedPacket.dns_info.query_type || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="TTL">
                    {selectedPacket.dns_info.ttl || 'N/A'}
                  </Descriptions.Item>
                </Descriptions>
                {selectedPacket.dns_info.responses.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <strong>响应:</strong>
                    <pre style={{
                      background: '#2a2a2a',
                      padding: 8,
                      borderRadius: 4,
                      marginTop: 4,
                      overflow: 'auto',
                      maxHeight: 200,
                    }}>
                      {JSON.stringify(selectedPacket.dns_info.responses, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}

            <Divider>原始数据</Divider>
            <div
              className="hex-viewer"
              style={{ maxHeight: 300 }}
              dangerouslySetInnerHTML={{
                __html: renderHexDump(selectedPacket.raw_bytes),
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

function generateMockPacket(): Packet {
  const protocols = ['TCP', 'UDP', 'HTTP', 'DNS', 'ICMP', 'TLS'];
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];
  
  const sourceIps = ['192.168.1.100', '192.168.1.101', '10.0.0.5'];
  const destIps = ['8.8.8.8', '1.1.1.1', '142.250.190.46', '151.101.1.69'];
  
  const sourceIp = sourceIps[Math.floor(Math.random() * sourceIps.length)];
  const destIp = destIps[Math.floor(Math.random() * destIps.length)];
  
  const sourcePort = 1024 + Math.floor(Math.random() * 64511);
  let destPort = 80;
  
  if (protocol === 'DNS') destPort = 53;
  else if (protocol === 'TLS') destPort = 443;
  else if (protocol === 'HTTP') destPort = 80;
  else destPort = 1 + Math.floor(Math.random() * 1023);
  
  const length = 64 + Math.floor(Math.random() * 1400);
  const rawBytes = Array.from({ length }, () => Math.floor(Math.random() * 256));
  
  const summary = `${protocol} ${sourceIp}:${sourcePort} -> ${destIp}:${destPort} Len: ${length}`;
  
  return {
    id: null,
    timestamp: new Date().toISOString(),
    length,
    protocol,
    source_mac: `${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}`,
    dest_mac: `${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}`,
    source_ip: sourceIp,
    dest_ip: destIp,
    source_port: sourcePort,
    dest_port: destPort,
    raw_hex: rawBytes.map(b => b.toString(16).padStart(2, '0')).join(''),
    raw_bytes: rawBytes,
    summary,
    details: null,
    tcp_flags: protocol === 'TCP' || protocol === 'HTTP' ? {
      fin: Math.random() > 0.8,
      syn: Math.random() > 0.9,
      rst: false,
      psh: Math.random() > 0.5,
      ack: true,
      urg: false,
      ece: false,
      cwr: false,
      sequence: Math.floor(Math.random() * 4294967295),
      acknowledgement: Math.floor(Math.random() * 4294967295),
      window: 65535,
    } : null,
    http_info: protocol === 'HTTP' ? {
      method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
      url: ['/', '/api/v1/users', '/index.html', '/api/data'][Math.floor(Math.random() * 4)],
      version: 'HTTP/1.1',
      status_code: null,
      status_text: null,
      headers: {
        'Host': 'example.com',
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
      },
      body: null,
      content_type: 'text/html; charset=utf-8',
      content_length: length,
    } : null,
    dns_info: protocol === 'DNS' ? {
      is_query: Math.random() > 0.5,
      query_name: ['google.com', 'github.com', 'example.com'][Math.floor(Math.random() * 3)],
      query_type: 'A',
      query_class: 'IN',
      responses: [],
      ttl: 300,
    } : null,
  };
}

function renderHexDump(bytes: number[]): string {
  const bytesPerRow = 16;
  let html = '';
  
  for (let offset = 0; offset < bytes.length; offset += bytesPerRow) {
    const row = bytes.slice(offset, offset + bytesPerRow);
    const hexBytes = row.map(b => b.toString(16).padStart(2, '0'));
    
    while (hexBytes.length < bytesPerRow) {
      hexBytes.push('  ');
    }
    
    const ascii = row.map(b => {
      if (b >= 32 && b <= 126) {
        return String.fromCharCode(b);
      }
      return '.';
    }).join('');
    
    const offsetStr = offset.toString(16).padStart(8, '0');
    
    html += `<div class="hex-row">
      <span class="offset">${offsetStr}</span>
      <span class="hex-bytes">
        ${hexBytes.slice(0, 8).map(h => `<span class="hex-byte">${h}</span>`).join('')}
        <span class="separator"> </span>
        ${hexBytes.slice(8).map(h => `<span class="hex-byte">${h}</span>`).join('')}
      </span>
      <span class="ascii">${ascii}</span>
    </div>`;
  }
  
  return html;
}

export default PacketSnifferPage;
