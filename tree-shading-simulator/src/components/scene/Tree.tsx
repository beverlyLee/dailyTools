import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';
import { calculateCanopySize } from '../../utils/growth';

export function Tree() {
  const canopyGroupRef = useRef<THREE.Group>(null);
  const leavesRefs = useRef<THREE.Mesh[]>([]);
  const tree = useSimulationStore((s) => s.tree);
  const season = useSimulationStore((s) => s.season);

  const canopy = useMemo(
    () => calculateCanopySize(tree.species, tree.years),
    [tree.species, tree.years]
  );

  const isWinterDeciduous = season === 'winter' && tree.species === 'deciduous';

  const trunkColor = '#5a3e2b';
  const summerLeafColor = tree.species === 'deciduous' ? '#2d6a4f' : '#1b4332';
  const winterLeafColor = tree.species === 'deciduous' ? '#8b7355' : '#2d4a3e';
  const leafColor = isWinterDeciduous ? winterLeafColor : summerLeafColor;

  useFrame((_, delta) => {
    if (!canopyGroupRef.current) return;
    const targetOpacity = isWinterDeciduous ? 0.05 : 1;
    const targetScale = isWinterDeciduous ? 0.1 : 1;
    leavesRefs.current.forEach((mesh) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 1, targetOpacity, delta * 3);
      mat.transparent = mat.opacity < 1;
      mat.visible = mat.opacity > 0.05;
      mesh.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 3
      );
    });
    const sway = Math.sin(performance.now() * 0.001) * 0.01;
    canopyGroupRef.current.rotation.z = sway;
  });

  const leavesConfig = useMemo(() => {
    if (tree.species === 'deciduous') {
      return [
        { pos: [0, canopy.trunkHeight + canopy.height * 0.5, 0] as [number, number, number], scale: canopy.radius },
        { pos: [-canopy.radius * 0.5, canopy.trunkHeight + canopy.height * 0.3, 0] as [number, number, number], scale: canopy.radius * 0.7 },
        { pos: [canopy.radius * 0.5, canopy.trunkHeight + canopy.height * 0.3, 0] as [number, number, number], scale: canopy.radius * 0.7 },
        { pos: [0, canopy.trunkHeight + canopy.height * 0.75, canopy.radius * 0.4] as [number, number, number], scale: canopy.radius * 0.65 },
        { pos: [0, canopy.trunkHeight + canopy.height * 0.75, -canopy.radius * 0.4] as [number, number, number], scale: canopy.radius * 0.65 },
      ];
    } else {
      return [
        { pos: [0, canopy.trunkHeight + canopy.height * 0.3, 0] as [number, number, number], scale: canopy.radius * 1.1 },
        { pos: [0, canopy.trunkHeight + canopy.height * 0.55, 0] as [number, number, number], scale: canopy.radius * 0.9 },
        { pos: [0, canopy.trunkHeight + canopy.height * 0.8, 0] as [number, number, number], scale: canopy.radius * 0.65 },
      ];
    }
  }, [tree.species, canopy]);

  return (
    <group position={tree.position}>
      <mesh
        position={[0, canopy.trunkHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[0.25 + canopy.radius * 0.05, 0.4 + canopy.radius * 0.08, canopy.trunkHeight, 12]}
        />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>

      <group ref={canopyGroupRef}>
        {leavesConfig.map((cfg, idx) => (
          <mesh
            key={idx}
            ref={(el) => {
              if (el) leavesRefs.current[idx] = el;
            }}
            position={cfg.pos}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[cfg.scale, 16, 16]} />
            <meshStandardMaterial
              color={leafColor}
              roughness={0.85}
              transparent
              opacity={isWinterDeciduous ? 0.05 : 1}
            />
          </mesh>
        ))}
      </group>

      {isWinterDeciduous && tree.species === 'deciduous' && (
        <group>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const len = canopy.radius * 0.7;
            const height = canopy.trunkHeight + canopy.height * 0.5;
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * len * 0.3,
                  height + Math.sin(i) * 0.5,
                  Math.sin(angle) * len * 0.3,
                ]}
                rotation={[0, angle, -Math.PI / 6]}
                castShadow
              >
                <cylinderGeometry args={[0.04, 0.06, len, 6]} />
                <meshStandardMaterial color="#6b4423" roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}
