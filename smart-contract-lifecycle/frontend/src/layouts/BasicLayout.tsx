import React from 'react';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import {
  DashboardOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useHistory, useLocation } from 'umi';
import styles from './BasicLayout.less';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/contract-review',
    icon: <FileSearchOutlined />,
    label: '合同智能审查',
    children: [
      { key: '/contract-review/upload', label: '上传合同' },
      { key: '/contract-review/history', label: '审查历史' },
      { key: '/contract-review/templates', label: '模板管理' },
    ],
  },
  {
    key: '/esignature-reminder',
    icon: <SafetyCertificateOutlined />,
    label: '电子签章与履约提醒',
    children: [
      { key: '/esignature-reminder/sign', label: '电子签章' },
      { key: '/esignature-reminder/contracts', label: '合同管理' },
      { key: '/esignature-reminder/reminders', label: '履约提醒' },
    ],
  },
];

const BasicLayout: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { children } = props;
  const history = useHistory();
  const location = useLocation();

  const userMenu = [
    {
      key: '1',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: '2',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (!key.includes('/')) {
      return;
    }
    history.push(key);
  };

  const getSelectedKeys = () => {
    const { pathname } = location;
    return [pathname];
  };

  const getOpenKeys = () => {
    const { pathname } = location;
    if (pathname.startsWith('/contract-review')) {
      return ['/contract-review'];
    }
    if (pathname.startsWith('/esignature-reminder')) {
      return ['/esignature-reminder'];
    }
    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={256} className={styles.sider}>
        <div className={styles.logo}>
          <img
            src="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg"
            alt="logo"
            style={{ height: '32px', marginRight: '12px' }}
          />
          <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
            智能合同管理平台
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <div style={{ flex: 1 }}></div>
          <Dropdown menu={{ items: userMenu }}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Avatar icon={<UserOutlined />} />
              <span style={{ marginLeft: '8px', color: 'rgba(0, 0, 0, 0.65)' }}>
                管理员
              </span>
              <DownOutlined style={{ marginLeft: '8px', fontSize: '12px' }} />
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default BasicLayout;
