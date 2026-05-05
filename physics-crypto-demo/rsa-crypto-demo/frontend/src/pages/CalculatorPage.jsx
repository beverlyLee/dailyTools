import React, { useState } from 'react';
import {
  Form,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Space,
  Divider,
  message,
  Typography,
  Descriptions,
  List,
  Tag,
  Alert
} from 'antd';
import {
  CalculatorOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { rsaApi } from '../services/api';

const { Title, Text, Paragraph } = Typography;

const CalculatorPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [steps, setSteps] = useState([]);
  const [primeResult, setPrimeResult] = useState(null);
  const [primeLoading, setPrimeLoading] = useState(false);

  const handleModExp = async (values) => {
    setLoading(true);
    try {
      const response = await rsaApi.modExp({
        base: values.base,
        exponent: values.exponent,
        modulus: values.modulus
      });
      
      if (response.success) {
        setResult(response.result);
        setSteps(response.steps);
        message.success('模幂运算完成！');
      }
    } catch (error) {
      message.error('运算失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPrime = async (values) => {
    setPrimeLoading(true);
    try {
      const response = await rsaApi.isPrime(values.prime_number);
      
      if (response.success) {
        setPrimeResult({
          number: values.prime_number,
          is_prime: response.is_prime
        });
        message.success(`检查完成: ${values.prime_number} ${response.is_prime ? '是' : '不是'}素数`);
      }
    } catch (error) {
      message.error('检查失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setPrimeLoading(false);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title={<Space><CalculatorOutlined /><span>大整数计算器</span></Space>}>
        <Alert
          message="模幂运算在 RSA 中的作用"
          description={
            <div>
              <Paragraph>
                RSA 算法的核心是模幂运算（Modular Exponentiation）：
              </Paragraph>
              <ul>
                <li><Text code>加密: c = m^e mod n</Text> - 使用公钥 (e, n) 加密明文 m</li>
                <li><Text code>解密: m = c^d mod n</Text> - 使用私钥 (d, n) 解密密文 c</li>
              </ul>
              <Paragraph>
                直接计算大指数会导致数值爆炸，因此使用"快速模幂算法"（Square-and-Multiply），
                通过不断平方底数并在指数为奇数时乘以结果来高效计算。
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Row gutter={24}>
          <Col span={12}>
            <Card
              size="small"
              title="模幂运算: base^exponent mod modulus"
              style={{ marginBottom: 16 }}
            >
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  base: 123,
                  exponent: 17,
                  modulus: 3233
                }}
                onFinish={handleModExp}
              >
                <Row gutter={8}>
                  <Col span={8}>
                    <Form.Item label="底数 (base)" name="base">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="指数 (exponent)" name="exponent">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="模数 (modulus)" name="modulus">
                      <InputNumber min={2} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlayCircleOutlined />}
                    loading={loading}
                    block
                  >
                    计算模幂
                  </Button>
                </Form.Item>
              </Form>

              {result !== null && (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    message={
                      <span>
                        结果: <Text strong copyable>{result}</Text>
                      </span>
                    }
                    type="success"
                    showIcon
                  />
                </div>
              )}
            </Card>
          </Col>

          <Col span={12}>
            <Card
              size="small"
              title="素数检查"
              style={{ marginBottom: 16 }}
            >
              <Form
                layout="vertical"
                initialValues={{
                  prime_number: 61
                }}
                onFinish={handleCheckPrime}
              >
                <Form.Item label="待检查的数字" name="prime_number">
                  <InputNumber min={2} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<CheckCircleOutlined />}
                    loading={primeLoading}
                    block
                  >
                    检查是否为素数
                  </Button>
                </Form.Item>
              </Form>

              {primeResult && (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    message={
                      <span>
                        {primeResult.number} {primeResult.is_prime ? '是' : '不是'}素数
                        <Tag color={primeResult.is_prime ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                          {primeResult.is_prime ? 'Prime' : 'Not Prime'}
                        </Tag>
                      </span>
                    }
                    type={primeResult.is_prime ? 'success' : 'warning'}
                    showIcon
                  />
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Card>

      {steps.length > 0 && (
        <Card title="快速模幂算法步骤详解">
          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="计算公式">
              <Text code>{form.getFieldValue('base')}^{form.getFieldValue('exponent')} mod {form.getFieldValue('modulus')} = {result}</Text>
            </Descriptions.Item>
          </Descriptions>

          <Divider>算法执行步骤</Divider>

          <List
            dataSource={steps}
            renderItem={(item, index) => (
              <List.Item
                style={{
                  background: item.is_final ? '#f6ffed' : '#fafafa',
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 4
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Tag color={item.is_final ? 'success' : 'blue'}>
                      步骤 {item.step}
                    </Tag>
                    <Text strong>{item.action}</Text>
                  </Space>
                  <Descriptions size="small" column={4} style={{ marginTop: 8 }}>
                    <Descriptions.Item label="当前指数">{item.exponent}</Descriptions.Item>
                    <Descriptions.Item label="当前底数">{item.base}</Descriptions.Item>
                    <Descriptions.Item label="当前结果">{item.result}</Descriptions.Item>
                  </Descriptions>
                </Space>
              </List.Item>
            )}
          />

          <Divider>算法说明</Divider>

          <Card size="small" style={{ background: '#fafafa' }}>
            <Title level={5}>快速模幂算法 (Square-and-Multiply)</Title>
            <Paragraph>
              快速模幂算法通过将指数表示为二进制，从而将时间复杂度从 O(n) 降低到 O(log n)。
            </Paragraph>
            <ol>
              <li>初始化结果 result = 1</li>
              <li>将指数 exponent 转换为二进制</li>
              <li>从最低位到最高位遍历每一位：
                <ul>
                  <li>如果当前位是 1，执行 result = (result × base) mod modulus</li>
                  <li>执行 base = (base × base) mod modulus（平方底数）</li>
                  <li>将指数右移一位（除以 2）</li>
                </ul>
              </li>
            </ol>
            <Paragraph>
              例如计算 <Text code>123^17 mod 3233</Text>：
            </Paragraph>
            <ul>
              <li>17 的二进制是 10001</li>
              <li>从最低位开始，只有第 0 位和第 4 位是 1</li>
              <li>通过平方和乘法，最终得到结果</li>
            </ul>
          </Card>
        </Card>
      )}
    </Space>
  );
};

export default CalculatorPage;
