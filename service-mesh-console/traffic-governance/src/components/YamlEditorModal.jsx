import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, message, Tag, Descriptions, Form, Input, Select, Switch, InputNumber, Card } from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CodeOutlined,
  FormOutlined,
} from '@ant-design/icons';
import yaml from 'js-yaml';
import { getRuleYAML, applyRuleYAML, RULE_TYPES } from '../api/governance';

const { TextArea } = Input;
const { Option } = Select;

const YamlEditorModal = ({
  visible,
  onCancel,
  onSave,
  ruleType,
  rule,
  isEdit = false,
}) => {
  const [yamlContent, setYamlContent] = useState('');
  const [formData, setFormData] = useState(null);
  const [isSynced, setIsSynced] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('yaml'); // 'yaml' or 'form'
  const yamlRef = useRef(null);

  // 初始化数据
  useEffect(() => {
    if (visible) {
      if (rule && isEdit) {
        // 编辑模式：从后端获取 YAML
        fetchRuleYAML();
      } else {
        // 新建模式：生成默认 YAML 模板
        const defaultYAML = generateDefaultYAML(ruleType);
        setYamlContent(defaultYAML);
        try {
          const parsed = yaml.load(defaultYAML);
          setFormData(parsed);
          setIsSynced(true);
        } catch (error) {
          setIsSynced(false);
        }
      }
      setActiveTab('yaml');
    }
  }, [visible, rule, isEdit, ruleType]);

  // 生成默认 YAML 模板
  const generateDefaultYAML = (type) => {
    const templates = {
      [RULE_TYPES.CANARY]: `name: new-canary-rule
namespace: default
service: your-service
stableVersion: v1
canaryVersion: v2
weight: 10
trafficRules:
  byWeight: true
  byHeader: {}
  byCookie: {}
status: active`,
      [RULE_TYPES.BLUE_GREEN]: `name: new-blue-green-rule
namespace: default
service: your-service
blueVersion: v1
greenVersion: v2
activeVersion: blue
status: active`,
      [RULE_TYPES.CIRCUIT_BREAKER]: `name: new-circuit-breaker-rule
namespace: default
service: your-service
maxConnections: 100
maxRequests: 200
timeoutMs: 5000
retryPolicy:
  attempts: 3
  perTryTimeoutMs: 1000
  retryOn: "5xx,connect-failure,refused-stream"
fallbackPolicy:
  enabled: true
  maxErrors: 5
  errorWindowMs: 30000
  baseTimeMs: 60000
status: active`,
      [RULE_TYPES.ACCESS_CONTROL]: `name: new-access-control-rule
namespace: default
service: your-service
ruleType: whitelist
sources:
  - type: ip
    value: 10.0.0.0/8
  - type: service
    value: frontend-service
status: active`,
    };
    return templates[type] || '';
  };

  // 从后端获取规则 YAML
  const fetchRuleYAML = async () => {
    if (!rule?.name) return;

    setLoading(true);
    try {
      const yamlStr = await getRuleYAML(ruleType, rule.name);
      setYamlContent(yamlStr);
      try {
        const parsed = yaml.load(yamlStr);
        setFormData(parsed);
        setIsSynced(true);
      } catch (error) {
        setIsSynced(false);
        message.warning('YAML 格式不正确，请检查语法');
      }
    } catch (error) {
      message.error('获取规则 YAML 失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // YAML 内容变化时同步到表单
  const handleYamlChange = (value) => {
    setYamlContent(value);
    try {
      const parsed = yaml.load(value);
      setFormData(parsed);
      setIsSynced(true);
    } catch (error) {
      setIsSynced(false);
    }
  };

  // 表单数据变化时同步到 YAML
  const handleFormChange = (newFormData) => {
    setFormData(newFormData);
    try {
      const yamlStr = yaml.dump(newFormData, { indent: 2 });
      setYamlContent(yamlStr);
      setIsSynced(true);
    } catch (error) {
      setIsSynced(false);
    }
  };

  // 保存规则
  const handleSave = async () => {
    if (!isSynced) {
      message.error('YAML 格式不正确，无法保存');
      return;
    }

    setSaving(true);
    try {
      // 验证 YAML
      const parsed = yaml.load(yamlContent);
      if (!parsed.name) {
        message.error('规则名称不能为空');
        return;
      }

      // 应用 YAML 规则
      const result = await applyRuleYAML(ruleType, yamlContent);
      
      message.success(isEdit ? '规则更新成功' : '规则创建成功');
      onSave && onSave(result);
      onCancel && onCancel();
    } catch (error) {
      message.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 渲染不同规则类型的表单
  const renderFormByType = () => {
    if (!formData) return null;

    switch (ruleType) {
      case RULE_TYPES.CANARY:
        return (
          <Form layout="vertical">
            <div className="form-section">
              <div className="form-section-title">基本信息</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="规则名称">
                    <Input
                      value={formData.name}
                      onChange={(e) => handleFormChange({ ...formData, name: e.target.value })}
                      placeholder="请输入规则名称"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="命名空间">
                    <Input
                      value={formData.namespace}
                      onChange={(e) => handleFormChange({ ...formData, namespace: e.target.value })}
                      placeholder="default"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="目标服务">
                <Input
                  value={formData.service}
                  onChange={(e) => handleFormChange({ ...formData, service: e.target.value })}
                  placeholder="请输入目标服务名称"
                />
              </Form.Item>
            </div>

            <div className="form-section">
              <div className="form-section-title">版本配置</div>
              <div className="version-selector">
                <Card size="small" style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>稳定版本</div>
                  <Input
                    value={formData.stableVersion}
                    onChange={(e) => handleFormChange({ ...formData, stableVersion: e.target.value })}
                    placeholder="v1"
                  />
                </Card>
                <div className="version-arrow">→</div>
                <Card size="small" style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>金丝雀版本</div>
                  <Input
                    value={formData.canaryVersion}
                    onChange={(e) => handleFormChange({ ...formData, canaryVersion: e.target.value })}
                    placeholder="v2"
                  />
                </Card>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">流量分配</div>
              <div className="weight-slider">
                <div style={{ marginBottom: 8 }}>
                  <span>金丝雀版本流量比例: <strong>{formData.weight || 10}%</strong></span>
                </div>
                <InputNumber
                  min={0}
                  max={100}
                  value={formData.weight}
                  onChange={(value) => handleFormChange({ ...formData, weight: value })}
                  style={{ width: '100%' }}
                  addonAfter="%"
                />
              </div>
              <div className="traffic-preview" style={{ marginTop: 16 }}>
                <div className="traffic-preview-title">流量预览</div>
                <div className="traffic-preview-content">
                  <div className="traffic-preview-item">
                    <div className="traffic-preview-color" style={{ backgroundColor: '#1890ff' }} />
                    <span>稳定版本: {100 - (formData.weight || 10)}%</span>
                  </div>
                  <div className="traffic-preview-item">
                    <div className="traffic-preview-color" style={{ backgroundColor: '#52c41a' }} />
                    <span>金丝雀版本: {formData.weight || 10}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">流量规则</div>
              <Form.Item label="按权重分配">
                <Switch
                  checked={formData.trafficRules?.byWeight}
                  onChange={(checked) => handleFormChange({
                    ...formData,
                    trafficRules: { ...formData.trafficRules, byWeight: checked }
                  })}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
              </Form.Item>
              <Form.Item label="按 Header 分配 (JSON 格式)">
                <TextArea
                  value={JSON.stringify(formData.trafficRules?.byHeader || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleFormChange({
                        ...formData,
                        trafficRules: { ...formData.trafficRules, byHeader: parsed }
                      });
                    } catch (err) {
                      // 允许编辑过程中的临时错误
                    }
                  }}
                  rows={3}
                  placeholder='{"x-canary": "true"}'
                />
              </Form.Item>
              <Form.Item label="按 Cookie 分配 (JSON 格式)">
                <TextArea
                  value={JSON.stringify(formData.trafficRules?.byCookie || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleFormChange({
                        ...formData,
                        trafficRules: { ...formData.trafficRules, byCookie: parsed }
                      });
                    } catch (err) {
                      // 允许编辑过程中的临时错误
                    }
                  }}
                  rows={3}
                  placeholder='{"canary_user": "123"}'
                />
              </Form.Item>
            </div>
          </Form>
        );

      case RULE_TYPES.BLUE_GREEN:
        return (
          <Form layout="vertical">
            <div className="form-section">
              <div className="form-section-title">基本信息</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="规则名称">
                    <Input
                      value={formData.name}
                      onChange={(e) => handleFormChange({ ...formData, name: e.target.value })}
                      placeholder="请输入规则名称"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="命名空间">
                    <Input
                      value={formData.namespace}
                      onChange={(e) => handleFormChange({ ...formData, namespace: e.target.value })}
                      placeholder="default"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="目标服务">
                <Input
                  value={formData.service}
                  onChange={(e) => handleFormChange({ ...formData, service: e.target.value })}
                  placeholder="请输入目标服务名称"
                />
              </Form.Item>
            </div>

            <div className="form-section">
              <div className="form-section-title">版本配置</div>
              <div className="blue-green-switch">
                <div className={`blue-green-version ${formData.activeVersion === 'blue' ? 'active' : ''}`}>
                  <div className="blue-green-version-label">Blue 版本</div>
                  <div className="blue-green-version-value">{formData.blueVersion || 'v1'}</div>
                </div>
                <Button
                  type="primary"
                  className="blue-green-switch-btn"
                  onClick={() => handleFormChange({
                    ...formData,
                    activeVersion: formData.activeVersion === 'blue' ? 'green' : 'blue'
                  })}
                >
                  ⇄
                </Button>
                <div className={`blue-green-version ${formData.activeVersion === 'green' ? 'active' : ''}`}>
                  <div className="blue-green-version-label">Green 版本</div>
                  <div className="blue-green-version-value">{formData.greenVersion || 'v2'}</div>
                </div>
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Blue 版本">
                    <Input
                      value={formData.blueVersion}
                      onChange={(e) => handleFormChange({ ...formData, blueVersion: e.target.value })}
                      placeholder="v1"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Green 版本">
                    <Input
                      value={formData.greenVersion}
                      onChange={(e) => handleFormChange({ ...formData, greenVersion: e.target.value })}
                      placeholder="v2"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="当前活跃版本">
                <Select
                  value={formData.activeVersion}
                  onChange={(value) => handleFormChange({ ...formData, activeVersion: value })}
                  style={{ width: 200 }}
                >
                  <Option value="blue">Blue</Option>
                  <Option value="green">Green</Option>
                </Select>
              </Form.Item>
            </div>
          </Form>
        );

      case RULE_TYPES.CIRCUIT_BREAKER:
        return (
          <Form layout="vertical">
            <div className="form-section">
              <div className="form-section-title">基本信息</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="规则名称">
                    <Input
                      value={formData.name}
                      onChange={(e) => handleFormChange({ ...formData, name: e.target.value })}
                      placeholder="请输入规则名称"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="命名空间">
                    <Input
                      value={formData.namespace}
                      onChange={(e) => handleFormChange({ ...formData, namespace: e.target.value })}
                      placeholder="default"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="目标服务">
                <Input
                  value={formData.service}
                  onChange={(e) => handleFormChange({ ...formData, service: e.target.value })}
                  placeholder="请输入目标服务名称"
                />
              </Form.Item>
            </div>

            <div className="form-section">
              <div className="form-section-title">连接配置</div>
              <div className="circuit-breaker-config">
                <Form.Item label="最大连接数">
                  <InputNumber
                    min={1}
                    max={10000}
                    value={formData.maxConnections}
                    onChange={(value) => handleFormChange({ ...formData, maxConnections: value })}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item label="最大请求数">
                  <InputNumber
                    min={1}
                    max={100000}
                    value={formData.maxRequests}
                    onChange={(value) => handleFormChange({ ...formData, maxRequests: value })}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item label="超时时间 (毫秒)">
                  <InputNumber
                    min={100}
                    max={60000}
                    value={formData.timeoutMs}
                    onChange={(value) => handleFormChange({ ...formData, timeoutMs: value })}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">重试策略</div>
              <div className="retry-config">
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="重试次数">
                      <InputNumber
                        min={0}
                        max={10}
                        value={formData.retryPolicy?.attempts}
                        onChange={(value) => handleFormChange({
                          ...formData,
                          retryPolicy: { ...formData.retryPolicy, attempts: value }
                        })}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="每次重试超时 (毫秒)">
                      <InputNumber
                        min={100}
                        max={30000}
                        value={formData.retryPolicy?.perTryTimeoutMs}
                        onChange={(value) => handleFormChange({
                          ...formData,
                          retryPolicy: { ...formData.retryPolicy, perTryTimeoutMs: value }
                        })}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="重试条件">
                      <Input
                        value={formData.retryPolicy?.retryOn}
                        onChange={(e) => handleFormChange({
                          ...formData,
                          retryPolicy: { ...formData.retryPolicy, retryOn: e.target.value }
                        })}
                        placeholder="5xx,connect-failure"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">降级策略</div>
              <div className="fallback-config">
                <Form.Item label="启用降级">
                  <Switch
                    checked={formData.fallbackPolicy?.enabled}
                    onChange={(checked) => handleFormChange({
                      ...formData,
                      fallbackPolicy: { ...formData.fallbackPolicy, enabled: checked }
                    })}
                    checkedChildren="开启"
                    unCheckedChildren="关闭"
                  />
                </Form.Item>
                {formData.fallbackPolicy?.enabled && (
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="最大错误数">
                        <InputNumber
                          min={1}
                          max={100}
                          value={formData.fallbackPolicy?.maxErrors}
                          onChange={(value) => handleFormChange({
                            ...formData,
                            fallbackPolicy: { ...formData.fallbackPolicy, maxErrors: value }
                          })}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="错误统计窗口 (毫秒)">
                        <InputNumber
                          min={1000}
                          max={300000}
                          value={formData.fallbackPolicy?.errorWindowMs}
                          onChange={(value) => handleFormChange({
                            ...formData,
                            fallbackPolicy: { ...formData.fallbackPolicy, errorWindowMs: value }
                          })}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="基础恢复时间 (毫秒)">
                        <InputNumber
                          min={1000}
                          max={300000}
                          value={formData.fallbackPolicy?.baseTimeMs}
                          onChange={(value) => handleFormChange({
                            ...formData,
                            fallbackPolicy: { ...formData.fallbackPolicy, baseTimeMs: value }
                          })}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </div>
            </div>
          </Form>
        );

      case RULE_TYPES.ACCESS_CONTROL:
        return (
          <Form layout="vertical">
            <div className="form-section">
              <div className="form-section-title">基本信息</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="规则名称">
                    <Input
                      value={formData.name}
                      onChange={(e) => handleFormChange({ ...formData, name: e.target.value })}
                      placeholder="请输入规则名称"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="命名空间">
                    <Input
                      value={formData.namespace}
                      onChange={(e) => handleFormChange({ ...formData, namespace: e.target.value })}
                      placeholder="default"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="目标服务">
                <Input
                  value={formData.service}
                  onChange={(e) => handleFormChange({ ...formData, service: e.target.value })}
                  placeholder="请输入目标服务名称"
                />
              </Form.Item>
            </div>

            <div className="form-section">
              <div className="form-section-title">访问控制类型</div>
              <Form.Item label="规则类型">
                <Select
                  value={formData.ruleType}
                  onChange={(value) => handleFormChange({ ...formData, ruleType: value })}
                  style={{ width: 200 }}
                >
                  <Option value="whitelist">白名单</Option>
                  <Option value="blacklist">黑名单</Option>
                </Select>
              </Form.Item>
              <div className={formData.ruleType === 'whitelist' ? 'whitelist-config' : 'blacklist-config'}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                  {formData.ruleType === 'whitelist' ? '允许访问的源' : '禁止访问的源'}
                </div>
                <div className="access-control-list">
                  {(formData.sources || []).map((source, index) => (
                    <div key={index} className="access-control-item">
                      <Select
                        value={source.type}
                        onChange={(value) => {
                          const newSources = [...(formData.sources || [])];
                          newSources[index] = { ...newSources[index], type: value };
                          handleFormChange({ ...formData, sources: newSources });
                        }}
                        style={{ width: 120 }}
                      >
                        <Option value="ip">IP 地址</Option>
                        <Option value="service">服务</Option>
                        <Option value="namespace">命名空间</Option>
                      </Select>
                      <Input
                        value={source.value}
                        onChange={(e) => {
                          const newSources = [...(formData.sources || [])];
                          newSources[index] = { ...newSources[index], value: e.target.value };
                          handleFormChange({ ...formData, sources: newSources });
                        }}
                        style={{ flex: 1 }}
                        placeholder={
                          source.type === 'ip' ? '10.0.0.0/8' :
                          source.type === 'service' ? 'frontend-service' :
                          'default'
                        }
                      />
                      <Button
                        type="text"
                        danger
                        onClick={() => {
                          const newSources = [...(formData.sources || [])];
                          newSources.splice(index, 1);
                          handleFormChange({ ...formData, sources: newSources });
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    style={{ width: '100%' }}
                    onClick={() => {
                      const newSources = [...(formData.sources || []), { type: 'ip', value: '' }];
                      handleFormChange({ ...formData, sources: newSources });
                    }}
                  >
                    + 添加源
                  </Button>
                </div>
              </div>
            </div>
          </Form>
        );

      default:
        return <div>不支持的规则类型</div>;
    }
  };

  // 获取规则类型名称
  const getRuleTypeName = () => {
    const names = {
      [RULE_TYPES.CANARY]: '金丝雀发布规则',
      [RULE_TYPES.BLUE_GREEN]: '蓝绿部署规则',
      [RULE_TYPES.CIRCUIT_BREAKER]: '熔断降级规则',
      [RULE_TYPES.ACCESS_CONTROL]: '黑白名单规则',
    };
    return names[ruleType] || '规则';
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>{isEdit ? '编辑' : '新建'}{getRuleTypeName()}</span>
          <div className={`yaml-editor-sync-indicator ${!isSynced ? 'out-of-sync' : ''}`}>
            {isSynced ? (
              <>
                <CheckCircleOutlined />
                <span>已同步</span>
              </>
            ) : (
              <>
                <WarningOutlined />
                <span>YAML 格式错误</span>
              </>
            )}
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          loading={saving}
          disabled={!isSynced}
        >
          保存
        </Button>,
      ]}
      className="yaml-editor-modal"
      destroyOnClose
    >
      <div className="yaml-editor-container">
        <div className="yaml-editor-header">
          <div className="yaml-editor-title">
            <Button.Group>
              <Button
                type={activeTab === 'yaml' ? 'primary' : 'default'}
                icon={<CodeOutlined />}
                onClick={() => setActiveTab('yaml')}
              >
                YAML 编辑
              </Button>
              <Button
                type={activeTab === 'form' ? 'primary' : 'default'}
                icon={<FormOutlined />}
                onClick={() => setActiveTab('form')}
              >
                表单配置
              </Button>
            </Button.Group>
          </div>
          <Button
            icon={<SyncOutlined />}
            onClick={fetchRuleYAML}
            loading={loading}
          >
            从后端同步
          </Button>
        </div>

        <div className="yaml-editor-content">
          {activeTab === 'yaml' ? (
            <div className="yaml-editor-pane">
              <div className="yaml-editor-pane-header">YAML 源文件</div>
              <TextArea
                ref={yamlRef}
                value={yamlContent}
                onChange={(e) => handleYamlChange(e.target.value)}
                className="yaml-editor-textarea"
                placeholder="在此输入 YAML 规则..."
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="yaml-editor-pane">
              <div className="yaml-editor-pane-header">可视化配置</div>
              <div className="yaml-editor-preview">
                {renderFormByType()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default YamlEditorModal;
