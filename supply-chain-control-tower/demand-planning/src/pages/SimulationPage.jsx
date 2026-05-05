import React, { useState } from 'react';
import {
  Card,
  Form,
  Select,
  Slider,
  Button,
  Row,
  Col,
  Space,
  Descriptions,
  Tag,
  message,
  Statistic,
  Alert,
  List,
} from 'antd';
import {
  ExperimentOutlined,
  PlayCircleOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { runSimulation } from '../api/demand';

const { Option } = Select;

const scenarios = [
  { value: 'holiday_surge', label: '节假日需求激增', description: '模拟节假日期间需求增长20%的场景' },
  { value: 'supply_delay', label: '供应延迟', description: '模拟供应商延迟交货2天的场景' },
  { value: 'weather_impact', label: '天气影响', description: '模拟恶劣天气导致物流延迟的场景' },
  { value: 'promotion', label: '促销活动', description: '模拟促销活动导致需求增长的场景' },
  { value: 'custom', label: '自定义场景', description: '自定义调整参数进行模拟' },
];

const products = [
  { id: 'PROD-001', name: '产品A', sku: 'SKU-001' },
  { id: 'PROD-002', name: '产品B', sku: 'SKU-002' },
  { id: 'PROD-003', name: '产品C', sku: 'SKU-003' },
];

const SimulationPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState('custom');

  const handleScenarioChange = (value) => {
    setSelectedScenario(value);
    setSimulationResult(null);

    switch (value) {
      case 'holiday_surge':
        form.setFieldsValue({
          demandChange: 20,
          leadTimeChange: 0,
        });
        break;
      case 'supply_delay':
        form.setFieldsValue({
          demandChange: 0,
          leadTimeChange: 2,
        });
        break;
      case 'weather_impact':
        form.setFieldsValue({
          demandChange: -10,
          leadTimeChange: 3,
        });
        break;
      case 'promotion':
        form.setFieldsValue({
          demandChange: 50,
          leadTimeChange: 0,
        });
        break;
      default:
        form.setFieldsValue({
          demandChange: 0,
          leadTimeChange: 0,
        });
    }
  };

  const handleRunSimulation = async (values) => {
    setLoading(true);
    try {
      const params = {
        productId: values.productId,
        scenario: selectedScenario,
        demandChange: values.demandChange,
        leadTimeChange: values.leadTimeChange,
      };

      const response = await runSimulation(params);
      setSimulationResult(response.data);
      message.success('模拟完成');
    } catch (error) {
      message.error('模拟运行失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (risk) => {
    if (risk > 0.5) return 'red';
    if (risk > 0.3) return 'orange';
    return 'green';
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card
            title={
              <Space>
                <ExperimentOutlined />
                <span>模拟参数设置</span>
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleRunSimulation}
              initialValues={{
                productId: 'PROD-001',
                demandChange: 0,
                leadTimeChange: 0,
              }}
            >
              <Form.Item name="productId" label="选择产品">
                <Select>
                  {products.map((p) => (
                    <Option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="scenario" label="预设场景">
                <Select value={selectedScenario} onChange={handleScenarioChange}>
                  {scenarios.map((s) => (
                    <Option key={s.value} value={s.value}>
                      {s.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedScenario && (
                <Alert
                  message={scenarios.find((s) => s.value === selectedScenario)?.description}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form.Item name="demandChange" label="需求变化百分比">
                <div className="slider-container">
                  <Slider
                    min={-50}
                    max={100}
                    marks={{
                      '-50': '-50%',
                      '-20': '-20%',
                      '0': '0%',
                      '20': '+20%',
                      '50': '+50%',
                      '100': '+100%',
                    }}
                    tooltip={{ formatter: (value) => `${value}%` }}
                  />
                </div>
              </Form.Item>

              <Form.Item name="leadTimeChange" label="交货期变化（天）">
                <div className="slider-container">
                  <Slider
                    min={0}
                    max={7}
                    marks={{
                      '0': '0天',
                      '2': '+2天',
                      '4': '+4天',
                      '7': '+7天',
                    }}
                    tooltip={{ formatter: (value) => `+${value}天` }}
                  />
                </div>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlayCircleOutlined />}
                  loading={loading}
                  block
                  size="large"
                >
                  运行模拟
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={16}>
          <Card
            title={
              <Space>
                <ExperimentOutlined />
                <span>模拟结果</span>
              </Space>
            }
          >
            {!simulationResult ? (
              <div style={{ textAlign: 'center', padding: '100px', color: '#999' }}>
                <ExperimentOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>选择参数并点击"运行模拟"查看结果</p>
              </div>
            ) : (
              <>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card>
                      <Statistic
                        title="基准预测需求"
                        value={simulationResult.baseForecast}
                        precision={0}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card>
                      <Statistic
                        title="模拟后需求"
                        value={simulationResult.simulatedDemand}
                        precision={0}
                        valueStyle={{
                          color: simulationResult.simulatedDemand > simulationResult.baseForecast
                            ? '#ff4d4f'
                            : '#52c41a',
                        }}
                        prefix={
                          simulationResult.simulatedDemand > simulationResult.baseForecast ? (
                            <RiseOutlined />
                          ) : (
                            <FallOutlined />
                          )
                        }
                      />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col span={24}>
                    <Card title="库存影响分析">
                      <Descriptions bordered column={2}>
                        <Descriptions.Item label="当前库存">
                          {simulationResult.inventoryImpact?.currentStock} 件
                        </Descriptions.Item>
                        <Descriptions.Item label="预计库存">
                          {simulationResult.inventoryImpact?.projectedStock?.toFixed(0)} 件
                        </Descriptions.Item>
                        <Descriptions.Item label="缺货风险">
                          <Tag color={getUrgencyColor(simulationResult.inventoryImpact?.stockoutRisk)}>
                            {(simulationResult.inventoryImpact?.stockoutRisk * 100).toFixed(1)}%
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="积压风险">
                          <Tag color={getUrgencyColor(simulationResult.inventoryImpact?.overstockRisk)}>
                            {(simulationResult.inventoryImpact?.overstockRisk * 100).toFixed(1)}%
                          </Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col span={24}>
                    <Card title="成本影响分析">
                      <Descriptions bordered column={3}>
                        <Descriptions.Item label="基准成本">
                          ¥{simulationResult.costImpact?.baseCost?.toLocaleString()}
                        </Descriptions.Item>
                        <Descriptions.Item label="模拟后成本">
                          ¥{simulationResult.costImpact?.simulatedCost?.toLocaleString()}
                        </Descriptions.Item>
                        <Descriptions.Item label="成本差异">
                          <span
                            className={
                              simulationResult.costImpact?.costDifference >= 0
                                ? 'impact-negative'
                                : 'impact-positive'
                            }
                          >
                            {simulationResult.costImpact?.costDifference >= 0 ? '+' : ''}
                            ¥{simulationResult.costImpact?.costDifference?.toLocaleString()}
                          </span>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                </Row>

                {simulationResult.recommendations && simulationResult.recommendations.length > 0 && (
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col span={24}>
                      <Alert
                        message="智能建议"
                        description={
                          <List
                            dataSource={simulationResult.recommendations}
                            renderItem={(item) => (
                              <List.Item className="recommendation-item">
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                <span>{item}</span>
                              </List.Item>
                            )}
                          />
                        }
                        type="success"
                        showIcon
                      />
                    </Col>
                  </Row>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SimulationPage;
