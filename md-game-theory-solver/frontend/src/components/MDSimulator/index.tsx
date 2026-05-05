import { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Line } from '@react-three/drei';
import * as THREE from 'three';
import { api } from '../../services/api';
import {
  SimulationState,
  SystemInfo,
  EnergyHistoryPoint,
  SavedSimulation,
  FrameInfo
} from '../../types';
import './MDSimulator.css';

interface AtomMeshProps {
  positions: number[][];
  boxSize: number;
}

function AtomMesh({ positions, boxSize }: AtomMeshProps) {
  const halfBox = boxSize / 2;

  return (
    <>
      {positions.map((pos, index) => (
        <mesh key={index} position={[pos[0] - halfBox, pos[1] - halfBox, pos[2] - halfBox]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color={getAtomColor(index)} />
        </mesh>
      ))}
    </>
  );
}

function getAtomColor(index: number): string {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#bb8fce', '#85c1e9'];
  return colors[index % colors.length];
}

interface SimulationBoxProps {
  boxSize: number;
}

function SimulationBox({ boxSize }: SimulationBoxProps) {
  const halfBox = boxSize / 2;
  const points: [number, number, number][] = [
    [-halfBox, -halfBox, -halfBox],
    [halfBox, -halfBox, -halfBox],
    [halfBox, -halfBox, halfBox],
    [-halfBox, -halfBox, halfBox],
    [-halfBox, -halfBox, -halfBox],
    [-halfBox, halfBox, -halfBox],
    [halfBox, halfBox, -halfBox],
    [halfBox, -halfBox, -halfBox],
    [halfBox, halfBox, -halfBox],
    [halfBox, halfBox, halfBox],
    [halfBox, -halfBox, halfBox],
    [halfBox, halfBox, halfBox],
    [-halfBox, halfBox, halfBox],
    [-halfBox, -halfBox, halfBox],
    [-halfBox, halfBox, halfBox],
    [-halfBox, halfBox, -halfBox],
  ];

  return (
    <Line
      points={points}
      color="#666"
      lineWidth={1}
      dashed={false}
    />
  );
}

interface ThreeSceneProps {
  positions: number[][];
  boxSize: number;
}

function ThreeScene({ positions, boxSize }: ThreeSceneProps) {
  return (
    <Canvas camera={{ position: [boxSize, boxSize, boxSize], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <AtomMesh positions={positions} boxSize={boxSize} />
      <SimulationBox boxSize={boxSize} />
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={boxSize * 0.5}
        maxDistance={boxSize * 5}
      />
      <gridHelper args={[boxSize, 10, '#444', '#333']} />
    </Canvas>
  );
}

export default function MDSimulator() {
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [currentState, setCurrentState] = useState<SimulationState | null>(null);
  const [initialEnergy, setInitialEnergy] = useState<number | null>(null);
  const [energyHistory, setEnergyHistory] = useState<EnergyHistoryPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState({
    n_unit_cells: 3,
    density: 0.8,
    temperature: 1.0,
    timestep: 0.001,
    stepsPerFrame: 10,
    target_temp: 1.0
  });

  const [playbackMode, setPlaybackMode] = useState(false);
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState<number | null>(null);
  const [playbackFrames, setPlaybackFrames] = useState<FrameInfo[]>([]);
  const [currentPlaybackFrame, setCurrentPlaybackFrame] = useState(0);
  const [playbackPositions, setPlaybackPositions] = useState<number[][]>([]);
  const [playbackBoxSize, setPlaybackBoxSize] = useState(0);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const animationRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSavedSimulations();
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  const loadSavedSimulations = async () => {
    try {
      const result = await api.listSavedSimulations();
      setSavedSimulations(result.simulations);
    } catch (err) {
      console.error('Failed to load saved simulations:', err);
    }
  };

  const handleCreateSimulation = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.createSimulation({
        n_unit_cells: config.n_unit_cells,
        density: config.density,
        temperature: config.temperature,
        timestep: config.timestep,
        seed: 42
      });

      setSimulationId(result.simulation_id);
      setSystemInfo(result.system_info);
      setCurrentState(result.initial_state);
      setInitialEnergy(result.initial_state.total_energy);
      setEnergyHistory([{
        step: result.initial_state.step,
        pe: result.initial_state.potential_energy,
        ke: result.initial_state.kinetic_energy,
        te: result.initial_state.total_energy
      }]);
      setPlaybackMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建模拟失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSimulation = async () => {
    if (isRunning) {
      setIsRunning(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    if (simulationId) {
      try {
        await api.closeSimulation(simulationId);
      } catch (err) {
        console.error('Failed to close simulation:', err);
      }
    }

    setSimulationId(null);
    setSystemInfo(null);
    setCurrentState(null);
    setInitialEnergy(null);
    setEnergyHistory([]);
  };

  const runSimulationLoop = useCallback(async () => {
    if (!simulationId || !isRunning) return;

    try {
      const result = await api.stepSimulation(simulationId, config.stepsPerFrame);
      setCurrentState(result.state);

      setEnergyHistory(prev => {
        const newHistory = [...prev, {
          step: result.state.step,
          pe: result.state.potential_energy,
          ke: result.state.kinetic_energy,
          te: result.state.total_energy
        }];
        if (newHistory.length > 200) {
          return newHistory.slice(-200);
        }
        return newHistory;
      });

      animationRef.current = requestAnimationFrame(runSimulationLoop);
    } catch (err) {
      setIsRunning(false);
      setError(err instanceof Error ? err.message : '模拟运行失败');
    }
  }, [simulationId, isRunning, config.stepsPerFrame]);

  useEffect(() => {
    if (isRunning && simulationId) {
      runSimulationLoop();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [isRunning, simulationId, runSimulationLoop]);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);

  const handleStep = async () => {
    if (!simulationId) return;
    if (isRunning) {
      setIsRunning(false);
    }

    try {
      const result = await api.stepSimulation(simulationId, 1);
      setCurrentState(result.state);
      setEnergyHistory(prev => [...prev, {
        step: result.state.step,
        pe: result.state.potential_energy,
        ke: result.state.kinetic_energy,
        te: result.state.total_energy
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '单步执行失败');
    }
  };

  const handleScaleTemperature = async () => {
    if (!simulationId) return;

    try {
      await api.scaleTemperature(simulationId, config.target_temp);
      const result = await api.getSimulationState(simulationId);
      setCurrentState(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : '温度缩放失败');
    }
  };

  const handleSaveSimulation = async () => {
    if (!simulationId) return;

    try {
      await api.saveSimulation(simulationId, `模拟 ${new Date().toLocaleString()}`);
      await loadSavedSimulations();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleLoadSimulation = async (dbId: number) => {
    setSelectedSimulationId(dbId);
    setLoading(true);

    try {
      const framesResult = await api.getSavedFrames(dbId);
      setPlaybackFrames(framesResult.frames);
      setPlaybackBoxSize(framesResult.box_size);
      setCurrentPlaybackFrame(0);

      const firstFrame = await api.getSavedFrameDetails(dbId, framesResult.frames[0].frame_number);
      const positions = firstFrame.atoms.map(a => [a.position.x, a.position.y, a.position.z]);
      setPlaybackPositions(positions);

      setPlaybackMode(true);
      if (simulationId) {
        handleCloseSimulation();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载轨迹失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaybackFrameChange = async (frameIndex: number) => {
    if (!selectedSimulationId || !playbackFrames[frameIndex]) return;

    setCurrentPlaybackFrame(frameIndex);
    try {
      const frameData = await api.getSavedFrameDetails(
        selectedSimulationId,
        playbackFrames[frameIndex].frame_number
      );
      const positions = frameData.atoms.map(a => [a.position.x, a.position.y, a.position.z]);
      setPlaybackPositions(positions);
    } catch (err) {
      console.error('Failed to load frame:', err);
    }
  };

  const togglePlayback = () => {
    if (isPlayingBack) {
      setIsPlayingBack(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    } else {
      setIsPlayingBack(true);
      playbackIntervalRef.current = setInterval(() => {
        setCurrentPlaybackFrame(prev => {
          const next = prev + 1;
          if (next >= playbackFrames.length) {
            setIsPlayingBack(false);
            if (playbackIntervalRef.current) {
              clearInterval(playbackIntervalRef.current);
              playbackIntervalRef.current = null;
            }
            return 0;
          }
          handlePlaybackFrameChange(next);
          return next;
        });
      }, 100);
    }
  };

  const handleStopPlayback = () => {
    setPlaybackMode(false);
    setSelectedSimulationId(null);
    setPlaybackFrames([]);
    setCurrentPlaybackFrame(0);
    setPlaybackPositions([]);
    setIsPlayingBack(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const energyError = initialEnergy && currentState
    ? Math.abs((currentState.total_energy - initialEnergy) / initialEnergy) * 100
    : 0;

  const displayPositions = playbackMode
    ? playbackPositions
    : currentState?.positions || [];

  const displayBoxSize = playbackMode
    ? playbackBoxSize
    : systemInfo?.box_size || 10;

  const displayState = playbackMode && playbackFrames[currentPlaybackFrame]
    ? playbackFrames[currentPlaybackFrame]
    : currentState;

  return (
    <div className="md-simulator">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}

      <div className="main-content">
        <div className="left-panel">
          <div className="card">
            <h2>⚛️ 模拟配置</h2>
            <div className="config-form">
              <div className="form-group">
                <label>晶格单元数</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.n_unit_cells}
                  onChange={(e) => setConfig({ ...config, n_unit_cells: parseInt(e.target.value) || 3 })}
                  disabled={!!simulationId}
                />
              </div>
              <div className="form-group">
                <label>密度 (ρ)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="2.0"
                  value={config.density}
                  onChange={(e) => setConfig({ ...config, density: parseFloat(e.target.value) || 0.8 })}
                  disabled={!!simulationId}
                />
              </div>
              <div className="form-group">
                <label>初始温度 (T)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10.0"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) || 1.0 })}
                  disabled={!!simulationId}
                />
              </div>
              <div className="form-group">
                <label>时间步长 (Δt)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="0.01"
                  value={config.timestep}
                  onChange={(e) => setConfig({ ...config, timestep: parseFloat(e.target.value) || 0.001 })}
                  disabled={!!simulationId}
                />
              </div>
              <div className="form-group">
                <label>每帧步数</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.stepsPerFrame}
                  onChange={(e) => setConfig({ ...config, stepsPerFrame: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>

            <div className="button-group">
              {!simulationId ? (
                <button className="btn btn-primary" onClick={handleCreateSimulation} disabled={loading}>
                  🚀 创建模拟
                </button>
              ) : (
                <>
                  <button className="btn btn-danger" onClick={handleCloseSimulation}>
                    ❌ 关闭模拟
                  </button>
                  <button className="btn btn-secondary" onClick={handleSaveSimulation}>
                    💾 保存轨迹
                  </button>
                </>
              )}
            </div>
          </div>

          {simulationId && (
            <div className="card">
              <h2>🎮 模拟控制</h2>
              <div className="button-group">
                {!isRunning ? (
                  <button className="btn btn-success" onClick={handleStart}>
                    ▶️ 开始
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={handlePause}>
                    ⏸️ 暂停
                  </button>
                )}
                <button className="btn btn-secondary" onClick={handleStep} disabled={isRunning}>
                    ⏭️ 单步
                </button>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>目标温度 (温度缩放)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10.0"
                    value={config.target_temp}
                    onChange={(e) => setConfig({ ...config, target_temp: parseFloat(e.target.value) || 1.0 })}
                  />
                  <button className="btn btn-secondary" onClick={handleScaleTemperature}>
                    应用
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h2>📁 轨迹回放</h2>
            <button 
              className="btn btn-secondary" 
              onClick={loadSavedSimulations}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              🔄 刷新列表
            </button>

            <div className="trajectory-list">
              {savedSimulations.length === 0 ? (
                <p className="text-muted">暂无保存的轨迹</p>
              ) : (
                savedSimulations.map((sim) => (
                  <div
                    key={sim.id}
                    className={`trajectory-item ${selectedSimulationId === sim.id ? 'active' : ''}`}
                    onClick={() => handleLoadSimulation(sim.id)}
                  >
                    <div className="trajectory-name">{sim.name}</div>
                    <div className="trajectory-info">
                      {sim.num_atoms} 原子 | {sim.frame_count} 帧
                    </div>
                  </div>
                ))
              )}
            </div>

            {playbackMode && (
              <div className="playback-controls" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>帧进度: {currentPlaybackFrame + 1} / {playbackFrames.length}</label>
                  <input
                    type="range"
                    min="0"
                    max={playbackFrames.length - 1}
                    value={currentPlaybackFrame}
                    onChange={(e) => handlePlaybackFrameChange(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="button-group">
                  <button 
                    className="btn btn-secondary" 
                    onClick={togglePlayback}
                  >
                    {isPlayingBack ? '⏸️ 暂停' : '▶️ 播放'}
                  </button>
                  <button className="btn btn-danger" onClick={handleStopPlayback}>
                    ❌ 停止
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="center-panel">
          <div className="card visualization-card">
            <h2>🔬 3D 可视化</h2>
            <div className="canvas-container">
              {(displayPositions.length > 0 && displayBoxSize > 0) ? (
                <ThreeScene positions={displayPositions} boxSize={displayBoxSize} />
              ) : (
                <div className="canvas-placeholder">
                  <div className="placeholder-icon">⚛️</div>
                  <p>创建模拟或加载轨迹以开始可视化</p>
                </div>
              )}
            </div>

            {displayState && (
              <div className="state-display">
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-label">步数</span>
                    <span className="stat-value">{displayState.frame_number || displayState.step || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">时间</span>
                    <span className="stat-value">{displayState.time?.toFixed(4) || '0.0000'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">温度</span>
                    <span className="stat-value">{displayState.temperature?.toFixed(6) || '0.000000'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">压力</span>
                    <span className="stat-value">{displayState.pressure?.toFixed(6) || '0.000000'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {systemInfo && (
            <div className="card">
              <h2>📊 系统信息</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">原子数</span>
                  <span className="info-value">{systemInfo.n_atoms}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">盒子大小</span>
                  <span className="info-value">{systemInfo.box_size.toFixed(3)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">密度</span>
                  <span className="info-value">{systemInfo.density.toFixed(3)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">时间步长</span>
                  <span className="info-value">{systemInfo.timestep}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="right-panel">
          {currentState && (
            <div className="card">
              <h2>⚡ 能量状态</h2>
              <div className="energy-stats">
                <div className="energy-item">
                  <div className="energy-color" style={{ backgroundColor: '#f44336' }}></div>
                  <span className="energy-label">势能 (PE)</span>
                  <span className="energy-value">{currentState.potential_energy.toFixed(6)}</span>
                </div>
                <div className="energy-item">
                  <div className="energy-color" style={{ backgroundColor: '#4caf50' }}></div>
                  <span className="energy-label">动能 (KE)</span>
                  <span className="energy-value">{currentState.kinetic_energy.toFixed(6)}</span>
                </div>
                <div className="energy-item">
                  <div className="energy-color" style={{ backgroundColor: '#2196f3' }}></div>
                  <span className="energy-label">总能量 (TE)</span>
                  <span className="energy-value">{currentState.total_energy.toFixed(6)}</span>
                </div>
                {initialEnergy && (
                  <div className="energy-item">
                    <div className={`energy-color ${energyError < 0.1 ? 'good' : energyError < 1.0 ? 'warning' : 'error'}`}></div>
                    <span className="energy-label">能量误差</span>
                    <span className={`energy-value ${energyError < 0.1 ? 'good' : energyError < 1.0 ? 'warning' : 'error'}`}>
                      {energyError.toFixed(4)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {energyHistory.length > 1 && (
            <div className="card">
              <h2>📈 能量变化图</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={energyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis 
                      dataKey="step" 
                      stroke="#666"
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      stroke="#666"
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line 
                      type="monotone" 
                      dataKey="pe" 
                      stroke="#f44336" 
                      dot={false} 
                      name="势能 (PE)"
                      strokeWidth={1.5}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ke" 
                      stroke="#4caf50" 
                      dot={false} 
                      name="动能 (KE)"
                      strokeWidth={1.5}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="te" 
                      stroke="#2196f3" 
                      dot={false} 
                      name="总能量 (TE)"
                      strokeWidth={1.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="info-box">
                <h4>📝 微正则系综 (NVE)</h4>
                <p>在 NVE 系综中，总能量应该保持守恒。观察蓝色曲线（总能量）是否为一条近似水平的直线。</p>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {!simulationId && !playbackMode && (
            <div className="card">
              <div className="info-box">
                <h4>📖 使用说明</h4>
                <p>
                  <strong>1. 设置模拟参数</strong><br/>
                  调整晶格大小、密度、温度和时间步长。<br/><br/>
                  <strong>2. 创建模拟</strong><br/>
                  点击"创建模拟"按钮初始化 FCC 晶格结构。<br/><br/>
                  <strong>3. 运行模拟</strong><br/>
                  点击"开始"或"单步"运行模拟，观察原子运动。<br/><br/>
                  <strong>4. 能量守恒验证</strong><br/>
                  观察能量变化图，验证总能量是否守恒。<br/><br/>
                  <strong>5. 轨迹回放</strong><br/>
                  保存模拟轨迹后可以从右侧列表加载回放。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
