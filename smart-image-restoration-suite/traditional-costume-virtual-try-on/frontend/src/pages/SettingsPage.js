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
    modelType: 'controlnet_sdxl',
    apiUrl: 'http://localhost:8000',
    timeout: 120,
    defaultCostume: 'hanfu_ming',
    enableHistory: true,
    enableLocalRepaint: true,
    outputQuality: 'high',
    canvasWidth: 800,
    canvasHeight: 600,
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
      modelType: 'controlnet_sdxl',
      apiUrl: 'http://localhost:8000',
      timeout: 120,
      defaultCostume: 'hanfu_ming',
      enableHistory: true,
      enableLocalRepaint: true,
      outputQuality: 'high',
      canvasWidth: 800,
      canvasHeight: 600,
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
                  placeholder="http://localhost:8000"
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

              <Form.Item label="AI模型选择">
                <Select
                  value={settings.modelType}
                  onChange={(value) => handleInputChange('modelType', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="controlnet_sdxl">ControlNet SDXL (推荐)</Option>
                  <Option value="controlnet_1_5">ControlNet 1.5</Option>
                  <Option value="openpose_controlnet">OpenPose ControlNet</Option>
                  <Option value="custom">自定义模型</Option>
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

              <Form.Item label="默认服饰类型">
                <Select
                  value={settings.defaultCostume}
                  onChange={(value) => handleInputChange('defaultCostume', value)}
                  style={{ width: '100%' }}
                >
                  <Option value="hanfu_ming">明制汉服</Option>
                  <Option value="hanfu_tang">唐制汉服</Option>
                  <Option value="qipao">旗袍</Option>
                  <Option value="qipao_modern">改良旗袍</Option>
                  <Option value="hanfu_song">宋制汉服</Option>
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
                label="启用历史记录"
                extra="保存用户的创作历史到本地数据库"
              >
                <Switch
                  checked={settings.enableHistory}
                  onChange={(checked) => handleInputChange('enableHistory', checked)}
                />
              </Form.Item>

              <Form.Item
                label="启用局部重绘"
                extra="允许用户对服饰细节进行局部重绘和调整"
              >
                <Switch
                  checked={settings.enableLocalRepaint}
                  onChange={(checked) => handleInputChange('enableLocalRepaint', checked)}
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
              <p><strong>系统名称：</strong>国风服饰虚拟换装系统</p>
              <p><strong>版本号：</strong>1.0.0</p>
              <p><strong>技术架构：</strong></p>
              <ul>
                <li>前端: React + Ant Design + Fabric.js</li>
                <li>后端: Python + FastAPI</li>
                <li>AI模型: ControlNet (基于Diffusion Model)</li>
                <li>数据库: SQLite</li>
              </ul>
              <p><strong>功能特点：</strong></p>
              <ul>
                <li>支持多种传统服饰类型（汉服、旗袍等）</li>
                <li>保持人物姿态不变进行风格迁移</li>
                <li>支持局部细节重绘（刺绣纹样、盘扣等）</li>
                <li>PNG高清下载</li>
                <li>创作历史记录管理</li>
              </ul>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default SettingsPage;
