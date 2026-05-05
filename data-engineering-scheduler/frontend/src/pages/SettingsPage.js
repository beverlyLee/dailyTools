import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Switch,
  Divider,
  message,
  Tabs,
  Descriptions,
  Tag,
  List,
  Space,
  Modal,
  InputNumber,
  Radio,
} from 'antd';
import {
  SaveOutlined,
  DatabaseOutlined,
  BellOutlined,
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const SettingsPage = () => {
  const [form] = Form.useForm();
  const [connections, setConnections] = useState([]);
  const [alertConfig, setAlertConfig] = useState({
    emailEnabled: true,
    smtpServer: 'smtp.example.com',
    smtpPort: 587,
    senderEmail: 'admin@example.com',
    webhookEnabled: false,
    webhookUrl: '',
  });
  const [systemConfig, setSystemConfig] = useState({
    maxRetryCount: 3,
    defaultRetryDelay: 5,
    taskTimeout: 3600,
    parallelTasks: 10,
    logRetentionDays: 30,
    autoCleanup: true,
  });
  const [connectionModal, setConnectionModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [connectionForm] = Form.useForm();

  useEffect(() => {
    loadConnections();
    loadAlertConfig();
    loadSystemConfig();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/connections');
      setConnections(response.data);
    } catch (error) {
      console.error('加载连接失败:', error);
      const mockConnections = [
        {
          id: 1,
          name: '生产数据库',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'production',
          username: 'root',
          status: 'active',
        },
        {
          id: 2,
          name: '数据仓库',
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'warehouse',
          username: 'postgres',
          status: 'active',
        },
        {
          id: 3,
          name: 'Redis缓存',
          type: 'redis',
          host: 'localhost',
          port: 6379,
          database: 0,
          status: 'inactive',
        },
      ];
      setConnections(mockConnections);
    }
  };

  const loadAlertConfig = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/settings/alerts');
      setAlertConfig(response.data);
    } catch (error) {
      console.error('加载告警配置失败:', error);
    }
  };

  const loadSystemConfig = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/settings/system');
      setSystemConfig(response.data);
    } catch (error) {
      console.error('加载系统配置失败:', error);
    }
  };

  const saveAlertConfig = async (values) => {
    try {
      await axios.post('http://localhost:5000/api/settings/alerts', values);
      setAlertConfig(values);
      message.success('告警配置已保存');
    } catch (error) {
      message.error('保存失败: ' + error.message);
    }
  };

  const saveSystemConfig = async (values) => {
    try {
      await axios.post('http://localhost:5000/api/settings/system', values);
      setSystemConfig(values);
      message.success('系统配置已保存');
    } catch (error) {
      message.error('保存失败: ' + error.message);
    }
  };

  const saveConnection = async (values) => {
    try {
      if (editingConnection) {
        await axios.put(`http://localhost:5000/api/connections/${editingConnection.id}`, values);
        message.success('连接已更新');
      } else {
        await axios.post('http://localhost:5000/api/connections', values);
        message.success('连接已创建');
      }
      setConnectionModal(false);
      connectionForm.resetFields();
      setEditingConnection(null);
      loadConnections();
    } catch (error) {
      message.error('保存连接失败: ' + error.message);
    }
  };

  const testConnection = async (values) => {
    try {
      await axios.post('http://localhost:5000/api/connections/test', values);
      message.success('连接测试成功');
    } catch (error) {
      message.error('连接测试失败: ' + error.message);
    }
  };

  const deleteConnection = async (connId) => {
    try {
      await axios.delete(`http://localhost:5000/api/connections/${connId}`);
      message.success('连接已删除');
      loadConnections();
    } catch (error) {
      message.error('删除连接失败: ' + error.message);
    }
  };

  const getConnectionTypeColor = (type) => {
    switch (type) {
      case 'mysql':
        return '#4479a1';
      case 'postgresql':
        return '#336791';
      case 'oracle':
        return '#f80000';
      case 'sqlserver':
        return '#cc2927';
      case 'redis':
        return '#dc382d';
      case 'mongodb':
        return '#47a248';
      default:
        return '#1890ff';
    }
  };

  const getConnectionTypeLabel = (type) => {
    switch (type) {
      case 'mysql':
        return 'MySQL';
      case 'postgresql':
        return 'PostgreSQL';
      case 'oracle':
        return 'Oracle';
      case 'sqlserver':
        return 'SQL Server';
      case 'redis':
        return 'Redis';
      case 'mongodb':
        return 'MongoDB';
      case 'elasticsearch':
        return 'Elasticsearch';
      default:
        return type;
    }
  };

  const connectionTypes = [
    'mysql',
    'postgresql',
    'oracle',
    'sqlserver',
    'redis',
    'mongodb',
    'elasticsearch',
  ];

  return (
    <div>
      <Card>
        <Tabs defaultActiveKey="connections">
          <TabPane
            tab={
              <span>
                <DatabaseOutlined />
                数据源连接
              </span>
            }
            key="connections"
          >
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <h3>已配置的数据源连接</h3>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingConnection(null);
                  connectionForm.resetFields();
                  setConnectionModal(true);
                }}
              >
                新建连接
              </Button>
            </div>

            <List
              grid={{ gutter: 16, column: 2 }}
              dataSource={connections}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    size="small"
                    title={
                      <Space>
                        <Tag color={getConnectionTypeColor(item.type)}>
                          {getConnectionTypeLabel(item.type)}
                        </Tag>
                        <strong>{item.name}</strong>
                      </Space>
                    }
                    extra={
                      <Tag color={item.status === 'active' ? 'green' : 'default'}>
                        {item.status === 'active' ? '启用' : '禁用'}
                      </Tag>
                    }
                  >
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="主机">
                        {item.host}:{item.port}
                      </Descriptions.Item>
                      <Descriptions.Item label="数据库">
                        {item.database !== undefined ? item.database : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="用户名">
                        {item.username || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                    <Divider style={{ margin: '12px 0' }} />
                    <Space>
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingConnection(item);
                          connectionForm.setFieldsValue(item);
                          setConnectionModal(true);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => testConnection(item)}
                      >
                        测试连接
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => deleteConnection(item.id)}
                      >
                        删除
                      </Button>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <BellOutlined />
                告警配置
              </span>
            }
            key="alerts"
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={alertConfig}
              onFinish={saveAlertConfig}
              style={{ maxWidth: 600 }}
            >
              <h3>邮件告警配置</h3>
              <Form.Item label="启用邮件告警" name="emailEnabled" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.emailEnabled !== curr.emailEnabled}>
                {({ getFieldValue }) =>
                  getFieldValue('emailEnabled') ? (
                    <>
                      <Form.Item label="SMTP 服务器" name="smtpServer">
                        <Input placeholder="smtp.example.com" />
                      </Form.Item>
                      <Form.Item label="SMTP 端口" name="smtpPort">
                        <InputNumber style={{ width: '100%' }} placeholder="587" />
                      </Form.Item>
                      <Form.Item label="发送邮箱" name="senderEmail">
                        <Input placeholder="admin@example.com" />
                      </Form.Item>
                      <Form.Item label="发送邮箱密码/授权码" name="senderPassword">
                        <Input.Password placeholder="请输入密码或授权码" />
                      </Form.Item>
                    </>
                  ) : null
                }
              </Form.Item>

              <Divider />
              <h3>Webhook 告警配置</h3>
              <Form.Item label="启用 Webhook 告警" name="webhookEnabled" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.webhookEnabled !== curr.webhookEnabled}>
                {({ getFieldValue }) =>
                  getFieldValue('webhookEnabled') ? (
                    <>
                      <Form.Item label="Webhook URL" name="webhookUrl">
                        <Input placeholder="https://hooks.slack.com/services/..." />
                      </Form.Item>
                      <Form.Item label="请求方法" name="webhookMethod">
                        <Select placeholder="请选择请求方法">
                          <Option value="POST">POST</Option>
                          <Option value="GET">GET</Option>
                        </Select>
                      </Form.Item>
                    </>
                  ) : null
                }
              </Form.Item>

              <Divider />
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane
            tab={
              <span>
                <SettingOutlined />
                系统配置
              </span>
            }
            key="system"
          >
            <Form
              layout="vertical"
              initialValues={systemConfig}
              onFinish={saveSystemConfig}
              style={{ maxWidth: 600 }}
            >
              <h3>任务执行配置</h3>
              <Form.Item label="最大重试次数" name="maxRetryCount">
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="默认重试延迟(秒)" name="defaultRetryDelay">
                <InputNumber min={1} max={300} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="任务超时时间(秒)" name="taskTimeout">
                <InputNumber min={60} max={86400} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="最大并行任务数" name="parallelTasks">
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>

              <Divider />
              <h3>日志与清理配置</h3>
              <Form.Item label="日志保留天数" name="logRetentionDays">
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="自动清理过期日志" name="autoCleanup" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Divider />
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={editingConnection ? '编辑数据源连接' : '新建数据源连接'}
        open={connectionModal}
        onOk={() => connectionForm.submit()}
        onCancel={() => {
          setConnectionModal(false);
          setEditingConnection(null);
          connectionForm.resetFields();
        }}
        width={600}
        footer={
          <Space>
            <Button
              onClick={() => {
                connectionForm.validateFields().then((values) => {
                  testConnection(values);
                });
              }}
            >
              测试连接
            </Button>
            <Button onClick={() => setConnectionModal(false)}>取消</Button>
            <Button type="primary" onClick={() => connectionForm.submit()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form
          form={connectionForm}
          layout="vertical"
          onFinish={saveConnection}
        >
          <Form.Item
            label="连接名称"
            name="name"
            rules={[{ required: true, message: '请输入连接名称' }]}
          >
            <Input placeholder="例如：生产数据库" />
          </Form.Item>

          <Form.Item
            label="数据库类型"
            name="type"
            rules={[{ required: true, message: '请选择数据库类型' }]}
          >
            <Select placeholder="请选择数据库类型">
              {connectionTypes.map((type) => (
                <Option key={type} value={type}>
                  {getConnectionTypeLabel(type)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="主机地址"
                name="host"
                rules={[{ required: true, message: '请输入主机地址' }]}
              >
                <Input placeholder="localhost" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="端口"
                name="port"
                rules={[{ required: true, message: '请输入端口' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="3306" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'redis') {
                return (
                  <Form.Item label="数据库编号" name="database">
                    <InputNumber min={0} max={15} style={{ width: '100%' }} placeholder="0" />
                  </Form.Item>
                );
              }
              return (
                <Form.Item label="数据库名" name="database">
                  <Input placeholder="例如：production" />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item label="用户名" name="username">
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item label="密码" name="password">
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item label="状态" name="status">
            <Radio.Group>
              <Radio value="active">启用</Radio>
              <Radio value="inactive">禁用</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={3} placeholder="请输入连接描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;
