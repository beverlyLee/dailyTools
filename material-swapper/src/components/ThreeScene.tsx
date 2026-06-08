import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MaterialSwapper } from './MaterialSwapper';
import { MaterialItem } from '../types/material';

interface FloorProps {
  material: MaterialItem;
  uvOptions?: any;
  physicsOverrides?: any;
}

function Floor({ material, uvOptions, physicsOverrides }: FloorProps) {
  return (
    <MaterialSwapper material={material} uvOptions={uvOptions} physicsOverrides={physicsOverrides}>
      <planeGeometry args={[10, 10, 1, 1]} />
    </MaterialSwapper>
  );
}

function Wall({ position, rotation, size = [10, 3] }: { 
  position: [number, number, number]; 
  rotation?: [number, number, number];
  size?: [number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#f5f5f0" side={THREE.DoubleSide} />
    </mesh>
  );
}

function Ceiling() {
  return (
    <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
    </mesh>
  );
}

function Pillar({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <cylinderGeometry args={[0.3, 0.35, 3, 8]} />
      <meshStandardMaterial color="#e8e4de" />
    </mesh>
  );
}

function Furniture() {
  return (
    <group>
      <mesh position={[-2, 0.4, -1]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.8, 1]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      <mesh position={[-2, 0.9, -1]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.2, 0.9]} />
        <meshStandardMaterial color="#a0522d" />
      </mesh>
      
      <mesh position={[2, 0.3, -2]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.6, 1.5]} />
        <meshStandardMaterial color="#d4c4b0" />
      </mesh>
      <mesh position={[2, 0.65, -2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
        <meshStandardMaterial color="#c9b896" />
      </mesh>
    </group>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[0, 2.5, 0]} intensity={0.8} color="#fff8e7" />
      <pointLight position={[-3, 2.5, -3]} intensity={0.4} color="#e6f0ff" />
    </>
  );
}

interface SceneProps {
  floorMaterial: MaterialItem;
  uvOptions?: any;
  physicsOverrides?: any;
}

function SceneContent({ floorMaterial, uvOptions, physicsOverrides }: SceneProps) {
  return (
    <>
      <Lighting />
      
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <Floor material={floorMaterial} uvOptions={uvOptions} physicsOverrides={physicsOverrides} />
      </group>
      
      <Wall position={[0, 1.5, -5]} size={[10, 3]} />
      <Wall position={[-5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} size={[10, 3]} />
      
      <Ceiling />
      
      <Pillar position={[-4, 1.5, -4]} />
      <Pillar position={[4, 1.5, -4]} />
      
      <Furniture />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </>
  );
}

interface ThreeSceneProps {
  floorMaterial: MaterialItem;
  uvOptions?: any;
  physicsOverrides?: any;
}

export function ThreeScene({ floorMaterial, uvOptions, physicsOverrides }: ThreeSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [8, 6, 8], fov: 50 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#f0f0f0']} />
      <fog attach="fog" args={['#f0f0f0', 15, 30]} />
      <SceneContent 
        floorMaterial={floorMaterial} 
        uvOptions={uvOptions} 
        physicsOverrides={physicsOverrides} 
      />
    </Canvas>
  );
}
