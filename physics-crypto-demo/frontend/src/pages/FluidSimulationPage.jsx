import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Form,
  InputNumber,
  Button,
  Select,
  Statistic,
  Divider,
  List,
  message,
  Space,
  Typography,
  Tabs
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  HistoryOutlined,
  ExperimentOutlined
} from '@ant-design/icons'
import axios from 'axios'
import { MathJax } from 'better-react-mathjax'

const { Title, Paragraph, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

const API_BASE = ''

function FluidSimulationPage() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const [form] = Form.useForm()

  const [isRunning, setIsRunning] = useState(false)
  const [stepCount, setStepCount] = useState(0)
  const [currentState, setCurrentState] = useState(null)
  const [simulations, setSimulations] = useState([])
  const [renderMode, setRenderMode] = useState('vorticity')
  const [loading, setLoading] = useState(false)
  const [parameters, setParameters] = useState({
    grid_width: 256,
    grid_height: 128,
    reynolds: 1000,
    inlet_velocity: 0.1
  })

  // 初始化模拟
  const initSimulation = useCallback(async (params) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/api/fluid/init`, params)
      if (response.data.success) {
        message.success('模拟初始化成功')
        setParameters(params)
        setStepCount(0)
        setIsRunning(false)
        // 获取初始状态
        await fetchState()
      }
    } catch (error) {
      message.error('初始化失败: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取模拟状态
  const fetchState = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/fluid/state`)
      if (response.data.success) {
        setCurrentState(response.data.state)
      }
    } catch (error) {
      console.error('获取状态失败:', error)
    }
  }, [])

  // 执行模拟步进
  const executeStep = useCallback(async (steps = 10) => {
    try {
      const response = await axios.post(`${API_BASE}/api/fluid/step`, { steps })
      if (response.data.success) {
        setStepCount(prev => prev + response.data.steps_performed)
        await fetchState()
      }
    } catch (error) {
      console.error('执行步进失败:', error)
    }
  }, [fetchState])

  // 动画循环
  const animate = useCallback(() => {
    if (!isRunning) return
    
    executeStep(5).then(() => {
      animationRef.current = requestAnimationFrame(animate)
    })
  }, [isRunning, executeStep])

  // 开始/暂停模拟
  const toggleRunning = useCallback(() => {
    if (!currentState) {
      message.warning('请先初始化模拟')
      return
    }
    
    if (isRunning) {
      setIsRunning(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else {
      setIsRunning(true)
    }
  }, [isRunning, currentState])

  // 重置模拟
  const resetSimulation = useCallback(() => {
    if (isRunning) {
      setIsRunning(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
    initSimulation(parameters)
  }, [isRunning, parameters, initSimulation])

  // 保存当前模拟
  const saveSimulation = useCallback(async () => {
    if (!currentState) {
      message.warning('没有可保存的模拟数据')
      return
    }
    
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/api/fluid/save`, { steps: stepCount })
      if (response.data.success) {
        message.success(`模拟已保存，ID: ${response.data.simulation_id}`)
        fetchSimulations()
      }
    } catch (error) {
      message.error('保存失败: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }, [currentState, stepCount])

  // 获取历史模拟
  const fetchSimulations = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/fluid/simulations`)
      if (response.data.success) {
        setSimulations(response.data.simulations)
      }
    } catch (error) {
      console.error('获取历史记录失败:', error)
    }
  }, [])

  // 初始化时获取历史记录
  useEffect(() => {
    fetchSimulations()
  }, [fetchSimulations])

  // 动画循环
  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRunning, animate])

  // Canvas 渲染
  useEffect(() => {
    if (!currentState || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { vorticity, speed, obstacle, grid_size } = currentState
    
    const nx = grid_size[0]
    const ny = grid_size[1]
    
    // 设置 Canvas 尺寸
    canvas.width = nx
    canvas.height = ny
    
    const imageData = ctx.createImageData(nx, ny)
    const data = imageData.data

    if (renderMode === 'vorticity') {
      // 涡量图 - 彩色显示
      let maxVort = 0
      let minVort = 0
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const v = vorticity[i][j]
          maxVort = Math.max(maxVort, v)
          minVort = Math.min(minVort, v)
        }
      }
      
      const vortRange = Math.max(Math.abs(maxVort), Math.abs(minVort), 0.001)
      
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const idx = (i + (ny - 1 - j) * nx) * 4  // 翻转 Y 轴
          
          if (obstacle[i][j]) {
            // 障碍物：灰色
            data[idx] = 80
            data[idx + 1] = 80
            data[idx + 2] = 80
            data[idx + 3] = 255
          } else {
            // 涡量颜色映射
            const v = vorticity[i][j]
            const normalized = (v + vortRange) / (2 * vortRange)  // 0-1 范围
            
            // 蓝色到红色渐变
            let r, g, b
            if (normalized < 0.5) {
              // 0.0-0.5: 蓝色到白色
              const t = normalized * 2
              r = Math.floor(255 * t)
              g = Math.floor(255 * t)
              b = 255
            } else {
              // 0.5-1.0: 白色到红色
              const t = (normalized - 0.5) * 2
              r = 255
              g = Math.floor(255 * (1 - t))
              b = Math.floor(255 * (1 - t))
            }
            
            data[idx] = r
            data[idx + 1] = g
            data[idx + 2] = b
            data[idx + 3] = 255
          }
        }
      }
    } else if (renderMode === 'speed') {
      // 速度大小图
      let maxSpeed = 0
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          maxSpeed = Math.max(maxSpeed, speed[i][j])
        }
      }
      maxSpeed = Math.max(maxSpeed, 0.001)
      
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const idx = (i + (ny - 1 - j) * nx) * 4
          
          if (obstacle[i][j]) {
            data[idx] = 80
            data[idx + 1] = 80
            data[idx + 2] = 80
            data[idx + 3] = 255
          } else {
            const s = speed[i][j] / maxSpeed
            // 灰度到彩色
            const intensity = Math.floor(s * 255)
            data[idx] = Math.floor(30 + intensity * 0.5)
            data[idx + 1] = Math.floor(50 + intensity * 0.8)
            data[idx + 2] = Math.floor(100 + intensity * 0.6)
            data[idx + 3] = 255
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
  }, [currentState, renderMode])

  const handleInit = (values) => {
    initSimulation(values)
  }

  return (
    <div>
      <Title level={2}>
        <ExperimentOutlined style={{ marginRight: 12 }} />
        流体力学模拟 (LBM D2Q9)
      </Title>

      <Tabs defaultActiveKey="simulation">
        <TabPane tab="模拟演示" key="simulation">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <Text>流场可视化</Text>
                    <Select
                      value={renderMode}
                      onChange={setRenderMode}
                      style={{ width: 120 }}
                      size="small"
                    >
                      <Option value="vorticity">涡量图</Option>
                      <Option value="speed">速度图</Option>
                    </Select>
                  </Space>
                }
                extra={
                  <Space>
                    <Statistic
                      title="步数"
                      value={stepCount}
                      style={{ marginRight: 24 }}
                      valueStyle={{ fontSize: 18 }}
                    />
                    <Button
                      type={isRunning ? 'default' : 'primary'}
                      icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={toggleRunning}
                      loading={loading}
                    >
                      {isRunning ? '暂停' : '运行'}
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={resetSimulation}
                      loading={loading}
                    >
                      重置
                    </Button>
                    <Button
                      icon={<SaveOutlined />}
                      onClick={saveSimulation}
                      loading={loading}
                      type="dashed"
                    >
                      保存
                    </Button>
                  </Space>
                }
              >
                <div className="fluid-canvas-container" style={{ minHeight: 300 }}>
                  {currentState ? (
                    <canvas
                      ref={canvasRef}
                      className="fluid-canvas"
                      style={{
                        width: '100%',
                        maxWidth: currentState.grid_size[0],
                        imageRendering: 'pixelated'
                      }}
                    />
                  ) : (
                    <Text type="secondary">请初始化模拟以开始</Text>
                  )}
                </div>
                
                {currentState && (
                  <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
                    <Space split={<Divider type="vertical" />}>
                      <Text>网格: {currentState.grid_size[0]} × {currentState.grid_size[1]}</Text>
                      <Text>雷诺数: {currentState.reynolds}</Text>
                      <Text>入口速度: {currentState.inlet_velocity}</Text>
                      <Text>ν = {currentState.nu.toExponential(2)}</Text>
                      <Text>τ = {currentState.tau.toFixed(3)}</Text>
                    </Space>
                  </div>
                )}
              </Card>

              <Card title="数学原理" style={{ marginTop: 24 }}>
                <div className="math-display">
                  <Text strong>LBM 基本方程:</Text>
                  <MathJax>
                    {`
                      $$
                      f_i(\\mathbf{x} + \\mathbf{c}_i \\Delta t, t + \\Delta t) - f_i(\\mathbf{x}, t) = -\\frac{1}{\\tau} \\left( f_i(\\mathbf{x}, t) - f_i^{eq}(\\rho, \\mathbf{u}) \\right)
                      $$
                    `}
                  </MathJax>
                </div>
                
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} md={8}>
                    <Card size="small" title="D2Q9 速度模型">
                      <Paragraph style={{ fontSize: 13, marginBottom: 8 }}>
                        9 个离散速度方向：{`c₀`} 静止，{`c₁-c₄`} 正交，{`c₅-c₈`} 对角
                      </Paragraph>
                      <div className="math-display" style={{ padding: 8, fontSize: 14 }}>
                        <MathJax inline>{`$\\mathbf{c}_i = \\{(0,0), (\\pm1,0), (0,\\pm1), (\\pm1,\\pm1)\\}$`}</MathJax>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card size="small" title="平衡分布函数">
                      <div className="math-display" style={{ padding: 8, fontSize: 14 }}>
                        <MathJax>
                          {`
                            $$
                            f_i^{eq} = w_i \\rho \\left( 1 + 3 \\mathbf{c}_i \\cdot \\mathbf{u} + \\frac{9}{2} (\\mathbf{c}_i \\cdot \\mathbf{u})^2 - \\frac{3}{2} \\mathbf{u} \\cdot \\mathbf{u} \\right)
                            $$
                          `}
                        </MathJax>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card size="small" title="雷诺数">
                      <div className="math-display" style={{ padding: 8, fontSize: 14 }}>
                        <MathJax inline>{`$Re = \\frac{UL}{\\nu}$`}</MathJax>
                      </div>
                      <Paragraph style={{ fontSize: 13, marginTop: 8 }}>
                        U: 特征速度, L: 特征长度, ν: 运动粘性系数
                      </Paragraph>
                      <Paragraph type="secondary" style={{ fontSize: 12 }}>
                        Re ≈ 40-200 可观察到卡门涡街现象
                      </Paragraph>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="参数设置">
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={parameters}
                  onFinish={handleInit}
                >
                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Form.Item
                        name="grid_width"
                        label="网格宽度 (X)"
                        rules={[{ required: true, message: '请输入' }]}
                      >
                        <InputNumber min={64} max={512} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="grid_height"
                        label="网格高度 (Y)"
                        rules={[{ required: true, message: '请输入' }]}
                      >
                        <InputNumber min={32} max={256} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item
                    name="reynolds"
                    label="雷诺数 (Re)"
                    rules={[{ required: true, message: '请输入' }]}
                    help="较低的 Re (如 100-500) 更容易观察到卡门涡街"
                  >
                    <InputNumber min={10} max={10000} style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item
                    name="inlet_velocity"
                    label="入口速度"
                    rules={[{ required: true, message: '请输入' }]}
                    help="LBM 模拟中通常使用 0.01-0.3 的速度范围"
                  >
                    <InputNumber
                      min={0.01}
                      max={0.5}
                      step={0.01}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<ReloadOutlined />}
                      block
                    >
                      初始化模拟
                    </Button>
                  </Form.Item>
                </Form>
                
                <Divider />
                
                <Card size="small" title="快速预设" style={{ marginTop: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      block
                      onClick={() => handleInit({
                        grid_width: 256,
                        grid_height: 128,
                        reynolds: 200,
                        inlet_velocity: 0.1
                      })}
                    >
                      卡门涡街演示 (Re=200)
                    </Button>
                    <Button
                      block
                      onClick={() => handleInit({
                        grid_width: 256,
                        grid_height: 128,
                        reynolds: 1000,
                        inlet_velocity: 0.1
                      })}
                    >
                      高雷诺数湍流 (Re=1000)
                    </Button>
                    <Button
                      block
                      onClick={() => handleInit({
                        grid_width: 512,
                        grid_height: 256,
                        reynolds: 100,
                        inlet_velocity: 0.05
                      })}
                    >
                      高分辨率精细模拟
                    </Button>
                  </Space>
                </Card>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><HistoryOutlined /> 历史记录</span>} key="history">
          <Card title="已保存的模拟">
            <List
              dataSource={simulations}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={`模拟 #${item.id}`}
                    description={
                      <Space split={<Divider type="vertical" />}>
                        <Text>Re: {item.reynolds_number}</Text>
                        <Text>速度: {item.inlet_velocity}</Text>
                        <Text>网格: {item.grid_size}</Text>
                        <Text type="secondary">{item.created_at}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: '暂无历史记录' }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default FluidSimulationPage
