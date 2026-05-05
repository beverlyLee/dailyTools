import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Slider,
  Divider,
  Row,
  Col,
  message,
  Space
} from 'antd';
import {
  SaveOutlined,
  SettingOutlined,
  ApiOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    modelType: 'realesrgan_x4plus',
    apiUrl: 'http://localhost:8001',
    timeout: 180,
    defaultScale: 4,
    enableInpainting: true,
    enableColorization: false,
    outputQuality: 'high',
    canvasWidth: 800,
    canvasHeight: 500,
  });

  const handleInputChange = (name, value) => {
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/settings/save', settings);
      if (response.data.success) {
        message.success('设置已保存');
      } else {
        message.error('保存失败: ' + (response.data.message || '未知错误'));
      }
    } catch (error) {
      console.error('Save settings error:', error);
      message.error('保存失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSettings({
      modelType: 'realesrgan_x4plus',
      apiUrl: 'http://localhost:8001',
      timeout: 180,
      defaultScale: 4,
      enableInpainting: true,
      enableColorization: false,
      outputQuality: 'high',
      canvasWidth: 800,
      canvasHeight: 500,
    });
    message.info('已恢复默认设置');
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/health');
      if (response.data.status === 'ok') {
        message.success('连接成功！后端服务运行正常');
      } else {
        message.error('连接异常: ' + (response.data.message || '未知错误'));
      }
    } catch (error) {
      console.error('Test connection error:', error);
      message.error('连接失败，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Row gutter={24}>
        <Col span={12}>
          <Card 
            title={
              <Space>
                <ApiOutlined />
                <span>API 设置</span>
              </Space>
            }
          >
            <Form layout="vertical">
              <Form.Item label="后端API地址">
                <Input
                  value={settings.apiUrl}
                  onChange={(e) => handleInputChange('apiUrl', e.target.value)}
                  placeholder="http://localhost:8001"
                  addonAfter={
                    <Button 
                      size="small" 
                      onClick={testConnection}
                      loading={loading}
                    >
                      测试连接
                    </Button>
                  }
                />
              </Form.Item>

              <Form.Item label="默认超分辨率模型">
                <Select
                  value={settings.modelType}
                  onChange={(value) => handleInputChange('modelType', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="realesrgan_x4plus">Real-ESRGAN x4 (推荐)</Option>
                  <Option value="realesrgan_x2plus">Real-ESRGAN x2</Option>
                  <Option value="realesrgan_x8">Real-ESRGAN x8</Option>
                  <Option value="swinir_lightweight_x4">SwinIR Lightweight x4</Option>
                  <Option value="swinir_classical_x4">SwinIR Classical x4</Option>
                </Select>
              </Form.Item>

              <Form.Item label={`请求超时: ${settings.timeout} 秒`}>
                <Slider
                  min={30}
                  max={300}
                  value={settings.timeout}
                  onChange={(value) => handleInputChange('timeout', value)}
                  marks={{
                    30: '30s',
                    60: '1min',
                    120: '2min',
                    180: '3min',
                    300: '5min'
                  }}
                />
              </Form.Item>

              <Form.Item label="默认放大倍数">
                <Select
                  value={settings.defaultScale}
                  onChange={(value) => handleInputChange('defaultScale', value)}
                  style={{ width: '100%' }}
                >
                  <Option value={2}>2倍</Option>
                  <Option value={4}>4倍 (推荐)</Option>
                  <Option value={8}>8倍</Option>
                </Select>
              </Form.Item>

              <Form.Item label="输出图像质量">
                <Select
                  value={settings.outputQuality}
                  onChange={(value) => handleInputChange('outputQuality', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="low">低 (快速，适合预览)</Option>
                  <Option value="medium">中等 (平衡)</Option>
                  <Option value="high">高 (推荐)</Option>
                  <Option value="ultra">超高 (最慢，最高质量)</Option>
                </Select>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title={
              <Space>
                <ExperimentOutlined />
                <span>画布与功能设置</span>
              </Space>
            }
          >
            <Form layout="vertical">
              <Form.Item label="画布尺寸">
                <Row gutter={16}>
                  <Col span={12}>
                    <Input
                      type="number"
                      value={settings.canvasWidth}
                      onChange={(e) => handleInputChange('canvasWidth', parseInt(e.target.value))}
                      addonBefore="宽度"
                      addonAfter="px"
                    />
                  </Col>
                  <Col span={12}>
                    <Input
                      type="number"
                      value={settings.canvasHeight}
                      onChange={(e) => handleInputChange('canvasHeight', parseInt(e.target.value))}
                      addonBefore="高度"
                      addonAfter="px"
                    />
                  </Col>
                </Row>
              </Form.Item>

              <Divider>功能开关</Divider>

              <Form.Item
                label="默认启用划痕修复"
                extra="新上传照片时默认启用划痕修复功能"
              >
                <Switch
                  checked={settings.enableInpainting}
                  onChange={(checked) => handleInputChange('enableInpainting', checked)}
                />
              </Form.Item>

              <Form.Item
                label="默认启用智能上色"
                extra="新上传照片时默认启用智能上色功能"
              >
                <Switch
                  checked={settings.enableColorization}
                  onChange={(checked) => handleInputChange('enableColorization', checked)}
                />
              </Form.Item>
            </Form>
          </Card>

          <Card 
            title={
              <Space>
                <SettingOutlined />
                <span>操作</span>
              </Space>
            }
            style={{ marginTop: '16px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                block
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
              >
                保存设置
              </Button>
              <Button
                block
                onClick={handleReset}
              >
                恢复默认设置
              </Button>
            </Space>
          </Card>

          <Card title="关于系统" style={{ marginTop: '16px' }}>
            <div>
              <p><strong>系统名称：</strong>老照片超分辨率修复系统</p>
              <p><strong>版本号：</strong>1.0.0</p>
              <p><strong>技术架构：</strong></p>
              <ul>
                <li>前端: React + Ant Design + Fabric.js</li>
                <li>后端: Python + FastAPI</li>
                <li>超分辨率模型: Real-ESRGAN / SwinIR</li>
                <li>修复技术: Inpainting</li>
                <li>上色技术: Colorization</li>
                <li>数据库: SQLite</li>
              </ul>
              <p><strong>功能特点：</strong></p>
              <ul>
                <li>支持 2倍、4倍、8倍 超分辨率重建</li>
                <li>自动修复照片划痕和破损区域</li>
                <li>黑白照片智能上色</li>
                <li>处理前后对比滑块交互</li>
                <li>PNG高清下载</li>
                <li>修复历史记录管理</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default SettingsPage;
