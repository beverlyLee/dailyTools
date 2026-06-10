import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';
import { calculateCanopySize } from '../../utils/growth';
import { calculateSolarAltitude, degToRad } from '../../utils/solar';

export function Ground() {
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  const season = useSimulationStore((s) => s.season);
  const tree = useSimulationStore((s) => s.tree);
  const latitude = useSimulationStore((s) => s.latitude);

  useFrame(() => {
    if (!shadowMeshRef.current) return;
    const canopy = calculateCanopySize(tree.species, tree.years);
    const isWinterDeciduous = season === 'winter' && tree.species === 'deciduous';
    if (isWinterDeciduous) {
      shadowMeshRef.current.visible = false;
      return;
    }
    shadowMeshRef.current.visible = true;
    const altitude = calculateSolarAltitude(latitude, season);
    const altitudeRad = degToRad(altitude);
    const canopyCenterY = canopy.trunkHeight + canopy.height * 0.5;
    const shadowScale =
      altitudeRad > 0.01 ? canopyCenterY / Math.tan(altitudeRad) * 0.35 : 10;
    const totalRadius = canopy.radius + shadowScale;
    shadowMeshRef.current.scale.set(totalRadius, 1, totalRadius * 0.6);
    shadowMeshRef.current.position.x = tree.position[0] - shadowScale * 0.5;
    shadowMeshRef.current.position.z = tree.position[2];
    const opacity = Math.max(0.1, 0.5 - altitude / 180);
    const mat = shadowMeshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = isWinterDeciduous ? 0 : opacity;
  });

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color={season === 'summer' ? '#4a7c3a' : '#6b7a5a'}
          roughness={0.9}
        />
      </mesh>

      <mesh
        ref={shadowMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color="#1a1a1a"
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 8]}
        receiveShadow
      >
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#8b6f47" roughness={0.8} />
      </mesh>
    </group>
  );
}
