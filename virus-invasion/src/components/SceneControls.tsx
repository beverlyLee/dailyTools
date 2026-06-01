import { useRef } from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface SceneControlsProps {
  enableZoom?: boolean;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
}

const SceneControls = ({
  enableZoom = true,
  enablePan = false,
  minDistance = 6,
  maxDistance = 25,
}: SceneControlsProps) => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      <ambientLight intensity={0.5} color="#6366f1" />
      
      <directionalLight
        ref={directionalLightRef}
        position={[5, 8, 10]}
        intensity={1.5}
        color="#ffffff"
        castShadow
      />
      
      <pointLight position={[-4, -3, 8]} intensity={0.8} color="#c084fc" />
      <pointLight position={[4, -5, 6]} intensity={0.5} color="#22d3ee" />
      <pointLight position={[0, 6, -4]} intensity={0.4} color="#f472b6" />

      <Stars
        radius={50}
        depth={20}
        count={800}
        factor={2}
        saturation={0}
        fade
        speed={0.5}
      />

      <OrbitControls
        enableZoom={enableZoom}
        enablePan={enablePan}
        minDistance={minDistance}
        maxDistance={maxDistance}
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.2}
      />

      <fog attach="fog" args={['#0f0a1a', 20, 50]} />
    </>
  );
};

export default SceneControls;
