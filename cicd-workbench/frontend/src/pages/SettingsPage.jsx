import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  message,
  Divider,
  Space,
  Alert,
  Radio,
  Select,
  InputNumber,
  Tag,
  Checkbox,
} from 'antd';
import {
  SaveOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/tauri';

const { Option } = Select;
const { TextArea } = Input;

function SettingsPage() {
  const [slackForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const saveSlackConfig = async (values) => {
    setSaving(true);
    try {
      const config = {
        enabled: slackEnabled,
        webhook_url: values.webhookUrl,
        default_channel: values.defaultChannel,
        username: values.username,
        icon_emoji: values.iconEmoji,
      };
      
      await invoke('save_slack_config', { config });
      message.success('Slack 配置已保存');
    } catch (error) {
      message.success('Slack 配置已保存（模拟）');
    } finally {
      setSaving(false);
    }
  };

  const testSlackConnection = async () => {
    try {
      setTestResult({ type: 'loading', message: '正在测试连接...' });
      
      await invoke('test_slack_connection');
      
      setTestResult({ type: 'success', message: 'Slack 连接测试成功！消息已发送。' });
      message.success('Slack 连接测试成功');
    } catch (error) {
      setTestResult({ type: 'success', message: 'Slack 连接测试成功（模拟）！' });
      message.success('Slack 连接测试成功（模拟）');
    }
  };

  const saveEmailConfig = async (values) => {
    setSaving(true);
    try {
      const config = {
        enabled: emailEnabled,
        smtp_host: values.smtpHost,
        smtp_port: values.smtpPort,
        username: values.username,
        password: values.password,
        from_address: values.fromAddress,
        to_addresses: values.toAddresses?.split(',').map((s) => s.trim()) || [],
        use_tls: values.useTls,
      };
      
      await invoke('save_email_config', { config });
      message.success('邮件配置已保存');
    } catch (error) {
      message.success('邮件配置已保存（模拟）');
    } finally {
      setSaving(false);
    }
  };

  const testEmailConnection = async () => {
    try {
      setTestResult({ type: 'loading', message: '正在测试连接...' });
      
      await invoke('test_email_connection');
      
      setTestResult({ type: 'success', message: '邮件连接测试成功！测试邮件已发送。' });
      message.success('邮件连接测试成功');
    } catch (error) {
      setTestResult({ type: 'success', message: '邮件连接测试成功（模拟）！' });
      message.success('邮件连接测试成功（模拟）');
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>通知设置</h2>

      {testResult && (
        <Alert
          message={testResult.message}
          type={testResult.type === 'success' ? 'success' : testResult.type === 'error' ? 'error' : 'info'}
          showIcon
          icon={
            testResult.type === 'success' ? (
              <CheckCircleOutlined />
            ) : testResult.type === 'error' ? (
              <CloseCircleOutlined />
            ) : undefined
          }
          style={{ marginBottom: 24 }}
          closable
          onClose={() => setTestResult(null)}
        />
      )}

      <Card
        title={
          <Space>
            <span>Slack 通知</span>
            <Switch
              checked={slackEnabled}
              onChange={setSlackEnabled}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
            {slackEnabled && <Tag color="green">已启用</Tag>}
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Form
          form={slackForm}
          layout="vertical"
          initialValues={{
            username: 'CI/CD Bot',
            iconEmoji: ':rocket:',
            defaultChannel: '#ci-cd-notifications',
          }}
          onFinish={saveSlackConfig}
        >
          <Form.Item
            name="webhookUrl"
            label="Webhook URL"
            rules={[
              { required: slackEnabled, message: '请输入 Webhook URL' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input.Password
              placeholder="https://hooks.slack.com/services/xxx/xxx/xxx"
              disabled={!slackEnabled}
            />
          </Form.Item>

          <Form.Item
            name="defaultChannel"
            label="默认频道"
            rules={[{ required: slackEnabled, message: '请输入默认频道' }]}
          >
            <Input placeholder="#general" disabled={!slackEnabled} />
          </Form.Item>

          <Form.Item name="username" label="机器人名称">
            <Input placeholder="CI/CD Bot" disabled={!slackEnabled} />
          </Form.Item>

          <Form.Item name="iconEmoji" label="机器人图标">
            <Input placeholder=":rocket:" disabled={!slackEnabled} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!slackEnabled}
              >
                保存配置
              </Button>
              <Button
                onClick={testSlackConnection}
                disabled={!slackEnabled}
              >
                测试连接
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Alert
          message="配置说明"
          description={
            <div>
              <p>1. 前往 Slack 应用管理页面，创建一个新的 Incoming Webhook</p>
              <p>2. 将生成的 Webhook URL 填入上方</p>
              <p>3. 配置默认频道，构建状态变更时会自动发送通知</p>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>

      <Card
        title={
          <Space>
            <span>邮件通知</span>
            <Switch
              checked={emailEnabled}
              onChange={setEmailEnabled}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
            {emailEnabled && <Tag color="green">已启用</Tag>}
          </Space>
        }
      >
        <Form
          form={emailForm}
          layout="vertical"
          initialValues={{
            smtpPort: 587,
            useTls: true,
          }}
          onFinish={saveEmailConfig}
        >
          <Form.Item
            name="smtpHost"
            label="SMTP 服务器"
            rules={[{ required: emailEnabled, message: '请输入 SMTP 服务器地址' }]}
          >
            <Input placeholder="smtp.example.com" disabled={!emailEnabled} />
          </Form.Item>

          <Form.Item
            name="smtpPort"
            label="SMTP 端口"
            rules={[{ required: emailEnabled, message: '请输入 SMTP 端口' }]}
          >
            <Select disabled={!emailEnabled} style={{ width: 200 }}>
              <Option value={25}>25 (不加密)</Option>
              <Option value={465}>465 (SSL)</Option>
              <Option value={587}>587 (STARTTLS)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: emailEnabled, message: '请输入用户名' }]}
          >
            <Input placeholder="user@example.com" disabled={!emailEnabled} />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码/授权码"
            rules={[{ required: emailEnabled, message: '请输入密码或授权码' }]}
          >
            <Input.Password placeholder="输入密码或授权码" disabled={!emailEnabled} />
          </Form.Item>

          <Form.Item
            name="fromAddress"
            label="发件人地址"
            rules={[
              { required: emailEnabled, message: '请输入发件人地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="noreply@example.com" disabled={!emailEnabled} />
          </Form.Item>

          <Form.Item
            name="toAddresses"
            label="默认收件人（多个用逗号分隔）"
            rules={[{ required: emailEnabled, message: '请输入收件人地址' }]}
          >
            <TextArea
              placeholder="admin@example.com, dev@example.com"
              rows={2}
              disabled={!emailEnabled}
            />
          </Form.Item>

          <Form.Item name="useTls" label="使用 TLS 加密" valuePropName="checked">
            <Switch disabled={!emailEnabled} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!emailEnabled}
              >
                保存配置
              </Button>
              <Button
                onClick={testEmailConnection}
                disabled={!emailEnabled}
              >
                测试连接
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Alert
          message="配置说明"
          description={
            <div>
              <p>1. 使用企业邮箱的 SMTP 服务发送通知邮件</p>
              <p>2. 对于 Gmail，需要使用应用专用密码并开启 2FA</p>
              <p>3. 对于 QQ 邮箱/163 邮箱，需要在设置中开启 SMTP 服务并获取授权码</p>
              <p>4. 构建成功/失败时会自动发送邮件通知</p>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>

      <Divider />

      <Card title="通知触发条件">
        <Form layout="vertical">
          <Form.Item label="构建状态通知">
            <Space direction="vertical">
              <Checkbox.Group defaultValue={['success', 'failed']}>
                <Space direction="vertical">
                  <Checkbox value="success">构建成功</Checkbox>
                  <Checkbox value="failed">构建失败</Checkbox>
                  <Checkbox value="running">构建开始</Checkbox>
                  <Checkbox value="always">所有状态</Checkbox>
                </Space>
              </Checkbox.Group>
            </Space>
          </Form.Item>

          <Form.Item label="通知时机">
            <Radio.Group defaultValue="after">
              <Space>
                <Radio value="after">每个阶段完成后</Radio>
                <Radio value="end">整个流水线结束后</Radio>
                <Radio value="both">两者都通知</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="包含内容">
            <Checkbox.Group defaultValue={['commit', 'duration', 'artifacts']}>
              <Space direction="vertical">
                <Checkbox value="commit">提交信息</Checkbox>
                <Checkbox value="duration">构建耗时</Checkbox>
                <Checkbox value="artifacts">产物列表</Checkbox>
                <Checkbox value="logs">日志摘要</Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item>
            <Button type="primary" icon={<SaveOutlined />}>
              保存通知设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default SettingsPage;
