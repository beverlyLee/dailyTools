import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  SyncOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { visaApi } from '../services/api';
import type { VisaApplication, VisaStatus, Country } from '../types';

const { Option } = Select;

const statusColors: Record<VisaStatus, string> = {
  pending: 'gold',
  processing: 'blue',
  approved: 'green',
  rejected: 'red',
  ready_for_pickup: 'purple',
  in_transit: 'cyan',
  unknown: 'default',
};

const ApplicationsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<VisaApplication | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCountries();
    loadApplications();
  }, []);

  const loadCountries = async () => {
    try {
      const result = await visaApi.getCountries();
      setCountries(result);
    } catch (err) {
      console.error('Failed to load countries:', err);
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const result = await visaApi.getApplications();
      setApplications(result.applications);
    } catch (err) {
      message.error('Failed to load applications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditMode(false);
    setSelectedApplication(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: VisaApplication) => {
    setEditMode(true);
    setSelectedApplication(record);
    form.setFieldsValue({
      ...record,
      submit_date: record.submit_date ? dayjs(record.submit_date) : undefined,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await visaApi.deleteApplication(id);
      message.success('Application deleted successfully');
      loadApplications();
    } catch (err) {
      message.error('Failed to delete application');
      console.error(err);
    }
  };

  const handleRefresh = async (record: VisaApplication) => {
    try {
      const result = await visaApi.refreshApplication(record.id);
      message.success('Status refreshed');
      loadApplications();
    } catch (err) {
      message.error('Failed to refresh status');
      console.error(err);
    }
  };

  const handleView = (record: VisaApplication) => {
    setSelectedApplication(record);
    setIsDetailModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editMode && selectedApplication) {
        await visaApi.updateApplication(selectedApplication.id, {
          ...values,
          submit_date: values.submit_date?.format('YYYY-MM-DD'),
        });
        message.success('Application updated successfully');
      } else {
        await visaApi.createApplication({
          ...values,
          submit_date: values.submit_date?.format('YYYY-MM-DD'),
        });
        message.success('Application created successfully');
      }
      setIsModalOpen(false);
      loadApplications();
    } catch (err) {
      message.error('Failed to save application');
      console.error(err);
    }
  };

  const columns = [
    {
      title: 'Application Number',
      dataIndex: 'application_number',
      key: 'application_number',
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (text: string) => text.toUpperCase(),
    },
    {
      title: 'Visa Type',
      dataIndex: 'visa_type',
      key: 'visa_type',
      render: (text: string) => text.toUpperCase(),
    },
    {
      title: 'Applicant',
      dataIndex: 'applicant_name',
      key: 'applicant_name',
      render: (text: string) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: VisaStatus) => (
        <Tag color={statusColors[status]}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'submit_date',
      key: 'submit_date',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: 'Last Checked',
      dataIndex: 'last_checked_at',
      key: 'last_checked_at',
      render: (date: string) =>
        date ? dayjs(date).format('MM-DD HH:mm') : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: VisaApplication) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          />
          <Button
            type="text"
            icon={<SyncOutlined />}
            onClick={() => handleRefresh(record)}
            title="Refresh Status"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this application?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Visa Applications"
        extra={
          <Space>
            <Button icon={<SyncOutlined />} onClick={loadApplications}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Add Application
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
          }}
        />
      </Card>

      <Modal
        title={editMode ? 'Edit Application' : 'Add New Application'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={
            editMode && selectedApplication
              ? {
                  ...selectedApplication,
                  submit_date: selectedApplication.submit_date
                    ? dayjs(selectedApplication.submit_date)
                    : undefined,
                }
              : {}
          }
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="application_number"
                label="Application Number"
                rules={[
                  { required: true, message: 'Please enter application number' },
                ]}
              >
                <Input placeholder="Enter application number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="country"
                label="Country"
                rules={[{ required: true, message: 'Please select country' }]}
              >
                <Select placeholder="Select country">
                  {countries.map((country) => (
                    <Option key={country.code} value={country.code}>
                      {country.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="visa_type"
                label="Visa Type"
                rules={[{ required: true, message: 'Please enter visa type' }]}
              >
                <Select
                  placeholder="Select or type visa type"
                  allowClear
                  mode="tags"
                  maxTagCount={1}
                >
                  <Option value="tourist">Tourist</Option>
                  <Option value="business">Business</Option>
                  <Option value="student">Student</Option>
                  <Option value="work">Work</Option>
                  <Option value="b1_b2">B1/B2 (US)</Option>
                  <Option value="f1">F1 (US Student)</Option>
                  <Option value="standard_visitor">Standard Visitor (UK)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="applicant_name" label="Applicant Name">
                <Input placeholder="Enter applicant name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="applicant_nationality" label="Nationality">
                <Input placeholder="Enter nationality" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="passport_number" label="Passport Number">
                <Input placeholder="Enter passport number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="submit_date" label="Submit Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editMode ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Application Details"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {selectedApplication && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Application Number">
              {selectedApplication.application_number}
            </Descriptions.Item>
            <Descriptions.Item label="Country">
              {selectedApplication.country.toUpperCase()}
            </Descriptions.Item>
            <Descriptions.Item label="Visa Type">
              {selectedApplication.visa_type.toUpperCase()}
            </Descriptions.Item>
            <Descriptions.Item label="Applicant Name">
              {selectedApplication.applicant_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Nationality">
              {selectedApplication.applicant_nationality || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Passport Number">
              {selectedApplication.passport_number || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColors[selectedApplication.status]}>
                {selectedApplication.status.replace('_', ' ').toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status Details">
              {selectedApplication.status_details || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Submit Date">
              {selectedApplication.submit_date
                ? dayjs(selectedApplication.submit_date).format('YYYY-MM-DD')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Checked">
              {selectedApplication.last_checked_at
                ? dayjs(selectedApplication.last_checked_at).format('YYYY-MM-DD HH:mm')
                : 'Never'}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {dayjs(selectedApplication.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ApplicationsPage;
