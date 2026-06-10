import { useMemo } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import {
  calculateSolarPosition,
  getSunColor,
  getSunLightIntensity,
} from '../../utils/solar';

export function SunLight() {
  const season = useSimulationStore((s) => s.season);
  const latitude = useSimulationStore((s) => s.latitude);
  const solarAzimuth = useSimulationStore((s) => s.solarAzimuth);

  const { lightPosition, altitude, direction } = useMemo(
    () => calculateSolarPosition(latitude, season, solarAzimuth),
    [latitude, season, solarAzimuth]
  );

  const lightColor = getSunColor(season);
  const intensity = getSunLightIntensity(season);

  const targetX = -direction[0] * 5;
  const targetY = Math.max(0, direction[1] * 0.5 + 2);
  const targetZ = -direction[2] * 5;

  return (
    <>
      <directionalLight
        position={lightPosition}
        intensity={intensity}
        color={lightColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
        target-position={[targetX, targetY, targetZ]}
      />

      <ambientLight
        intensity={season === 'summer' ? 0.45 : 0.35}
        color={season === 'summer' ? '#e8f0ff' : '#dce4f0'}
      />
      <hemisphereLight
        args={[
          season === 'summer' ? '#9fd8ff' : '#a8b8d0',
          '#8b7355',
          season === 'summer' ? 0.55 : 0.4,
        ]}
      />

      <mesh position={lightPosition}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#ffcc33" />
      </mesh>
      <pointLight
        position={lightPosition}
        intensity={0.6}
        color="#fff0c0"
        distance={80}
      />
    </>
  );
}
