import React from 'react';
import { Row, Col, Card, Typography, Spin, Alert } from 'antd';
import { useLogStore } from '@/store';
import { StatCards } from '@/components/StatCard';
import {
  LevelDistributionChart,
  ServiceDistributionChart,
  ErrorRateTrendChart,
  AccessHeatmapChart,
} from '@/components/Charts';
import { LogTable } from '@/components/LogTable';

const { Title } = Typography;

export const DashboardPage: React.FC = () => {
  const { logs, stats, loading, error } = useLogStore();

  const servicesCount = stats ? Object.keys(stats.logs.by_service).length : 0;
  const activeAlertsCount = stats?.alerts.total || 0;

  return (
    <div>
      {error && (
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      <StatCards
        totalLogs={stats?.logs.total || 0}
        errorRate={stats?.logs.error_rate_percent || 0}
        totalAlerts={activeAlertsCount}
        servicesCount={servicesCount}
      />

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <LevelDistributionChart stats={stats} />
        </Col>
        <Col xs={24} lg={12}>
          <ServiceDistributionChart stats={stats} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <ErrorRateTrendChart logs={logs} />
        </Col>
        <Col xs={24} lg={12}>
          <AccessHeatmapChart logs={logs} />
        </Col>
      </Row>

      <Card
        title={
          <Title level={4} style={{ margin: 0 }}>
            最新日志
          </Title>
        }
        style={{ marginTop: 24 }}
      >
        <LogTable logs={logs.slice(0, 50)} loading={loading} />
      </Card>
    </div>
  );
};
