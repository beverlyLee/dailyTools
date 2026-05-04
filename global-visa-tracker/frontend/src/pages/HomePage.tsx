import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Spin,
  Alert,
  Button,
} from 'antd';
import {
  GlobalOutlined,
  FileTextOutlined,
  ScanOutlined,
  ProfileOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { visaApi } from '../services/api';
import type { VisaApplication, VisaStatus } from '../types';

const statusIcons: Record<VisaStatus, React.ReactNode> = {
  pending: <ClockCircleOutlined style={{ color: '#faad14' }} />,
  processing: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
  approved: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  rejected: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  ready_for_pickup: <CheckCircleOutlined style={{ color: '#722ed1' }} />,
  in_transit: <GlobalOutlined style={{ color: '#13c2c2' }} />,
  unknown: <ClockCircleOutlined style={{ color: '#8c8c8c' }} />,
};

const statusColors: Record<VisaStatus, string> = {
  pending: 'gold',
  processing: 'blue',
  approved: 'green',
  rejected: 'red',
  ready_for_pickup: 'purple',
  in_transit: 'cyan',
  unknown: 'default',
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await visaApi.getApplications(0, 10);
      setApplications(result.applications);
      setError(null);
    } catch (err) {
      setError('Failed to load applications. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusCount = (status: VisaStatus): number => {
    return applications.filter((app) => app.status === status).length;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/applications')}>
            <Statistic
              title="Total Applications"
              value={applications.length}
              prefix={<ProfileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Processing"
              value={
                getStatusCount('processing') + getStatusCount('pending')
              }
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Approved"
              value={getStatusCount('approved')}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Ready for Pickup"
              value={getStatusCount('ready_for_pickup')}
              prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="Quick Actions"
            extra={
              <Button type="link" onClick={() => navigate('/applications')}>
                View All
              </Button>
            }
          >
            <Row gutter={[8, 8]}>
              <Col xs={12}>
                <Card
                  hoverable
                  onClick={() => navigate('/query')}
                  style={{ textAlign: 'center' }}
                >
                  <GlobalOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  <div style={{ marginTop: 8 }}>Track Status</div>
                </Card>
              </Col>
              <Col xs={12}>
                <Card
                  hoverable
                  onClick={() => navigate('/checklist')}
                  style={{ textAlign: 'center' }}
                >
                  <FileTextOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                  <div style={{ marginTop: 8 }}>Document Checklist</div>
                </Card>
              </Col>
              <Col xs={12}>
                <Card
                  hoverable
                  onClick={() => navigate('/ocr')}
                  style={{ textAlign: 'center' }}
                >
                  <ScanOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                  <div style={{ marginTop: 8 }}>OCR Preview</div>
                </Card>
              </Col>
              <Col xs={12}>
                <Card
                  hoverable
                  onClick={() => navigate('/applications')}
                  style={{ textAlign: 'center' }}
                >
                  <ProfileOutlined style={{ fontSize: 32, color: '#fa8c16' }} />
                  <div style={{ marginTop: 8 }}>My Applications</div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Recent Applications"
            extra={
              <Button type="link" onClick={loadData}>
                Refresh
              </Button>
            }
          >
            {applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <ProfileOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>No applications yet</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Add your first visa application to get started
                </div>
              </div>
            ) : (
              <List
                dataSource={applications.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Tag color={statusColors[item.status]} key="status">
                        {item.status.replace('_', ' ').toUpperCase()}
                      </Tag>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={statusIcons[item.status]}
                      title={
                        <span>
                          {item.applicant_name || 'Application'}{' '}
                          <span style={{ color: '#999', fontSize: 12 }}>
                            ({item.application_number})
                          </span>
                        </span>
                      }
                      description={
                        <span>
                          {item.country} - {item.visa_type}
                          <span style={{ color: '#999', marginLeft: 16 }}>
                            {dayjs(item.created_at).format('YYYY-MM-DD')}
                          </span>
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Supported Countries">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { code: 'usa', name: 'United States' },
            { code: 'schengen', name: 'Schengen Area (EU)' },
            { code: 'uk', name: 'United Kingdom' },
            { code: 'japan', name: 'Japan' },
          ].map((country) => (
            <Tag key={country.code} color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
              {country.name}
            </Tag>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default HomePage;
