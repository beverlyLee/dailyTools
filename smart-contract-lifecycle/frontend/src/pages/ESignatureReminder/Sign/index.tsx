import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  message,
  Modal,
  List,
  Tag,
  Descriptions,
  Divider,
  Row,
  Col,
  Statistic,
  Timeline,
  Steps,
  Alert,
  Typography,
} from 'antd';

const { Text } = Typography;
import {
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  ReloadOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Step } = Steps;
const { TextArea } = Input;

interface Contract {
  id: number;
  title: string;
  contractNumber: string;
  contractType: string;
  status: string;
}

interface Signature {
  id: number;
  signatoryName: string;
  signatoryEmail: string;
  signatoryPhone: string;
  status: string;
  signatureType: string;
  signedAt: string;
  certificateSerialNumber: string;
}

const ESignaturePage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [signatureResult, setSignatureResult] = useState<Signature | null>(null);

  // 倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 模拟合同数据
  useEffect(() => {
    const mockContracts: Contract[] = [
      {
        id: 1,
        title: '设备采购合同-20230512',
        contractNumber: 'CT-2023-001',
        contractType: '采购合同',
        status: 'PENDING_SIGN',
      },
      {
        id: 2,
        title: '技术服务协议-20230510',
        contractNumber: 'CT-2023-002',
        contractType: '服务合同',
        status: 'PENDING_SIGN',
      },
      {
        id: 3,
        title: '办公场所租赁合同',
        contractNumber: 'CT-2023-003',
        contractType: '租赁合同',
        status: 'SIGNED',
      },
    ];
    setContracts(mockContracts);
  }, []);

  const handleContractSelect = (contractId: number) => {
    const contract = contracts.find((c) => c.id === contractId);
    setSelectedContract(contract || null);
    form.setFieldValue('contractId', contractId);
  };

  const sendVerificationCode = async () => {
    const phone = form.getFieldValue('signatoryPhone');
    if (!phone) {
      message.warning('请先输入手机号');
      return;
    }

    try {
      setLoading(true);
      // 实际项目中调用后端 API
      // const response = await axios.post('/api/esignature/send-verification-code', null, {
      //   params: { phoneNumber: phone },
      // });
      
      // 模拟发送成功
      message.success('验证码已发送到 ' + phone);
      setVerificationCodeSent(true);
      setCountdown(60);
    } catch (error: any) {
      message.error(error.response?.data?.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      // 验证选择合同
      const contractId = form.getFieldValue('contractId');
      if (!contractId) {
        message.warning('请选择要签署的合同');
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // 验证签署人信息
      form.validateFields(['signatoryName', 'signatoryPhone', 'signatureType'])
        .then(() => {
          setCurrentStep(2);
        })
        .catch(() => {
          message.warning('请填写完整的签署人信息');
        });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSign = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      // 实际项目中调用后端 API
      // const response = await axios.post('/api/esignature/create', values);
      // const signatureId = response.data.data.id;
      
      // // 完成签名
      // await axios.post(`/api/esignature/complete/${signatureId}`);

      // 模拟签名成功
      const mockSignature: Signature = {
        id: Date.now(),
        signatoryName: values.signatoryName,
        signatoryEmail: values.signatoryEmail,
        signatoryPhone: values.signatoryPhone,
        status: 'COMPLETED',
        signatureType: values.signatureType,
        signedAt: new Date().toISOString(),
        certificateSerialNumber: 'SC-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      };

      setSignatureResult(mockSignature);
      setShowSuccessModal(true);
      
      // 添加到签名记录
      setSignatures([mockSignature, ...signatures]);
      
    } catch (error: any) {
      message.error(error.response?.data?.message || '签名失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Tag color="success">已完成</Tag>;
      case 'IN_PROGRESS':
        return <Tag color="processing">签署中</Tag>;
      case 'PENDING':
        return <Tag color="default">待签署</Tag>;
      case 'REVOKED':
        return <Tag color="error">已撤销</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  const getSignatureTypeLabel = (type: string) => {
    switch (type) {
      case 'DIGITAL_SIGNATURE':
        return '数字签名';
      case 'ELECTRONIC_SIGNATURE':
        return '电子签名';
      case 'HANDWRITTEN_SIGNATURE':
        return '手写签名';
      default:
        return type;
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="待签署合同"
              value={contracts.filter((c) => c.status === 'PENDING_SIGN').length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="签署中"
              value={signatures.filter((s) => s.status === 'IN_PROGRESS').length}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="已完成签署"
              value={signatures.filter((s) => s.status === 'COMPLETED').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="总签署数"
              value={signatures.length}
              prefix={<SafetyCertificateOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="电子签名流程" bordered={false}>
            <Steps current={currentStep} style={{ marginBottom: '32px' }}>
              <Step title="选择合同" description="选择要签署的合同" />
              <Step title="填写签署信息" description="填写签署人信息" />
              <Step title="完成签名" description="确认并完成签名" />
            </Steps>

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                signatureType: 'ELECTRONIC_SIGNATURE',
              }}
            >
              {currentStep === 0 && (
                <div>
                  <Form.Item
                    name="contractId"
                    label="选择合同"
                    rules={[{ required: true, message: '请选择要签署的合同' }]}
                  >
                    <Select
                      placeholder="请选择要签署的合同"
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="children"
                      onChange={handleContractSelect}
                      filterOption={(input, option: any) =>
                        option?.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {contracts
                        .filter((c) => c.status === 'PENDING_SIGN')
                        .map((contract) => (
                          <Option key={contract.id} value={contract.id}>
                            {contract.title} ({contract.contractNumber})
                          </Option>
                        ))}
                    </Select>
                  </Form.Item>

                  {selectedContract && (
                    <Card size="small" title="合同详情">
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="合同名称">
                          {selectedContract.title}
                        </Descriptions.Item>
                        <Descriptions.Item label="合同编号">
                          {selectedContract.contractNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="合同类型">
                          <Tag color="blue">{selectedContract.contractType}</Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  )}
                </div>
              )}

              {currentStep === 1 && (
                <div>
                  <Form.Item
                    name="signatoryName"
                    label="签署人姓名"
                    rules={[{ required: true, message: '请输入签署人姓名' }]}
                  >
                    <Input placeholder="请输入签署人姓名" />
                  </Form.Item>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="signatoryEmail"
                        label="电子邮箱"
                        rules={[
                          { type: 'email', message: '请输入有效的邮箱地址' },
                        ]}
                      >
                        <Input placeholder="请输入电子邮箱" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="signatoryPhone"
                        label="手机号码"
                        rules={[
                          { required: true, message: '请输入手机号码' },
                          { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
                        ]}
                      >
                        <Input
                          placeholder="请输入手机号码"
                          addonAfter={
                            <Button
                              type="link"
                              onClick={sendVerificationCode}
                              disabled={countdown > 0 || loading}
                            >
                              {countdown > 0 ? `${countdown}s` : '发送验证码'}
                            </Button>
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {verificationCodeSent && (
                    <Form.Item
                      name="verificationCode"
                      label="验证码"
                      rules={[{ required: true, message: '请输入验证码' }]}
                    >
                      <Input placeholder="请输入收到的验证码" maxLength={6} />
                    </Form.Item>
                  )}

                  <Form.Item
                    name="signatureType"
                    label="签名类型"
                    rules={[{ required: true, message: '请选择签名类型' }]}
                  >
                    <Select placeholder="请选择签名类型">
                      <Option value="DIGITAL_SIGNATURE">数字签名（CA证书）</Option>
                      <Option value="ELECTRONIC_SIGNATURE">电子签名</Option>
                      <Option value="HANDWRITTEN_SIGNATURE">手写签名</Option>
                    </Select>
                  </Form.Item>
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <Card
                    size="small"
                    title="确认签署信息"
                    style={{ marginBottom: '24px' }}
                  >
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="合同名称">
                        {selectedContract?.title || form.getFieldValue('contractId')}
                      </Descriptions.Item>
                      <Descriptions.Item label="签署人">
                        {form.getFieldValue('signatoryName')}
                      </Descriptions.Item>
                      <Descriptions.Item label="手机号码">
                        {form.getFieldValue('signatoryPhone')}
                      </Descriptions.Item>
                      <Descriptions.Item label="电子邮箱">
                        {form.getFieldValue('signatoryEmail') || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="签名类型">
                        {getSignatureTypeLabel(form.getFieldValue('signatureType'))}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Alert
                    message="签名须知"
                    description={
                      <div>
                        <p>1. 请确认以上信息准确无误</p>
                        <p>2. 数字签名具有法律效力，请谨慎操作</p>
                        <p>3. 签名完成后将无法修改，请仔细核对</p>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                </div>
              )}

              <Divider />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={handlePrev} disabled={currentStep === 0}>
                  上一步
                </Button>
                {currentStep < 2 ? (
                  <Button type="primary" onClick={handleNext}>
                    下一步
                  </Button>
                ) : (
                  <Button type="primary" onClick={handleSign} loading={loading}>
                    <SafetyCertificateOutlined style={{ marginRight: '8px' }} />
                    确认签名
                  </Button>
                )}
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="签名记录" bordered={false}>
            {signatures.length > 0 ? (
              <List
                dataSource={signatures}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#e6f7ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <SafetyCertificateOutlined style={{ color: '#1890ff' }} />
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.signatoryName}</span>
                          {getStatusTag(item.status)}
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {getSignatureTypeLabel(item.signatureType)}
                          </div>
                          {item.signedAt && (
                            <div style={{ fontSize: '12px', color: '#999' }}>
                              {new Date(item.signedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <SafetyCertificateOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <p>暂无签名记录</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 签名成功弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px', marginRight: '8px' }} />
            签名成功
          </div>
        }
        open={showSuccessModal}
        onOk={() => {
          setShowSuccessModal(false);
          setCurrentStep(0);
          form.resetFields();
          setSelectedContract(null);
        }}
        onCancel={() => setShowSuccessModal(false)}
        okText="完成"
        cancelText="关闭"
      >
        {signatureResult && (
          <div>
            <Alert
              message="数字签名已生成"
              description="签名具有法律效力，请妥善保管相关凭证"
              type="success"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="签署人">
                {signatureResult.signatoryName}
              </Descriptions.Item>
              <Descriptions.Item label="证书序列号">
                <Text copyable>{signatureResult.certificateSerialNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="签名类型">
                {getSignatureTypeLabel(signatureResult.signatureType)}
              </Descriptions.Item>
              <Descriptions.Item label="签署时间">
                {new Date(signatureResult.signedAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ESignaturePage;
