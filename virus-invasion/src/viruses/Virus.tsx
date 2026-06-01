import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VirusProps {
  position: THREE.Vector3;
  scale?: number;
  rotationSpeed?: number;
  opacity?: number;
  onClick?: () => void;
}

const Virus = ({
  position,
  scale = 1,
  rotationSpeed = 0.5,
  opacity = 1,
  onClick,
}: VirusProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const { bodyGeometry, spikeGeometry, spikePositions } = useMemo(() => {
    const bodyRadius = 0.55;
    const bodyGeo = new THREE.IcosahedronGeometry(bodyRadius, 1);
    
    const positions = bodyGeo.attributes.position.array as Float32Array;
    const vertexCount = positions.length / 3;
    const uniqueVertices: THREE.Vector3[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const x = positions[idx];
      const y = positions[idx + 1];
      const z = positions[idx + 2];
      const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueVertices.push(new THREE.Vector3(x, y, z).normalize());
      }
    }

    const spikeGeo = new THREE.ConeGeometry(0.09, 0.35, 6);
    spikeGeo.translate(0, 0.175, 0);

    return {
      bodyGeometry: bodyGeo,
      spikeGeometry: spikeGeo,
      spikePositions: uniqueVertices,
    };
  }, []);

  useEffect(() => {
    return () => {
      bodyGeometry.dispose();
      spikeGeometry.dispose();
    };
  }, [bodyGeometry, spikeGeometry]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += delta * rotationSpeed * 0.5;
      groupRef.current.rotation.y += delta * rotationSpeed;
    }
    if (materialRef.current) {
      materialRef.current.opacity = opacity;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale} onClick={onClick}>
      <mesh geometry={bodyGeometry}>
        <meshStandardMaterial
          ref={materialRef}
          color="#fb923c"
          roughness={0.35}
          metalness={0.25}
          emissive="#f97316"
          emissiveIntensity={0.5}
          transparent
          opacity={opacity}
        />
      </mesh>
      {spikePositions.map((dir, index) => {
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir
        );
        return (
          <mesh
            key={index}
            geometry={spikeGeometry}
            position={dir.clone().multiplyScalar(0.58)}
            quaternion={quaternion}
          >
            <meshStandardMaterial
              color="#ef4444"
              roughness={0.25}
              metalness={0.35}
              emissive="#dc2626"
              emissiveIntensity={0.4}
              transparent
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default Virus;
