import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Select,
  Button,
  Switch,
  Divider,
  message,
  Space,
  InputNumber,
  Tabs,
  List,
  Tag,
  Descriptions,
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  GlobalOutlined,
  SecurityScanOutlined,
  SyncOutlined,
  BellOutlined,
  MonitorOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

function Settings() {
  const [form] = Form.useForm();
  const [sshForm] = Form.useForm();
  const [monitorForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSaveGeneral = async (values) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('设置已保存');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSSH = async (values) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('SSH设置已保存');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMonitor = async (values) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('监控设置已保存');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: '1',
      label: (
        <span>
          <SettingOutlined /> 常规设置
        </span>
      ),
      children: (
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveGeneral}
            initialValues={{
              theme: 'light',
              language: 'zh-CN',
              auto_refresh: true,
              refresh_interval: 10,
              notifications: true,
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="theme"
                  label="主题"
                >
                  <Select>
                    <Option value="light">浅色</Option>
                    <Option value="dark">深色</Option>
                    <Option value="auto">跟随系统</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="language"
                  label="语言"
                >
                  <Select>
                    <Option value="zh-CN">简体中文</Option>
                    <Option value="en-US">English</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>自动刷新</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="auto_refresh"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="refresh_interval"
                  label="刷新间隔（秒）"
                >
                  <InputNumber
                    min={5}
                    max={300}
                    style={{ width: '100%' }}
                    addonAfter="秒"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>通知</Title>
            <Form.Item
              name="notifications"
              valuePropName="checked"
              label="启用系统通知"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: '2',
      label: (
        <span>
          <SecurityScanOutlined /> SSH设置
        </span>
      ),
      children: (
        <Card>
          <Form
            form={sshForm}
            layout="vertical"
            onFinish={handleSaveSSH}
            initialValues={{
              ssh_timeout: 30,
              ssh_keepalive: true,
              ssh_compression: false,
              default_ssh_port: 22,
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="default_ssh_port"
                  label="默认SSH端口"
                >
                  <InputNumber
                    min={1}
                    max={65535}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="ssh_timeout"
                  label="连接超时（秒）"
                >
                  <InputNumber
                    min={5}
                    max={300}
                    style={{ width: '100%' }}
                    addonAfter="秒"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>SSH选项</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="ssh_keepalive"
                  valuePropName="checked"
                  label="保持连接"
                >
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="ssh_compression"
                  valuePropName="checked"
                  label="压缩传输"
                >
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>SSH密钥管理</Title>
            <List
              dataSource={[
                { name: 'id_rsa', fingerprint: 'SHA256:abc123...', created: '2024-01-15' },
                { name: 'id_ed25519', fingerprint: 'SHA256:def456...', created: '2024-02-20' },
              ]}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" danger>删除</Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<SecurityScanOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                    title={item.name}
                    description={
                      <Space>
                        <Tag color="blue">指纹: {item.fingerprint}</Tag>
                        <Text type="secondary">创建于: {item.created}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />

            <Form.Item style={{ marginTop: 16 }}>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
                <Button icon={<PlusOutlined />}>
                  导入密钥
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: '3',
      label: (
        <span>
          <MonitorOutlined /> 监控设置
        </span>
      ),
      children: (
        <Card>
          <Form
            form={monitorForm}
            layout="vertical"
            onFinish={handleSaveMonitor}
            initialValues={{
              cpu_warning: 80,
              cpu_critical: 90,
              memory_warning: 80,
              memory_critical: 90,
              disk_warning: 85,
              disk_critical: 95,
              temp_warning: 70,
              temp_critical: 80,
              enable_alerting: true,
              alert_email: true,
              alert_webhook: false,
            }}
          >
            <Title level={5}>资源告警阈值</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="cpu_warning"
                  label="CPU警告阈值（%）"
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="cpu_critical"
                  label="CPU紧急阈值（%）"
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="memory_warning"
                  label="内存警告阈值（%）"
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="memory_critical"
                  label="内存紧急阈值（%）"
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="disk_warning"
                  label="磁盘警告阈值（%）"
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="disk_critical"
                  label="磁盘紧急阈值（%）"
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="temp_warning"
                  label="温度警告阈值（°C）"
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="°C"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="temp_critical"
                  label="温度紧急阈值（°C）"
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    addonAfter="°C"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>告警通知</Title>
            <Form.Item
              name="enable_alerting"
              valuePropName="checked"
              label="启用告警"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="alert_email"
                  valuePropName="checked"
                  label="邮件通知"
                >
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="alert_webhook"
                  valuePropName="checked"
                  label="Webhook通知"
                >
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="alert_email_address"
              label="告警接收邮箱"
            >
              <Input placeholder="例如: admin@example.com" />
            </Form.Item>

            <Form.Item
              name="webhook_url"
              label="Webhook URL"
            >
              <Input placeholder="例如: https://hooks.example.com/alert" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: '4',
      label: (
        <span>
          <GlobalOutlined /> API设置
        </span>
      ),
      children: (
        <Card>
          <Title level={5}>后端API配置</Title>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="API地址">http://localhost:8080</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color="success">已连接</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="超时时间">30秒</Descriptions.Item>
            <Descriptions.Item label="最后检查">
              {new Date().toLocaleString()}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <Title level={5}>连接测试</Title>
          <Space>
            <Button icon={<SyncOutlined />} onClick={() => message.success('API连接正常')}>
              测试连接
            </Button>
          </Space>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={3}>系统设置</Title>
      </div>

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
}

export default Settings;
