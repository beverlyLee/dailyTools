import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';
import { calculateCanopySize } from '../../utils/growth';
import {
  calculateSolarAltitude,
  degToRad,
  DEFAULT_SOLAR_AZIMUTH,
} from '../../utils/solar';
import { calculateShadowProjection } from '../../utils/shadow';

export function Ground() {
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  const shadowMesh2Ref = useRef<THREE.Mesh>(null);
  const season = useSimulationStore((s) => s.season);
  const tree = useSimulationStore((s) => s.tree);
  const latitude = useSimulationStore((s) => s.latitude);
  const solarAzimuth = useSimulationStore(
    (s) => s.solarAzimuth || DEFAULT_SOLAR_AZIMUTH
  );

  const groundColor = useMemo(
    () => (season === 'summer' ? '#4a7c3a' : '#6b7a5a'),
    [season]
  );

  useFrame(() => {
    const canopy = calculateCanopySize(tree.species, tree.years);
    const isWinterDeciduous = season === 'winter' && tree.species === 'deciduous';
    const effectiveCanopy = isWinterDeciduous
      ? { ...canopy, radius: 0.2, height: 0.2 }
      : canopy;

    const altitude = calculateSolarAltitude(latitude, season);

    const proj = calculateShadowProjection(
      tree.position,
      effectiveCanopy,
      altitude,
      solarAzimuth,
      0
    );

    if (shadowMeshRef.current) {
      const azimuthRad = degToRad(proj.azimuthDeg);
      shadowMeshRef.current.visible = !isWinterDeciduous;
      shadowMeshRef.current.position.x = proj.centerX;
      shadowMeshRef.current.position.z = proj.centerZ;
      shadowMeshRef.current.rotation.z = -azimuthRad;

      const sx = Math.max(0.5, proj.radiusX);
      const sz = Math.max(0.5, proj.radiusZ);
      shadowMeshRef.current.scale.set(sx, sz, 1);

      const opacity = isWinterDeciduous
        ? 0
        : Math.max(0.18, 0.52 - altitude / 180);
      const mat = shadowMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    }

    if (shadowMesh2Ref.current) {
      const azimuthRad = degToRad(proj.azimuthDeg);
      shadowMesh2Ref.current.visible = !isWinterDeciduous;
      shadowMesh2Ref.current.position.x = proj.centerX;
      shadowMesh2Ref.current.position.z = proj.centerZ;
      shadowMesh2Ref.current.rotation.z = -azimuthRad;

      const sx = Math.max(0.5, proj.radiusX * 0.82);
      const sz = Math.max(0.5, proj.radiusZ * 0.82);
      shadowMesh2Ref.current.scale.set(sx, sz, 1);

      const opacity = isWinterDeciduous
        ? 0
        : Math.max(0.1, 0.35 - altitude / 220);
      const mat = shadowMesh2Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    }
  });

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={0.92}
          metalness={0}
        />
      </mesh>

      <mesh
        ref={shadowMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
      >
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial
          color="#0a0a0a"
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={shadowMesh2Ref}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
      >
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.008, 10]}
        receiveShadow
      >
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial
          color={season === 'summer' ? '#8a6d47' : '#7a6040'}
          roughness={0.85}
        />
      </mesh>
    </group>
  );
}
