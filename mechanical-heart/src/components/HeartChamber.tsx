import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ChamberPhase } from '@/systems/Hydraulics';

interface HeartChamberProps {
  position: [number, number, number];
  pistonPosition: number;
  pressure: number;
  valveOpen: boolean;
  phase: ChamberPhase;
  side: 'left' | 'right';
  rotation?: [number, number, number];
}

export default function HeartChamber({
  position,
  pistonPosition,
  pressure,
  valveOpen,
  phase,
  side,
  rotation = [0, 0, 0]
}: HeartChamberProps) {
  const pistonRef = useRef<THREE.Mesh>(null);
  const chamberRef = useRef<THREE.Group>(null);
  const valveRef = useRef<THREE.Mesh>(null);

  const chamberColor = side === 'left' ? '#8B0000' : '#4A0000';
  const pistonColor = side === 'left' ? '#B22222' : '#660000';
  const valveColor = valveOpen ? '#00FF00' : '#FF4444';

  const maxPistonTravel = 1.5;
  const pistonY = pistonPosition * maxPistonTravel - maxPistonTravel / 2;

  const pressureIntensity = Math.min(pressure / 120, 1);
  const glowIntensity = 0.1 + pressureIntensity * 0.4;

  useFrame(() => {
    if (pistonRef.current) {
      pistonRef.current.position.y = pistonY;
    }
    if (valveRef.current) {
      valveRef.current.rotation.x = valveOpen ? -Math.PI / 3 : 0;
      const material = valveRef.current.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(valveOpen ? 0x00ff00 : 0xff4444);
      material.emissiveIntensity = valveOpen ? 0.5 : 0.2;
    }
  });

  return (
    <group ref={chamberRef} position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 3, 32, 1, true]} />
        <meshStandardMaterial
          color={chamberColor}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          emissive={chamberColor}
          emissiveIntensity={glowIntensity * 0.3}
        />
      </mesh>

      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.1, 32]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.1, 32]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={valveRef} position={[0, 1.55, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshStandardMaterial
          color={valveColor}
          emissive={valveColor}
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      <mesh ref={pistonRef} position={[0, pistonY, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.3, 32]} />
        <meshStandardMaterial
          color={pistonColor}
          metalness={0.6}
          roughness={0.4}
          emissive={pistonColor}
          emissiveIntensity={glowIntensity * 0.5}
        />
      </mesh>

      <mesh position={[0, pistonY + 0.8, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1.6, 16]} />
        <meshStandardMaterial
          color="#4a4a4a"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[0, pistonY + 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.08, 8, 32]} />
        <meshStandardMaterial
          color="#333333"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      <group position={[0, -1.5, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI) / 3) * 0.5,
              0,
              Math.sin((i * Math.PI) / 3) * 0.5
            ]}
          >
            <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
            <meshStandardMaterial
              color="#666666"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>

      <mesh position={[1.5, 0, 0]}>
        <torusGeometry args={[0.3, 0.05, 8, 32]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[1.5, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial
          color="#333333"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {phase !== 'resting' && (
        <group position={[0, 0, 1.3]}>
          <mesh>
            <planeGeometry args={[1.5, 0.4]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
