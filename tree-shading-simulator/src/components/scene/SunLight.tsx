import { useMemo } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { calculateSolarPosition, getSunColor, getSunLightIntensity } from '../../utils/solar';

export function SunLight() {
  const season = useSimulationStore((s) => s.season);
  const latitude = useSimulationStore((s) => s.latitude);

  const { direction, altitude } = useMemo(
    () => calculateSolarPosition(latitude, season),
    [latitude, season]
  );

  const lightColor = getSunColor(season);
  const intensity = getSunLightIntensity(season);

  const lightPosition: [number, number, number] = [
    direction[0] * 30,
    Math.max(direction[1] * 30, 10),
    direction[2] * 30,
  ];

  return (
    <>
      <directionalLight
        position={lightPosition}
        intensity={intensity}
        color={lightColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-bias={-0.0005}
      />
      <ambientLight intensity={season === 'summer' ? 0.4 : 0.3} color="#e8efff" />
      <hemisphereLight
        args={[season === 'summer' ? '#87ceeb' : '#b0c4de', '#8b7355', 0.5]}
      />
      <mesh position={lightPosition}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#ffd700" />
      </mesh>
    </>
  );
}
