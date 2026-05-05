import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, theme, Button, Badge, Dropdown, Avatar } from 'antd';
import {
  DashboardOutlined,
  SearchOutlined,
  BellOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useUiStore, useLogStore } from '@/store';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/search',
    icon: <SearchOutlined />,
    label: '日志查询',
  },
  {
    key: '/alerts',
    icon: <BellOutlined />,
    label: '告警中心',
  },
  {
    key: '/rules',
    icon: <SettingOutlined />,
    label: '规则管理',
  },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const { sidebarCollapsed, toggleSidebar, refreshInterval } = useUiStore();
  const { alerts, fetchAllData } = useLogStore();
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAllData();
      setLoading(false);
    };
    loadData();

    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchAllData]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAllData();
    setLoading(false);
  };

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const userMenu: MenuProps = {
    items: [
      {
        key: '1',
        label: '个人设置',
      },
      {
        key: '2',
        label: '退出登录',
      },
    ],
  };

  const activeAlertsCount = alerts.filter(
    (a) => a.status === 'Open' || a.status === 'Acknowledged'
  ).length;

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={sidebarCollapsed}>
        <div className="logo" style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: sidebarCollapsed ? 12 : 18,
          fontWeight: 'bold'
        }}>
          {sidebarCollapsed ? '日志' : '日志分析中心'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              style={{ fontSize: 16, width: 64, height: 64 }}
            />
            <h2 style={{ margin: 0, fontSize: 18 }}>
              {menuItems.find(item => item.key === location.pathname)?.label || '仪表盘'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginRight: 16 }}>
            <Button
              type="text"
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleRefresh}
              title="刷新数据"
            />
            <Badge count={activeAlertsCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                onClick={() => navigate('/alerts')}
              />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                <Avatar size="small" icon={<SettingOutlined />} />
                <span>管理员</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
