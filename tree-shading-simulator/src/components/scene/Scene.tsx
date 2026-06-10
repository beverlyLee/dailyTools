import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, BakeShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useSimulationStore } from '../../store/useSimulationStore';
import { SunLight } from './SunLight';
import { Ground } from './Ground';
import { House } from './House';
import { Tree } from './Tree';
import { getSkyColor } from '../../utils/solar';

export function Scene() {
  const season = useSimulationStore((s) => s.season);
  const skyColor = getSkyColor(season);

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [18, 12, 18], fov: 45 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={[skyColor, 40, 80]} />

        <Sky
          distance={450000}
          sunPosition={
            season === 'summer' ? [100, 80, 100] : [100, 30, 100]
          }
          inclination={season === 'summer' ? 0.55 : 0.25}
          azimuth={0.25}
        />

        <SunLight />

        <Ground />
        <House />
        <Tree />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 3, 0]}
        />

        <BakeShadows />

        <EffectComposer>
          <Bloom
            intensity={0.3}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
