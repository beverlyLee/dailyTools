import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Layout, Row, Col, Card, message, Space, Tag } from 'antd';
import { ExperimentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import HistoryModal from './components/HistoryModal';
import { simulationApi } from './services/api';
import { parseSimulationState } from './utils/dataUtils';

const { Header, Content, Footer } = Layout;

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationId, setSimulationId] = useState(null);
  const [simulationState, setSimulationState] = useState(null);
  const [gridWidth, setGridWidth] = useState(256);
  const [gridHeight, setGridHeight] = useState(128);
  const [renderMode, setRenderMode] = useState('vorticity');
  const [vectorDensity, setVectorDensity] = useState(8);
  const [stepsPerFrame, setStepsPerFrame] = useState(10);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const animationRef = useRef(null);
  const isRunningRef = useRef(false);

  const animate = useCallback(async () => {
    if (!isRunningRef.current) return;

    try {
      const response = await simulationApi.step(stepsPerFrame);
      if (response.success) {
        setCurrentStep(response.current_step);
        const state = parseSimulationState(response.state, gridWidth, gridHeight);
        setSimulationState(state);
      }
    } catch (error) {
      console.error('Simulation step error:', error);
      message.error('模拟步进失败');
    }

    if (isRunningRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [gridWidth, gridHeight, stepsPerFrame]);

  useEffect(() => {
    isRunningRef.current = isRunning;
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, animate]);

  const handleInit = async (values) => {
    try {
      setIsRunning(false);
      isRunningRef.current = false;

      const params = {
        reynolds_number: values.reynolds_number,
        inlet_velocity: values.inlet_velocity,
        grid_width: values.grid_width,
        grid_height: values.grid_height,
        obstacle_type: values.obstacle_type,
        obstacle_x: values.obstacle_x,
        obstacle_y: values.obstacle_y,
        obstacle_radius: values.obstacle_radius,
        obstacle_width: values.obstacle_width,
        obstacle_height: values.obstacle_height
      };

      const response = await simulationApi.init(params);
      if (response.success) {
        setIsInitialized(true);
        setSimulationId(response.simulation_id);
        setGridWidth(response.grid_width);
        setGridHeight(response.grid_height);
        setCurrentStep(response.current_step);
        setRenderMode(values.render_mode);
        setVectorDensity(values.vector_density);
        setStepsPerFrame(values.steps_per_frame);

        const state = parseSimulationState(response.state, response.grid_width, response.grid_height);
        setSimulationState(state);

        message.success('模拟初始化成功');
      }
    } catch (error) {
      console.error('Init error:', error);
      message.error('初始化失败: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleStart = () => {
    setIsRunning(true);
    message.info('模拟开始');
  };

  const handlePause = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    message.info('模拟暂停');
  };

  const handleReset = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setIsInitialized(false);
    setSimulationId(null);
    setCurrentStep(0);
    setSimulationState(null);
    message.info('模拟已重置');
  };

  const handleSaveSnapshot = async () => {
    try {
      const response = await simulationApi.saveSnapshot();
      if (response.success) {
        message.success(`快照已保存 (ID: ${response.snapshot_id}, 步数: ${response.step})`);
      }
    } catch (error) {
      message.error('保存快照失败');
    }
  };

  const handleShowHistory = () => {
    setHistoryModalVisible(true);
  };

  const handleLoadSnapshot = (snapshotData) => {
    const { state, grid_width, grid_height, step, simulation } = snapshotData;
    
    setIsRunning(false);
    isRunningRef.current = false;
    setIsInitialized(true);
    setGridWidth(grid_width);
    setGridHeight(grid_height);
    setCurrentStep(step);
    setSimulationId(simulation?.id || null);
    
    const parsedState = parseSimulationState(state, grid_width, grid_height);
    setSimulationState(parsedState);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Space size="middle">
          <ExperimentOutlined style={{ fontSize: 24, color: 'white' }} />
          <h1 style={{ color: 'white', margin: 0, fontSize: 20 }}>
            流体动力学模拟器 - LBM D2Q9
          </h1>
          <Tag color="blue">Lattice Boltzmann Method</Tag>
        </Space>
      </Header>

      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Row gutter={24}>
          <Col xs={24} lg={8}>
            <ControlPanel
              onInit={handleInit}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              onSaveSnapshot={handleSaveSnapshot}
              onShowHistory={handleShowHistory}
              isInitialized={isInitialized}
              isRunning={isRunning}
              currentStep={currentStep}
              simulationId={simulationId}
            />
          </Col>
          
          <Col xs={24} lg={16}>
            <Card 
              title={
                <Space>
                  <span>流场可视化</span>
                  <Tag color={renderMode === 'vorticity' ? 'blue' : renderMode === 'velocity' ? 'green' : 'purple'}>
                    {renderMode === 'vorticity' ? '涡量图' : renderMode === 'velocity' ? '速度场' : '混合模式'}
                  </Tag>
                </Space>
              }
              size="small"
            >
              {simulationState ? (
                <SimulationCanvas
                  simulationState={simulationState}
                  gridWidth={gridWidth}
                  gridHeight={gridHeight}
                  renderMode={renderMode}
                  vectorDensity={vectorDensity}
                  width={800}
                  height={400}
                />
              ) : (
                <div style={{ 
                  height: 400, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: '#fafafa',
                  border: '1px dashed #d9d9d9',
                  borderRadius: 4
                }}>
                  <Space direction="vertical" align="center">
                    <InfoCircleOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    <div style={{ color: '#8c8c8c', fontSize: 16 }}>
                      请在左侧面板设置参数并点击"初始化模拟"
                    </div>
                  </Space>
                </div>
              )}

              {simulationState && (
                <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>图例</div>
                    </Col>
                    <Col span={6}>
                      <Space size="small">
                        <div style={{ width: 16, height: 16, background: 'linear-gradient(to right, blue, white)', borderRadius: 2 }} />
                        <span style={{ fontSize: 12 }}>负涡量 (逆时针)</span>
                      </Space>
                    </Col>
                    <Col span={6}>
                      <Space size="small">
                        <div style={{ width: 16, height: 16, background: 'linear-gradient(to right, white, red)', borderRadius: 2 }} />
                        <span style={{ fontSize: 12 }}>正涡量 (顺时针)</span>
                      </Space>
                    </Col>
                    <Col span={6}>
                      <Space size="small">
                        <div style={{ width: 16, height: 16, background: '#333', borderRadius: 2 }} />
                        <span style={{ fontSize: 12 }}>障碍物</span>
                      </Space>
                    </Col>
                  </Row>
                </div>
              )}
            </Card>

            <Card 
              title="LBM D2Q9 模型说明" 
              size="small"
              style={{ marginTop: 16 }}
            >
              <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                <p>
                  <strong>Lattice Boltzmann Method (LBM)</strong> 是一种基于介观粒子模型的计算流体力学方法。
                  D2Q9 表示二维空间，9个离散速度方向。
                </p>
                <p>
                  <strong>核心公式:</strong>
                </p>
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: 12, 
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  overflowX: 'auto'
                }}>
                  <div>碰撞步: f<sup>eq</sup><sub>i</sub> = w<sub>i</sub>ρ(1 + 3c<sub>i</sub>·u + 4.5(c<sub>i</sub>·u)<sup>2</sup> - 1.5u·u)</div>
                  <div>迁移步: f<sub>i</sub>(x + c<sub>i</sub>Δt, t + Δt) = f<sub>i</sub><sup>*</sup>(x, t)</div>
                  <div>松弛时间: τ = 3ν + 0.5, 其中 ν 为运动粘度</div>
                </div>
                <p style={{ marginTop: 12 }}>
                  <strong>卡门涡街现象:</strong> 当雷诺数足够大时，流体经过圆柱障碍物后会产生周期性的涡旋脱落，
                  形成交替排列的涡旋结构，这就是著名的卡门涡街现象。
                </p>
              </div>
            </Card>
          </Col>
        </Row>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#001529', color: 'rgba(255,255,255,0.65)' }}>
        流体动力学模拟器 v1.0.0 | 基于 Lattice Boltzmann Method (D2Q9 模型) | 用于教学演示
      </Footer>

      <HistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        onLoadSnapshot={handleLoadSnapshot}
      />
    </Layout>
  );
}

export default App;
