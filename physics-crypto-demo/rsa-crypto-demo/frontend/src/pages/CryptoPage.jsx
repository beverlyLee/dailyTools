import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
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
  Select,
  Tag,
  Alert,
  Collapse
} from 'antd';
import {
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { rsaApi } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const CryptoPage = () => {
  const [encryptForm] = Form.useForm();
  const [decryptForm] = Form.useForm();
  const [keyPairs, setKeyPairs] = useState([]);
  const [selectedKeyPair, setSelectedKeyPair] = useState(null);
  const [encryptResult, setEncryptResult] = useState(null);
  const [decryptResult, setDecryptResult] = useState(null);
  const [loading, setLoading] = useState({ encrypt: false, decrypt: false });
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    loadKeyPairs();
  }, []);

  const loadKeyPairs = async () => {
    try {
      const response = await rsaApi.getKeyPairs();
      if (response.success) {
        setKeyPairs(response.key_pairs);
      }
    } catch (error) {
      console.error('Failed to load key pairs:', error);
    }
  };

  const handleKeySelect = async (keyId) => {
    if (!keyId) {
      setSelectedKeyPair(null);
      return;
    }

    try {
      const response = await rsaApi.getKeyPair(keyId);
      if (response.success) {
        setSelectedKeyPair(response.key_pair);
      }
    } catch (error) {
      message.error('加载密钥失败');
    }
  };

  const handleEncrypt = async (values) => {
    setLoading(prev => ({ ...prev, encrypt: true }));
    try {
      const params = {
        message: values.plain_text,
        e: values.e || selectedKeyPair?.e,
        n: values.n || selectedKeyPair?.n,
        key_pair_id: selectedKeyPair?.id
      };

      if (!params.e || !params.n) {
        message.error('请提供公钥 (e, n) 或选择已保存的密钥对');
        return;
      }

      const response = await rsaApi.encrypt(params);
      
      if (response.success) {
        setEncryptResult(response);
        message.success('加密成功！');
      }
    } catch (error) {
      message.error('加密失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(prev => ({ ...prev, encrypt: false }));
    }
  };

  const handleDecrypt = async (values) => {
    setLoading(prev => ({ ...prev, decrypt: true }));
    try {
      let encryptedData;
      if (values.encrypted_text) {
        encryptedData = values.encrypted_text.split(' ').map(Number).filter(n => !isNaN(n));
      }

      const params = {
        encrypted_data: encryptedData || encryptResult?.encrypted || [],
        d: values.d || selectedKeyPair?.d,
        n: values.n || selectedKeyPair?.n,
        key_pair_id: selectedKeyPair?.id
      };

      if (!params.d || !params.n) {
        message.error('请提供私钥 (d, n) 或选择已保存的密钥对');
        return;
      }

      if (!params.encrypted_data || params.encrypted_data.length === 0) {
        message.error('请提供要解密的数据');
        return;
      }

      const response = await rsaApi.decrypt(params);
      
      if (response.success) {
        setDecryptResult(response);
        message.success('解密成功！');
      }
    } catch (error) {
      message.error('解密失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(prev => ({ ...prev, decrypt: false }));
    }
  };

  const handleVerify = async () => {
    if (!encryptResult || !decryptResult) {
      message.warning('请先执行加密和解密操作');
      return;
    }

    const original = encryptResult.original;
    const decrypted = decryptResult.decrypted;
    const valid = original === decrypted;

    setVerifyResult({
      original,
      decrypted,
      valid
    });

    if (valid) {
      message.success('验证通过：解密结果与原始明文一致！');
    } else {
      message.error('验证失败：解密结果与原始明文不一致');
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title={<Space><LockOutlined /><span>选择密钥对 (可选)</span></Space>}>
        <Row gutter={16}>
          <Col span={12}>
            <Select
              placeholder="选择已保存的密钥对"
              style={{ width: '100%' }}
              onChange={handleKeySelect}
              allowClear
              size="large"
            >
              {keyPairs.map(kp => (
                <Option key={kp.id} value={kp.id}>
                  {kp.name || `密钥对 #${kp.id}`} ({kp.key_size}位)
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            <Button icon={<LoadingOutlined />} onClick={loadKeyPairs}>
              刷新列表
            </Button>
          </Col>
        </Row>

        {selectedKeyPair && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={`已选择密钥对 #${selectedKeyPair.id}`}
              description={
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="公钥 e">{selectedKeyPair.e}</Descriptions.Item>
                  <Descriptions.Item label="私钥 d (前30位)">{String(selectedKeyPair.d).substring(0, 30)}...</Descriptions.Item>
                  <Descriptions.Item label="模数 n (前30位)" span={2}>{String(selectedKeyPair.n).substring(0, 30)}...</Descriptions.Item>
                </Descriptions>
              }
              type="info"
              showIcon
            />
          </div>
        )}
      </Card>

      <Row gutter={24}>
        <Col span={12}>
          <Card title={<Space><LockOutlined /><span>加密</span></Space>}>
            <Alert
              message="加密公式: c = m^e mod n"
              description="使用公钥 (e, n) 对明文进行加密"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form
              form={encryptForm}
              layout="vertical"
              initialValues={{
                plain_text: 'Hello RSA! 你好，RSA算法！'
              }}
              onFinish={handleEncrypt}
            >
              <Form.Item
                label="明文 (Plain Text)"
                name="plain_text"
                rules={[{ required: true, message: '请输入要加密的文本' }]}
              >
                <TextArea rows={4} placeholder="输入要加密的文本..." />
              </Form.Item>

              {!selectedKeyPair && (
                <>
                  <Divider>手动输入公钥</Divider>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item label="公钥指数 e" name="e">
                        <InputNumber min={3} style={{ width: '100%' }} placeholder="例如：65537" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="模数 n" name="n">
                        <InputNumber style={{ width: '100%' }} placeholder="输入大整数 n" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LockOutlined />}
                  loading={loading.encrypt}
                  block
                  size="large"
                >
                  加密
                </Button>
              </Form.Item>
            </Form>

            {encryptResult && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message="加密结果"
                  type="success"
                  showIcon
                />
                <Descriptions bordered size="small" column={1} style={{ marginTop: 8 }}>
                  <Descriptions.Item label="原始明文">
                    <Text copyable>{encryptResult.original}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="加密后的数据数组">
                    <Text code copyable>{encryptResult.encrypted_text}</Text>
                  </Descriptions.Item>
                </Descriptions>

                <Collapse size="small" style={{ marginTop: 8 }}>
                  <Panel header="查看详细加密过程" key="encryptDetails">
                    <List
                      dataSource={encryptResult.details}
                      size="small"
                      renderItem={(item, index) => (
                        <List.Item>
                          <Space>
                            <Tag>字符 {index}</Tag>
                            <Text>'{item.char}' (编码: {item.char_code})</Text>
                            <Text type="secondary">→</Text>
                            <Text strong>加密后: {item.encrypted}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Panel>
                </Collapse>
              </div>
            )}
          </Card>
        </Col>

        <Col span={12}>
          <Card title={<Space><UnlockOutlined /><span>解密</span></Space>}>
            <Alert
              message="解密公式: m = c^d mod n"
              description="使用私钥 (d, n) 对密文进行解密"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form
              form={decryptForm}
              layout="vertical"
              onFinish={handleDecrypt}
            >
              <Form.Item
                label="密文 (Encrypted Data - 空格分隔的数字)"
                name="encrypted_text"
                initialValue={encryptResult?.encrypted_text}
              >
                <TextArea 
                  rows={4} 
                  placeholder="输入加密后的数字数组，用空格分隔..."
                />
              </Form.Item>

              {!selectedKeyPair && (
                <>
                  <Divider>手动输入私钥</Divider>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Form.Item label="私钥指数 d" name="d">
                        <InputNumber style={{ width: '100%' }} placeholder="输入私钥 d" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="模数 n" name="n">
                        <InputNumber style={{ width: '100%' }} placeholder="输入模数 n" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<UnlockOutlined />}
                  loading={loading.decrypt}
                  block
                  size="large"
                  danger
                >
                  解密
                </Button>
              </Form.Item>
            </Form>

            {decryptResult && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message="解密结果"
                  type="success"
                  showIcon
                />
                <Descriptions bordered size="small" column={1} style={{ marginTop: 8 }}>
                  <Descriptions.Item label="解密后的明文">
                    <Text strong copyable style={{ fontSize: 16 }}>{decryptResult.decrypted}</Text>
                  </Descriptions.Item>
                </Descriptions>

                <Collapse size="small" style={{ marginTop: 8 }}>
                  <Panel header="查看详细解密过程" key="decryptDetails">
                    <List
                      dataSource={decryptResult.details}
                      size="small"
                      renderItem={(item, index) => (
                        <List.Item>
                          <Space>
                            <Tag>字符 {index}</Tag>
                            <Text>加密值: {item.encrypted}</Text>
                            <Text type="secondary">→</Text>
                            <Text strong>'{item.char}' (编码: {item.decrypted_code})</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Panel>
                </Collapse>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {encryptResult && decryptResult && (
        <Card title={<Space><CheckCircleOutlined /><span>验证 RSA 正确性</span></Space>}>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleVerify}
            size="large"
            style={{ marginBottom: 16 }}
          >
            验证加密/解密一致性
          </Button>

          {verifyResult && (
            <div>
              <Alert
                message={verifyResult.valid ? '验证通过！' : '验证失败！'}
                description={
                  <div>
                    <p>原始明文: <Text code copyable>{verifyResult.original}</Text></p>
                    <p>解密结果: <Text code copyable>{verifyResult.decrypted}</Text></p>
                    <p>
                      {verifyResult.valid 
                        ? 'RSA 算法正确工作：解密结果与原始明文完全一致！'
                        : 'RSA 算法存在问题：解密结果与原始明文不一致！'
                      }
                    </p>
                  </div>
                }
                type={verifyResult.valid ? 'success' : 'error'}
                showIcon
              />

              <Divider>RSA 正确性原理</Divider>

              <Card size="small" style={{ background: '#fafafa' }}>
                <Title level={5}>为什么 RSA 加密后可以正确解密？</Title>
                <Paragraph>
                  RSA 的正确性基于数论中的欧拉定理：如果 m 与 n 互质，则
                  <Text code> m^φ(n) ≡ 1 (mod n)</Text>
                </Paragraph>
                <Paragraph>
                  由于我们选择的密钥满足 <Text code>e × d ≡ 1 (mod φ(n))</Text>，
                  即存在整数 k 使得 <Text code>e × d = 1 + k × φ(n)</Text>
                </Paragraph>
                <Paragraph>
                  因此：
                </Paragraph>
                <ul>
                  <li><Text code>加密: c = m^e mod n</Text></li>
                  <li><Text code>解密: c^d = (m^e)^d = m^(e×d) = m^(1 + k×φ(n)) = m × (m^φ(n))^k ≡ m × 1^k ≡ m (mod n)</Text></li>
                </ul>
                <Paragraph type="success">
                  这就是为什么解密后能得到原始明文的数学原理！
                </Paragraph>
              </Card>
            </div>
          )}
        </Card>
      )}
    </Space>
  );
};

export default CryptoPage;
