import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { WindowData } from '../../types';
import { calculateCanopySize } from '../../utils/growth';
import {
  calculateSolarAltitude,
  DEFAULT_SOLAR_AZIMUTH,
} from '../../utils/solar';
import { pointShadowSoftness } from '../../utils/shadow';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const initializedRef = useRef(false);

  const season = useSimulationStore((s) => s.season);
  const treeSpecies = useSimulationStore((s) => s.tree.species);
  const treeYears = useSimulationStore((s) => s.tree.years);
  const treePosX = useSimulationStore((s) => s.tree.position[0]);
  const treePosY = useSimulationStore((s) => s.tree.position[1]);
  const treePosZ = useSimulationStore((s) => s.tree.position[2]);
  const latitude = useSimulationStore((s) => s.latitude);
  const solarAzimuth = useSimulationStore(
    (s) => s.solarAzimuth || DEFAULT_SOLAR_AZIMUTH
  );

  const TEX_WIDTH = 256;
  const TEX_HEIGHT = 192;
  const SAMPLES_X = 32;
  const SAMPLES_Y = 24;

  const treePosition: [number, number, number] = useMemo(
    () => [treePosX, treePosY, treePosZ],
    [treePosX, treePosY, treePosZ]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const canvas = document.createElement('canvas');
    canvas.width = TEX_WIDTH;
    canvas.height = TEX_HEIGHT;
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    textureRef.current = texture;

    if (overlayRef.current) {
      const mat = overlayRef.current.material as THREE.MeshBasicMaterial;
      mat.map = texture;
      mat.transparent = true;
      mat.needsUpdate = true;
    }

    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      canvasRef.current = null;
      ctxRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  const drawShadowOverlay = useMemo(() => {
    const canopy = calculateCanopySize(treeSpecies, treeYears);
    const isWinterDeciduous =
      season === 'winter' && treeSpecies === 'deciduous';
    const effectiveCanopy = isWinterDeciduous
      ? { ...canopy, radius: 0.2, height: 0.2, trunkHeight: canopy.trunkHeight }
      : canopy;
    const altitude = calculateSolarAltitude(latitude, season);

    return { canopy, effectiveCanopy, altitude, isWinterDeciduous };
  }, [season, treeSpecies, treeYears, treePosX, treePosY, treePosZ, latitude, solarAzimuth]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const texture = textureRef.current;
    if (!ctx || !texture) return;

    const { effectiveCanopy, altitude, isWinterDeciduous } = drawShadowOverlay;

    ctx.clearRect(0, 0, TEX_WIDTH, TEX_HEIGHT);

    if (!isWinterDeciduous) {
      const houseFacadeZ = 4.01;

      for (let i = 0; i < SAMPLES_X; i++) {
        for (let j = 0; j < SAMPLES_Y; j++) {
          const px = -6 + ((i + 0.5) / SAMPLES_X) * 12;
          const py = ((j + 0.5) / SAMPLES_Y) * 7;
          const point: [number, number, number] = [px, py, houseFacadeZ];

          const softness = pointShadowSoftness(
            point,
            treePosition,
            effectiveCanopy,
            altitude,
            solarAzimuth
          );

          if (softness > 0.02) {
            const cx = ((i + 0.5) / SAMPLES_X) * TEX_WIDTH;
            const cy = TEX_HEIGHT - ((j + 0.5) / SAMPLES_Y) * TEX_HEIGHT;
            const cellW = TEX_WIDTH / SAMPLES_X + 2;
            const cellH = TEX_HEIGHT / SAMPLES_Y + 2;

            const alpha = Math.min(0.55, softness * 0.55);
            const coreAlpha = Math.min(0.75, softness * 0.75);

            const grad = ctx.createRadialGradient(
              cx,
              cy,
              0,
              cx,
              cy,
              Math.max(cellW, cellH)
            );
            grad.addColorStop(0, `rgba(0,0,0,${coreAlpha})`);
            grad.addColorStop(0.5, `rgba(0,0,0,${alpha * 0.6})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(cx - cellW, cy - cellH, cellW * 2, cellH * 2);
          }
        }
      }
    }

    texture.needsUpdate = true;

    if (overlayRef.current) {
      const mat = overlayRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isWinterDeciduous ? 0 : 0.85;
    }
  }, [drawShadowOverlay, treePosition[0], treePosition[1], treePosition[2], solarAzimuth]);

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
