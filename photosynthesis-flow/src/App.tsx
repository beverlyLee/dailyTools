import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Thylakoid from './cell/Thylakoid'

export default function App() {
  return (
    <div className="canvas-container">
      <div className="info-panel">
        <h1>🌿 光合作用</h1>
        <p>观察植物细胞内类囊体膜上的光合作用过程。</p>
        <p>光子撞击反应中心，激发电子沿传递链跳跃，最终生成 ATP 能量分子。</p>
        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot photon-dot"></div>
            <span>光子 (Photon) - 阳光能量</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot electron-dot"></div>
            <span>电子 (Electron) - 能量载体</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot atp-dot"></div>
            <span>ATP - 细胞能量货币</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot membrane-dot"></div>
            <span>类囊体膜 - 光合作用场所</span>
          </div>
        </div>
      </div>
      <Canvas camera={{ position: [0, 5, 12], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />
        <Thylakoid />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={25}
        />
      </Canvas>
    </div>
  )
}
