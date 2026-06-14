import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { BayWindowConfig, ComfortAnalysis, StorageConfig, LightingAnalysis, DecorConfig } from './types'
import { BayWindowStructure } from './components/bay-window/BayWindowStructure'
import { ComfortVisualization } from './components/comfort/ComfortVisualization'
import { StorageBoxVisualization } from './components/storage/StorageBoxVisualization'
import { LightingVisualization } from './components/lighting/LightingVisualization'
import { DecorVisualization } from './components/decor/DecorVisualization'

interface Scene3DProps {
  bayConfig: BayWindowConfig
  comfortAnalysis: ComfortAnalysis
  storageConfig: StorageConfig
  lightingAnalysis: LightingAnalysis
  decorConfig: DecorConfig
  showPerson: boolean
  animateDrawers: boolean
  showLightRays: boolean
  showCoverageMap: boolean
  drawerMaterialColor: string
}

export function Scene3D({
  bayConfig,
  comfortAnalysis,
  storageConfig,
  lightingAnalysis,
  decorConfig,
  showPerson,
  animateDrawers,
  showLightRays,
  showCoverageMap,
  drawerMaterialColor
}: Scene3DProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [2.8, 1.8, 3.5], fov: 50 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#f8fafc']} />
      <fog attach="fog" args={['#f8fafc', 6, 18]} />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} color="#dbeafe" />
      <pointLight position={[0, 3, 1]} intensity={0.5} color="#fef3c7" />

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
      />

      <Environment preset="apartment" />
    </Canvas>
  )
}
