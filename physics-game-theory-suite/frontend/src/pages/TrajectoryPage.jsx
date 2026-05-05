import { useState, useEffect, useRef, useCallback } from 'react'
import { trajectoryApi } from '../services/api'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function TrajectoryPage() {
  const [trajectories, setTrajectories] = useState([])
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState(null)
  const [trajectoryInfo, setTrajectoryInfo] = useState(null)
  const [frames, setFrames] = useState([])
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameData, setFrameData] = useState(null)
  const [energyHistory, setEnergyHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const atomMeshesRef = useRef([])
  const animationFrameRef = useRef(null)
  const playIntervalRef = useRef(null)
  const boxSizeRef = useRef(0)

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
    loadTrajectories()
    return cleanup
  }, [initThreeJS])

  const loadTrajectories = async () => {
    try {
      const response = await trajectoryApi.list()
      setTrajectories(response.data.simulations)
    } catch (error) {
      console.error('Failed to load trajectories:', error)
    }
  }

  const loadTrajectory = async (trajectoryId) => {
    setLoading(true)
    try {
      const [infoResponse, framesResponse] = await Promise.all([
        trajectoryApi.getInfo(trajectoryId),
        trajectoryApi.getFrames(trajectoryId)
      ])
      
      setSelectedTrajectoryId(trajectoryId)
      setTrajectoryInfo(infoResponse.data.simulation)
      setFrames(framesResponse.data.frames)
      setCurrentFrameIndex(0)
      setEnergyHistory(framesResponse.data.frames.map((f, i) => ({
        step: f.frame_number,
        pe: f.potential_energy,
        ke: f.kinetic_energy,
        te: f.total_energy,
      })))
      
      if (framesResponse.data.frames.length > 0) {
        const firstFrame = framesResponse.data.frames[0]
        const frameDetailResponse = await trajectoryApi.getFrameDetails(
          trajectoryId, 
          firstFrame.frame_number
        )
        setFrameData(frameDetailResponse.data)
        createAtoms(
          frameDetailResponse.data.positions, 
          framesResponse.data.box_size
        )
      }
      
    } catch (error) {
      console.error('Failed to load trajectory:', error)
      alert('加载轨迹失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const loadFrame = useCallback(async (frameIndex) => {
    if (!selectedTrajectoryId || !frames[frameIndex]) return
    
    try {
      const frame = frames[frameIndex]
      const response = await trajectoryApi.getFrameDetails(
        selectedTrajectoryId,
        frame.frame_number
      )
      
      setFrameData(response.data)
      setCurrentFrameIndex(frameIndex)
      updateAtomPositions(response.data.positions)
      
    } catch (error) {
      console.error('Failed to load frame:', error)
    }
  }, [selectedTrajectoryId, frames, updateAtomPositions])

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentFrameIndex(prev => {
          const next = (prev + 1) % frames.length
          loadFrame(next)
          return next
        })
      }, 150)
      
      return () => {
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current)
        }
      }
    }
  }, [isPlaying, frames.length, loadFrame])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSliderChange = async (e) => {
    const frameIndex = parseInt(e.target.value)
    if (isPlaying) {
      setIsPlaying(false)
    }
    await loadFrame(frameIndex)
  }

  const deleteTrajectory = async (trajectoryId) => {
    if (!confirm('确定要删除这个轨迹吗？')) return
    
    try {
      await trajectoryApi.delete(trajectoryId)
      
      if (selectedTrajectoryId === trajectoryId) {
        setSelectedTrajectoryId(null)
        setTrajectoryInfo(null)
        setFrames([])
        setCurrentFrameIndex(0)
        setFrameData(null)
        setEnergyHistory([])
        setIsPlaying(false)
        
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
      
      await loadTrajectories()
      
    } catch (error) {
      console.error('Failed to delete trajectory:', error)
      alert('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  return (
    <div className="trajectory-page">
      <div className="page-header">
        <h1 className="page-title">📊 轨迹回放</h1>
        <p className="page-subtitle">
          查看和回放已保存的物理模拟轨迹数据
        </p>
      </div>

      <div className="grid grid-cols-3">
        <div className="trajectory-list-panel">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📁 已保存的轨迹</h3>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={loadTrajectories}
              >
                🔄 刷新
              </button>
            </div>
            <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {trajectories.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📂</div>
                  <div className="empty-state-text">暂无保存的轨迹</div>
                  <div style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
                    在物理模拟页面运行模拟并保存轨迹
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {trajectories.map((traj) => (
                    <div
                      key={traj.id}
                      className={`trajectory-card ${selectedTrajectoryId === traj.id ? 'active' : ''}`}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                    >
                      <div 
                        style={{ flex: 1, cursor: 'pointer' }}
                        onClick={() => loadTrajectory(traj.id)}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
                          {traj.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                          <div>🔢 {traj.n_atoms} 原子</div>
                          <div>📊 {traj.frame_count} 帧</div>
                          <div>⏱️ {traj.total_steps} 步</div>
                          {traj.created_at && (
                            <div>📅 {new Date(traj.created_at).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTrajectory(traj.id)
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="visualization-panel" style={{ gridColumn: 'span 2' }}>
          {selectedTrajectoryId ? (
            <div>
              <div className="card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 className="card-title">🔬 轨迹可视化</h3>
                    {trajectoryInfo && (
                      <span className="badge badge-primary">
                        {trajectoryInfo.name || `模拟 #${trajectoryInfo.id}`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isPlaying ? (
                      <button className="btn btn-warning" onClick={togglePlay}>
                        ⏸️ 暂停
                      </button>
                    ) : (
                      <button className="btn btn-success" onClick={togglePlay}>
                        ▶️ 播放
                      </button>
                    )}
                  </div>
                </div>
                <div 
                  ref={canvasRef} 
                  className="simulation-canvas-container"
                  style={{ height: '400px' }}
                />
                
                {frames.length > 0 && (
                  <div className="card-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '13px', color: '#666', minWidth: '80px' }}>
                        帧: {currentFrameIndex + 1}/{frames.length}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={frames.length - 1}
                        value={currentFrameIndex}
                        onChange={handleSliderChange}
                        style={{ flex: 1 }}
                      />
                      {frameData && (
                        <span style={{ fontSize: '13px', color: '#666', whiteSpace: 'nowrap' }}>
                          步数: {frameData.step} | 时间: {frameData.time.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {frameData && (
                <div className="grid grid-cols-4" style={{ marginTop: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-label">步数</div>
                    <div className="stat-value primary">{frameData.step}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">时间</div>
                    <div className="stat-value">{frameData.time.toFixed(4)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">温度</div>
                    <div className="stat-value">{frameData.temperature.toFixed(4)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">压力</div>
                    <div className="stat-value">{frameData.pressure.toFixed(4)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">势能</div>
                    <div className="stat-value danger">{frameData.potential_energy.toFixed(4)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">动能</div>
                    <div className="stat-value success">{frameData.kinetic_energy.toFixed(4)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">总能量</div>
                    <div className="stat-value primary">{frameData.total_energy.toFixed(4)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">总帧数</div>
                    <div className="stat-value">{frames.length}</div>
                  </div>
                </div>
              )}

              {energyHistory.length > 1 && (
                <div className="card" style={{ marginTop: '20px' }}>
                  <div className="card-header">
                    <h3 className="card-title">📈 能量变化图</h3>
                  </div>
                  <div className="card-body" style={{ height: '280px' }}>
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
          ) : (
            <div className="card" style={{ height: '500px' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div className="empty-state">
                  <div className="empty-state-icon">🎬</div>
                  <div className="empty-state-text" style={{ marginBottom: '8px' }}>
                    选择左侧的轨迹开始回放
                  </div>
                  <div style={{ fontSize: '13px', color: '#999' }}>
                    点击轨迹卡片加载并可视化
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrajectoryPage
