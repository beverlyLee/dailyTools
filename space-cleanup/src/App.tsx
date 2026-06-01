import { useState, useCallback, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import Earth from './earth/Earth'
import DebrisField from './debris/DebrisField'
import SpaceShip from './ship/SpaceShip'
import './App.css'

interface CameraControllerProps {
  shipPosition: THREE.Vector3
}

function CameraController({ shipPosition }: CameraControllerProps) {
  const targetPosition = useRef(new THREE.Vector3())
  const smoothFactor = 0.05

  useFrame(({ camera }) => {
    const offset = new THREE.Vector3(0, 3, 10)
    targetPosition.current.copy(shipPosition).add(offset)
    camera.position.lerp(targetPosition.current, smoothFactor)

    const lookTarget = new THREE.Vector3().copy(shipPosition)
    lookTarget.y += 1
    camera.lookAt(lookTarget)
  })

  return null
}

function App() {
  const [shipPosition, setShipPosition] = useState(new THREE.Vector3(0, 0, 6))
  const [score, setScore] = useState(0)
  const [debrisRemaining, setDebrisRemaining] = useState(50)

  const handlePositionUpdate = useCallback((position: THREE.Vector3) => {
    setShipPosition(position)
  }, [])

  const handleDebrisRemoved = useCallback((count: number) => {
    setScore((prev) => prev + count * 10)
    setDebrisRemaining((prev) => Math.max(0, prev - count))
  }, [])

  const handleDebrisAdded = useCallback((count: number) => {
    setDebrisRemaining((prev) => prev + count)
  }, [])

  return (
    <div className="app-container">
      <div className="hud">
        <div className="hud-item">
          <span className="hud-label">得分</span>
          <span className="hud-value">{score}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">剩余垃圾</span>
          <span className="hud-value">{debrisRemaining}</span>
        </div>
      </div>

      <div className="controls-hint">
        <p>WASD - 移动飞船 | Q/E - 翻滚</p>
        <p>靠近太空垃圾即可清除</p>
      </div>



      <Canvas
        camera={{ position: [0, 3, 10], fov: 60 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#000010']} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1.5} castShadow />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color="#4a90d9" />

        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

        <Earth />
        <DebrisField shipPosition={shipPosition} onDebrisRemoved={handleDebrisRemoved} onDebrisAdded={handleDebrisAdded} />
        <SpaceShip onPositionUpdate={handlePositionUpdate} />

        <CameraController shipPosition={shipPosition} />
      </Canvas>
    </div>
  )
}

export default App
