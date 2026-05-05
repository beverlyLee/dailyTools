import React, { useState } from 'react';
import {
  Table,
  Tag,
  Card,
  Typography,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Empty,
  Popconfirm,
  message,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useLogStore } from '@/store';
import type { Rule, Condition, Action } from '@/types';
import { formatRelativeTime } from '@/utils/helpers';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const operatorOptions = [
  { value: 'Equals', label: '等于' },
  { value: 'NotEquals', label: '不等于' },
  { value: 'Contains', label: '包含' },
  { value: 'NotContains', label: '不包含' },
  { value: 'GreaterThan', label: '大于' },
  { value: 'LessThan', label: '小于' },
  { value: 'GreaterThanOrEqual', label: '大于等于' },
  { value: 'LessThanOrEqual', label: '小于等于' },
  { value: 'RegexMatch', label: '正则匹配' },
  { value: 'RegexNotMatch', label: '正则不匹配' },
  { value: 'In', label: '在列表中' },
  { value: 'NotIn', label: '不在列表中' },
];

const actionTypeOptions = [
  { value: 'CreateAlert', label: '创建告警' },
  { value: 'Email', label: '发送邮件' },
  { value: 'Webhook', label: 'Webhook 通知' },
  { value: 'AddTag', label: '添加标签' },
];

const fieldOptions = [
  { value: 'message', label: '消息 (message)' },
  { value: 'level', label: '级别 (level)' },
  { value: 'service', label: '服务 (service)' },
  { value: 'hostname', label: '主机名 (hostname)' },
  { value: 'source', label: '来源 (source)' },
];

interface FormCondition {
  field: string;
  operator: string;
  value: string;
}

interface FormAction {
  action_type: string;
  config: string;
}

interface FormValues {
  name: string;
  description: string;
  enabled: boolean;
  conditions: FormCondition[];
  actions: FormAction[];
}

export const RulesPage: React.FC = () => {
  const { rules, loading } = useLogStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form] = Form.useForm<FormValues>();

  const openCreateModal = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      conditions: [{ field: '', operator: 'Equals', value: '' }],
      actions: [{ action_type: 'CreateAlert', config: '{"severity": "MEDIUM"}' }],
    });
    setModalVisible(true);
  };

  const openEditModal = (rule: Rule) => {
    setEditingRule(rule);
    form.setFieldsValue({
      name: rule.name,
      description: rule.description || '',
      enabled: rule.enabled,
      conditions: rule.conditions.map((c) => ({
        field: c.field,
        operator: c.operator as unknown as string,
        value: JSON.stringify(c.value),
      })),
      actions: rule.actions.map((a) => ({
        action_type: a.action_type as unknown as string,
        config: JSON.stringify(a.config),
      })),
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      const conditions: Condition[] = values.conditions
        .filter((c) => c.field && c.operator && c.value)
        .map((c) => ({
          field: c.field,
          operator: c.operator as unknown as Condition['operator'],
          value: JSON.parse(c.value || '""'),
        }));

      const actions: Action[] = values.actions
        .filter((a) => a.action_type)
        .map((a) => ({
          action_type: a.action_type as unknown as Action['action_type'],
          config: JSON.parse(a.config || '{}'),
        }));

      if (conditions.length === 0) {
        message.error('至少需要一个有效条件');
        return;
      }

      if (actions.length === 0) {
        message.error('至少需要一个有效动作');
        return;
      }

      message.success(editingRule ? '规则已更新' : '规则已创建');
      setModalVisible(false);
    } catch (error) {
      message.error('JSON 格式错误，请检查配置');
    }
  };

  const columns: ColumnsType<Rule> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <span>{name}</span>
          {!record.enabled && (
            <Tag size="small" color="default">
              已禁用
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '条件数',
      key: 'conditions',
      width: 100,
      render: (_, record) => (
        <Tag color="blue">{record.conditions.length}</Tag>
      ),
    },
    {
      title: '动作数',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Tag color="green">{record.actions.length}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string | undefined) => (
        <Text type="secondary">{description || '无描述'}</Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => formatRelativeTime(time),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}>
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此规则吗？"
            onConfirm={() => message.success('规则已删除')}
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

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          规则管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新建规则
        </Button>
      </div>

      <Card>
        {rules.length > 0 ? (
          <Table
            columns={columns}
            dataSource={rules}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条规则`,
              defaultPageSize: 10,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 1000 }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <span>暂无规则</span>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                  新建规则
                </Button>
              </Space>
            }
          />
        )}
      </Card>

      <Modal
        title={editingRule ? '编辑规则' : '新建规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            enabled: true,
          }}
        >
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如: 高错误率告警" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="规则的描述信息" />
          </Form.Item>

          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Divider>条件配置</Divider>

          <Form.List name="conditions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Text strong>{index + 1}.</Text>
                    <Form.Item
                      {...restField}
                      name={[name, 'field']}
                      rules={[{ required: true, message: '请选择字段' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select placeholder="选择字段" style={{ width: 200 }}>
                        {fieldOptions.map((opt) => (
                          <Option key={opt.value} value={opt.value}>
                            {opt.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'operator']}
                      rules={[{ required: true, message: '请选择操作符' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select placeholder="选择操作符" style={{ width: 150 }}>
                        {operatorOptions.map((opt) => (
                          <Option key={opt.value} value={opt.value}>
                            {opt.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'value']}
                      rules={[{ required: true, message: '请输入值 (JSON 格式)' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder='例如: "ERROR" 或 ["ERROR", "FATAL"]' style={{ width: 250 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', cursor: 'pointer' }} />
                    )}
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加条件
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider>动作配置</Divider>

          <Form.List name="actions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Text strong>{index + 1}.</Text>
                    <Form.Item
                      {...restField}
                      name={[name, 'action_type']}
                      rules={[{ required: true, message: '请选择动作类型' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select placeholder="选择动作类型" style={{ width: 200 }}>
                        {actionTypeOptions.map((opt) => (
                          <Option key={opt.value} value={opt.value}>
                            {opt.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'config']}
                      rules={[{ required: true, message: '请输入配置 (JSON 格式)' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder='例如: {"severity": "HIGH", "title": "错误告警"}'
                        style={{ width: 400 }}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', cursor: 'pointer' }} />
                    )}
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加动作
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item style={{ marginTop: 24, marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingRule ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
