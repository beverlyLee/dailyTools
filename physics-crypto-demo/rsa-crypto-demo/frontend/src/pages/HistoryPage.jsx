import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Descriptions,
  Divider,
  message,
  Modal,
  Typography,
  Empty
} from 'antd';
import {
  HistoryOutlined,
  EyeOutlined,
  DeleteOutlined,
  KeyOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons';
import { rsaApi } from '../services/api';

const { Title, Text } = Typography;

const HistoryPage = () => {
  const [keyPairs, setKeyPairs] = useState([]);
  const [cryptoRecords, setCryptoRecords] = useState([]);
  const [loading, setLoading] = useState({ keyPairs: false, records: false });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [recordDetail, setRecordDetail] = useState(null);

  useEffect(() => {
    loadKeyPairs();
    loadCryptoRecords();
  }, []);

  const loadKeyPairs = async () => {
    setLoading(prev => ({ ...prev, keyPairs: true }));
    try {
      const response = await rsaApi.getKeyPairs();
      if (response.success) {
        setKeyPairs(response.key_pairs);
      }
    } catch (error) {
      message.error('加载密钥对列表失败');
    } finally {
      setLoading(prev => ({ ...prev, keyPairs: false }));
    }
  };

  const loadCryptoRecords = async () => {
    setLoading(prev => ({ ...prev, records: true }));
    try {
      const response = await rsaApi.getCryptoRecords();
      if (response.success) {
        setCryptoRecords(response.records);
      }
    } catch (error) {
      message.error('加载历史记录失败');
    } finally {
      setLoading(prev => ({ ...prev, records: false }));
    }
  };

  const handleDeleteKeyPair = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个密钥对吗？相关的加密记录也会被删除。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await rsaApi.deleteKeyPair(id);
          message.success('密钥对已删除');
          loadKeyPairs();
          loadCryptoRecords();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleViewRecord = async (id) => {
    try {
      const response = await rsaApi.getCryptoRecord(id);
      if (response.success) {
        setRecordDetail(response.record);
        setDetailModalVisible(true);
      }
    } catch (error) {
      message.error('加载记录详情失败');
    }
  };

  const handleDeleteRecord = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await rsaApi.deleteCryptoRecord(id);
          message.success('记录已删除');
          loadCryptoRecords();
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const keyPairColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => text || <Text type="secondary">未命名</Text>
    },
    {
      title: '密钥位数',
      dataIndex: 'key_size',
      key: 'key_size',
      width: 100,
      render: (size) => <Tag color="blue">{size} 位</Tag>
    },
    {
      title: '模数 n (前50位)',
      dataIndex: 'n',
      key: 'n',
      ellipsis: true
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteKeyPair(record.id)}
        >
          删除
        </Button>
      )
    }
  ];

  const recordColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'encrypt' ? 'blue' : 'green'}>
          {type === 'encrypt' ? (
            <Space><LockOutlined />加密</Space>
          ) : (
            <Space><UnlockOutlined />解密</Space>
          )}
        </Tag>
      )
    },
    {
      title: '密钥对ID',
      dataIndex: 'key_pair_id',
      key: 'key_pair_id',
      width: 100,
      render: (id) => id || <Text type="secondary">临时密钥</Text>
    },
    {
      title: '明文',
      dataIndex: 'plain_text',
      key: 'plain_text',
      ellipsis: true
    },
    {
      title: '密文',
      dataIndex: 'cipher_text',
      key: 'cipher_text',
      ellipsis: true
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => time ? new Date(time).toLocaleString() : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewRecord(record.id)}
          >
            查看
          </Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteRecord(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title={<Space><KeyOutlined /><span>已保存的密钥对</span></Space>}>
        <Table
          columns={keyPairColumns}
          dataSource={keyPairs}
          rowKey="id"
          loading={loading.keyPairs}
          size="small"
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: <Empty description="暂无保存的密钥对" /> }}
        />
      </Card>

      <Card title={<Space><HistoryOutlined /><span>加密/解密历史记录</span></Space>}>
        <Table
          columns={recordColumns}
          dataSource={cryptoRecords}
          rowKey="id"
          loading={loading.records}
          size="small"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="暂无历史记录" /> }}
        />
      </Card>

      <Card title="数据存储说明">
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <Title level={5}>SQLite 数据库存储</Title>
          <p>
            本系统使用 SQLite 数据库存储以下数据，便于教学演示和历史回放：
          </p>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="密钥对表 (key_pairs)">
              存储生成的 RSA 密钥对，包括 p, q, n, φ(n), e, d 等参数，支持历史回放和教学演示。
            </Descriptions.Item>
            <Descriptions.Item label="加密记录表 (crypto_records)">
              存储每次加密和解密操作的记录，包括明文、密文、使用的密钥对等信息，便于验证和演示。
            </Descriptions.Item>
          </Descriptions>

          <Divider>使用场景</Divider>
          <ul>
            <li><Text strong>教学演示：</Text>保存不同参数的密钥对，对比展示不同位数密钥的安全性和性能</li>
            <li><Text strong>历史回放：</Text>查看之前的加密解密操作，验证 RSA 算法的正确性</li>
            <li><Text strong>实验记录：</Text>记录实验过程中的参数和结果，便于后续分析和报告</li>
          </ul>
        </div>
      </Card>

      <Modal
        title="记录详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {recordDetail && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="记录 ID">{recordDetail.id}</Descriptions.Item>
              <Descriptions.Item label="操作类型">
                <Tag color={recordDetail.operation_type === 'encrypt' ? 'blue' : 'green'}>
                  {recordDetail.operation_type === 'encrypt' ? '加密' : '解密'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="使用的密钥对 ID">
                {recordDetail.key_pair_id || '临时密钥（未保存）'}
              </Descriptions.Item>
              <Descriptions.Item label="明文">
                <Text copyable>{recordDetail.plain_text}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="密文">
                <Text copyable>{recordDetail.cipher_text || '-'}</Text>
              </Descriptions.Item>
              {recordDetail.encrypted_data && (
                <Descriptions.Item label="加密数据数组">
                  <Text code copyable>
                    {JSON.stringify(recordDetail.encrypted_data)}
                  </Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {recordDetail.created_at ? new Date(recordDetail.created_at).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Modal>
    </Space>
  );
};

export default HistoryPage;
