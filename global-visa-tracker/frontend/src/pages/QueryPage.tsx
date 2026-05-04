import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  Collapse,
  Descriptions,
  Tag,
  message,
  Spin,
  Row,
  Col,
  Divider,
  Switch,
  Space,
} from 'antd';
import {
  SearchOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { visaApi } from '../services/api';
import type { VisaStatus, Country, VisaQueryResult } from '../types';

const { Option } = Select;
const { Panel } = Collapse;

const statusColors: Record<VisaStatus, string> = {
  pending: 'gold',
  processing: 'blue',
  approved: 'green',
  rejected: 'red',
  ready_for_pickup: 'purple',
  in_transit: 'cyan',
  unknown: 'default',
};

const statusLabels: Record<VisaStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  approved: 'Approved',
  rejected: 'Rejected',
  ready_for_pickup: 'Ready for Pickup',
  in_transit: 'In Transit',
  unknown: 'Unknown',
};

const countryAdditionalFields: Record<string, { name: string; label: string; placeholder: string }[]> = {
  usa: [
    { name: 'location', label: 'Embassy/Consulate Location', placeholder: 'e.g., Beijing, Shanghai' },
  ],
  schengen: [
    { name: 'reference_number', label: 'Reference Number', placeholder: 'VFS reference number' },
    { name: 'last_name', label: 'Last Name', placeholder: 'Last name used in application' },
  ],
  uk: [
    { name: 'email', label: 'Email Address', placeholder: 'Email used for UKVI account' },
  ],
  japan: [
    { name: 'passport_number', label: 'Passport Number', placeholder: 'Passport number' },
  ],
};

const QueryPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [result, setResult] = useState<VisaQueryResult | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      const result = await visaApi.getCountries();
      setCountries(result);
    } catch (err) {
      console.error('Failed to load countries:', err);
    }
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    form.setFieldsValue({ additionalParams: {} });
  };

  const handleQuery = async (values: any) => {
    try {
      setLoading(true);
      setResult(null);

      const additionalParams: Record<string, any> = {};
      if (values.additionalParams) {
        Object.assign(additionalParams, values.additionalParams);
      }

      const queryResult = await visaApi.queryStatus(
        values.country,
        values.applicationNumber,
        values.useCache,
        additionalParams
      );

      setResult(queryResult);
      message.success('Query completed');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Query failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const additionalFields = selectedCountry ? countryAdditionalFields[selectedCountry.toLowerCase()] || [] : [];

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Track Visa Status" icon={<SearchOutlined />}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleQuery}
              initialValues={{ useCache: true }}
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
                name="applicationNumber"
                label="Application Number / Reference Number"
                rules={[
                  { required: true, message: 'Please enter application number' },
                ]}
              >
                <Input
                  placeholder="Enter your application or reference number"
                  prefix={<InfoCircleOutlined />}
                />
              </Form.Item>

              {additionalFields.length > 0 && (
                <>
                  <Divider>Additional Information (Optional)</Divider>
                  {additionalFields.map((field) => (
                    <Form.Item
                      key={field.name}
                      name={['additionalParams', field.name]}
                      label={field.label}
                    >
                      <Input placeholder={field.placeholder} />
                    </Form.Item>
                  ))}
                </>
              )}

              <Form.Item name="useCache" valuePropName="checked">
                <Space>
                  <Switch />
                  <span style={{ color: '#666' }}>
                    Use cached results (faster, may not be latest)
                  </span>
                </Space>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<SearchOutlined />}
                  loading={loading}
                  block
                >
                  {loading ? 'Querying...' : 'Check Status'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Query Result"
            extra={
              result && (
                <Tag color={result.from_cache ? 'orange' : 'green'}>
                  {result.from_cache ? 'From Cache' : 'Live Query'}
                </Tag>
              )
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Querying visa center...</div>
              </div>
            ) : result ? (
              <div>
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Status">
                    <Tag color={statusColors[result.status as VisaStatus]}>
                      {statusLabels[result.status as VisaStatus] || result.status}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status Details">
                    {result.status_details || 'No additional details available'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Application Number">
                    {result.application_number}
                  </Descriptions.Item>
                  <Descriptions.Item label="Country">
                    {result.country.toUpperCase()}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Checked">
                    <ClockCircleOutlined style={{ marginRight: 8 }} />
                    {dayjs(result.last_checked).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  {result.cache_expires_at && (
                    <Descriptions.Item label="Cache Expires At">
                      {dayjs(result.cache_expires_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                {result.raw_response && (
                  <div style={{ marginTop: 24 }}>
                    <Collapse>
                      <Panel header="Raw Response (for debugging)" key="raw">
                        <pre
                          style={{
                            background: '#f5f5f5',
                            padding: 12,
                            borderRadius: 4,
                            overflow: 'auto',
                            fontSize: 12,
                          }}
                        >
                          {result.raw_response}
                        </pre>
                      </Panel>
                    </Collapse>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: 60,
                  color: '#999',
                }}
              >
                <SearchOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>Enter your application details to check status</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Supports: USA, Schengen Area, UK, Japan
                </div>
              </div>
            )}
          </Card>

          <Card title="Quick Guide" style={{ marginTop: 24 }}>
            <Collapse defaultActiveKey={['1']}>
              <Panel header="Where to find your application number?" key="1">
                <ul>
                  <li><strong>USA (CEAC):</strong> Found on your DS-160 confirmation page</li>
                  <li><strong>Schengen (VFS):</strong> Found on your VFS application receipt</li>
                  <li><strong>UK (UKVI):</strong> Found in your GWF confirmation email</li>
                  <li><strong>Japan:</strong> Found on your visa application receipt</li>
                </ul>
              </Panel>
              <Panel header="About Caching" key="2">
                <p>
                  To avoid overloading visa center servers and provide faster responses,
                  query results are cached for 24 hours. You can disable caching to get
                  the most up-to-date status, but this may take longer.
                </p>
              </Panel>
            </Collapse>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default QueryPage;
