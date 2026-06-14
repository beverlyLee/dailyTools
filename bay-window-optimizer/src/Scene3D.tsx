import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { BayWindowConfig, ComfortAnalysis, StorageConfig, LightingAnalysis, DecorConfig, StorageAnalysis as StorageAnalysisType } from './types'
import { SceneErrorBoundary } from './components/SceneErrorBoundary'
import { BayWindowStructure } from './components/bay-window/BayWindowStructure'
import { ComfortVisualization } from './components/comfort/ComfortVisualization'
import { StorageBoxVisualization } from './components/storage/StorageBoxVisualization'
import { LightingVisualization } from './components/lighting/LightingVisualization'
import { DecorVisualization } from './components/decor/DecorVisualization'

interface Scene3DProps {
  bayConfig: BayWindowConfig
  comfortAnalysis: ComfortAnalysis
  storageConfig: StorageConfig
  storageAnalysis: StorageAnalysisType
  lightingAnalysis: LightingAnalysis
  decorConfig: DecorConfig
  showPerson: boolean
  animateDrawers: boolean
  showLightRays: boolean
  showCoverageMap: boolean
  drawerMaterialColor: string
}

function SceneContent({
  bayConfig,
  comfortAnalysis,
  storageConfig,
  storageAnalysis,
  lightingAnalysis,
  decorConfig,
  showPerson,
  animateDrawers,
  showLightRays,
  showCoverageMap,
  drawerMaterialColor
}: Scene3DProps) {
  return (
    <>
      <color attach="background" args={['#f8fafc']} />
      <fog attach="fog" args={['#f8fafc', 6, 18]} />

      <ambientLight intensity={0.65} color="#ffffff" />
      <hemisphereLight
        color="#ffffff"
        groundColor="#d4c4a8"
        intensity={0.5}
      />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.3}
        color="#fff8ee"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0001}
      />
      <directionalLight
        position={[-3, 4, -2]}
        intensity={0.45}
        color="#dbeafe"
      />
      <directionalLight
        position={[0, 8, 5]}
        intensity={0.35}
        color="#fef3c7"
      />
      <pointLight
        position={[0, 3, 1]}
        intensity={0.4}
        color="#fef3c7"
        distance={8}
        decay={2}
      />
      <rectAreaLight
        width={3}
        height={2.5}
        intensity={1.5}
        color="#e8f4fc"
        position={[0, 1.5, -1.2]}
      />

      <BayWindowStructure config={bayConfig} frameColor={decorConfig.frameColor} />

      <ComfortVisualization
        bayConfig={bayConfig}
        comfortAnalysis={comfortAnalysis}
        cushionColor={decorConfig.cushionColor}
        showPerson={showPerson}
      />

      <StorageBoxVisualization
        bayConfig={bayConfig}
        storageConfig={storageConfig}
        storageAnalysis={storageAnalysis}
        animateDrawers={animateDrawers}
        drawerMaterial={drawerMaterialColor}
      />

      <LightingVisualization
        bayConfig={bayConfig}
        lightingAnalysis={lightingAnalysis}
        showLightRays={showLightRays}
        showCoverageMap={showCoverageMap}
      />

      <DecorVisualization
        bayConfig={bayConfig}
        decorItems={decorConfig.items}
        frameColor={decorConfig.frameColor}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1.5}
        maxDistance={10}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1, 0]}
        enableDamping={true}
        dampingFactor={0.08}
      />
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3"></div>
        <p className="text-sm text-slate-500">3D 场景加载中...</p>
      </div>
    </div>
  )
}

export function Scene3D(props: Scene3DProps) {
  return (
    <SceneErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows
          camera={{ position: [2.8, 1.8, 3.5], fov: 50 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#f8fafc')
          }}
        >
          <SceneContent {...props} />
        </Canvas>
      </Suspense>
    </SceneErrorBoundary>
  )
}
