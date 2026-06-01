import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PetModel } from './models/PetModel';
import { usePetAI } from './hooks/usePetAI';

function Scene({ isScared }: { isScared: boolean }) {
  const { excitement, isSleeping } = usePetAI();

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color="#00ffff" />
      <pointLight position={[5, 3, 5]} intensity={0.3} color="#ff00ff" />
      
      <PetModel excitement={excitement} isSleeping={isSleeping} isScared={isScared} />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#1a1a2e" 
          metalness={0.3}
          roughness={0.8}
        />
      </mesh>
      
      <gridHelper 
        args={[20, 20, '#2a2a4e', '#1a1a3e']} 
        position={[0, -0.99, 0]} 
      />
      
      <OrbitControls 
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

function App() {
  const { status, excitement, isScared } = usePetAI();

  const statusConfig = {
    sleeping: { icon: '💤', text: '睡眠中', color: '#8888aa' },
    awake: { icon: '👀', text: '注意到你了', color: '#00ffff' },
    excited: { icon: '⚡', text: '好兴奋!', color: '#ff00ff' },
    scared: { icon: '😨', text: '被吓到了!', color: '#ff4444' },
  };

  const config = statusConfig[status];

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div className="status-indicator" style={{ borderColor: config.color + '40', color: config.color }}>
        <span className="status-icon">{config.icon}</span>
        <span>{config.text}</span>
      </div>

      <div className="distance-bar">
        <span>亲密度</span>
        <div className="distance-bar-fill" style={{ width: `${excitement * 100}%` }} />
        <div className="distance-label">
          <span>疏远</span>
          <span>亲密</span>
        </div>
      </div>

      <div className="hint">
        慢慢移动鼠标靠近宠物，快速移动会吓到它哦 🤖
      </div>

      <Canvas
        camera={{ position: [0, 2, 5], fov: 50 }}
        shadows
        style={{ background: 'transparent' }}
      >
        <fog attach="fog" args={['#0a0a1a', 5, 20]} />
        <Scene isScared={isScared} />
      </Canvas>
    </div>
  );
}

export default App;
