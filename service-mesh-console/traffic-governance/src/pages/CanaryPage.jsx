import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  message,
  Space,
  Popconfirm,
  Descriptions,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeOutlined,
  RocketOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import YamlEditorModal from '../components/YamlEditorModal';
import { getCanaryRules, deleteCanaryRule, RULE_TYPES } from '../api/governance';

const CanaryPage = () => {
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
      const data = await getCanaryRules();
      setRules(data);
    } catch (error) {
      message.error('获取金丝雀规则失败: ' + error.message);
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
      await deleteCanaryRule(ruleName);
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
      title: '版本配置',
      key: 'versions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tag color="blue">{record.stableVersion}</Tag>
          <SwapOutlined style={{ color: '#999' }} />
          <Tag color="green">{record.canaryVersion}</Tag>
        </Space>
      ),
    },
    {
      title: '流量比例',
      dataIndex: 'weight',
      key: 'weight',
      width: 120,
      render: (weight) => (
        <Space>
          <Tag color="green">{weight}%</Tag>
          <span style={{ color: '#999' }}>(金丝雀)</span>
        </Space>
      ),
    },
    {
      title: '流量规则',
      key: 'trafficRules',
      width: 150,
      render: (_, record) => {
        const rules = [];
        if (record.trafficRules?.byWeight) rules.push('权重');
        if (record.trafficRules?.byHeader && Object.keys(record.trafficRules.byHeader).length > 0)
          rules.push('Header');
        if (record.trafficRules?.byCookie && Object.keys(record.trafficRules.byCookie).length > 0)
          rules.push('Cookie');
        return rules.map((r, i) => <Tag key={i} size="small">{r}</Tag>);
      },
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
  const totalWeight = rules.reduce((sum, r) => sum + (r.weight || 0), 0);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="总规则数"
              value={rules.length}
              prefix={<RocketOutlined />}
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
              title="涉及服务"
              value={new Set(rules.map((r) => r.service)).size}
              prefix={<Tag color="blue">●</Tag>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="平均金丝雀流量"
              value={rules.length > 0 ? totalWeight / rules.length : 0}
              precision={1}
              suffix="%"
              prefix={<Tag color="green">●</Tag>}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="金丝雀发布规则列表"
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
        ruleType={RULE_TYPES.CANARY}
        rule={editingRule}
        isEdit={isEdit}
      />
    </div>
  );
};

export default CanaryPage;
