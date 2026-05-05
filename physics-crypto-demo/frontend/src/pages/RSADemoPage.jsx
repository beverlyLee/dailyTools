import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  Statistic,
  Divider,
  List,
  message,
  Space,
  Typography,
  Tabs,
  Steps,
  Switch,
  Descriptions,
  Alert,
  Tag
} from 'antd'
import {
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  CalculatorOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import axios from 'axios'
import { MathJax } from 'better-react-mathjax'

const { Title, Paragraph, Text, Link } = Typography
const { Option } = Select
const { TabPane } = Tabs
const { Step } = Steps
const { TextArea } = Input

const API_BASE = ''

function RSADemoPage() {
  const [form] = Form.useForm()
  const [modPowForm] = Form.useForm()

  const [currentKey, setCurrentKey] = useState(null)
  const [keyGenerationSteps, setKeyGenerationSteps] = useState([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [manualMode, setManualMode] = useState(false)
  
  const [encryptedResult, setEncryptedResult] = useState(null)
  const [decryptedResult, setDecryptedResult] = useState(null)
  const [modPowResult, setModPowResult] = useState(null)
  
  const [keysHistory, setKeysHistory] = useState([])
  const [operationsHistory, setOperationsHistory] = useState([])
  
  const [loading, setLoading] = useState(false)
  const [encryptText, setEncryptText] = useState('')
  const [decryptBlocks, setDecryptBlocks] = useState('')

  // 获取历史记录
  const fetchHistory = useCallback(async () => {
    try {
      const [keysRes, opsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/rsa/keys`),
        axios.get(`${API_BASE}/api/rsa/operations`)
      ])
      
      if (keysRes.data.success) {
        setKeysHistory(keysRes.data.keys)
      }
      if (opsRes.data.success) {
        setOperationsHistory(opsRes.data.operations)
      }
    } catch (error) {
      console.error('获取历史记录失败:', error)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // 生成密钥对
  const generateKeys = useCallback(async (values) => {
    setLoading(true)
    try {
      const params = { bits: values.bits || 256 }
      
      if (manualMode) {
        if (values.p) params.p = values.p
        if (values.q) params.q = values.q
        if (values.e) params.e = values.e
      }
      
      const response = await axios.post(`${API_BASE}/api/rsa/generate`, params)
      
      if (response.data.success) {
        message.success('密钥对生成成功')
        setCurrentKey(response.data)
        setKeyGenerationSteps(response.data.steps || [])
        setCurrentStepIndex(0)
        fetchHistory()
      }
    } catch (error) {
      message.error('生成密钥失败: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }, [manualMode, fetchHistory])

  // 模幂运算
  const calculateModPow = useCallback(async (values) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/api/rsa/modpow`, {
        base: values.base,
        exponent: values.exponent,
        modulus: values.modulus
      })
      
      if (response.data.success) {
        setModPowResult(response.data.result)
        message.success('计算完成')
      }
    } catch (error) {
      message.error('计算失败: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }, [])

  // 加密消息
  const encryptMessage = useCallback(async () => {
    if (!encryptText) {
      message.warning('请输入要加密的消息')
      return
    }
    
    setLoading(true)
    try {
      const publicKey = currentKey ? currentKey.public_key : null
      
      const response = await axios.post(`${API_BASE}/api/rsa/encrypt`, {
        message: encryptText,
        public_key: publicKey
      })
      
      if (response.data.success) {
        setEncryptedResult(response.data)
        setDecryptBlocks(JSON.stringify(response.data.encrypted_blocks))
        message.success('加密成功')
        fetchHistory()
      }
    } catch (error) {
      message.error('加密失败: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }, [encryptText, currentKey, fetchHistory])

  // 解密消息
  const decryptMessage = useCallback(async () => {
    if (!decryptBlocks) {
      message.warning('请输入要解密的密文块（JSON 数组格式）')
      return
    }
    
    let blocks
    try {
      blocks = JSON.parse(decryptBlocks)
    } catch (error) {
      message.error('密文块格式错误，请输入有效的 JSON 数组')
      return
    }
    
    setLoading(true)
    try {
      const privateKey = currentKey ? currentKey.private_key : null
      
      const response = await axios.post(`${API_BASE}/api/rsa/decrypt`, {
        encrypted_blocks: blocks,
        private_key: privateKey
      })
      
      if (response.data.success) {
        setDecryptedResult(response.data)
        message.success('解密成功')
        fetchHistory()
      }
    } catch (error) {
      message.error('解密失败: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }, [decryptBlocks, currentKey, fetchHistory])

  // 验证加解密
  const verifyEncryption = useCallback(async () => {
    const testMessage = 'Hello RSA! 测试消息'
    
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/api/rsa/verify`, {
        message: testMessage
      })
      
      if (response.data.success) {
        const { verification } = response.data
        setCurrentKey({
          key_id: response.data.key_id,
          ...response.data
        })
        message.info(verification.is_valid ? '验证通过：加解密正确' : '验证失败')
        fetchHistory()
      }
    } catch (error) {
      message.error('验证失败: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }, [fetchHistory])

  // 渲染步骤详情
  const renderStepDetail = (step) => {
    if (!step) return null
    
    return (
      <Card size="small" title={`步骤 ${step.step}: ${step.title}`}>
        <Paragraph>{step.description}</Paragraph>
        
        {step.formula && (
          <div className="math-display" style={{ margin: '12px 0' }}>
            <MathJax inline>{`$${step.formula}$`}</MathJax>
          </div>
        )}
        
        {step.value !== undefined && (
          <Alert
            message={`计算结果: ${step.value}`}
            type="info"
            showIcon
            style={{ marginTop: 12 }}
          />
        )}
        
        {step.verification && (
          <Alert
            message={step.verification}
            type="success"
            showIcon
            style={{ marginTop: 12 }}
          />
        )}
        
        {step.public_key && (
          <Descriptions size="small" column={1} style={{ marginTop: 12 }}>
            <Descriptions.Item label="公钥 (e, n)">
              <Tag color="blue">e = {step.public_key.e}</Tag>
              <Tag color="blue" style={{ marginTop: 4 }}>
                n = {step.public_key.n.toString().slice(0, 50)}...
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="私钥 (d, n)">
              <Tag color="green">d = {step.private_key.d.toString().slice(0, 50)}...</Tag>
              <Tag color="green" style={{ marginTop: 4 }}>
                n = {step.private_key.n.toString().slice(0, 50)}...
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    )
  }

  return (
    <div>
      <Title level={2}>
        <LockOutlined style={{ marginRight: 12 }} />
        RSA 算法演示
      </Title>

      <Tabs defaultActiveKey="keygen">
        {/* 密钥生成标签页 */}
        <TabPane
          tab={
            <span>
              <KeyOutlined /> 密钥生成
            </span>
          }
          key="keygen"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={10}>
              <Card title="参数设置">
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{ bits: 256 }}
                  onFinish={generateKeys}
                >
                  <Form.Item
                    label="手动指定参数"
                    valuePropName="checked"
                  >
                    <Switch
                      checked={manualMode}
                      onChange={setManualMode}
                      checkedChildren="手动"
                      unCheckedChildren="自动"
                    />
                    <Text type="secondary" style={{ marginLeft: 12 }}>
                      手动模式可指定 p, q, e 用于教学演示
                    </Text>
                  </Form.Item>
                  
                  {manualMode && (
                    <>
                      <Form.Item name="p" label="素数 p">
                        <InputNumber
                          placeholder="输入素数 p（如 61）"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                      <Form.Item name="q" label="素数 q">
                        <InputNumber
                          placeholder="输入素数 q（如 53）"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                      <Form.Item name="e" label="公钥指数 e">
                        <InputNumber
                          placeholder="输入 e（常用 3, 17, 65537）"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </>
                  )}
                  
                  {!manualMode && (
                    <Form.Item name="bits" label="密钥位数">
                      <Select style={{ width: '100%' }}>
                        <Option value={128}>128 位（演示用）</Option>
                        <Option value={256}>256 位</Option>
                        <Option value={512}>512 位</Option>
                      </Select>
                    </Form.Item>
                  )}
                  
                  <Form.Item>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        icon={<KeyOutlined />}
                        block
                        size="large"
                      >
                        生成密钥对
                      </Button>
                      <Button
                        onClick={verifyEncryption}
                        loading={loading}
                        icon={<SafetyCertificateOutlined />}
                        block
                      >
                        快速演示（自动验证）
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
                
                {manualMode && (
                  <Alert
                    message="手动模式示例"
                    description={
                      <div>
                        <Paragraph>推荐使用小素数进行演示：</Paragraph>
                        <Text code>p=61, q=53, e=17</Text>
                        <Paragraph style={{ marginTop: 8 }}>
                          <MathJax inline>{`$n = 61 \\times 53 = 3233$`}</MathJax>
                        </Paragraph>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                )}
              </Card>
              
              {/* 当前密钥信息 */}
              {currentKey && (
                <Card title="当前密钥" style={{ marginTop: 24 }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="p">
                      <Text copyable>{currentKey.parameters?.p}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="q">
                      <Text copyable>{currentKey.parameters?.q}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="n">
                      <Text copyable ellipsis={{ rows: 2 }}>
                        {currentKey.public_key?.n}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="φ(n)">
                      <Text copyable ellipsis={{ rows: 2 }}>
                        {currentKey.parameters?.phi_n}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="公钥 (e)">
                      <Tag color="blue">{currentKey.public_key?.e}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="私钥 (d)">
                      <Tag color="green">
                        {String(currentKey.private_key?.d).slice(0, 30)}...
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}
            </Col>

            <Col xs={24} lg={14}>
              <Card
                title="生成过程分步演示"
                extra={
                  keyGenerationSteps.length > 0 && (
                    <Space>
                      <Button
                        size="small"
                        onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                        disabled={currentStepIndex === 0}
                      >
                        上一步
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setCurrentStepIndex(Math.min(keyGenerationSteps.length - 1, currentStepIndex + 1))}
                        disabled={currentStepIndex === keyGenerationSteps.length - 1}
                      >
                        下一步
                      </Button>
                    </Space>
                  )
                }
              >
                {keyGenerationSteps.length > 0 ? (
                  <>
                    <Steps
                      direction="vertical"
                      current={currentStepIndex}
                      onChange={setCurrentStepIndex}
                      style={{ marginBottom: 24 }}
                    >
                      {keyGenerationSteps.map((step, index) => (
                        <Step
                          key={index}
                          title={step.title}
                          description={
                            step.value ? String(step.value).slice(0, 30) + (String(step.value).length > 30 ? '...' : '') : ''
                          }
                        />
                      ))}
                    </Steps>
                    
                    {renderStepDetail(keyGenerationSteps[currentStepIndex])}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
                    <KeyOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <Paragraph>请点击"生成密钥对"开始演示</Paragraph>
                  </div>
                )}
              </Card>

              <Card title="数学原理" style={{ marginTop: 24 }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card size="small" title="加密公式">
                      <div className="math-display" style={{ padding: 12 }}>
                        <MathJax>{`$$c = m^e \\pmod{n}$$`}</MathJax>
                      </div>
                      <Paragraph style={{ fontSize: 13, marginTop: 8 }}>
                        m: 明文消息, e: 公钥指数, n: 模数
                      </Paragraph>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" title="解密公式">
                      <div className="math-display" style={{ padding: 12 }}>
                        <MathJax>{`$$m = c^d \\pmod{n}$$`}</MathJax>
                      </div>
                      <Paragraph style={{ fontSize: 13, marginTop: 8 }}>
                        c: 密文, d: 私钥指数, n: 模数
                      </Paragraph>
                    </Card>
                  </Col>
                </Row>
                
                <Divider />
                
                <Card size="small" title="密钥关系">
                  <div className="math-display" style={{ padding: 12, marginBottom: 12 }}>
                    <MathJax>{`$$e \\cdot d \\equiv 1 \\pmod{\\phi(n)}$$`}</MathJax>
                  </div>
                  <Paragraph style={{ fontSize: 13 }}>
                    其中 <MathJax inline>{`$\\phi(n) = (p-1)(q-1)$`}</MathJax> 是欧拉函数
                  </Paragraph>
                  <Alert
                    message="RSA 安全性基于大数分解难题：已知 n=pq 求 p,q 在计算上是困难的"
                    type="warning"
                    showIcon
                    style={{ marginTop: 12 }}
                  />
                </Card>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 模幂运算计算器 */}
        <TabPane
          tab={
            <span>
              <CalculatorOutlined /> 模幂计算器
            </span>
          }
          key="modpow"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={8}>
              <Card title="计算参数">
                <Form
                  form={modPowForm}
                  layout="vertical"
                  initialValues={{ base: 2, exponent: 10, modulus: 1000 }}
                  onFinish={calculateModPow}
                >
                  <Form.Item
                    name="base"
                    label="底数 (base)"
                    rules={[{ required: true, message: '请输入' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={1} />
                  </Form.Item>
                  
                  <Form.Item
                    name="exponent"
                    label="指数 (exponent)"
                    rules={[{ required: true, message: '请输入' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                  
                  <Form.Item
                    name="modulus"
                    label="模数 (modulus)"
                    rules={[{ required: true, message: '请输入' }]}
                    help="必须大于 1"
                  >
                    <InputNumber style={{ width: '100%' }} min={2} />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<CalculatorOutlined />}
                      block
                    >
                      计算 (快速幂算法)
                    </Button>
                  </Form.Item>
                </Form>
                
                <Divider />
                
                <Card size="small" title="快速示例">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      block
                      onClick={() => modPowForm.setFieldsValue({
                        base: 65, exponent: 17, modulus: 3233
                      })}
                    >
                      RSA 加密示例: 65^17 mod 3233
                    </Button>
                    <Button
                      block
                      onClick={() => modPowForm.setFieldsValue({
                        base: 2790, exponent: 2753, modulus: 3233
                      })}
                    >
                      RSA 解密示例: 2790^2753 mod 3233
                    </Button>
                    <Button
                      block
                      onClick={() => modPowForm.setFieldsValue({
                        base: 3, exponent: 7, modulus: 31
                      })}
                    >
                      简单示例: 3^7 mod 31
                    </Button>
                  </Space>
                </Card>
              </Card>
            </Col>

            <Col xs={24} lg={16}>
              <Card title="计算结果">
                {modPowResult ? (
                  <>
                    <Statistic
                      title="计算结果"
                      value={modPowResult.result}
                      prefix={<MathJax inline>{`$${modPowResult.base}^{${modPowResult.exponent}} \\mod ${modPowResult.modulus} = $`}</MathJax>}
                      valueStyle={{ color: '#3f8600' }}
                    />
                    
                    <Divider />
                    
                    <Title level={4}>快速幂算法分步演示</Title>
                    
                    <List
                      dataSource={modPowResult.steps || []}
                      renderItem={(step, index) => (
                        <List.Item>
                          <Card
                            size="small"
                            title={step.title}
                            style={{ width: '100%' }}
                          >
                            <Paragraph>{step.description}</Paragraph>
                            {step.formula && (
                              <div className="math-display" style={{ padding: 8, fontSize: 14 }}>
                                <MathJax inline>{`$${step.formula}$`}</MathJax>
                              </div>
                            )}
                            {step.result !== undefined && (
                              <Tag color="blue" style={{ marginTop: 8 }}>
                                result = {step.result}
                              </Tag>
                            )}
                          </Card>
                        </List.Item>
                      )}
                    />
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
                    <CalculatorOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <Paragraph>请输入参数并点击计算</Paragraph>
                  </div>
                )}
              </Card>

              <Card title="快速幂算法说明" style={{ marginTop: 24 }}>
                <Paragraph>
                  快速幂算法（Binary Exponentiation）是一种高效计算大指数模运算的方法，时间复杂度为 <MathJax inline>{`$O(\\log n)$`}</MathJax>。
                </Paragraph>
                
                <div className="code-block">
{`# 快速幂算法伪代码
function mod_pow(base, exponent, modulus):
    result = 1
    base = base % modulus
    while exponent > 0:
        if exponent % 2 == 1:
            result = (result * base) % modulus
        base = (base * base) % modulus
        exponent = exponent // 2
    return result`}
                </div>
                
                <Alert
                  message="为什么需要快速幂？"
                  description="直接计算 base^exponent 会产生极大的中间结果，快速幂通过每步取模保持数值可控，同时通过二分法减少计算次数。"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 加解密标签页 */}
        <TabPane
          tab={
            <span>
              <LockOutlined /> 加解密
            </span>
          }
          key="encrypt"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <span>
                    <LockOutlined /> 加密
                  </span>
                }
                type="inner"
              >
                <Form layout="vertical">
                  <Form.Item label="输入明文消息">
                    <TextArea
                      value={encryptText}
                      onChange={(e) => setEncryptText(e.target.value)}
                      placeholder="输入要加密的文本消息..."
                      rows={4}
                      maxLength={1000}
                      showCount
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button
                      type="primary"
                      onClick={encryptMessage}
                      loading={loading}
                      icon={<LockOutlined />}
                      block
                    >
                      加密消息
                    </Button>
                  </Form.Item>
                </Form>
                
                {encryptedResult && (
                  <>
                    <Divider />
                    <Title level={5}>加密结果</Title>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="密文块">
                        <TextArea
                          value={JSON.stringify(encryptedResult.encrypted_blocks, null, 2)}
                          readOnly
                          rows={6}
                          style={{ fontFamily: 'monospace' }}
                        />
                      </Descriptions.Item>
                      <Descriptions.Item label="块数量">
                        <Tag color="blue">{encryptedResult.encrypted_blocks?.length || 0}</Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <span>
                    <UnlockOutlined /> 解密
                  </span>
                }
                type="inner"
              >
                <Form layout="vertical">
                  <Form.Item label="输入密文块（JSON 数组）">
                    <TextArea
                      value={decryptBlocks}
                      onChange={(e) => setDecryptBlocks(e.target.value)}
                      placeholder='输入密文块，如 [123, 456, ...]'
                      rows={4}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button
                      type="primary"
                      onClick={decryptMessage}
                      loading={loading}
                      icon={<UnlockOutlined />}
                      block
                      danger
                    >
                      解密消息
                    </Button>
                  </Form.Item>
                </Form>
                
                {decryptedResult && (
                  <>
                    <Divider />
                    <Title level={5}>解密结果</Title>
                    <Card
                      size="small"
                      style={{
                        background: decryptedResult.decrypted_message ? '#f6ffed' : '#fff2f0',
                        borderColor: decryptedResult.decrypted_message ? '#b7eb8f' : '#ffa39e'
                      }}
                    >
                      <Space>
                        {decryptedResult.decrypted_message ? (
                          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                        )}
                        <Text strong style={{ fontSize: 16 }}>
                          {decryptedResult.decrypted_message || '解密失败'}
                        </Text>
                      </Space>
                    </Card>
                    
                    {decryptedResult.steps && (
                      <Details
                        open={false}
                        title="查看详细步骤"
                        style={{ marginTop: 12 }}
                      >
                        <List
                          size="small"
                          dataSource={decryptedResult.steps}
                          renderItem={(step) => (
                            <List.Item>
                              <Text strong>{step.title}:</Text> {step.description}
                            </List.Item>
                          )}
                        />
                      </Details>
                    )}
                  </>
                )}
              </Card>
            </Col>
          </Row>

          <Card title="加解密示例" style={{ marginTop: 24 }}>
            <Alert
              message="使用 p=61, q=53, e=17 的小密钥演示"
              description={
                <div>
                  <Paragraph>
                    公钥: (e=17, n=3233) | 私钥: (d=2753, n=3233)
                  </Paragraph>
                  <Paragraph>
                    消息 "Hi" → ASCII 编码 (72, 105) → 合并为 72×256 + 105 = 18537（或分块处理）
                  </Paragraph>
                  <div className="math-display">
                    <MathJax inline>{`$c = 65^{17} \\mod 3233 = 2790$`}</MathJax>
                    <br />
                    <MathJax inline>{`$m = 2790^{2753} \\mod 3233 = 65$`}</MathJax>
                  </div>
                </div>
              }
              type="info"
              showIcon
            />
          </Card>
        </TabPane>

        {/* 历史记录标签页 */}
        <TabPane
          tab={
            <span>
              <HistoryOutlined /> 历史记录
            </span>
          }
          key="history"
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title="密钥历史">
                <List
                  dataSource={keysHistory}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag>#{item.id}</Tag>
                            <Text>密钥对</Text>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" split={<Divider type="vertical" />}>
                            <Text type="secondary">p: {String(item.p).slice(0, 20)}...</Text>
                            <Text type="secondary">q: {String(item.q).slice(0, 20)}...</Text>
                            <Text type="secondary">e: {item.e}</Text>
                            <Text type="secondary">{item.created_at}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无密钥历史' }}
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="操作历史">
                <List
                  dataSource={operationsHistory}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color={item.operation_type === 'encrypt' ? 'blue' : 'green'}>
                              {item.operation_type === 'encrypt' ? '加密' : '解密'}
                            </Tag>
                            <Text type="secondary">Key #{item.key_id}</Text>
                          </Space>
                        }
                        description={
                          <Space direction="vertical">
                            <Text ellipsis>输入: {item.input_text?.slice(0, 50)}...</Text>
                            <Text ellipsis>输出: {item.output_text?.slice(0, 50)}...</Text>
                            <Text type="secondary">{item.created_at}</Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无操作历史' }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  )
}

// 简单的 Details 组件（类似 HTML5 details）
function Details({ children, open = false, title, style }) {
  const [isOpen, setIsOpen] = useState(open)
  
  return (
    <div style={style}>
      <Button
        type="link"
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: 0 }}
      >
        {isOpen ? '收起' : '展开'} {title}
      </Button>
      {isOpen && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  )
}

export default RSADemoPage
