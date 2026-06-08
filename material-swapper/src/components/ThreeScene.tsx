import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MaterialSwapper } from './MaterialSwapper';
import { MaterialItem, SceneObjectType } from '../types/material';

interface SceneMaterialConfig {
  floor: MaterialItem;
  backWall: MaterialItem;
  sideWall: MaterialItem;
  leftPillar: MaterialItem;
  rightPillar: MaterialItem;
}

interface SceneUVConfig {
  floor?: any;
  backWall?: any;
  sideWall?: any;
  leftPillar?: any;
  rightPillar?: any;
}

interface FloorProps {
  material: MaterialItem;
  uvOptions?: any;
  physicsOverrides?: any;
  customTextures?: any;
  size?: number;
}

function Floor({ material, uvOptions, physicsOverrides, customTextures, size = 20 }: FloorProps) {
  return (
    <MaterialSwapper 
      material={material} 
      uvOptions={uvOptions} 
      physicsOverrides={physicsOverrides}
      customTextures={customTextures}
      geometryType="plane"
    >
      <planeGeometry args={[size, size, 1, 1]} />
    </MaterialSwapper>
  );
}

interface WallProps {
  material: MaterialItem;
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  uvOptions?: any;
  physicsOverrides?: any;
  customTextures?: any;
}

function Wall({ material, position, rotation, size = [20, 4], uvOptions, physicsOverrides, customTextures }: WallProps) {
  const wallUV = useMemo(() => ({
    repeatX: uvOptions?.repeatX ?? 6,
    repeatY: uvOptions?.repeatY ?? 1.2,
    offsetX: uvOptions?.offsetX ?? 0,
    offsetY: uvOptions?.offsetY ?? 0,
    rotation: uvOptions?.rotation ?? 0
  }), [uvOptions]);

  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <MaterialSwapper 
        material={material} 
        uvOptions={wallUV} 
        physicsOverrides={physicsOverrides}
        customTextures={customTextures}
        geometryType="plane"
      >
        <planeGeometry args={size} />
      </MaterialSwapper>
    </mesh>
  );
}

interface PillarProps {
  material: MaterialItem;
  position: [number, number, number];
  height?: number;
  radiusTop?: number;
  radiusBottom?: number;
  uvOptions?: any;
  physicsOverrides?: any;
  customTextures?: any;
}

function Pillar({ 
  material, 
  position, 
  height = 4, 
  radiusTop = 0.4, 
  radiusBottom = 0.45,
  uvOptions,
  physicsOverrides,
  customTextures
}: PillarProps) {
  const pillarUV = useMemo(() => ({
    repeatX: uvOptions?.repeatX ?? 2,
    repeatY: uvOptions?.repeatY ?? 2,
    offsetX: uvOptions?.offsetX ?? 0,
    offsetY: uvOptions?.offsetY ?? 0,
    rotation: uvOptions?.rotation ?? 0
  }), [uvOptions]);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <MaterialSwapper 
          material={material} 
          uvOptions={pillarUV} 
          physicsOverrides={physicsOverrides}
          customTextures={customTextures}
          geometryType="cylinder"
        >
          <cylinderGeometry args={[radiusTop, radiusBottom, height, 24, 1, false]} />
        </MaterialSwapper>
      </mesh>
      
      <mesh position={[0, height / 2 + 0.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radiusTop + 0.12, radiusTop + 0.08, 0.15, 24]} />
        <meshStandardMaterial color="#e8e4de" />
      </mesh>
      
      <mesh position={[0, -height / 2 - 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radiusBottom + 0.15, radiusBottom + 0.2, 0.1, 24]} />
        <meshStandardMaterial color="#d4cfc5" />
      </mesh>
    </group>
  );
}

function Furniture() {
  return (
    <group>
      <mesh position={[-4, 0.45, -2]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.9, 1.2]} />
        <meshStandardMaterial color="#8b6914" />
      </mesh>
      <mesh position={[-4, 1.0, -2]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 0.25, 1.1]} />
        <meshStandardMaterial color="#a0522d" />
      </mesh>
      <mesh position={[-4.5, 0.25, -1.4]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      <mesh position={[-3.5, 0.25, -1.4]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.5, 0.2]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      
      <mesh position={[3, 0.35, -4]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.7, 2]} />
        <meshStandardMaterial color="#d4c4b0" />
      </mesh>
      <mesh position={[3, 0.75, -4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 24]} />
        <meshStandardMaterial color="#c9b896" />
      </mesh>
      
      <group position={[0, 0, 2]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.8, 1.8]} />
          <meshStandardMaterial color="#f0ebe3" />
        </mesh>
        <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 24]} />
          <meshStandardMaterial color="#e0d8cc" />
        </mesh>
      </group>
    </group>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[8, 12, 8]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <pointLight position={[0, 3.5, -5]} intensity={1.0} color="#fff8e7" />
      <pointLight position={[-5, 3, -3]} intensity={0.5} color="#e6f0ff" />
      <pointLight position={[5, 3, 2]} intensity={0.4} color="#fff0e0" />
    </>
  );
}

interface SceneContentProps {
  materials: SceneMaterialConfig;
  uvOverrides?: Partial<Record<SceneObjectType, any>>;
  physicsOverrides?: Partial<Record<SceneObjectType, any>>;
  customTextures?: Partial<Record<SceneObjectType, any>>;
}

function SceneContent({ materials, uvOverrides = {}, physicsOverrides = {}, customTextures = {} }: SceneContentProps) {
  return (
    <>
      <Lighting />
      
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <Floor 
          material={materials.floor} 
          uvOptions={uvOverrides.floor} 
          physicsOverrides={physicsOverrides.floor}
          customTextures={customTextures.floor}
          size={24}
        />
      </group>
      
      <Wall 
        material={materials.backWall}
        position={[0, 2, -10]} 
        size={[20, 4]}
        uvOptions={uvOverrides.backWall}
        physicsOverrides={physicsOverrides.backWall}
        customTextures={customTextures.backWall}
      />
      
      <Wall 
        material={materials.sideWall}
        position={[-10, 2, 0]} 
        rotation={[0, Math.PI / 2, 0]} 
        size={[20, 4]}
        uvOptions={uvOverrides.sideWall}
        physicsOverrides={physicsOverrides.sideWall}
        customTextures={customTextures.sideWall}
      />
      
      <Pillar 
        material={materials.leftPillar}
        position={[-7, 2, -7]} 
        height={4}
        uvOptions={uvOverrides.leftPillar}
        physicsOverrides={physicsOverrides.leftPillar}
        customTextures={customTextures.leftPillar}
      />
      
      <Pillar 
        material={materials.rightPillar}
        position={[7, 2, -7]} 
        height={4}
        uvOptions={uvOverrides.rightPillar}
        physicsOverrides={physicsOverrides.rightPillar}
        customTextures={customTextures.rightPillar}
      />
      
      <Furniture />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={4}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={0.1}
        zoomSpeed={0.8}
        rotateSpeed={0.6}
        panSpeed={0.8}
        dampingFactor={0.05}
        enableDamping={true}
      />
    </>
  );
}

interface ThreeSceneProps {
  materials: SceneMaterialConfig;
  uvOverrides?: Partial<Record<SceneObjectType, any>>;
  physicsOverrides?: Partial<Record<SceneObjectType, any>>;
  customTextures?: Partial<Record<SceneObjectType, any>>;
}

export function ThreeScene({ materials, uvOverrides, physicsOverrides, customTextures }: ThreeSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [12, 8, 12], fov: 50 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#e8e8e8']} />
      <fog attach="fog" args={['#e8e8e8', 20, 50]} />
      <SceneContent 
        materials={materials} 
        uvOverrides={uvOverrides}
        physicsOverrides={physicsOverrides}
        customTextures={customTextures}
      />
    </Canvas>
  );
}
