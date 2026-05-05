import React, { useState } from 'react';
import { Card, Form, Input, Select, Switch, Button, Divider, message, InputNumber } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const { Option } = Select;

const SettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const initialValues = {
    backendUrl: 'http://localhost:8080',
    autoRefresh: true,
    refreshInterval: 5000,
    highlightAbnormalLinks: true,
    showFlowAnimation: true,
    showMetricsOnLinks: true,
    nodeClickAction: 'showDetail',
    theme: 'light',
    language: 'zh-CN',
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // 模拟保存设置
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 这里可以将设置保存到 localStorage 或发送到后端
      localStorage.setItem('topologySettings', JSON.stringify(values));
      
      message.success('设置保存成功');
    } catch (error) {
      message.error('保存失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(initialValues);
    message.info('已重置为默认设置');
  };

  return (
    <div>
      <Card title="系统设置" size="small">
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSave}
        >
          <Divider>连接设置</Divider>
          
          <Form.Item
            label="后端服务地址"
            name="backendUrl"
            rules={[
              { required: true, message: '请输入后端服务地址' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input placeholder="http://localhost:8080" />
          </Form.Item>

          <Form.Item
            label="自动刷新"
            name="autoRefresh"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item
            label="刷新间隔 (毫秒)"
            name="refreshInterval"
            dependencies={['autoRefresh']}
            rules={[
              { required: true, message: '请输入刷新间隔' },
              { type: 'number', min: 1000, max: 60000, message: '刷新间隔应在 1000-60000 毫秒之间' },
            ]}
          >
            <InputNumber
              min={1000}
              max={60000}
              step={1000}
              style={{ width: '100%' }}
              placeholder="5000"
            />
          </Form.Item>

          <Divider>显示设置</Divider>

          <Form.Item
            label="高亮异常链路"
            name="highlightAbnormalLinks"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item
            label="显示流量动画"
            name="showFlowAnimation"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item
            label="在连线上显示指标"
            name="showMetricsOnLinks"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item
            label="节点点击行为"
            name="nodeClickAction"
            rules={[{ required: true, message: '请选择节点点击行为' }]}
          >
            <Select placeholder="请选择">
              <Option value="showDetail">显示服务详情</Option>
              <Option value="showInstances">显示服务实例</Option>
              <Option value="showMetrics">显示指标图表</Option>
              <Option value="none">无操作</Option>
            </Select>
          </Form.Item>

          <Divider>界面设置</Divider>

          <Form.Item
            label="主题"
            name="theme"
            rules={[{ required: true, message: '请选择主题' }]}
          >
            <Select placeholder="请选择">
              <Option value="light">浅色</Option>
              <Option value="dark">深色</Option>
              <Option value="auto">跟随系统</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="语言"
            name="language"
            rules={[{ required: true, message: '请选择语言' }]}
          >
            <Select placeholder="请选择">
              <Option value="zh-CN">简体中文</Option>
              <Option value="zh-TW">繁体中文</Option>
              <Option value="en-US">English</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              style={{ marginRight: 8 }}
            >
              保存设置
            </Button>
            <Button onClick={handleReset}>
              重置默认
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;
