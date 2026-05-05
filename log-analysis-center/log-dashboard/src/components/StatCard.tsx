import React from 'react';
import { Card, Statistic, Row, Col, Progress } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { StatisticProps } from 'antd/es/statistic';

interface StatCardProps {
  title: string;
  value: number | string;
  valueStyle?: React.CSSProperties;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  trend?: number;
  showProgress?: boolean;
  progressPercent?: number;
  progressColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  valueStyle,
  prefix,
  suffix,
  trend,
  showProgress = false,
  progressPercent = 0,
  progressColor = '#1890ff',
}) => {
  const isPositiveTrend = trend && trend > 0;
  const showTrend = trend !== undefined && trend !== 0;

  return (
    <Card size="small">
      <Statistic
        title={<span style={{ fontSize: 14 }}>{title}</span>}
        value={value}
        valueStyle={valueStyle}
        prefix={prefix}
        suffix={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {suffix}
            {showTrend && (
              <span style={{ 
                fontSize: 12,
                color: isPositiveTrend ? '#3f8600' : '#cf1322'
              }}>
                {isPositiveTrend ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {Math.abs(trend!)}%
              </span>
            )}
          </span>
        }
      />
      {showProgress && (
        <Progress
          percent={Math.round(progressPercent)}
          strokeColor={progressColor}
          showInfo={false}
          size="small"
          style={{ marginTop: 8 }}
        />
      )}
    </Card>
  );
};

interface StatCardsProps {
  totalLogs: number;
  errorRate: number;
  totalAlerts: number;
  servicesCount: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalLogs,
  errorRate,
  totalAlerts,
  servicesCount,
}) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="总日志数"
          value={totalLogs}
          valueStyle={{ fontSize: 32 }}
          prefix={<span style={{ fontSize: 20 }}>📊</span>}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="错误率"
          value={errorRate.toFixed(2)}
          suffix="%"
          showProgress
          progressPercent={errorRate}
          progressColor={errorRate > 10 ? '#ff4d4f' : errorRate > 5 ? '#faad14' : '#52c41a'}
          valueStyle={{ 
            fontSize: 32,
            color: errorRate > 10 ? '#ff4d4f' : errorRate > 5 ? '#faad14' : '#52c41a'
          }}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="活跃告警"
          value={totalAlerts}
          valueStyle={{ fontSize: 32, color: '#ff4d4f' }}
          prefix={<span style={{ fontSize: 20 }}>🚨</span>}
        />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <StatCard
          title="服务数量"
          value={servicesCount}
          valueStyle={{ fontSize: 32, color: '#1890ff' }}
          prefix={<span style={{ fontSize: 20 }}>🔧</span>}
        />
      </Col>
    </Row>
  );
};
