import React, { useState } from 'react';
import {
  Form,
  InputNumber,
  Button,
  Card,
  Steps,
  Descriptions,
  Row,
  Col,
  Space,
  Divider,
  message,
  Input,
  Tag,
  Typography,
  Alert
} from 'antd';
import {
  KeyOutlined,
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { rsaApi } from '../services/api';

const { Step } = Steps;
const { TextArea } = Input;
const { Title, Text } = Typography;

const KeyGenerationPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [keyData, setKeyData] = useState(null);
  const [steps, setSteps] = useState([]);
  const [savedKeyId, setSavedKeyId] = useState(null);

  const handleGenerate = async (values) => {
    setLoading(true);
    try {
      const params = {
        bit_length: values.bit_length || 1024,
        e: values.e || 65537,
        name: values.name
      };

      if (values.p) params.p = values.p;
      if (values.q) params.q = values.q;

      const response = await rsaApi.generateKey(params);
      
      if (response.success) {
        setKeyData(response);
        setSteps(response.steps);
        setSavedKeyId(response.key_pair_id);
        setCurrentStep(0);
        message.success('密钥对生成成功！');
      }
    } catch (error) {
      message.error('生成密钥失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStepChange = (step) => {
    setCurrentStep(step);
  };

  const formatBigNumber = (num, maxLength = 50) => {
    const str = String(num);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength / 2) + '...' + str.substring(str.length - maxLength / 2);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title={<Space><KeyOutlined /><span>RSA 密钥生成向导</span></Space>}>
        <Alert
          message="RSA 密钥生成过程"
          description={
            <div>
              <p>RSA 算法的密钥生成包含以下步骤：</p>
              <ol>
                <li>选择两个大素数 p 和 q</li>
                <li>计算 n = p × q (模数)</li>
                <li>计算 φ(n) = (p-1) × (q-1) (欧拉函数)</li>
                <li>选择公钥指数 e，使得 1 < e < φ(n) 且 gcd(e, φ(n)) = 1</li>
                <li>计算私钥指数 d，使得 e × d ≡ 1 (mod φ(n))</li>
              </ol>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            bit_length: 1024,
            e: 65537
          }}
          onFinish={handleGenerate}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="密钥位数"
                name="bit_length"
                tooltip="密钥位数越大，安全性越高，但计算速度越慢"
              >
                <InputNumber min={256} max={4096} step={256} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="公钥指数 e"
                name="e"
                tooltip="通常选择 65537 (0x10001)，这是一个常用的素数"
              >
                <InputNumber min={3} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="密钥名称 (可选)"
                name="name"
              >
                <Input placeholder="例如：我的测试密钥" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>手动指定素数 (可选，留空则自动生成)</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="素数 p"
                name="p"
                tooltip="手动指定素数 p，如果留空将自动生成"
              >
                <InputNumber style={{ width: '100%' }} placeholder="留空自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="素数 q"
                name="q"
                tooltip="手动指定素数 q，必须与 p 不同"
              >
                <InputNumber style={{ width: '100%' }} placeholder="留空自动生成" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<ReloadOutlined />}
              loading={loading}
              size="large"
            >
              生成密钥对
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {keyData && (
        <>
          <Card title="生成步骤详解">
            <Steps
              direction="vertical"
              current={currentStep}
              onChange={handleStepChange}
              items={steps.map((step, index) => ({
                title: step.title,
                description: (
                  <div>
                    <p>{step.description}</p>
                    {step.formula && (
                      <div style={{ 
                        background: '#f5f5f5', 
                        padding: 12, 
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        marginTop: 8
                      }}>
                        <Text code>{step.formula}</Text>
                      </div>
                    )}
                    {step.value && (
                      <div style={{ marginTop: 8 }}>
                        <Text strong>值: </Text>
                        <Text copyable={{ text: String(step.value) }}>
                          {formatBigNumber(step.value, 80)}
                        </Text>
                      </div>
                    )}
                  </div>
                ),
                status: index <= currentStep ? 'finish' : 'wait'
              }))}
            />
          </Card>

          <Card title="密钥结果">
            {savedKeyId && (
              <Alert
                message={`密钥已保存，ID: ${savedKeyId}`}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Card
                  size="small"
                  title={<Space><LockOutlined /><span>公钥 (e, n)</span></Space>}
                  style={{ marginBottom: 16 }}
                >
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="e (公钥指数)">
                      <Text copyable>{keyData.public_key.e}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="n (模数)">
                      <Text copyable>
                        {formatBigNumber(keyData.public_key.n, 100)}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  title={<Space><UnlockOutlined /><span>私钥 (d, n)</span></Space>}
                  type="inner"
                  style={{ borderColor: '#faad14', marginBottom: 16 }}
                >
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="d (私钥指数)">
                      <Text copyable>
                        {formatBigNumber(keyData.private_key.d, 100)}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="n (模数)">
                      <Text copyable>
                        {formatBigNumber(keyData.private_key.n, 100)}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>

            <Divider>详细参数</Divider>

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="p (素数)">
                <Text copyable>{formatBigNumber(keyData.details.p, 60)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="q (素数)">
                <Text copyable>{formatBigNumber(keyData.details.q, 60)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="n = p × q">
                <Text copyable>{formatBigNumber(keyData.details.n, 60)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="φ(n) = (p-1)(q-1)">
                <Text copyable>{formatBigNumber(keyData.details.phi_n, 60)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="e (公钥指数)" span={2}>
                <Text copyable>{keyData.details.e}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="d (私钥指数，d ≡ e⁻¹ mod φ(n))" span={2}>
                <Text copyable>{formatBigNumber(keyData.details.d, 100)}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider>RSA 数学公式</Divider>

            <Card size="small" style={{ background: '#fafafa' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>加密公式: </Text>
                  <Text code>c = m^e mod n</Text>
                  <Text type="secondary"> (明文 m 加密为密文 c)</Text>
                </div>
                <div>
                  <Text strong>解密公式: </Text>
                  <Text code>m = c^d mod n</Text>
                  <Text type="secondary"> (密文 c 解密为明文 m)</Text>
                </div>
                <div>
                  <Text strong>密钥关系: </Text>
                  <Text code>e × d ≡ 1 (mod φ(n))</Text>
                </div>
              </Space>
            </Card>
          </Card>
        </>
      )}
    </Space>
  );
};

export default KeyGenerationPage;
