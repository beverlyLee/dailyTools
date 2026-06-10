import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { WindowData } from '../../types';
import { calculateCanopySize } from '../../utils/growth';
import {
  calculateSolarAltitude,
  DEFAULT_SOLAR_AZIMUTH,
} from '../../utils/solar';
import { calculateShadowProjection, pointInShadowEllipse } from '../../utils/shadow';

function WindowPane({
  data,
  coverage,
  isBlocked,
  isPermanentBlock,
}: {
  data: WindowData;
  coverage: number;
  isBlocked: boolean;
  isPermanentBlock: boolean;
}) {
  const [w, h] = data.size;
  const frameColor = '#5a3e28';
  const normalGlass = '#a8e0f5';
  const shadowedGlass = '#3a5868';
  const shadowLevel = Math.min(1, coverage * 1.1);
  const glassColor = isBlocked ? shadowedGlass : normalGlass;
  const glassEmissive = isBlocked ? '#0a1620' : '#102838';

  return (
    <group position={data.position}>
      <mesh>
        <boxGeometry args={[w + 0.22, h + 0.22, 0.14]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.72 - shadowLevel * 0.15}
          roughness={0.08}
          metalness={0.25}
          emissive={glassEmissive}
          emissiveIntensity={shadowLevel * 0.5}
        />
      </mesh>
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[w * 0.05, h]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[w, h * 0.05]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      {isPermanentBlock && (
        <group position={[0, h / 2 + 0.35, 0.8]}>
          <mesh>
            <planeGeometry args={[2.6, 0.52]} />
            <meshBasicMaterial color="#cc2222" transparent opacity={0.92} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function FacadeShadowOverlay() {
  const overlayRef = useRef<THREE.Mesh>(null);
  const season = useSimulationStore((s) => s.season);
  const tree = useSimulationStore((s) => s.tree);
  const latitude = useSimulationStore((s) => s.latitude);
  const solarAzimuth = useSimulationStore(
    (s) => s.solarAzimuth || DEFAULT_SOLAR_AZIMUTH
  );

  useFrame(() => {
    if (!overlayRef.current) return;
    const canopy = calculateCanopySize(tree.species, tree.years);
    const isWinterDeciduous = season === 'winter' && tree.species === 'deciduous';
    const effectiveCanopy = isWinterDeciduous
      ? { ...canopy, radius: 0.2, height: 0.2 }
      : canopy;
    const altitude = calculateSolarAltitude(latitude, season);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 192);

    if (!isWinterDeciduous) {
      const houseFacadeZ = 4.01;
      const samplesX = 32;
      const samplesY = 24;

      for (let i = 0; i < samplesX; i++) {
        for (let j = 0; j < samplesY; j++) {
          const px = -6 + (i / samplesX) * 12 + (6 / samplesX);
          const py = 0 + (j / samplesY) * 7 + (3.5 / samplesY);
          const point: [number, number, number] = [px, py, houseFacadeZ];

          const inShadow = pointInShadowEllipse(
            point,
            tree.position,
            effectiveCanopy,
            altitude,
            solarAzimuth
          );

          if (inShadow) {
            const cx = ((i + 0.5) / samplesX) * 256;
            const cy = 192 - ((j + 0.5) / samplesY) * 192;
            const cellW = 256 / samplesX + 1;
            const cellH = 192 / samplesY + 1;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cellW, cellH));
            grad.addColorStop(0, 'rgba(0,0,0,0.55)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(cx - cellW, cy - cellH, cellW * 2, cellH * 2);
          }
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = overlayRef.current.material as THREE.MeshBasicMaterial;
    if (mat.map) {
      (mat.map as THREE.Texture).dispose();
    }
    mat.map = tex;
    mat.opacity = isWinterDeciduous ? 0 : 0.85;
    mat.transparent = true;
    mat.needsUpdate = true;
  });

  return (
    <mesh ref={overlayRef} position={[0, 3.5, 4.04]}>
      <planeGeometry args={[12, 7]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.MultiplyBlending}
      />
    </mesh>
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

  const waMap = useMemo(() => {
    const map = new Map<string, (typeof assessment.windows)[number]>();
    assessment.windows.forEach((w) => map.set(w.id, w));
    return map;
  }, [assessment]);

  return (
    <group>
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 7, 8]} />
        <meshStandardMaterial color={wallColor} roughness={0.82} />
      </mesh>

      <mesh position={[0, 7.8, 0]} castShadow receiveShadow>
        <coneGeometry args={[9, 3, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 7.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[9, 3, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.9} />
      </mesh>

      <mesh position={[0, 1.25, 4.08]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 2.5, 0.18]} />
        <meshStandardMaterial color="#4a2c1a" roughness={0.7} />
      </mesh>
      <mesh position={[0.45, 1.4, 4.18]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#c9a227" metalness={0.8} roughness={0.2} />
      </mesh>

      <FacadeShadowOverlay />

      {assessment.windows.map((wa) => {
        const data = windowMap.get(wa.id);
        if (!data) return null;
        return (
          <WindowPane
            key={wa.id}
            data={data}
            coverage={wa.shadowCoverage}
            isBlocked={wa.shadowCoverage > 0.55}
            isPermanentBlock={wa.isPermanentlyBlocked}
          />
        );
      })}

      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[13, 0.5, 9]} />
        <meshStandardMaterial color="#6b5a48" roughness={0.92} />
      </mesh>
    </group>
  );
}
