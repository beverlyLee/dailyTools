import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Space, Tag, theme } from 'antd';
import {
  LockOutlined,
  KeyOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  HomeOutlined
} from '@ant-design/icons';
import KeyGenerationPage from './pages/KeyGenerationPage';
import CalculatorPage from './pages/CalculatorPage';
import CryptoPage from './pages/CryptoPage';
import HistoryPage from './pages/HistoryPage';

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: '首页',
  },
  {
    key: '/key-generation',
    icon: <KeyOutlined />,
    label: '密钥生成',
  },
  {
    key: '/calculator',
    icon: <CalculatorOutlined />,
    label: '大整数计算器',
  },
  {
    key: '/crypto',
    icon: <LockOutlined />,
    label: '加密解密',
  },
  {
    key: '/history',
    icon: <HistoryOutlined />,
    label: '历史记录',
  }
];

const HomePage = () => {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <LockOutlined style={{ fontSize: 64, color: '#1890ff' }} />
        <Title level={2} style={{ marginTop: 16 }}>
          RSA 密码学算法演示系统
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          用于教学演示 RSA 公钥加密算法的完整工作流程
        </Text>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <Link to="/key-generation" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 8,
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <KeyOutlined style={{ fontSize: 32 }} />
            <Title level={4} style={{ color: 'white', marginTop: 12 }}>密钥生成向导</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
              分步演示 RSA 密钥生成过程，包括选择素数 p、q，计算 n=pq，φ(n)，选择 e，计算 d
            </Text>
          </div>
        </Link>

        <Link to="/calculator" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: 8,
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <CalculatorOutlined style={{ fontSize: 32 }} />
            <Title level={4} style={{ color: 'white', marginTop: 12 }}>大整数计算器</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
              展示模幂运算过程，包括快速模幂算法的每一步执行细节，素数检查功能
            </Text>
          </div>
        </Link>

        <Link to="/crypto" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            borderRadius: 8,
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <LockOutlined style={{ fontSize: 32 }} />
            <Title level={4} style={{ color: 'white', marginTop: 12 }}>加密解密</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
              实现文本消息的加密和解密功能，验证 RSA 算法的正确性，展示每一步的计算过程
            </Text>
          </div>
        </Link>

        <Link to="/history" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            borderRadius: 8,
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <HistoryOutlined style={{ fontSize: 32 }} />
            <Title level={4} style={{ color: 'white', marginTop: 12 }}>历史记录</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
              查看已保存的密钥对和加密解密历史记录，用于教学演示回放和实验记录
            </Text>
          </div>
        </Link>
      </div>

      <div style={{ marginTop: 24 }}>
        <Title level={3}>RSA 算法简介</Title>
        <div style={{ fontSize: 14, lineHeight: 2 }}>
          <p>
            RSA 是由 Ron Rivest、Adi Shamir 和 Leonard Adleman 于 1977 年提出的公钥加密算法。
            它是目前应用最广泛的公钥加密算法之一。
          </p>
          
          <Title level={5}>核心数学原理</Title>
          <ul>
            <li><Text strong>大数分解难题：</Text>将两个大素数相乘很容易，但分解它们的乘积却非常困难</li>
            <li><Text strong>欧拉定理：</Text>如果 a 和 n 互质，则 a^φ(n) ≡ 1 (mod n)</li>
            <li><Text strong>模逆元：</Text>存在整数 d 使得 e × d ≡ 1 (mod φ(n))</li>
          </ul>

          <Title level={5}>算法流程</Title>
          <ol>
            <li>选择两个大素数 p 和 q</li>
            <li>计算 n = p × q（模数）</li>
            <li>计算 φ(n) = (p-1) × (q-1)（欧拉函数）</li>
            <li>选择公钥指数 e，使得 1 < e < φ(n) 且 gcd(e, φ(n)) = 1</li>
            <li>计算私钥指数 d，使得 e × d ≡ 1 (mod φ(n))</li>
            <li>公钥：(e, n)，私钥：(d, n)</li>
            <li>加密：c = m^e mod n</li>
            <li>解密：m = c^d mod n</li>
          </ol>

          <Title level={5}>安全性</Title>
          <p>
            RSA 的安全性基于大数分解的困难性。目前推荐使用 2048 位或 4096 位的密钥。
            随着量子计算的发展，RSA 可能面临威胁，但目前仍是最安全的公钥加密算法之一。
          </p>
        </div>
      </div>
    </Space>
  );
};

function App() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
      >
        <div style={{
          height: 64,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 12 : 16,
          fontWeight: 'bold'
        }}>
          {collapsed ? 'RSA' : 'RSA 演示系统'}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.map(item => ({
            ...item,
            label: <Link to={item.key}>{item.label}</Link>
          }))}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}>
          <Space>
            <LockOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              RSA 密码学算法演示系统
            </Title>
            <Tag color="blue">教学演示版</Tag>
          </Space>
        </Header>

        <Content style={{
          margin: '24px 16px',
          padding: 24,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          overflow: 'auto'
        }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/key-generation" element={<KeyGenerationPage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/crypto" element={<CryptoPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </Content>

        <Footer style={{
          textAlign: 'center',
          background: colorBgContainer
        }}>
          RSA 密码学算法演示系统 v1.0.0 | 用于教学演示 | 基于 React + FastAPI + SQLite
        </Footer>
      </Layout>
    </Layout>
  );
}

export default App;
