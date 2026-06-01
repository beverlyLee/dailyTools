import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HEX_SIZE } from '../math/HexGrid';

interface HexCellProps {
  position: [number, number, number];
  color?: string;
  height?: number;
  delay?: number;
  animate?: boolean;
}

const CELL_SCALE = 0.92;

export function HexCell({
  position,
  color = '#FFD700',
  height = 0.4,
  delay = 0,
  animate = true,
}: HexCellProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const cellRadius = HEX_SIZE * CELL_SCALE;
    const hexGeom = new THREE.CylinderGeometry(
      cellRadius,
      cellRadius,
      height,
      6,
      1,
      false
    );
    hexGeom.rotateY(Math.PI / 6);
    hexGeom.translate(0, height / 2, 0);
    return hexGeom;
  }, [height]);

  useFrame(({ clock }) => {
    if (!animate || !meshRef.current || !groupRef.current) return;

    const elapsed = clock.getElapsedTime() - delay;
    if (elapsed < 0) {
      groupRef.current.scale.set(0, 0, 0);
      return;
    }

    const progress = Math.min(elapsed * 3, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    groupRef.current.scale.setScalar(easeProgress);

    const floatOffset = Math.sin(elapsed * 2 + delay) * 0.02;
    meshRef.current.position.y = floatOffset;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef} castShadow receiveShadow geometry={geometry}>
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

export default HexCell;
