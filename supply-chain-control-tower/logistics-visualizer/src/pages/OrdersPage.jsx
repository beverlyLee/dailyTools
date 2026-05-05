import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Progress, Badge, Select, Space, message, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getOrders } from '../api/logistics';

const { Option } = Select;

const statusColors = {
  processing: 'blue',
  in_transit: 'cyan',
  delayed: 'red',
  delivered: 'green',
};

const statusTexts = {
  processing: '处理中',
  in_transit: '运输中',
  delayed: '已延迟',
  delivered: '已送达',
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getOrders();
      setOrders(response.data);
    } catch (error) {
      message.error('加载订单数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter((o) => o.status === filterStatus);

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text, record) => (
        <Space>
          {text}
          {record.hasAlert && (
            <Badge status="error" />
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>
          {statusTexts[status]}
        </Tag>
      ),
      filters: [
        { text: '处理中', value: 'processing' },
        { text: '运输中', value: 'in_transit' },
        { text: '已延迟', value: 'delayed' },
        { text: '已送达', value: 'delivered' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress, record) => (
        <Progress
          percent={progress}
          size="small"
          status={record.status === 'delayed' ? 'exception' : 'active'}
          strokeColor={record.status === 'delayed' ? '#ff4d4f' : undefined}
        />
      ),
    },
    {
      title: '起点',
      dataIndex: 'origin',
      key: 'origin',
    },
    {
      title: '终点',
      dataIndex: 'destination',
      key: 'destination',
    },
    {
      title: '承运商',
      dataIndex: 'carrier',
      key: 'carrier',
    },
    {
      title: '预计到达',
      dataIndex: 'estimatedTime',
      key: 'estimatedTime',
    },
    {
      title: '实际到达',
      dataIndex: 'actualTime',
      key: 'actualTime',
      render: (text) => text || '-',
    },
  ];

  return (
    <Card
      title="订单追踪"
      extra={
        <Space>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 150 }}
          >
            <Option value="all">全部状态</Option>
            <Option value="processing">处理中</Option>
            <Option value="in_transit">运输中</Option>
            <Option value="delayed">已延迟</Option>
            <Option value="delivered">已送达</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchOrders}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条订单`,
        }}
      />
    </Card>
  );
};

export default OrdersPage;
