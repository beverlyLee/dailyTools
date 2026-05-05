import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  message,
  Space,
  Popconfirm,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  RetryOutlined,
  FallOutlined,
} from '@ant-design/icons';
import YamlEditorModal from '../components/YamlEditorModal';
import { getCircuitBreakerRules, deleteCircuitBreakerRule, RULE_TYPES } from '../api/governance';

const CircuitBreakerPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getCircuitBreakerRules();
      setRules(data);
    } catch (error) {
      message.error('获取熔断规则失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setIsEdit(false);
    setEditorVisible(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setIsEdit(true);
    setEditorVisible(true);
  };

  const handleDelete = async (ruleName) => {
    try {
      await deleteCircuitBreakerRule(ruleName);
      message.success('规则删除成功');
      fetchRules();
    } catch (error) {
      message.error('删除规则失败: ' + error.message);
    }
  };

  const handleEditorSave = (result) => {
    fetchRules();
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          <span style={{ fontWeight: 600 }}>{text}</span>
          {record.status === 'active' && (
            <Tag color="success" className="rule-status-tag">
              活跃
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '命名空间',
      dataIndex: 'namespace',
      key: 'namespace',
      width: 120,
    },
    {
      title: '目标服务',
      dataIndex: 'service',
      key: 'service',
      width: 200,
    },
    {
      title: '连接配置',
      key: 'connection',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag size="small">最大连接: {record.maxConnections}</Tag>
          <Tag size="small">最大请求: {record.maxRequests}</Tag>
          <Tag size="small">超时: {record.timeoutMs}ms</Tag>
        </Space>
      ),
    },
    {
      title: '重试策略',
      key: 'retry',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag size="small" color="blue">
            重试: {record.retryPolicy?.attempts || 0} 次
          </Tag>
          <Tag size="small">
            超时: {record.retryPolicy?.perTryTimeoutMs || 0}ms
          </Tag>
        </Space>
      ),
    },
    {
      title: '降级策略',
      key: 'fallback',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tag
            color={record.fallbackPolicy?.enabled ? 'warning' : 'default'}
            size="small"
          >
            {record.fallbackPolicy?.enabled ? '已启用' : '未启用'}
          </Tag>
          {record.fallbackPolicy?.enabled && (
            <Tag size="small">
              错误数: {record.fallbackPolicy.maxErrors}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => time?.substring(0, 19).replace('T', ' '),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<CodeOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此规则吗？"
            onConfirm={() => handleDelete(record.name)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const activeRules = rules.filter((r) => r.status === 'active').length;
  const withRetry = rules.filter((r) => r.retryPolicy?.attempts > 0).length;
  const withFallback = rules.filter((r) => r.fallbackPolicy?.enabled).length;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="总规则数"
              value={rules.length}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="活跃规则"
              value={activeRules}
              valueStyle={{ color: '#52c41a' }}
              prefix={<Tag color="success">●</Tag>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="启用重试"
              value={withRetry}
              valueStyle={{ color: '#1890ff' }}
              prefix={<RetryOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="启用降级"
              value={withFallback}
              valueStyle={{ color: '#faad14' }}
              prefix={<FallOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="熔断降级规则列表"
        size="small"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建规则
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="name"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条规则`,
          }}
          scroll={{ x: 1400 }}
          rowClassName={(record) =>
            record.status === 'active' ? 'rule-card-active' : 'rule-card-inactive'
          }
        />
      </Card>

      <YamlEditorModal
        visible={editorVisible}
        onCancel={() => setEditorVisible(false)}
        onSave={handleEditorSave}
        ruleType={RULE_TYPES.CIRCUIT_BREAKER}
        rule={editingRule}
        isEdit={isEdit}
      />
    </div>
  );
};

export default CircuitBreakerPage;
