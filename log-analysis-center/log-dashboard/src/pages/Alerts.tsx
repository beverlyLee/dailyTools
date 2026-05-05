import React from 'react';
import { Table, Tag, Card, Typography, Space, Empty, Button, Popconfirm, message } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useLogStore } from '@/store';
import type { Alert } from '@/types';
import {
  formatRelativeTime,
  getAlertSeverityBadgeColor,
  truncateText,
} from '@/utils/helpers';
import { ALERT_SEVERITY_LABELS } from '@/utils/constants';

const { Title } = Typography;

export const AlertsPage: React.FC = () => {
  const { alerts, loading } = useLogStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open':
        return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      case 'Acknowledged':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'Resolved':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'Closed':
        return <CheckCircleOutlined style={{ color: '#8c8c8c' }} />;
      default:
        return null;
    }
  };

  const columns: ColumnsType<Alert> = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Space>
          {getStatusIcon(status)}
          <span>{status}</span>
        </Space>
      ),
      filters: [
        { text: 'Open', value: 'Open' },
        { text: 'Acknowledged', value: 'Acknowledged' },
        { text: 'Resolved', value: 'Resolved' },
        { text: 'Closed', value: 'Closed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      render: (severity: string) => (
        <Tag color={getAlertSeverityBadgeColor(severity)}>
          {ALERT_SEVERITY_LABELS[severity as keyof typeof ALERT_SEVERITY_LABELS] || severity}
        </Tag>
      ),
      filters: [
        { text: '低', value: 'Low' },
        { text: '中', value: 'Medium' },
        { text: '高', value: 'High' },
        { text: '严重', value: 'Critical' },
      ],
      onFilter: (value, record) => record.severity === value,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record) => (
        <span>
          {title}
          {record.rule_name && (
            <Tag size="small" color="blue" style={{ marginLeft: 8 }}>
              规则: {record.rule_name}
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => truncateText(message, 80),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => formatRelativeTime(time),
      sorter: (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}>
            查看
          </Button>
          {record.status === 'Open' && (
            <Button type="link" size="small">
              确认
            </Button>
          )}
          {record.status !== 'Closed' && record.status !== 'Resolved' && (
            <Button type="link" size="small">
              解决
            </Button>
          )}
          <Popconfirm
            title="确定要关闭此告警吗？"
            onConfirm={() => message.success('告警已关闭')}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              关闭
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        告警中心
      </Title>

      <Card>
        {alerts.length > 0 ? (
          <Table
            columns={columns}
            dataSource={alerts}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条告警`,
              defaultPageSize: 10,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 1200 }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无告警"
          />
        )}
      </Card>
    </div>
  );
};
