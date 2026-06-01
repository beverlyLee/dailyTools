import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { createCellMesh, type CellMesh } from './meshes/Cell'
import { useCellAnimation } from './hooks/useCellAnimation'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const meshRef = useRef<CellMesh | null>(null)
  const animFrameRef = useRef<number>(0)

  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle')

  const { progressRef, play, pause, resume, reset } = useCellAnimation()

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0f)

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 5
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0x00d4ff, 2, 100)
    pointLight1.position.set(3, 3, 3)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xff00ff, 1.5, 100)
    pointLight2.position.set(-3, -2, 2)
    scene.add(pointLight2)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3)
    directionalLight.position.set(0, 5, 5)
    scene.add(directionalLight)

    const cellMesh = createCellMesh()
    scene.add(cellMesh)
    meshRef.current = cellMesh

    const ringGeometry = new THREE.TorusGeometry(1.2, 0.02, 16, 100)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.3,
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    scene.add(ring)

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      if (meshRef.current) {
        meshRef.current.userData.updateDeformation(progressRef.current.value)
        meshRef.current.rotation.y += 0.002
      }
      ring.rotation.z += 0.003
      ring.rotation.x += 0.001

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      cellMesh.geometry.dispose()
      ;(cellMesh.material as THREE.Material).dispose()
      ringGeometry.dispose()
      ringMaterial.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  const handleSplit = useCallback(() => {
    if (status === 'idle') {
      play()
      setStatus('playing')
    } else if (status === 'playing') {
      pause()
      setStatus('paused')
    } else {
      resume()
      setStatus('playing')
    }
  }, [status, play, pause, resume])

  const handleReset = useCallback(() => {
    reset()
    setStatus('idle')
  }, [reset])

  return (
    <div className="app-container">
      <div className="canvas-container" ref={containerRef} />
      <div className="ui-overlay">
        <h1 className="title">细胞分裂模拟</h1>
        <button className="split-btn" onClick={handleSplit}>
          {status === 'idle' ? '开始分裂' : status === 'playing' ? '暂停' : '继续'}
        </button>
        {status !== 'idle' && (
          <button
            className="split-btn"
            style={{ marginTop: '12px', background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)' }}
            onClick={handleReset}
          >
            重置
          </button>
        )}
        <p className="status-text">
          {status === 'idle' && '点击按钮开始细胞分裂过程'}
          {status === 'playing' && '细胞正在分裂中...'}
          {status === 'paused' && '动画已暂停'}
        </p>
      </div>
    </div>
  )
}