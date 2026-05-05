import React, { useState, useEffect, useRef } from 'react';
import {
  Row,
  Col,
  Card,
  Form,
  InputNumber,
  Select,
  Button,
  Table,
  Space,
  Statistic,
  Progress,
  Divider,
  message,
} from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { mdApi } from '../services/api';

const { Option } = Select;

// Three.js 原子可视化组件
const AtomSphere = ({ position, color = 'skyblue', scale = 1 }) => {
  return (
    <mesh position={[position.x * 0.5, position.y * 0.5, position.z * 0.5]}>
      <sphereGeometry args={[0.3 * scale, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

const MDVisualizer = ({ atoms, isRunning }) => {
  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 60 }} style={{ background: '#001529', height: '400px' }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      {atoms.map((atom, idx) => (
        <AtomSphere
          key={idx}
          position={atom}
          color={atom.type === 'Ar' ? 'skyblue' : 'orange'}
          scale={atom.type === 'Ar' ? 1 : 1.2}
        />
      ))}
      <OrbitControls enableDamping dampingFactor={0.05} />
      <gridHelper args={[20, 20, 0x444444, 0x222222]} />
    </Canvas>
  );
};

// 默认原子类型配置
const DEFAULT_ATOM_TYPES = {
  Ar: { mass: 39.95, sigma: 3.405, epsilon: 0.238 },
  Xe: { mass: 131.29, sigma: 4.10, epsilon: 0.310 },
};

const MDSimulatorPage = () => {
  const [form] = Form.useForm();
  const [simulationStatus, setSimulationStatus] = useState('idle'); // idle, running, paused, completed
  const [currentSimId, setCurrentSimId] = useState(null);
  const [atoms, setAtoms] = useState([]);
  const [statsHistory, setStatsHistory] = useState([]);
  const [progress, setProgress] = useState(0);
  const [currentStats, setCurrentStats] = useState({
    step: 0,
    temperature: 0,
    pressure: 0,
    potential_energy: 0,
    kinetic_energy: 0,
    total_energy: 0,
  });

  const pollingIntervalRef = useRef(null);

  // 晶格类型选择配置
  const latticeTypes = ['FCC', 'BCC', 'SC'];

  // 开始模拟
  const handleStartSimulation = async (values) => {
    try {
      message.loading('正在启动模拟...', 1);
      
      const config = {
        lattice_type: values.lattice_type,
        unit_cells: values.unit_cells,
        atom_type: values.atom_type,
        temperature: values.temperature,
        timestep: values.timestep,
        steps: values.steps,
        record_interval: values.record_interval,
      };

      const response = await mdApi.startSimulation(config);
      const { simulation_id } = response.data;
      
      setCurrentSimId(simulation_id);
      setSimulationStatus('running');
      setProgress(0);
      setStatsHistory([]);
      message.success('模拟已启动');
      
      startPolling(simulation_id);
    } catch (error) {
      message.error('启动模拟失败: ' + error.message);
      console.error('Simulation start error:', error);
    }
  };

  // 开始轮询模拟状态
  const startPolling = (simId) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await mdApi.getSimulationStatus(simId);
        const { status, current_step, total_steps } = statusRes.data;
        
        setProgress(Math.min(100, (current_step / total_steps) * 100));
        
        if (status === 'running' || status === 'completed') {
          const statsRes = await mdApi.getSimulationStats(simId);
          const stats = statsRes.data;
          
          setCurrentStats({
            step: stats.current_step,
            temperature: stats.temperature,
            pressure: stats.pressure,
            potential_energy: stats.potential_energy,
            kinetic_energy: stats.kinetic_energy,
            total_energy: stats.total_energy,
          });

          setStatsHistory(prev => [
            ...prev.slice(-50),
            {
              step: stats.current_step,
              KE: stats.kinetic_energy,
              PE: stats.potential_energy,
              Total: stats.total_energy,
              Temp: stats.temperature,
            }
          ]);

          // 获取最新一帧的轨迹数据
          const trajRes = await mdApi.getTrajectory(simId, Math.max(0, stats.current_step - 1), stats.current_step);
          if (trajRes.data.frames && trajRes.data.frames.length > 0) {
            const latestFrame = trajRes.data.frames[trajRes.data.frames.length - 1];
            setAtoms(latestFrame.atoms.map(a => ({
              x: a.x, y: a.y, z: a.z, type: a.type
            })));
          }
        }

        if (status === 'completed') {
          clearInterval(pollingIntervalRef.current);
          setSimulationStatus('completed');
          message.success('模拟完成！');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);
  };

  // 暂停/继续
  const handleTogglePause = () => {
    if (simulationStatus === 'running') {
      setSimulationStatus('paused');
      clearInterval(pollingIntervalRef.current);
      message.info('模拟已暂停');
    } else if (simulationStatus === 'paused') {
      setSimulationStatus('running');
      startPolling(currentSimId);
      message.info('模拟已继续');
    }
  };

  // 重置
  const handleReset = () => {
    clearInterval(pollingIntervalRef.current);
    setSimulationStatus('idle');
    setCurrentSimId(null);
    setAtoms([]);
    setStatsHistory([]);
    setProgress(0);
    message.info('已重置');
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* 左侧配置面板 */}
        <Col span={6}>
          <Card title="模拟配置" size="small">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                lattice_type: 'FCC',
                unit_cells: 3,
                atom_type: 'Ar',
                temperature: 300,
                timestep: 1.0,
                steps: 1000,
                record_interval: 10,
              }}
              onFinish={handleStartSimulation}
            >
              <Form.Item label="晶格类型" name="lattice_type">
                <Select>
                  {latticeTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="晶胞数" name="unit_cells">
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="原子类型" name="atom_type">
                <Select>
                  {Object.keys(DEFAULT_ATOM_TYPES).map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="初始温度 (K)" name="temperature">
                <InputNumber min={0} max={5000} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="时间步长 (fs)" name="timestep">
                <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="总步数" name="steps">
                <InputNumber min={100} max={50000} step={100} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="记录间隔" name="record_interval">
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item>
                <Space.Compact style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => form.submit()}
                    disabled={simulationStatus === 'running'}
                    style={{ width: '33%' }}
                  >
                    开始
                  </Button>
                  <Button
                    icon={<PauseCircleOutlined />}
                    onClick={handleTogglePause}
                    disabled={simulationStatus !== 'running' && simulationStatus !== 'paused'}
                    style={{ width: '34%' }}
                  >
                    {simulationStatus === 'paused' ? '继续' : '暂停'}
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                    disabled={simulationStatus === 'idle'}
                    style={{ width: '33%' }}
                  >
                    重置
                  </Button>
                </Space.Compact>
              </Form.Item>
            </Form>

            <Divider />
            
            <Progress
              percent={progress}
              status={simulationStatus === 'completed' ? 'success' : 'active'}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              状态: {
                simulationStatus === 'idle' ? '等待启动' :
                simulationStatus === 'running' ? '运行中' :
                simulationStatus === 'paused' ? '已暂停' : '已完成'
              }
            </div>
          </Card>
        </Col>

        {/* 中间3D可视化 */}
        <Col span={10}>
          <Card title="分子动力学模拟 - 3D可视化" size="small">
            <MDVisualizer atoms={atoms} isRunning={simulationStatus === 'running'} />
          </Card>
        </Col>

        {/* 右侧实时监控 */}
        <Col span={8}>
          <Card title="实时监控" size="small">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic title="当前步" value={currentStats.step} valueStyle={{ fontSize: 18 }} />
              </Col>
              <Col span={12}>
                <Statistic title="温度 (K)" value={currentStats.temperature.toFixed(2)} valueStyle={{ fontSize: 18 }} />
              </Col>
              <Col span={12}>
                <Statistic title="势能" value={currentStats.potential_energy.toFixed(2)} valueStyle={{ fontSize: 16 }} />
              </Col>
              <Col span={12}>
                <Statistic title="动能" value={currentStats.kinetic_energy.toFixed(2)} valueStyle={{ fontSize: 16 }} />
              </Col>
              <Col span={12}>
                <Statistic title="总能" value={currentStats.total_energy.toFixed(2)} valueStyle={{ fontSize: 16, color: '#1890ff' }} />
              </Col>
              <Col span={12}>
                <Statistic title="压力" value={currentStats.pressure.toFixed(4)} valueStyle={{ fontSize: 16 }} />
              </Col>
            </Row>
          </Card>

          <Card title="能量守恒验证" size="small" style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={statsHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="KE" stroke="#ff7300" name="动能" dot={false} />
                <Line type="monotone" dataKey="PE" stroke="#387908" name="势能" dot={false} />
                <Line type="monotone" dataKey="Total" stroke="#1890ff" name="总能" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="温度变化" size="small" style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={statsHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="Temp" stroke="#722ed1" name="温度 (K)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MDSimulatorPage;
