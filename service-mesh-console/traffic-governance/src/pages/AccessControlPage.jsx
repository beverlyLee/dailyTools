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
  SafetyOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import YamlEditorModal from '../components/YamlEditorModal';
import { getAccessControlRules, deleteAccessControlRule, RULE_TYPES } from '../api/governance';

const AccessControlPage = () => {
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
      const data = await getAccessControlRules();
      setRules(data);
    } catch (error) {
      message.error('获取访问控制规则失败: ' + error.message);
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
      await deleteAccessControlRule(ruleName);
      message.success('规则删除成功');
      fetchRules();
    } catch (error) {
      message.error('删除规则失败: ' + error.message);
    }
  };

  const handleEditorSave = (result) => {
    fetchRules();
  };

  const formatSources = (sources = []) => {
    const counts = { ip: 0, service: 0, namespace: 0 };
    sources.forEach((s) => {
      if (s.type) counts[s.type]++;
    });
    return (
      <Space size="small" wrap>
        {counts.ip > 0 && <Tag size="small">IP: {counts.ip}</Tag>}
        {counts.service > 0 && <Tag size="small" color="blue">服务: {counts.service}</Tag>}
        {counts.namespace > 0 && <Tag size="small" color="green">命名空间: {counts.namespace}</Tag>}
        {sources.length === 0 && <Tag size="small" color="default">无规则</Tag>}
      </Space>
    );
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
      title: '规则类型',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 120,
      render: (type) => (
        <Tag
          color={type === 'whitelist' ? 'green' : 'red'}
          icon={type === 'whitelist' ? <UnlockOutlined /> : <LockOutlined />}
        >
          {type === 'whitelist' ? '白名单' : '黑名单'}
        </Tag>
      ),
    },
    {
      title: '源列表统计',
      key: 'sources',
      width: 250,
      render: (_, record) => formatSources(record.sources),
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
  const whitelistCount = rules.filter((r) => r.ruleType === 'whitelist').length;
  const blacklistCount = rules.filter((r) => r.ruleType === 'blacklist').length;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="总规则数"
              value={rules.length}
              prefix={<SafetyOutlined />}
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
              title="白名单规则"
              value={whitelistCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<UnlockOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="黑名单规则"
              value={blacklistCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="访问控制规则列表（黑白名单）"
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
          scroll={{ x: 1300 }}
          rowClassName={(record) =>
            record.status === 'active' ? 'rule-card-active' : 'rule-card-inactive'
          }
        />
      </Card>

      <YamlEditorModal
        visible={editorVisible}
        onCancel={() => setEditorVisible(false)}
        onSave={handleEditorSave}
        ruleType={RULE_TYPES.ACCESS_CONTROL}
        rule={editingRule}
        isEdit={isEdit}
      />
    </div>
  );
};

export default AccessControlPage;
