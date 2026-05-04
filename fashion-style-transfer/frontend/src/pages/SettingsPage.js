import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Input, Select, Switch, Slider, Button, message, Divider, InputNumber, Space } from 'antd';
import { 
  SettingOutlined, 
  SaveOutlined, 
  ResetOutlined,
  CloudOutlined,
  ApiOutlined,
  PictureOutlined,
  HistoryOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import './SettingsPage.css';

const { Option } = Select;
const { TextArea } = Input;

const SettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const initialValues = {
    api_base_url: 'http://localhost:8000',
    api_timeout: 300000,
    model_provider: 'local',
    controlnet_model: 'control_v11p_sd15_openpose',
    base_model: 'sd_v1_5',
    default_strength: 0.8,
    output_resolution: '1024x768',
    output_format: 'png',
    output_quality: 100,
    enable_history: true,
    max_history_items: 100,
    auto_save_history: true,
    enable_cors: true,
    upload_max_size: 10,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    debug_mode: false,
    log_level: 'info',
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = localStorage.getItem('fashion_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        form.setFieldsValue({ ...initialValues, ...parsed });
      } else {
        form.setFieldsValue(initialValues);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      form.setFieldsValue(initialValues);
    }
  };

  const handleSave = async (values) => {
    setLoading(true);
    try {
      localStorage.setItem('fashion_settings', JSON.stringify(values));
      message.success('设置已保存');
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

  const handleTestConnection = async () => {
    const values = form.getFieldsValue();
    message.loading('正在测试连接...', 1);
    
    try {
      const response = await fetch(`${values.api_base_url}/health`);
      if (response.ok) {
        setTimeout(() => {
          message.success('连接成功！');
        }, 1000);
      } else {
        setTimeout(() => {
          message.error('连接失败: 服务器返回错误状态');
        }, 1000);
      }
    } catch (error) {
      setTimeout(() => {
        message.error(`连接失败: ${error.message}`);
      }, 1000);
    }
  };

  const formatOptions = [
    { label: 'JPG', value: 'jpg' },
    { label: 'JPEG', value: 'jpeg' },
    { label: 'PNG', value: 'png' },
    { label: 'WebP', value: 'webp' },
  ];

  const resolutionOptions = [
    { label: '512 x 384', value: '512x384' },
    { label: '768 x 512', value: '768x512' },
    { label: '1024 x 768', value: '1024x768' },
    { label: '1280 x 960', value: '1280x960' },
    { label: '1536 x 1024', value: '1536x1024' },
  ];

  const logLevelOptions = [
    { label: 'Debug', value: 'debug' },
    { label: 'Info', value: 'info' },
    { label: 'Warning', value: 'warning' },
    { label: 'Error', value: 'error' },
  ];

  const modelProviderOptions = [
    { label: '本地模型 (Local)', value: 'local' },
    { label: 'Hugging Face', value: 'huggingface' },
    { label: 'ModelScope', value: 'modelscope' },
    { label: 'Ollama', value: 'ollama' },
  ];

  const controlnetModels = [
    { label: 'OpenPose (姿态)', value: 'control_v11p_sd15_openpose' },
    { label: 'Canny (边缘)', value: 'control_v11p_sd15_canny' },
    { label: 'Depth (深度)', value: 'control_v11f1p_sd15_depth' },
    { label: 'Normal (法线)', value: 'control_v11p_sd15_normalbae' },
    { label: 'Scribble (涂鸦)', value: 'control_v11p_sd15_scribble' },
    { label: 'Soft Edge (软边缘)', value: 'control_v11p_sd15_softedge' },
  ];

  return (
    <div className="settings-page">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            onFinish={handleSave}
          >
            <Card
              title={
                <span>
                  <ApiOutlined style={{ marginRight: 8 }} />
                  API 配置
                </span>
              }
              className="page-card settings-card"
              headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
            >
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="api_base_url"
                    label="API 基础地址"
                    rules={[{ required: true, message: '请输入API地址' }]}
                  >
                    <Input 
                      placeholder="例如: http://localhost:8000"
                      prefix={<CloudOutlined style={{ color: '#A0522D' }} />}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="api_timeout"
                    label="超时时间 (毫秒)"
                    rules={[{ required: true, message: '请输入超时时间' }]}
                  >
                    <InputNumber
                      min={10000}
                      max={600000}
                      step={10000}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={2}>
                  <Form.Item label=" ">
                    <Button 
                      onClick={handleTestConnection}
                      className="btn-secondary"
                    >
                      测试连接
                    </Button>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="model_provider"
                    label="模型提供商"
                  >
                    <Select>
                      {modelProviderOptions.map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="controlnet_model"
                    label="ControlNet 模型"
                  >
                    <Select>
                      {controlnetModels.map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="base_model"
                    label="基础模型"
                  >
                    <Input placeholder="例如: sd_v1_5, sd_xl_base_1.0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="default_strength"
                    label="默认迁移强度"
                  >
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      marks={{
                        0: '0%',
                        0.5: '50%',
                        1: '100%',
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />

            <Card
              title={
                <span>
                  <PictureOutlined style={{ marginRight: 8 }} />
                  输出设置
                </span>
              }
              className="page-card settings-card"
              headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="output_resolution"
                    label="输出分辨率"
                  >
                    <Select>
                      {resolutionOptions.map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="output_format"
                    label="输出格式"
                  >
                    <Select>
                      {formatOptions.map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="output_quality"
                    label="输出质量 (JPEG/WebP)"
                  >
                    <Slider
                      min={1}
                      max={100}
                      step={1}
                      marks={{
                        1: '低',
                        50: '中',
                        100: '高',
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="upload_max_size"
                    label="最大上传大小 (MB)"
                  >
                    <InputNumber
                      min={1}
                      max={100}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="allowed_formats"
                    label="允许的格式"
                  >
                    <Select
                      mode="multiple"
                      placeholder="选择格式"
                      options={formatOptions}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />

            <Card
              title={
                <span>
                  <HistoryOutlined style={{ marginRight: 8 }} />
                  历史记录设置
                </span>
              }
              className="page-card settings-card"
              headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="enable_history"
                    label="启用历史记录"
                    valuePropName="checked"
                  >
                    <Switch 
                      checkedChildren="开启" 
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="auto_save_history"
                    label="自动保存历史"
                    valuePropName="checked"
                  >
                    <Switch 
                      checkedChildren="开启" 
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="max_history_items"
                    label="最大历史条目"
                  >
                    <InputNumber
                      min={10}
                      max={1000}
                      step={10}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />

            <Card
              title={
                <span>
                  <DatabaseOutlined style={{ marginRight: 8 }} />
                  高级设置
                </span>
              }
              className="page-card settings-card"
              headStyle={{ background: 'linear-gradient(90deg, #FFFAF0, #FFF8DC)', borderBottom: '1px solid #DEB887' }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="enable_cors"
                    label="启用 CORS"
                    valuePropName="checked"
                    tooltip="允许跨域请求"
                  >
                    <Switch 
                      checkedChildren="开启" 
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="debug_mode"
                    label="调试模式"
                    valuePropName="checked"
                    tooltip="显示详细错误信息"
                  >
                    <Switch 
                      checkedChildren="开启" 
                      unCheckedChildren="关闭"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="log_level"
                    label="日志级别"
                  >
                    <Select>
                      {logLevelOptions.map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />

            <div className="settings-actions">
              <Space size="middle">
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={loading}
                  icon={<SaveOutlined />}
                  className="btn-primary"
                  size="large"
                >
                  保存设置
                </Button>
                <Button 
                  onClick={handleReset}
                  icon={<ResetOutlined />}
                  size="large"
                >
                  重置默认
                </Button>
              </Space>
            </div>
          </Form>
        </Col>
      </Row>
    </div>
  );
};

export default SettingsPage;
