import React, { useState, useEffect } from 'react';
import { Layout, Menu, Spin, Alert, Badge } from 'antd';
import {
  DashboardOutlined,
  TruckOutlined,
  WarehouseOutlined,
  BellOutlined,
} from '@ant-design/icons';
import TopologyPage from './pages/TopologyPage';
import OrdersPage from './pages/OrdersPage';
import InventoryPage from './pages/InventoryPage';
import AlertsPage from './pages/AlertsPage';
import { wsService, getAlerts } from './api/logistics';

const { Header, Sider, Content } = Layout;

function App() {
  const [selectedKey, setSelectedKey] = useState('topology');
  const [collapsed, setCollapsed] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    wsService.connect();
    
    wsService.on('alerts_update', () => {
      fetchAlertsCount();
    });

    fetchAlertsCount();

    return () => {
      wsService.disconnect();
    };
  }, []);

  const fetchAlertsCount = async () => {
    try {
      const response = await getAlerts();
      const unacknowledged = response.data.filter((a) => !a.acknowledged);
      setAlertsCount(unacknowledged.length);
    } catch (error) {
      console.error('获取告警数量失败:', error);
    }
  };

  const menuItems = [
    {
      key: 'topology',
      icon: <DashboardOutlined />,
      label: '物流拓扑图',
    },
    {
      key: 'orders',
      icon: <TruckOutlined />,
      label: '订单追踪',
    },
    {
      key: 'inventory',
      icon: <WarehouseOutlined />,
      label: '库存分布',
    },
    {
      key: 'alerts',
      icon: (
        <Badge count={alertsCount} size="small" offset={[5, -5]}>
          <BellOutlined />
        </Badge>
      ),
      label: '异常预警',
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" />
        </div>
      );
    }

    switch (selectedKey) {
      case 'topology':
        return <TopologyPage />;
      case 'orders':
        return <OrdersPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'alerts':
        return <AlertsPage />;
      default:
        return <Alert message="页面不存在" type="error" />;
    }
  };

  return (
    <Layout className="layout-container">
      <Header className="layout-header">
        <div className="logo">
          <DashboardOutlined style={{ fontSize: '24px' }} />
          <span>物流链路可视化</span>
        </div>
      </Header>
      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="light"
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ background: '#f0f2f5' }}>
          <Content className="layout-content">{renderContent()}</Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;
