import React, { useState, useRef } from 'react';
import {
  Card,
  Upload,
  Button,
  Form,
  Select,
  Input,
  message,
  Spin,
  Row,
  Col,
  Descriptions,
  Tag,
  Divider,
  Alert,
  Space,
} from 'antd';
import {
  ScanOutlined,
  UploadOutlined,
  FileTextOutlined,
  ProfileOutlined,
} from '@ant-design/icons';

import { ocrApi } from '../services/api';
import type { OCRResult } from '../types';

const { Option } = Select;
const { TextArea } = Input;

const documentTypes = [
  { value: 'passport', label: 'Passport' },
  { value: 'id', label: 'ID Card' },
  { value: 'visa', label: 'Visa Document' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'employment_letter', label: 'Employment Letter' },
  { value: 'other', label: 'Other Document' },
];

const OCRPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (info: any) => {
    const { file } = info;
    if (file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (file.status === 'done') {
      setLoading(false);
    }
    if (file.originFileObj) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file.originFileObj);
    }
  };

  const handleProcessImage = async (values: any) => {
    const file = values.image?.[0]?.originFileObj;
    if (!file) {
      message.error('Please select an image file');
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const ocrResult = await ocrApi.recognizeDocument(
        file,
        values.documentType
      );

      setResult(ocrResult);
      message.success('OCR processing completed');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'OCR processing failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessText = async (values: any) => {
    if (!values.textContent?.trim()) {
      message.error('Please enter some text to process');
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const extractResult = await ocrApi.extractFromText(
        values.textContent,
        values.documentType
      );

      setResult({
        success: extractResult.success,
        text: extractResult.original_text,
        text_lines: extractResult.original_text.split('\n'),
        bounding_boxes: [],
        confidences: [],
        language: 'auto',
        processed_at: new Date().toISOString(),
        extracted_fields: extractResult.extracted_fields,
      });

      message.success('Text extraction completed');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Text extraction failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    name: 'image',
    listType: 'picture' as const,
    maxCount: 1,
    accept: 'image/*',
    beforeUpload: () => false,
    onChange: handleFileChange,
  };

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="OCR Preview Tool" icon={<ScanOutlined />}>
            <Form
              form={form}
              layout="vertical"
            >
              <Alert
                message="About OCR Preview"
                description="This tool uses PaddleOCR to extract text from documents. It can automatically detect fields like passport numbers, dates, and names. Note: In demo mode, it returns sample data."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Form.Item
                name="documentType"
                label="Document Type (Optional)"
              >
                <Select placeholder="Select document type for better extraction">
                  {documentTypes.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Divider>Option 1: Upload Image</Divider>

              <Form.Item
                name="image"
                label="Upload Document Image"
                valuePropName="fileList"
                getValueFromEvent={(e) => {
                  if (Array.isArray(e)) {
                    return e;
                  }
                  return e?.fileList;
                }}
              >
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>Select Image</Button>
                </Upload>
              </Form.Item>

              {imagePreview && (
                <div style={{ marginBottom: 24 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 300,
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                    }}
                  />
                </div>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  icon={<ScanOutlined />}
                  loading={loading}
                  onClick={() => {
                    form.validateFields(['image']).then(handleProcessImage);
                  }}
                  disabled={!form.getFieldValue('image')?.length}
                  block
                >
                  Process Image with OCR
                </Button>
              </Form.Item>

              <Divider>Option 2: Paste Text</Divider>

              <Form.Item
                name="textContent"
                label="Document Text"
              >
                <TextArea
                  rows={8}
                  placeholder="Paste text from your document here for field extraction..."
                />
              </Form.Item>

              <Form.Item>
                <Button
                  icon={<FileTextOutlined />}
                  loading={loading}
                  onClick={() => {
                    form.validateFields(['textContent']).then(handleProcessText);
                  }}
                  disabled={!form.getFieldValue('textContent')}
                  block
                >
                  Extract Fields from Text
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="OCR Result"
            extra={
              result && (
                <Tag color={result.success ? 'green' : 'red'}>
                  {result.success ? 'Success' : 'Failed'}
                </Tag>
              )
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Processing document...</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                  OCR is running...
                </div>
              </div>
            ) : result ? (
              <div>
                {result.extracted_fields && Object.keys(result.extracted_fields).length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>
                      <ProfileOutlined style={{ marginRight: 8 }} />
                      Extracted Fields
                    </h3>
                    <Descriptions bordered column={1} size="small">
                      {Object.entries(result.extracted_fields).map(([key, value]) => (
                        <Descriptions.Item
                          key={key}
                          label={key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        >
                          {Array.isArray(value) ? (
                            <Space wrap>
                              {value.map((v, i) => (
                                <Tag key={i} color="blue">{v}</Tag>
                              ))}
                            </Space>
                          ) : (
                            String(value)
                          )}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  </div>
                )}

                <Divider orientation="left">Full OCR Text</Divider>
                <div
                  style={{
                    background: '#f5f5f5',
                    padding: 16,
                    borderRadius: 4,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 400,
                    overflow: 'auto',
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {result.text}
                </div>

                {result.note && (
                  <Alert
                    message={result.note}
                    type="warning"
                    style={{ marginTop: 16 }}
                  />
                )}

                <div style={{ marginTop: 24, textAlign: 'right', color: '#999', fontSize: 12 }}>
                  Processed at: {new Date(result.processed_at).toLocaleString()}
                  {result.language && ` | Language: ${result.language}`}
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: 60,
                  color: '#999',
                }}
              >
                <ScanOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>Upload an image or paste text to begin OCR</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Supported: Passports, IDs, Bank Statements, and more
                </div>
              </div>
            )}
          </Card>

          <Card title="Supported Field Types" style={{ marginTop: 24 }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Passport</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#666' }}>
                  <li>Passport Number</li>
                  <li>Surname / Given Name</li>
                  <li>Date of Birth</li>
                  <li>Expiry Date</li>
                  <li>Nationality</li>
                  <li>Gender</li>
                </ul>
              </Col>
              <Col span={8}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>General</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#666' }}>
                  <li>Dates (various formats)</li>
                  <li>Reference Numbers</li>
                  <li>GWF Numbers (UK)</li>
                  <li>SEVIS IDs (US)</li>
                  <li>Confirmation Numbers</li>
                </ul>
              </Col>
              <Col span={8}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Financial</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#666' }}>
                  <li>USD Amounts</li>
                  <li>EUR Amounts</li>
                  <li>GBP Amounts</li>
                  <li>JPY Amounts</li>
                  <li>Account Balances</li>
                </ul>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OCRPage;
