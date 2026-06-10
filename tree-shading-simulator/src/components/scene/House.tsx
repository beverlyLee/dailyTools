import { useMemo } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { WindowData } from '../../types';

function WindowPane({
  data,
  coverage,
  isBlocked,
}: {
  data: WindowData;
  coverage: number;
  isBlocked: boolean;
}) {
  const [w, h] = data.size;
  const frameColor = '#5a3e28';
  const glassColor = isBlocked ? '#1a3a4a' : '#87ceeb';

  return (
    <group position={data.position}>
      <mesh>
        <boxGeometry args={[w + 0.2, h + 0.2, 0.1]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.75}
          roughness={0.1}
          metalness={0.2}
          emissive={isBlocked ? '#001122' : '#000000'}
          emissiveIntensity={isBlocked ? 0.3 : 0}
        />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[w * 0.04, h]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[w, h * 0.04]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      {isBlocked && (
        <mesh position={[0, h / 2 + 0.3, 0.5]}>
          <planeGeometry args={[2.5, 0.5]} />
          <meshBasicMaterial color="#cc3333" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

export function House() {
  const season = useSimulationStore((s) => s.season);
  const windows = useSimulationStore((s) => s.windows);
  const assessment = useSimulationStore((s) => s.assessment);
  const wallColor = season === 'summer' ? '#f5e6d0' : '#e8dcc5';
  const roofColor = '#8b3a3a';

  const windowMap = useMemo(() => {
    const map = new Map<string, WindowData>();
    windows.forEach((w) => map.set(w.id, w));
    return map;
  }, [windows]);

  return (
    <group>
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 7, 8]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>

      <mesh position={[0, 7.8, 0]} rotation={[0, 0, 0]} castShadow receiveShadow>
        <coneGeometry args={[9, 3, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 7.8, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[9, 3, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.9} />
      </mesh>

      <mesh position={[0, 1.25, 4.01]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 2.5, 0.15]} />
        <meshStandardMaterial color="#4a2c1a" roughness={0.7} />
      </mesh>

      {assessment.windows.map((wa) => {
        const data = windowMap.get(wa.id);
        if (!data) return null;
        return (
          <WindowPane
            key={wa.id}
            data={data}
            coverage={wa.shadowCoverage}
            isBlocked={wa.isPermanentlyBlocked || wa.shadowCoverage > 0.8}
          />
        );
      })}

      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[13, 0.5, 9]} />
        <meshStandardMaterial color="#6b5a48" roughness={0.9} />
      </mesh>
    </group>
  );
}
