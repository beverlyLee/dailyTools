import { Link } from 'react-router-dom'

function HomePage() {
  const features = [
    {
      icon: '⚛️',
      title: '分子动力学模拟',
      description: '基于 Lennard-Jones 势函数的经典分子动力学模拟，支持 Velocity-Verlet 积分算法，验证微正则系综下的能量守恒。',
      link: '/simulation',
      linkText: '开始模拟',
      color: '--primary-color'
    },
    {
      icon: '🎮',
      title: '博弈论求解器',
      description: '使用 Support Enumeration 算法求解纳什均衡，支持纯策略和混合策略均衡计算，提供经典博弈案例模板。',
      link: '/game-solver',
      linkText: '开始求解',
      color: '--secondary-color'
    },
    {
      icon: '📊',
      title: '轨迹回放',
      description: '保存的物理模拟轨迹支持历史数据回放，查看原子运动轨迹和系统物理量变化，用于分析模拟结果。',
      link: '/trajectory',
      linkText: '查看轨迹',
      color: '--success-color'
    }
  ]

  const techStack = [
    { name: 'React', category: '前端框架' },
    { name: 'Three.js', category: '3D可视化' },
    { name: 'AG-Grid', category: '数据表格' },
    { name: 'FastAPI', category: '后端框架' },
    { name: 'Nashpy', category: '博弈论求解' },
    { name: 'MDAnalysis', category: '分子轨迹分析' },
  ]

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            🔬 物理模拟与博弈论求解平台
          </h1>
          <p className="hero-subtitle">
            集成分子动力学模拟和博弈论纳什均衡求解的综合计算平台
          </p>
          <div className="hero-actions">
            <Link to="/simulation" className="btn btn-primary btn-lg">
              ⚛️ 开始物理模拟
            </Link>
            <Link to="/game-solver" className="btn btn-secondary btn-lg">
              🎮 开始博弈求解
            </Link>
          </div>
        </div>
      </div>

      <div className="features-section">
        <div className="section-header">
          <h2 className="section-title">核心功能</h2>
          <p className="section-subtitle">
            提供专业的物理模拟和博弈论求解能力
          </p>
        </div>

        <div className="features-grid grid grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="feature-card card">
              <div className="card-body">
                <div className="feature-icon" style={{ color: `var(${feature.color})` }}>
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <Link to={feature.link} className="feature-link">
                  {feature.linkText} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="tech-section">
        <div className="section-header">
          <h2 className="section-title">技术栈</h2>
          <p className="section-subtitle">
            采用现代技术构建，确保性能和可扩展性
          </p>
        </div>

        <div className="tech-grid grid grid-cols-3">
          {techStack.map((tech, index) => (
            <div key={index} className="tech-card card">
              <div className="card-body">
                <h4 className="tech-name">{tech.name}</h4>
                <span className="badge badge-primary">{tech.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="physics-info-section">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚛️ 物理模拟功能</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2">
              <div className="info-block">
                <h4>晶格结构</h4>
                <ul>
                  <li>FCC (面心立方)</li>
                  <li>SC (简单立方)</li>
                  <li>BCC (体心立方)</li>
                </ul>
              </div>
              <div className="info-block">
                <h4>积分算法</h4>
                <ul>
                  <li>Velocity-Verlet 算法</li>
                  <li>周期性边界条件</li>
                  <li>最近邻镜像法</li>
                </ul>
              </div>
              <div className="info-block">
                <h4>势函数</h4>
                <ul>
                  <li>Lennard-Jones 12-6 势</li>
                  <li>势能截断与平移</li>
                  <li>支持多种原子类型</li>
                </ul>
              </div>
              <div className="info-block">
                <h4>物理量计算</h4>
                <ul>
                  <li>温度 (动能均分)</li>
                  <li>压力 (维里定理)</li>
                  <li>能量守恒验证</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="game-info-section">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎮 博弈论求解功能</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2">
              <div className="info-block">
                <h4>均衡求解</h4>
                <ul>
                  <li>纯策略纳什均衡</li>
                  <li>混合策略纳什均衡</li>
                  <li>Support Enumeration 算法</li>
                </ul>
              </div>
              <div className="info-block">
                <h4>经典案例</h4>
                <ul>
                  <li>囚徒困境</li>
                  <li>性别之战</li>
                  <li>石头剪刀布</li>
                  <li>猎鹿博弈</li>
                  <li>懦夫博弈</li>
                </ul>
              </div>
              <div className="info-block">
                <h4>数据表格</h4>
                <ul>
                  <li>AG-Grid 高性能表格</li>
                  <li>支持自定义策略名称</li>
                  <li>动态调整矩阵大小</li>
                </ul>
              </div>
              <div className="info-block">
                <h4>结果展示</h4>
                <ul>
                  <li>高亮显示均衡单元格</li>
                  <li>计算期望收益</li>
                  <li>历史记录保存</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
