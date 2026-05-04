import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Collapse,
  Descriptions,
  Tag,
  List,
  message,
  Spin,
  Row,
  Col,
  Divider,
  Empty,
  Steps,
} from 'antd';
import {
  FileTextOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { checklistApi } from '../services/api';
import type { Country, VisaType, ChecklistResult, DocumentItem } from '../types';

const { Option } = Select;
const { Panel } = Collapse;
const { Step } = Steps;

const categoryIcons: Record<string, React.ReactNode> = {
  mandatory: <WarningOutlined style={{ color: '#ff4d4f' }} />,
  recommended: <CheckCircleOutlined style={{ color: '#1890ff' }} />,
  conditional: <ClockCircleOutlined style={{ color: '#faad14' }} />,
};

const categoryColors: Record<string, string> = {
  mandatory: 'red',
  recommended: 'blue',
  conditional: 'orange',
};

const categoryLabels: Record<string, string> = {
  mandatory: 'Mandatory',
  recommended: 'Recommended',
  conditional: 'Conditional',
};

const ChecklistPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [checklist, setChecklist] = useState<ChecklistResult | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      const result = await checklistApi.getCountries();
      setCountries(result);
    } catch (err) {
      console.error('Failed to load countries:', err);
    }
  };

  const handleCountryChange = async (value: string) => {
    setSelectedCountry(value);
    setVisaTypes([]);
    setChecklist(null);
    form.setFieldsValue({ visaType: undefined });

    try {
      setLoading(true);
      const result = await checklistApi.getVisaTypes(value);
      setVisaTypes(result.visa_types);
    } catch (err) {
      message.error('Failed to load visa types');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (values: any) => {
    try {
      setLoading(true);
      const result = await checklistApi.generateChecklist(
        values.country,
        values.visaType
      );
      setChecklist(result);
      message.success('Checklist generated');
    } catch (err) {
      message.error('Failed to generate checklist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderDocumentItem = (doc: DocumentItem, category: string) => (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <span>
          {categoryIcons[category]}
          <span style={{ marginLeft: 8 }}>{doc.name}</span>
          {doc.ocr_fields.length > 0 && (
            <Tag color="purple" style={{ marginLeft: 8 }}>
              OCR Supported
            </Tag>
          )}
        </span>
      }
    >
      <p style={{ color: '#666', marginBottom: 12 }}>{doc.description}</p>
      
      {doc.requirements && doc.requirements.length > 0 && (
        <div>
          <strong>Requirements:</strong>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            {doc.requirements.map((req, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {doc.ocr_fields && doc.ocr_fields.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong>OCR Extractable Fields:</strong>
          <div style={{ marginTop: 8 }}>
            {doc.ocr_fields.map((field) => (
              <Tag key={field} color="purple" style={{ marginRight: 4 }}>
                {field.replace(/_/g, ' ')}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </Card>
  );

  const totalDocuments = checklist
    ? checklist.documents.mandatory.length +
      checklist.documents.recommended.length +
      checklist.documents.conditional.length
    : 0;

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="Generate Checklist" icon={<FileTextOutlined />}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleGenerate}
            >
              <Form.Item
                name="country"
                label="Destination Country"
                rules={[{ required: true, message: 'Please select a country' }]}
              >
                <Select
                  placeholder="Select destination country"
                  onChange={handleCountryChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {countries.map((country) => (
                    <Option key={country.code} value={country.code}>
                      <GlobalOutlined style={{ marginRight: 8 }} />
                      {country.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="visaType"
                label="Visa Type"
                rules={[{ required: true, message: 'Please select visa type' }]}
              >
                <Select
                  placeholder="Select visa type"
                  loading={loading}
                  disabled={!selectedCountry}
                >
                  {visaTypes.map((type) => (
                    <Option key={type.code} value={type.code}>
                      {type.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedCountry && (
                <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                  {visaTypes.map((type) => (
                    <React.Fragment key={type.code}>
                      {form.getFieldValue('visaType') === type.code && (
                        <>
                          <Descriptions.Item label="Processing Time">
                            {type.processing_time}
                          </Descriptions.Item>
                          <Descriptions.Item label="Validity">
                            {type.validity}
                          </Descriptions.Item>
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </Descriptions>
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<FileTextOutlined />}
                  loading={loading}
                  block
                >
                  Generate Checklist
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title="Document Checklist"
            extra={
              checklist && (
                <span>
                  <Tag color="red">{checklist.documents.mandatory.length} Mandatory</Tag>
                  <Tag color="blue" style={{ marginLeft: 4 }}>
                    {checklist.documents.recommended.length} Recommended
                  </Tag>
                  <Tag color="orange" style={{ marginLeft: 4 }}>
                    {checklist.documents.conditional.length} Conditional
                  </Tag>
                </span>
              )
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
              </div>
            ) : checklist ? (
              <div>
                <Card
                  size="small"
                  style={{ marginBottom: 24 }}
                  title={
                    <span>
                      <GlobalOutlined style={{ marginRight: 8 }} />
                      {checklist.country} - {checklist.visa_type}
                    </span>
                  }
                >
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Processing Time">
                      {checklist.processing_time}
                    </Descriptions.Item>
                    <Descriptions.Item label="Validity">
                      {checklist.validity}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {checklist.application_steps && checklist.application_steps.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <Divider orientation="left">Application Steps</Divider>
                    <Steps direction="vertical" current={-1}>
                      {checklist.application_steps.map((step, idx) => (
                        <Step
                          key={idx}
                          title={`Step ${idx + 1}`}
                          description={step}
                        />
                      ))}
                    </Steps>
                  </div>
                )}

                <Divider orientation="left">Required Documents</Divider>

                {(['mandatory', 'recommended', 'conditional'] as const).map((category) => {
                  const docs = checklist.documents[category];
                  if (docs.length === 0) return null;

                  return (
                    <div key={category} style={{ marginBottom: 24 }}>
                      <h3 style={{ marginBottom: 16 }}>
                        <Tag color={categoryColors[category]}>
                          {categoryLabels[category]}
                        </Tag>
                        <span style={{ marginLeft: 8, color: '#666' }}>
                          {docs.length} document{docs.length > 1 ? 's' : ''}
                        </span>
                      </h3>
                      <List
                        dataSource={docs}
                        renderItem={(doc) => (
                          <List.Item>{renderDocumentItem(doc, category)}</List.Item>
                        )}
                      />
                    </div>
                  );
                })}

                {checklist.general_notes && (
                  <div>
                    <Divider orientation="left">General Notes</Divider>
                    <Collapse>
                      {checklist.general_notes.photograph_requirements && (
                        <Panel header="Photograph Requirements" key="photo">
                          <Descriptions column={1} size="small">
                            {Object.entries(checklist.general_notes.photograph_requirements).map(
                              ([key, value]) => (
                                <Descriptions.Item
                                  key={key}
                                  label={key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                >
                                  {value}
                                </Descriptions.Item>
                              )
                            )}
                          </Descriptions>
                        </Panel>
                      )}
                      {checklist.general_notes.common_rejection_reasons && (
                        <Panel header="Common Rejection Reasons" key="rejection">
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {checklist.general_notes.common_rejection_reasons.map(
                              (reason: string, idx: number) => (
                                <li key={idx} style={{ marginBottom: 8 }}>
                                  {reason}
                                </li>
                              )
                            )}
                          </ul>
                        </Panel>
                      )}
                    </Collapse>
                  </div>
                )}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Select a country and visa type to generate your document checklist"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ChecklistPage;
