import React from 'react'
import { Card, Row, Col, Typography, Divider } from 'antd'
import {
  ExperimentOutlined,
  LockOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { MathJax } from 'better-react-mathjax'

const { Title, Paragraph, Text } = Typography

function HomePage() {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <Title level={1}>物理模拟与密码学演示系统</Title>
        <Paragraph style={{ fontSize: 16, color: '#666', maxWidth: 800, margin: '0 auto' }}>
          一个集流体动力学模拟与 RSA 密码学算法演示于一体的交互式教学平台
        </Paragraph>
      </div>

      <Row gutter={[32, 32]}>
        <Col xs={24} lg={12}>
          <Link to="/fluid" style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              title={
                <span>
                  <ExperimentOutlined style={{ marginRight: 8 }} />
                  流体力学模拟
                </span>
              }
              style={{ height: '100%' }}
            >
              <div style={{ marginBottom: 16 }}>
                <Title level={4}>Lattice Boltzmann Method (LBM) 模拟器</Title>
                <Paragraph>
                  基于 D2Q9 模型的二维流体动力学模拟，支持实时可视化和参数调节。
                </Paragraph>
              </div>
              
              <Divider orientation="left">主要功能</Divider>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
                  <ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8, marginTop: 4 }} />
                  <div>
                    <Text strong>LBM D2Q9 模型</Text>
                    <Paragraph style={{ margin: 0, color: '#666', fontSize: 13 }}>
                      9 速度离散速度模型，支持粘性流体模拟
                    </Paragraph>
                  </div>
                </li>
                <li style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
                  <ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8, marginTop: 4 }} />
                  <div>
                    <Text strong>卡门涡街现象</Text>
                    <Paragraph style={{ margin: 0, color: '#666', fontSize: 13 }}>
                      流体绕过障碍物产生的周期性涡流脱落现象
                    </Paragraph>
                  </div>
                </li>
                <li style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
                  <ThunderboltOutlined style={{ color: '#1890ff', marginRight: 8, marginTop: 4 }} />
                  <div>
                    <Text strong>参数可调</Text>
                    <Paragraph style={{ margin: 0, color: '#666', fontSize: 13 }}>
                      雷诺数、入口流速、网格大小等参数可实时调节
                    </Paragraph>
                  </div>
                </li>
              </ul>

              <Divider orientation="left">数学原理</Divider>
              
              <div className="math-display">
                <MathJax>
                  {`
                    $$
                    f_i(\\mathbf{x} + \\mathbf{c}_i \\Delta t, t + \\Delta t) - f_i(\\mathbf{x}, t) = -\\frac{1}{\\tau} \\left( f_i(\\mathbf{x}, t) - f_i^{eq}(\\rho, \\mathbf{u}) \\right)
                    $$
                  `}
                </MathJax>
                <Paragraph style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
                  LBM 碰撞迁移方程：分布函数 f_i 在时间 Δt 内发生碰撞和迁移
                </Paragraph>
              </div>
            </Card>
          </Link>
        </Col>

        <Col xs={24} lg={12}>
          <Link to="/rsa" style={{ textDecoration: 'none' }}>
            <Card
              hoverable
              title={
                <span>
                  <LockOutlined style={{ marginRight: 8 }} />
                  RSA 密码学演示
                </span>
              }
              style={{ height: '100%' }}
            >
              <div style={{ marginBottom: 16 }}>
                <Title level={4}>RSA 算法交互式演示器</Title>
                <Paragraph>
                  分步演示 RSA 密钥生成、加密和解密过程，支持大整数模幂运算可视化。
                </Paragraph>
              </div>
              
              <Divider orientation="left">主要功能</Divider>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
                  <SafetyCertificateOutlined style={{ color: '#52c41a', marginRight: 8, marginTop: 4 }} />
                  <div>
                    <Text strong>密钥生成分步演示</Text>
                    <Paragraph style={{ margin: 0, color: '#666', fontSize: 13 }}>
                      素数选择、模计算、欧拉函数、公钥私钥生成全过程
                    </Paragraph>
                  </div>
                </li>
                <li style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
                  <SafetyCertificateOutlined style={{ color: '#52c41a', marginRight: 8, marginTop: 4 }} />
                  <div>
                    <Text strong>模幂运算计算器</Text>
                    <Paragraph style={{ margin: 0, color: '#666', fontSize: 13 }}>
                      快速幂算法可视化，展示大整数运算的高效实现
                    </Paragraph>
                  </div>
                </li>
                <li style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start' }}>
                  <SafetyCertificateOutlined style={{ color: '#52c41a', marginRight: 8, marginTop: 4 }} />
                  <div>
                    <Text strong>加解密验证</Text>
                    <Paragraph style={{ margin: 0, color: '#666', fontSize: 13 }}>
                      文本消息加密解密，验证 RSA 算法正确性
                    </Paragraph>
                  </div>
                </li>
              </ul>

              <Divider orientation="left">数学原理</Divider>
              
              <div className="math-display">
                <div style={{ marginBottom: 12 }}>
                  <Text strong>加密：</Text>
                  <MathJax inline>{`$c = m^e \\mod n$`}</MathJax>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>解密：</Text>
                  <MathJax inline>{`$m = c^d \\mod n$`}</MathJax>
                </div>
                <div>
                  <Text strong>密钥关系：</Text>
                  <MathJax inline>{`$e \\cdot d \\equiv 1 \\pmod{\\phi(n)}$`}</MathJax>
                </div>
                <Paragraph style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
                  RSA 基于大数分解难题：已知 n=pq 求 p,q 计算困难
                </Paragraph>
              </div>
            </Card>
          </Link>
        </Col>
      </Row>

      <Divider style={{ margin: '48px 0' }} />

      <div style={{ textAlign: 'center' }}>
        <Title level={3}>技术架构</Title>
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={12} sm={8}>
            <Card size="small" title="前端技术">
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
                <li>• React 18 + Vite</li>
                <li>• HTML5 Canvas 渲染</li>
                <li>• MathJax 数学公式</li>
                <li>• Ant Design UI 组件</li>
              </ul>
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small" title="后端技术">
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
                <li>• Python 3 + Flask</li>
                <li>• Taichi Lang 高性能计算</li>
                <li>• Cryptography 库</li>
                <li>• SQLite 数据存储</li>
              </ul>
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small" title="核心算法">
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
                <li>• LBM D2Q9 模型</li>
                <li>• BGK 碰撞算子</li>
                <li>• Miller-Rabin 素性测试</li>
                <li>• 扩展欧几里得算法</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default HomePage
