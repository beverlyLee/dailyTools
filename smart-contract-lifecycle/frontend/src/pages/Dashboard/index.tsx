import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Progress, Table, Divider } from 'antd';
import {
  FileSearchOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    pendingReview: 12,
    signedContracts: 87,
    upcomingReminders: 5,
    riskPoints: 3,
  });

  const lineData = [
    { month: '1月', contracts: 45, reviews: 38 },
    { month: '2月', contracts: 52, reviews: 42 },
    { month: '3月', contracts: 61, reviews: 55 },
    { month: '4月', contracts: 58, reviews: 51 },
    { month: '5月', contracts: 72, reviews: 65 },
    { month: '6月', contracts: 85, reviews: 78 },
  ];

  const pieData = [
    { type: '采购合同', value: 35 },
    { type: '销售合同', value: 28 },
    { type: '服务合同', value: 20 },
    { type: '租赁合同', value: 12 },
    { type: '其他', value: 5 },
  ];

  const recentReviews = [
    {
      id: 1,
      title: '设备采购合同-20230512',
      status: 'completed',
      riskLevel: 'low',
      time: '2023-05-12 14:30',
    },
    {
      id: 2,
      title: '技术服务协议-20230510',
      status: 'processing',
      riskLevel: 'medium',
      time: '2023-05-10 09:15',
    },
    {
      id: 3,
      title: '办公场所租赁合同',
      status: 'completed',
      riskLevel: 'high',
      time: '2023-05-08 16:45',
    },
    {
      id: 4,
      title: '供应商合作框架协议',
      status: 'pending',
      riskLevel: 'unknown',
      time: '2023-05-07 10:20',
    },
  ];

  const upcomingExpirations = [
    {
      id: 1,
      title: '服务器托管服务合同',
      expireDate: '2023-06-15',
      daysLeft: 41,
      type: '服务合同',
    },
    {
      id: 2,
      title: '办公软件年度订阅协议',
      expireDate: '2023-06-20',
      daysLeft: 46,
      type: '采购合同',
    },
    {
      id: 3,
      title: '咨询服务框架合同',
      expireDate: '2023-07-05',
      daysLeft: 61,
      type: '服务合同',
    },
  ];

  const lineConfig = {
    data: lineData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 5000,
      },
    },
    color: ['#1890ff', '#52c41a'],
    legend: {
      position: 'top',
    },
  };

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}',
    },
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
    legend: {
      position: 'bottom',
    },
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag color="success">已完成</Tag>;
      case 'processing':
        return <Tag color="processing">处理中</Tag>;
      case 'pending':
        return <Tag color="default">待处理</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  const getRiskTag = (level: string) => {
    switch (level) {
      case 'low':
        return <Tag color="success">低风险</Tag>;
      case 'medium':
        return <Tag color="warning">中风险</Tag>;
      case 'high':
        return <Tag color="error">高风险</Tag>;
      default:
        return <Tag color="default">待评估</Tag>;
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="待审查合同"
              value={stats.pendingReview}
              prefix={<FileSearchOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="已签署合同"
              value={stats.signedContracts}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={<ArrowUpOutlined style={{ color: '#52c41a', fontSize: '16px' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="即将到期提醒"
              value={stats.upcomingReminders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="待处理风险点"
              value={stats.riskPoints}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="合同数量趋势" bordered={false}>
            <Line {...lineConfig} data={lineData} xField="month" yField="contracts" seriesField="type" />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="合同类型分布" bordered={false}>
            <Pie {...pieConfig} />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="最近审查记录" bordered={false}>
            <List
              dataSource={recentReviews}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '4px',
                          background: '#e6f7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        <FileSearchOutlined style={{ color: '#1890ff' }} />
                      </div>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>{item.title}</span>
                        <div>{getStatusTag(item.status)}</div>
                      </div>
                    }
                    description={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>{getRiskTag(item.riskLevel)}</div>
                        <div style={{ color: '#999' }}>{item.time}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="即将到期合同" bordered={false}>
            <List
              dataSource={upcomingExpirations}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '4px',
                          background: '#fff7e6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        <ClockCircleOutlined style={{ color: '#faad14' }} />
                      </div>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>{item.title}</span>
                        <Tag color="blue">{item.type}</Tag>
                      </div>
                    }
                    description={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: '#999' }}>到期日期: {item.expireDate}</div>
                        <div style={{ color: '#faad14', fontWeight: 500 }}>
                          剩余 {item.daysLeft} 天
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
