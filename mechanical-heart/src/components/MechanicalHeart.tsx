import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import HeartChamber from './HeartChamber';
import { hydraulicSystem, type HydraulicState, type BloodVessel } from '@/systems/Hydraulics';

interface BloodVesselTubeProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  radius?: number;
}

function BloodVesselTube({ start, end, color, radius = 0.2 }: BloodVesselTubeProps) {
  const curve = new THREE.LineCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  );

  return (
    <mesh>
      <tubeGeometry args={[curve, 20, radius, 8, false]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface CurvedVesselProps {
  points: [number, number, number][];
  color: string;
  radius?: number;
}

function CurvedVessel({ points, color, radius = 0.2 }: CurvedVesselProps) {
  const vectorPoints = points.map(p => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(vectorPoints);

  return (
    <mesh>
      <tubeGeometry args={[curve, 30, radius, 8, false]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface BloodParticleProps {
  position: [number, number, number];
}

function BloodParticle({ position }: BloodParticleProps) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.12, 12, 12]} />
      <meshStandardMaterial
        color="#CC0000"
        emissive="#FF0000"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

interface AtriumProps {
  position: [number, number, number];
  side: 'left' | 'right';
}

function Atrium({ position, side }: AtriumProps) {
  const color = side === 'left' ? '#8B0000' : '#5C0000';
  
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.7, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <torusGeometry args={[0.7, 0.06, 8, 32, Math.PI]} />
        <meshStandardMaterial
          color="#5a5a5a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function HydraulicBase() {
  return (
    <group position={[0, -4.5, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[4, 4.5, 0.4, 32]} />
        <meshStandardMaterial
          color="#4a90d9"
          metalness={0.7}
          roughness={0.3}
          emissive="#4a90d9"
          emissiveIntensity={0.1}
        />
      </mesh>

      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.8, 3.8, 0.1, 32]} />
        <meshStandardMaterial
          color="#6ab0f3"
          metalness={0.8}
          roughness={0.2}
          emissive="#6ab0f3"
          emissiveIntensity={0.15}
        />
      </mesh>

      <group position={[0, 0, 0]}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI) / 4) * 3.8,
              0.2,
              Math.sin((i * Math.PI) / 4) * 3.8
            ]}
          >
            <cylinderGeometry args={[0.12, 0.12, 0.6, 8]} />
            <meshStandardMaterial
              color="#88c8ff"
              metalness={0.8}
              roughness={0.2}
              emissive="#88c8ff"
              emissiveIntensity={0.2}
            />
          </mesh>
        ))}
      </group>

      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.25, 32]} />
        <meshStandardMaterial
          color="#3a7bc8"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[1.2, 0.08, 8, 32]} />
        <meshStandardMaterial
          color="#5aa0e0"
          metalness={0.8}
          roughness={0.2}
          emissive="#5aa0e0"
          emissiveIntensity={0.1}
        />
      </mesh>

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 3) * 1.2,
            0.4,
            Math.sin((i * Math.PI) / 3) * 1.2
          ]}
        >
          <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
          <meshStandardMaterial
            color="#2a5a9a"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function HydraulicRods({ leftPistonPos, rightPistonPos }: { leftPistonPos: number; rightPistonPos: number }) {
  const leftRodHeight = 1.2 + leftPistonPos * 0.5;
  const rightRodHeight = 1.2 + rightPistonPos * 0.5;

  return (
    <group>
      <group position={[-2, -2.5, 0]}>
        <mesh position={[0, leftRodHeight / 2, 0]}>
          <cylinderGeometry args={[0.15, 0.15, leftRodHeight, 12]} />
          <meshStandardMaterial
            color="#4a90d9"
            metalness={0.8}
            roughness={0.2}
            emissive="#4a90d9"
            emissiveIntensity={0.1}
          />
        </mesh>
        <mesh position={[0, leftRodHeight, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#6ab0f3"
            metalness={0.9}
            roughness={0.1}
            emissive="#6ab0f3"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      <group position={[2, -2.5, 0]}>
        <mesh position={[0, rightRodHeight / 2, 0]}>
          <cylinderGeometry args={[0.15, 0.15, rightRodHeight, 12]} />
          <meshStandardMaterial
            color="#4a90d9"
            metalness={0.8}
            roughness={0.2}
            emissive="#4a90d9"
            emissiveIntensity={0.1}
          />
        </mesh>
        <mesh position={[0, rightRodHeight, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#6ab0f3"
            metalness={0.9}
            roughness={0.1}
            emissive="#6ab0f3"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      <CurvedVessel
        points={[[-2, -2, 0], [-1.5, -3, 0], [0, -3.5, 0], [1.5, -3, 0], [2, -2, 0]]}
        color="#3a7bc8"
        radius={0.1}
      />
    </group>
  );
}

interface HeartSceneProps {
  state: HydraulicState;
}

function HeartScene({ state }: HeartSceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  const getParticlePosition = (particle: { vessel: BloodVessel; position: number }): [number, number, number] => {
    const t = particle.position;
    
    switch (particle.vessel) {
      case 'leftAtrium':
        return [-2.3 + t * 0.3, 1.8 - t * 0.3, 0];
      case 'rightAtrium':
        return [2.3 - t * 0.3, 1.8 - t * 0.3, 0];
      case 'leftVentricle':
        return [-2, 1.5 - t * 2.5, 0];
      case 'rightVentricle':
        return [2, 1.5 - t * 2.5, 0];
      case 'aorta':
        return [-2 - t * 0.8, -1 + t * 0.2, 0];
      case 'pulmonary':
        return [2 + t * 0.8, -1 + t * 0.2, 0];
      case 'systemic':
        return [-2.8 + t * 5.6, -3, 0];
      default:
        return [0, 0, 0];
    }
  };

  return (
    <group ref={groupRef}>
      <Atrium position={[-2.3, 1.8, 0]} side="left" />
      <Atrium position={[2.3, 1.8, 0]} side="right" />

      <BloodVesselTube
        start={[-2.3, 1.5, 0]}
        end={[-2, 1.2, 0]}
        color="#8B0000"
        radius={0.22}
      />
      <BloodVesselTube
        start={[2.3, 1.5, 0]}
        end={[2, 1.2, 0]}
        color="#5C0000"
        radius={0.22}
      />

      <HeartChamber
        position={[-2, 0, 0]}
        pistonPosition={state.leftVentricle.pistonPosition}
        pressure={state.leftVentricle.pressure}
        valveOpen={state.leftVentricle.valveOpen}
        phase={state.leftVentricle.phase}
        side="left"
      />

      <HeartChamber
        position={[2, 0, 0]}
        pistonPosition={state.rightVentricle.pistonPosition}
        pressure={state.rightVentricle.pressure}
        valveOpen={state.rightVentricle.valveOpen}
        phase={state.rightVentricle.phase}
        side="right"
      />

      <BloodVesselTube
        start={[-2, -1.2, 0]}
        end={[-2.8, -1.2, 0]}
        color="#CC0000"
        radius={0.25}
      />
      <BloodVesselTube
        start={[-2.8, -1.2, 0]}
        end={[-2.8, -3, 0]}
        color="#CC0000"
        radius={0.25}
      />

      <BloodVesselTube
        start={[2, -1.2, 0]}
        end={[2.8, -1.2, 0]}
        color="#660000"
        radius={0.22}
      />
      <BloodVesselTube
        start={[2.8, -1.2, 0]}
        end={[2.8, -3, 0]}
        color="#660000"
        radius={0.22}
      />

      <BloodVesselTube
        start={[-2.8, -3, 0]}
        end={[2.8, -3, 0]}
        color="#880000"
        radius={0.18}
      />

      <HydraulicRods
        leftPistonPos={state.leftVentricle.pistonPosition}
        rightPistonPos={state.rightVentricle.pistonPosition}
      />

      {state.bloodParticles.map((particle) => (
        <BloodParticle
          key={particle.id}
          position={getParticlePosition(particle)}
        />
      ))}

      <HydraulicBase />
    </group>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1.3} castShadow />
      <pointLight position={[-10, 5, 5]} intensity={0.7} color="#ff8888" />
      <directionalLight position={[0, 10, 5]} intensity={1.1} />
      <pointLight position={[0, -5, 0]} intensity={0.5} color="#6699ff" />
    </>
  );
}

interface MechanicalHeartProps {
  isBeating: boolean;
  heartRate?: number;
}

export default function MechanicalHeart({ isBeating, heartRate = 75 }: MechanicalHeartProps) {
  const [hydraulicState, setHydraulicState] = useState<HydraulicState>(
    hydraulicSystem.getState()
  );

  useEffect(() => {
    const unsubscribe = hydraulicSystem.subscribe(setHydraulicState);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isBeating) {
      hydraulicSystem.startBeating(heartRate);
    } else {
      hydraulicSystem.stopBeating();
    }
  }, [isBeating]);

  useEffect(() => {
    if (isBeating) {
      hydraulicSystem.updateHeartRate(heartRate);
    }
  }, [heartRate, isBeating]);

  useEffect(() => {
    return () => {
      hydraulicSystem.cleanup();
    };
  }, []);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 11], fov: 50 }}
        shadows
      >
        <color attach="background" args={['#FAFAFA']} />
        <fog attach="fog" args={['#FAFAFA', 15, 30]} />
        <SceneLighting />
        <HeartScene state={hydraulicState} />
      </Canvas>
    </div>
  );
}
