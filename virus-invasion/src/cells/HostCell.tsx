import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DeformationPoint, calculateVertexDisplacement, mergeDeformationPoints, clamp } from '../utils/math';

interface HostCellProps {
  radius?: number;
  deformationPoints: DeformationPoint[];
}

const HOST_CELL_RADIUS = 3.5;
const CELL_TEXTURE_AMPLITUDE = 0.08;

const HostCell = ({ radius = HOST_CELL_RADIUS, deformationPoints }: HostCellProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.SphereGeometry | null>(null);
  const originalPositions = useRef<Float32Array | null>(null);
  const textureOffsets = useRef<Float32Array | null>(null);
  const basePositions = useRef<Float32Array | null>(null);
  const mergedPointsRef = useRef<DeformationPoint[]>([]);
  const lastMergeTimeRef = useRef(0);
  const MERGE_INTERVAL = 50;

  const { geometry } = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 96, 96);
    const positions = geo.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;

    originalPositions.current = new Float32Array(positions);
    textureOffsets.current = new Float32Array(vertexCount);
    basePositions.current = new Float32Array(positions.length);

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const x = positions[idx];
      const y = positions[idx + 1];
      const z = positions[idx + 2];
      
      const angle1 = Math.atan2(y, x) * 4;
      const angle2 = Math.acos(z / radius) * 3;
      textureOffsets.current[i] = (Math.sin(angle1) * Math.cos(angle2) * 0.5 + 0.5) * CELL_TEXTURE_AMPLITUDE;
      
      const normal = new THREE.Vector3(x, y, z).normalize();
      const offset = textureOffsets.current[i];
      basePositions.current[idx] = x + normal.x * offset;
      basePositions.current[idx + 1] = y + normal.y * offset;
      basePositions.current[idx + 2] = z + normal.z * offset;
      
      positions[idx] = basePositions.current[idx];
      positions[idx + 1] = basePositions.current[idx + 1];
      positions[idx + 2] = basePositions.current[idx + 2];
    }

    return { geometry: geo };
  }, [radius]);

  useEffect(() => {
    geometryRef.current = geometry;
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(() => {
    if (!meshRef.current || !geometryRef.current || !basePositions.current) return;

    const now = performance.now();
    
    if (now - lastMergeTimeRef.current > MERGE_INTERVAL) {
      const validPoints = deformationPoints.filter(p => 
        p.position && !isNaN(p.position.x) && !isNaN(p.position.y) && !isNaN(p.position.z) &&
        p.radius > 0 && p.depth >= 0 && p.strength > 0.001
      );
      mergedPointsRef.current = mergeDeformationPoints(validPoints, 0.75);
      lastMergeTimeRef.current = now;
    }

    if (mergedPointsRef.current.length === 0) return;

    const positions = geometryRef.current.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const baseX = basePositions.current[idx];
      const baseY = basePositions.current[idx + 1];
      const baseZ = basePositions.current[idx + 2];

      if (isNaN(baseX) || isNaN(baseY) || isNaN(baseZ)) {
        continue;
      }

      const baseVertex = new THREE.Vector3(baseX, baseY, baseZ);

      const finalVertex = calculateVertexDisplacement(
        baseVertex,
        baseVertex,
        mergedPointsRef.current,
        radius
      );

      if (!isNaN(finalVertex.x) && !isNaN(finalVertex.y) && !isNaN(finalVertex.z)) {
        const vertexRadius = finalVertex.length();
        const minRadius = radius * 0.4;
        const maxRadius = radius * 1.05;
        
        if (vertexRadius < minRadius) {
          finalVertex.normalize().multiplyScalar(minRadius);
        } else if (vertexRadius > maxRadius) {
          finalVertex.normalize().multiplyScalar(maxRadius);
        }

        positions[idx] = finalVertex.x;
        positions[idx + 1] = finalVertex.y;
        positions[idx + 2] = finalVertex.z;
      }
    }

    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color="#c4b5fd"
        transparent
        opacity={0.5}
        roughness={0.3}
        metalness={0.0}
        emissive="#a855f7"
        emissiveIntensity={0.06}
        side={THREE.DoubleSide}
        depthWrite={false}
        transmission={0.3}
        thickness={0.5}
      />
    </mesh>
  );
};

export default HostCell;
