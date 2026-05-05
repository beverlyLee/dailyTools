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
  SwapOutlined,
  RightOutlined,
} from '@ant-design/icons';
import YamlEditorModal from '../components/YamlEditorModal';
import { getBlueGreenRules, deleteBlueGreenRule, RULE_TYPES } from '../api/governance';

const BlueGreenPage = () => {
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
      const data = await getBlueGreenRules();
      setRules(data);
    } catch (error) {
      message.error('获取蓝绿规则失败: ' + error.message);
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
      await deleteBlueGreenRule(ruleName);
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
      title: 'Blue 版本',
      dataIndex: 'blueVersion',
      key: 'blueVersion',
      width: 120,
      render: (version) => <Tag color="blue">{version}</Tag>,
    },
    {
      title: 'Green 版本',
      dataIndex: 'greenVersion',
      key: 'greenVersion',
      width: 120,
      render: (version) => <Tag color="green">{version}</Tag>,
    },
    {
      title: '当前活跃版本',
      dataIndex: 'activeVersion',
      key: 'activeVersion',
      width: 150,
      render: (version, record) => (
        <Space>
          <Tag color={version === 'blue' ? 'blue' : 'green'}>
            {version === 'blue' ? record.blueVersion : record.greenVersion}
          </Tag>
          <Tag color={version === 'blue' ? 'blue' : 'green'}>
            {version === 'blue' ? 'Blue' : 'Green'}
          </Tag>
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
  const blueActive = rules.filter((r) => r.activeVersion === 'blue').length;
  const greenActive = rules.filter((r) => r.activeVersion === 'green').length;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="总规则数"
              value={rules.length}
              prefix={<SwapOutlined />}
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
              title="Blue 版本活跃"
              value={blueActive}
              valueStyle={{ color: '#1890ff' }}
              prefix={<Tag color="blue">●</Tag>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="stat-card">
            <Statistic
              title="Green 版本活跃"
              value={greenActive}
              valueStyle={{ color: '#52c41a' }}
              prefix={<Tag color="green">●</Tag>}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="蓝绿部署规则列表"
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
        ruleType={RULE_TYPES.BLUE_GREEN}
        rule={editingRule}
        isEdit={isEdit}
      />
    </div>
  );
};

export default BlueGreenPage;
