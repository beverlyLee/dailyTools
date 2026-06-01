import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Book from './book/Book'
import PageTurner from './anim/PageTurner'
import type { PageData, BendCurvePoints } from './book/Book'

function App() {
  const [currentPage, setCurrentPage] = useState(0)
  const [turnProgress, setTurnProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [bendCurvePoints, setBendCurvePoints] = useState<BendCurvePoints | undefined>(undefined)
  
  const pages: PageData[] = useMemo(() => {
    const pageCount = 10
    return Array.from({ length: pageCount }, (_, i) => ({
      front: `/images/page-${i * 2 + 1}.jpg`,
      back: `/images/page-${i * 2 + 2}.jpg`,
    }))
  }, [])
  
  const totalPages = pages.length * 2
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        color: '#f5e6d3',
        fontFamily: 'serif',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
      }}>
        <h1 style={{ fontSize: '28px', margin: 0, fontWeight: 'normal' }}>古籍宝典</h1>
        <p style={{ fontSize: '14px', margin: '8px 0 0', opacity: 0.8 }}>
          第 {currentPage * 2 + 1} - {currentPage * 2 + 2} 页 / 共 {totalPages} 页
        </p>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        color: '#f5e6d3',
        fontFamily: 'serif',
        fontSize: '14px',
        opacity: 0.7,
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
      }}>
        鼠标按住书页拖动翻页 | 滚轮缩放 | 右键旋转视角
      </div>
      
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'linear-gradient(180deg, #2d2a24 0%, #1a1a2e 100%)' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, 5, 3]} intensity={0.6} color="#fff5e6" />
        
        <fog attach="fog" args={['#1a1a2e', 10, 30]} />
        
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={15}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
        />
        
        <Book
          pages={pages}
          currentPage={currentPage}
          turnProgress={turnProgress}
          bendCurvePoints={bendCurvePoints}
          pageWidth={3}
          pageHeight={4.5}
        />
        
        <PageTurner
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          turnProgress={turnProgress}
          onTurnProgressChange={setTurnProgress}
          isAnimating={isAnimating}
          onIsAnimatingChange={setIsAnimating}
          onBendCurveChange={setBendCurvePoints}
          bookWidth={3}
        />
        
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#1a1a2e" roughness={1} />
        </mesh>
      </Canvas>
    </div>
  )
}

export default App
