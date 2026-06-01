import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import UnderwaterEnv from './env/UnderwaterEnv';
import Plankton from './particles/Plankton';
import BackgroundDebris from './particles/BackgroundDebris';
import DeepSeaCreatures from './particles/DeepSeaCreatures';
import LightCone from './effects/LightCone';

function App() {
  const lightPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const lightUniformsRef = useRef({
    uLightPos: { value: new THREE.Vector3(0, 0, 0) },
    uLightRadius: { value: 22.0 },
    uLightIntensity: { value: 1.0 },
    uMouseMoved: { value: 0 },
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 0, 45], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
      >
        <UnderwaterEnv />
        <ambientLight intensity={0.005} color={0x0a1a2a} />
        <DeepSeaCreatures lightUniformsRef={lightUniformsRef} />
        <BackgroundDebris lightUniformsRef={lightUniformsRef} />
        <Plankton lightUniformsRef={lightUniformsRef} />
        <LightCone lightPosRef={lightPosRef} lightUniformsRef={lightUniformsRef} />
      </Canvas>
    </div>
  );
}

export default App;
