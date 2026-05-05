import React, { useState } from 'react';
import { Layout, Menu, Badge } from 'antd';
import {
  LineChartOutlined,
  ExperimentOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import ForecastPage from './pages/ForecastPage';
import SimulationPage from './pages/SimulationPage';
import ReplenishmentPage from './pages/ReplenishmentPage';
import ExternalFactorsPage from './pages/ExternalFactorsPage';

const { Header, Sider, Content } = Layout;

function App() {
  const [selectedKey, setSelectedKey] = useState('forecast');
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: 'forecast',
      icon: <LineChartOutlined />,
      label: '需求预测',
    },
    {
      key: 'simulation',
      icon: <ExperimentOutlined />,
      label: '模拟仿真',
    },
    {
      key: 'replenishment',
      icon: <ShoppingCartOutlined />,
      label: '补货建议',
    },
    {
      key: 'factors',
      icon: <EnvironmentOutlined />,
      label: '外部因子',
    },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case 'forecast':
        return <ForecastPage />;
      case 'simulation':
        return <SimulationPage />;
      case 'replenishment':
        return <ReplenishmentPage />;
      case 'factors':
        return <ExternalFactorsPage />;
      default:
        return <div>页面不存在</div>;
    }
  };

  return (
    <Layout className="layout-container">
      <Header className="layout-header">
        <div className="logo">
          <LineChartOutlined style={{ fontSize: '24px' }} />
          <span>需求预测与补货</span>
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
