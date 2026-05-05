import { useState, useEffect, useRef, useCallback } from 'react'
import { simulationApi } from '../services/api'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function SimulationPage() {
  const [simulationId, setSimulationId] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [config, setConfig] = useState({
    lattice_type: 'fcc',
    n_unit_cells: 5,
    density: 0.8,
    temperature: 1.0,
    timestep: 0.001,
    lattice_type: 'fcc',
    atom_type: null,
    mass: 1.0,
    epsilon: 1.0,
    sigma: 1.0,
    cutoff: 2.5,
    seed: 42,
  })
  
  const [systemInfo, setSystemInfo] = useState(null)
  const [currentState, setCurrentState] = useState(null)
  const [energyHistory, setEnergyHistory] = useState([])
  const [initialEnergy, setInitialEnergy] = useState(null)
  
  const [stepsPerFrame, setStepsPerFrame] = useState(10)
  const [targetTemperature, setTargetTemperature] = useState(1.0)
  
  const [saveName, setSaveName] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const atomMeshesRef = useRef([])
  const animationFrameRef = useRef(null)
  const boxSizeRef = useRef(0)
  const numAtomsRef = useRef(0)

  const initThreeJS = useCallback(() => {
    if (!canvasRef.current) return
    
    const container = canvasRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0f)
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(15, 12, 15)
    
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)
    
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 20, 10)
    scene.add(directionalLight)
    
    const pointLight1 = new THREE.PointLight(0x64b5f6, 0.5)
    pointLight1.position.set(-10, 10, -10)
    scene.add(pointLight1)
    
    const pointLight2 = new THREE.PointLight(0xf44336, 0.3)
    pointLight2.position.set(10, -5, 10)
    scene.add(pointLight2)
    
    sceneRef.current = { scene, camera, renderer, controls }
    
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()
    
    const handleResize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      renderer.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  const createAtoms = useCallback((positions, boxSize) => {
    if (!sceneRef.current) return
    
    const { scene, camera, controls } = sceneRef.current
    
    atomMeshesRef.current.forEach(mesh => {
      scene.remove(mesh)
    })
    atomMeshesRef.current = []
    
    if (boxSizeRef.current > 0 && sceneRef.current.boxHelper) {
      scene.remove(sceneRef.current.boxHelper)
    }
    
    const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize)
    const edges = new THREE.EdgesGeometry(geometry)
    const boxHelper = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x444466 })
    )
    boxHelper.position.set(boxSize / 2, boxSize / 2, boxSize / 2)
    scene.add(boxHelper)
    sceneRef.current.boxHelper = boxHelper
    
    const atomRadius = boxSize / 30
    const atomGeometry = new THREE.SphereGeometry(atomRadius, 16, 16)
    const atomMaterial = new THREE.MeshPhongMaterial({
      color: 0x64b5f6,
      shininess: 100,
      specular: 0x222222,
    })
    
    positions.forEach((pos, index) => {
      const mesh = new THREE.Mesh(atomGeometry, atomMaterial.clone())
      mesh.position.set(pos[0], pos[1], pos[2])
      scene.add(mesh)
      atomMeshesRef.current.push(mesh)
    })
    
    boxSizeRef.current = boxSize
    numAtomsRef.current = positions.length
    
    const distance = boxSize * 1.8
    camera.position.set(distance, distance * 0.8, distance)
    controls.target.set(boxSize / 2, boxSize / 2, boxSize / 2)
    controls.update()
  }, [])

  const updateAtomPositions = useCallback((positions) => {
    positions.forEach((pos, index) => {
      if (atomMeshesRef.current[index]) {
        atomMeshesRef.current[index].position.set(pos[0], pos[1], pos[2])
      }
    })
  }, [])

  useEffect(() => {
    const cleanup = initThreeJS()
    return cleanup
  }, [initThreeJS])

  const createSimulation = async () => {
    setIsLoading(true)
    try {
      const response = await simulationApi.create(config)
      const data = response.data
      
      setSimulationId(data.simulation_id)
      setSystemInfo(data.system_info)
      setCurrentState(data.initial_state)
      setInitialEnergy(data.initial_state.total_energy)
      setEnergyHistory([{
        step: 0,
        pe: data.initial_state.potential_energy,
        ke: data.initial_state.kinetic_energy,
        te: data.initial_state.total_energy,
      }])
      
      createAtoms(data.initial_state.positions, data.system_info.box_size)
      
    } catch (error) {
      console.error('Failed to create simulation:', error)
      alert('创建模拟失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setIsLoading(false)
    }
  }

  const runSimulationLoop = useCallback(async () => {
    if (!simulationId || !isRunning) return
    
    try {
      const response = await simulationApi.step(simulationId, stepsPerFrame, 1)
      const state = response.data.state
      
      setCurrentState(state)
      updateAtomPositions(state.positions)
      
      setEnergyHistory(prev => {
        const newHistory = [...prev, {
          step: state.step,
          pe: state.potential_energy,
          ke: state.kinetic_energy,
          te: state.total_energy,
        }]
        return newHistory.slice(-100)
      })
      
      if (isRunning) {
        setTimeout(runSimulationLoop, 0)
      }
      
    } catch (error) {
      console.error('Simulation step failed:', error)
      setIsRunning(false)
    }
  }, [simulationId, isRunning, stepsPerFrame, updateAtomPositions])

  useEffect(() => {
    if (isRunning) {
      runSimulationLoop()
    }
  }, [isRunning, runSimulationLoop])

  const startSimulation = () => {
    setIsRunning(true)
  }

  const pauseSimulation = () => {
    setIsRunning(false)
  }

  const stepSimulation = async () => {
    if (!simulationId) return
    
    try {
      const response = await simulationApi.step(simulationId, 1, 1)
      const state = response.data.state
      
      setCurrentState(state)
      updateAtomPositions(state.positions)
      
      setEnergyHistory(prev => [...prev, {
        step: state.step,
        pe: state.potential_energy,
        ke: state.kinetic_energy,
        te: state.total_energy,
      }])
      
    } catch (error) {
      console.error('Step failed:', error)
      alert('单步执行失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const scaleTemperature = async () => {
    if (!simulationId) return
    
    try {
      await simulationApi.scaleTemperature(simulationId, targetTemperature)
      const response = await simulationApi.getState(simulationId)
      setCurrentState(response.data)
    } catch (error) {
      console.error('Scale temperature failed:', error)
      alert('温度缩放失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const closeSimulation = async () => {
    if (!simulationId) return
    
    setIsRunning(false)
    
    try {
      await simulationApi.close(simulationId)
    } catch (error) {
      console.error('Close failed:', error)
    }
    
    setSimulationId(null)
    setSystemInfo(null)
    setCurrentState(null)
    setEnergyHistory([])
    setInitialEnergy(null)
    
    if (sceneRef.current && atomMeshesRef.current.length > 0) {
      atomMeshesRef.current.forEach(mesh => {
        sceneRef.current.scene.remove(mesh)
      })
      atomMeshesRef.current = []
      
      if (sceneRef.current.boxHelper) {
        sceneRef.current.scene.remove(sceneRef.current.boxHelper)
        sceneRef.current.boxHelper = null
      }
    }
  }

  const saveSimulation = async () => {
    if (!simulationId) return
    
    try {
      const response = await simulationApi.save(simulationId, saveName || null)
      alert(`模拟已保存，ID: ${response.data.id}`)
      setShowSaveModal(false)
      setSaveName('')
    } catch (error) {
      console.error('Save failed:', error)
      alert('保存失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const energyError = initialEnergy && currentState
    ? Math.abs((currentState.total_energy - initialEnergy) / initialEnergy) * 100
    : 0

  return (
    <div className="simulation-page">
      <div className="page-header">
        <h1 className="page-title">⚛️ 分子动力学模拟</h1>
        <p className="page-subtitle">
          基于 Lennard-Jones 势和 Velocity-Verlet 算法的经典分子动力学模拟
        </p>
      </div>

      <div className="grid grid-cols-3">
        <div className="config-panel">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📐 模拟配置</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">晶格类型</label>
                <select 
                  className="form-select"
                  value={config.lattice_type}
                  onChange={(e) => setConfig({...config, lattice_type: e.target.value})}
                  disabled={simulationId !== null}
                >
                  <option value="fcc">FCC (面心立方)</option>
                  <option value="sc">SC (简单立方)</option>
                  <option value="bcc">BCC (体心立方)</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">单位晶胞数</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={config.n_unit_cells}
                      onChange={(e) => setConfig({...config, n_unit_cells: parseInt(e.target.value) || 1})}
                      min="1"
                      max="10"
                      disabled={simulationId !== null}
                    />
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">数密度</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={config.density}
                      onChange={(e) => setConfig({...config, density: parseFloat(e.target.value) || 0.1})}
                      step="0.1"
                      min="0.1"
                      disabled={simulationId !== null}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">初始温度</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={config.temperature}
                      onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value) || 0})}
                      step="0.1"
                      min="0"
                      disabled={simulationId !== null}
                    />
                  </div>
                </div>
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label">时间步长</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={config.timestep}
                      onChange={(e) => setConfig({...config, timestep: parseFloat(e.target.value) || 0.001})}
                      step="0.0001"
                      disabled={simulationId !== null}
                    />
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div className="form-group">
                <label className="form-label">预定义原子类型</label>
                <select 
                  className="form-select"
                  value={config.atom_type || ''}
                  onChange={(e) => {
                    const value = e.target.value || null
                    setConfig({...config, atom_type: value})
                  }}
                  disabled={simulationId !== null}
                >
                  <option value="">自定义</option>
                  <option value="argon">Argon (氩)</option>
                  <option value="helium">Helium (氦)</option>
                  <option value="neon">Neon (氖)</option>
                  <option value="krypton">Krypton (氪)</option>
                </select>
              </div>

              {!config.atom_type && (
                <>
                  <div className="form-row">
                    <div className="form-col">
                      <div className="form-group">
                        <label className="form-label">质量 (m)</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={config.mass}
                          onChange={(e) => setConfig({...config, mass: parseFloat(e.target.value) || 1})}
                          step="0.1"
                          min="0.1"
                          disabled={simulationId !== null}
                        />
                      </div>
                    </div>
                    <div className="form-col">
                      <div className="form-group">
                        <label className="form-label">ε (势深度)</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={config.epsilon}
                          onChange={(e) => setConfig({...config, epsilon: parseFloat(e.target.value) || 1})}
                          step="0.1"
                          min="0.1"
                          disabled={simulationId !== null}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-col">
                      <div className="form-group">
                        <label className="form-label">σ (特征长度)</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={config.sigma}
                          onChange={(e) => setConfig({...config, sigma: parseFloat(e.target.value) || 1})}
                          step="0.1"
                          min="0.1"
                          disabled={simulationId !== null}
                        />
                      </div>
                    </div>
                    <div className="form-col">
                      <div className="form-group">
                        <label className="form-label">截断半径</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={config.cutoff}
                          onChange={(e) => setConfig({...config, cutoff: parseFloat(e.target.value) || 2.5})}
                          step="0.1"
                          min="1"
                          disabled={simulationId !== null}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="divider" />

              {!simulationId ? (
                <button 
                  className="btn btn-primary w-full"
                  onClick={createSimulation}
                  disabled={isLoading}
                >
                  {isLoading ? <span className="spinner" /> : '🚀 创建模拟'}
                </button>
              ) : (
                <button 
                  className="btn btn-danger w-full"
                  onClick={closeSimulation}
                >
                  ❌ 关闭模拟
                </button>
              )}
            </div>
          </div>

          {simulationId && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <h3 className="card-title">🎮 模拟控制</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">每帧步数</label>
                  <select 
                    className="form-select"
                    value={stepsPerFrame}
                    onChange={(e) => setStepsPerFrame(parseInt(e.target.value))}
                  >
                    <option value="1">1</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <div className="form-row" style={{ marginBottom: '16px' }}>
                  {!isRunning ? (
                    <button 
                      className="btn btn-success flex-1"
                      onClick={startSimulation}
                    >
                      ▶️ 运行
                    </button>
                  ) : (
                    <button 
                      className="btn btn-warning flex-1"
                      onClick={pauseSimulation}
                    >
                      ⏸️ 暂停
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary flex-1"
                    onClick={stepSimulation}
                    disabled={isRunning}
                  >
                    ⏭️ 单步
                  </button>
                </div>

                <div className="divider" />

                <div className="form-group">
                  <label className="form-label">温度缩放</label>
                  <div className="form-row">
                    <input 
                      type="number" 
                      className="form-input"
                      value={targetTemperature}
                      onChange={(e) => setTargetTemperature(parseFloat(e.target.value) || 0)}
                      step="0.1"
                      min="0"
                    />
                    <button 
                      className="btn btn-secondary"
                      onClick={scaleTemperature}
                    >
                      🔧 缩放
                    </button>
                  </div>
                </div>

                <div className="divider" />

                <button 
                  className="btn btn-primary w-full"
                  onClick={() => setShowSaveModal(true)}
                >
                  💾 保存轨迹
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="visualization-panel" style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">🔬 3D 可视化</h3>
              {systemInfo && (
                <span className="badge badge-primary">
                  {systemInfo.n_atoms} 原子 | {systemInfo.lattice_type.toUpperCase()} 晶格
                </span>
              )}
            </div>
            <div 
              ref={canvasRef} 
              className="simulation-canvas-container"
              style={{ height: '500px' }}
            />
          </div>

          <div className="grid grid-cols-4" style={{ marginTop: '20px' }}>
            {currentState ? (
              <>
                <div className="stat-card">
                  <div className="stat-label">步数</div>
                  <div className="stat-value primary">{currentState.step}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">时间</div>
                  <div className="stat-value">{currentState.time.toFixed(4)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">温度</div>
                  <div className="stat-value">{currentState.temperature.toFixed(4)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">压力</div>
                  <div className="stat-value">{currentState.pressure.toFixed(4)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">势能</div>
                  <div className="stat-value danger">{currentState.potential_energy.toFixed(4)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">动能</div>
                  <div className="stat-value success">{currentState.kinetic_energy.toFixed(4)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">总能量</div>
                  <div className="stat-value primary">{currentState.total_energy.toFixed(4)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">能量误差</div>
                  <div className={`stat-value ${energyError < 0.1 ? 'success' : energyError < 1 ? 'warning' : 'danger'}`}>
                    {energyError.toFixed(4)}%
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-4" style={{ gridColumn: 'span 4' }}>
                {[1,2,3,4].map(i => (
                  <div key={i} className="stat-card">
                    <div className="stat-label">--</div>
                    <div className="stat-value" style={{ color: '#999' }}>--</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {energyHistory.length > 1 && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <h3 className="card-title">📈 能量变化图</h3>
              </div>
              <div className="card-body" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={energyHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                    <XAxis 
                      dataKey="step" 
                      label={{ value: '步数', position: 'insideBottomRight', offset: -5 }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ value: '能量', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#fff', 
                        border: '1px solid #e0e6ed',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="pe" 
                      name="势能" 
                      stroke="#f44336" 
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ke" 
                      name="动能" 
                      stroke="#4caf50" 
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="te" 
                      name="总能量" 
                      stroke="#2196f3" 
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💾 保存模拟轨迹</h3>
              <button className="modal-close" onClick={() => setShowSaveModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">模拟名称（可选）</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="输入模拟名称，如：氩气LJ势模拟"
                />
              </div>
              <div className="alert alert-info">
                共 {energyHistory.length} 帧将被保存到数据库
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSaveModal(false)}
              >
                取消
              </button>
              <button 
                className="btn btn-primary"
                onClick={saveSimulation}
              >
                💾 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SimulationPage
