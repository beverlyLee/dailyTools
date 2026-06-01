import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Virus from '../viruses/Virus';
import { DeformationPoint, easeInOutCubic, easeOutCubic, easeInCubic } from '../utils/math';

type VirusState = 'approaching' | 'attaching' | 'fusing' | 'absorbed';

interface VirusData {
  id: number;
  position: THREE.Vector3;
  startPosition: THREE.Vector3;
  contactPoint: THREE.Vector3;
  surfaceNormal: THREE.Vector3;
  state: VirusState;
  stateStartTime: number;
  scale: number;
  opacity: number;
  deformationPoint: DeformationPoint;
  phaseDuration: number;
  hasValidStateTransition: boolean;
}

interface VirusManagerProps {
  cellRadius: number;
  maxViruses?: number;
  spawnInterval?: number;
  phaseDuration?: number;
  isPaused: boolean;
  onDeformationPointsChange: (points: DeformationPoint[]) => void;
  onVirusStateChange?: (virusId: number, oldState: VirusState, newState: VirusState) => void;
  onVirusCountChange?: (count: number) => void;
  onVirusCleanup?: (virusId: number) => void;
}

const VIRUS_BODY_RADIUS = 0.6;
const DEFORMATION_RADIUS = 2.0;
const MAX_DEFORMATION_DEPTH = 1.8;
const DEFAULT_PHASE_DURATION = 2500;
const SPAWN_DISTANCE = 8;
const DEPTH_WRITE_ENABLED = true;

const validateStateTransition = (oldState: VirusState, newState: VirusState): boolean => {
  const validTransitions: Record<VirusState, VirusState[]> = {
    approaching: ['attaching'],
    attaching: ['fusing'],
    fusing: ['absorbed'],
    absorbed: [],
  };
  return validTransitions[oldState]?.includes(newState) ?? false;
};

const randomFrontPosition = (radius: number): THREE.Vector3 => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.PI * 0.15 + Math.random() * Math.PI * 0.5;
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta) * 0.8;
  const z = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, Math.abs(z));
};

const VirusManager = ({
  cellRadius,
  maxViruses = 5,
  spawnInterval = 4000,
  phaseDuration = DEFAULT_PHASE_DURATION,
  isPaused,
  onDeformationPointsChange,
  onVirusStateChange,
  onVirusCountChange,
  onVirusCleanup,
}: VirusManagerProps) => {
  const virusesRef = useRef<VirusData[]>([]);
  const nextIdRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const [, forceUpdate] = useState(0);
  const debugLogThrottleRef = useRef<Record<number, number>>({});

  const logThrottled = (virusId: number, message: string) => {
    const now = performance.now();
    const lastLog = debugLogThrottleRef.current[virusId] || 0;
    if (now - lastLog > 500) {
      console.log(`[Virus ${virusId}] ${message}`);
      debugLogThrottleRef.current[virusId] = now;
    }
  };

  const destroyVirus = useCallback((virus: VirusData, index: number) => {
    virus.position.set(0, 0, 0);
    virus.startPosition.set(0, 0, 0);
    virus.contactPoint.set(0, 0, 0);
    virus.surfaceNormal.set(0, 0, 0);
    virus.deformationPoint.position.set(0, 0, 0);
    virus.deformationPoint.strength = 0;
    virus.deformationPoint.depth = 0;
    virus.scale = 0;
    virus.opacity = 0;

    virusesRef.current.splice(index, 1);

    delete debugLogThrottleRef.current[virus.id];

    if (onVirusCleanup) {
      onVirusCleanup(virus.id);
    }

    console.log(`[Virus ${virus.id}] ✅ 已从场景中移除并清理`);
  }, [onVirusCleanup]);

  useEffect(() => {
    return () => {
      virusesRef.current = [];
      debugLogThrottleRef.current = {};
    };
  }, []);

  const createVirus = useCallback((): VirusData => {
    const spawnDistance = cellRadius + SPAWN_DISTANCE;
    const spawnPosition = randomFrontPosition(spawnDistance);
    const contactPoint = randomFrontPosition(cellRadius);
    const surfaceNormal = contactPoint.clone().normalize();

    return {
      id: nextIdRef.current++,
      position: spawnPosition.clone(),
      startPosition: spawnPosition.clone(),
      contactPoint,
      surfaceNormal,
      state: 'approaching' as VirusState,
      stateStartTime: performance.now(),
      scale: 1,
      opacity: 1,
      deformationPoint: {
        position: contactPoint.clone(),
        radius: DEFORMATION_RADIUS,
        depth: 0,
        strength: 0,
      },
      phaseDuration,
      hasValidStateTransition: true,
    };
  }, [cellRadius, phaseDuration]);

  const transitionState = useCallback((virus: VirusData, newState: VirusState, now: number): boolean => {
    if (newState === virus.state) return false;

    const isValid = validateStateTransition(virus.state, newState);
    if (!isValid) {
      console.warn(`[Virus ${virus.id}] ❌ 非法状态转换: ${virus.state} -> ${newState}`);
      virus.hasValidStateTransition = false;
      return false;
    }

    if (onVirusStateChange) {
      onVirusStateChange(virus.id, virus.state, newState);
    }

    const oldState = virus.state;
    virus.state = newState;
    virus.stateStartTime = now;
    virus.hasValidStateTransition = true;

    console.log(`[Virus ${virus.id}] 🔄 ${oldState} → ${newState} (duration=${virus.phaseDuration}ms, now=${now})`);
    return true;
  }, [onVirusStateChange]);

  const spawnVirus = useCallback(() => {
    if (virusesRef.current.length < maxViruses) {
      const virus = createVirus();
      virusesRef.current.push(virus);
      forceUpdate((n) => n + 1);
      console.log(`[Virus ${virus.id}] 🆕 生成于 ${virus.position.toArray().map(v => v.toFixed(1)).join(', ')}，目标 ${virus.contactPoint.toArray().map(v => v.toFixed(1)).join(', ')}`);
    }
  }, [maxViruses, createVirus]);

  useEffect(() => {
    for (let i = 0; i < 2; i++) {
      setTimeout(() => spawnVirus(), i * 1200);
    }
  }, [spawnVirus]);

  useFrame(() => {
    if (isPaused) return;

    const now = performance.now();

    if (now - lastSpawnTimeRef.current > spawnInterval) {
      spawnVirus();
      lastSpawnTimeRef.current = now;
    }

    const activeDeformationPoints: DeformationPoint[] = [];

    for (let i = virusesRef.current.length - 1; i >= 0; i--) {
      const virus = virusesRef.current[i];
      const stateDuration = now - virus.stateStartTime;
      const duration = virus.phaseDuration;

      if (isNaN(stateDuration) || stateDuration < 0) {
        console.error(`[Virus ${virus.id}] ⚠️ stateDuration 异常: ${stateDuration}, startTime=${virus.stateStartTime}, now=${now}`);
        destroyVirus(virus, i);
        continue;
      }

      if (duration <= 0) {
        console.error(`[Virus ${virus.id}] ⚠️ phaseDuration 异常: ${duration}`);
        destroyVirus(virus, i);
        continue;
      }

      switch (virus.state) {
        case 'approaching': {
          const t = Math.min(stateDuration / duration, 1);
          const easedT = easeInOutCubic(t);

          const targetSurface = virus.surfaceNormal.clone().multiplyScalar(cellRadius + VIRUS_BODY_RADIUS * 0.5);
          virus.position.copy(virus.startPosition.clone().lerp(targetSurface, easedT));

          const wobbleStrength = 0.3 * (1 - t);
          virus.position.x += Math.sin(t * Math.PI * 3) * wobbleStrength;
          virus.position.y += Math.cos(t * Math.PI * 2) * wobbleStrength * 0.7;

          logThrottled(virus.id, `🚀 接近中 t=${t.toFixed(2)} pos=${virus.position.length().toFixed(2)} cellR=${cellRadius}`);

          if (t >= 1) {
            virus.deformationPoint.position = virus.surfaceNormal.clone().multiplyScalar(cellRadius);
            transitionState(virus, 'attaching', now);
          }
          break;
        }

        case 'attaching': {
          const t = Math.min(stateDuration / duration, 1);
          const easedT = easeOutCubic(t);

          const attachSurface = virus.surfaceNormal.clone().multiplyScalar(cellRadius + VIRUS_BODY_RADIUS * 0.3);
          const attachInside = virus.surfaceNormal.clone().multiplyScalar(cellRadius - VIRUS_BODY_RADIUS * 0.05);
          virus.position.copy(attachSurface.clone().lerp(attachInside, easedT));

          virus.deformationPoint.strength = 0.3 + easedT * 0.5;
          virus.deformationPoint.depth = easedT * 0.6;
          virus.deformationPoint.position = virus.surfaceNormal.clone().multiplyScalar(cellRadius);

          virus.scale = 1 - easedT * 0.08;
          virus.opacity = 1;

          activeDeformationPoints.push({ ...virus.deformationPoint });

          logThrottled(virus.id, `🔗 附着中 t=${t.toFixed(2)} depth=${virus.deformationPoint.depth.toFixed(2)} pos.length=${virus.position.length().toFixed(2)}`);

          if (t >= 1) {
            transitionState(virus, 'fusing', now);
          }
          break;
        }

        case 'fusing': {
          const t = Math.min(stateDuration / duration, 1);
          const easedT = easeInOutCubic(t);

          const fuseStart = virus.surfaceNormal.clone().multiplyScalar(cellRadius - VIRUS_BODY_RADIUS * 0.05);
          const fuseEnd = virus.surfaceNormal.clone().multiplyScalar(cellRadius * 0.55);
          virus.position.copy(fuseStart.clone().lerp(fuseEnd, easedT));

          const tangent = new THREE.Vector3(-virus.surfaceNormal.y, virus.surfaceNormal.x, 0).normalize();
          const orbitAmount = 0.25 * Math.sin(easedT * Math.PI);
          virus.position.add(tangent.clone().multiplyScalar(orbitAmount));

          virus.scale = 0.92 - easedT * 0.35;
          virus.opacity = 1 - easedT * 0.2;

          const depthFactor = Math.sin(easedT * Math.PI);
          virus.deformationPoint.depth = MAX_DEFORMATION_DEPTH * (0.3 + depthFactor * 0.7);
          virus.deformationPoint.strength = 0.8 + depthFactor * 0.2;
          virus.deformationPoint.position = virus.surfaceNormal.clone().multiplyScalar(cellRadius);

          activeDeformationPoints.push({ ...virus.deformationPoint });

          logThrottled(virus.id, `🧬 融合中 t=${t.toFixed(2)} pos.length=${virus.position.length().toFixed(2)} vs cellR=${cellRadius} depth=${virus.deformationPoint.depth.toFixed(2)}`);

          if (t >= 1) {
            transitionState(virus, 'absorbed', now);
          }
          break;
        }

        case 'absorbed': {
          const t = Math.min(stateDuration / duration, 1);
          const easedT = easeInCubic(t);

          const absorbStart = virus.surfaceNormal.clone().multiplyScalar(cellRadius * 0.55);
          const absorbEnd = virus.surfaceNormal.clone().multiplyScalar(cellRadius * 0.15);
          virus.position.copy(absorbStart.clone().lerp(absorbEnd, easedT));

          const tangent = new THREE.Vector3(-virus.surfaceNormal.y, virus.surfaceNormal.x, 0).normalize();
          const spiralAngle = easedT * Math.PI * 1.2;
          const spiralR = 0.15 * (1 - easedT);
          virus.position.add(tangent.clone().multiplyScalar(Math.sin(spiralAngle) * spiralR));

          virus.opacity = 0.8 * (1 - easedT);
          virus.scale = 0.57 * (1 - easedT * 0.7);

          const recoveryFactor = 1 - easedT;
          virus.deformationPoint.strength = 1.0 * recoveryFactor;
          virus.deformationPoint.depth = MAX_DEFORMATION_DEPTH * recoveryFactor * 0.5;
          virus.deformationPoint.position = virus.surfaceNormal.clone().multiplyScalar(cellRadius);

          if (easedT < 0.9) {
            activeDeformationPoints.push({ ...virus.deformationPoint });
          }

          logThrottled(virus.id, `✨ 吸收中 t=${t.toFixed(2)} easedT=${easedT.toFixed(2)} stateDur=${stateDuration}ms / duration=${duration}ms opacity=${virus.opacity.toFixed(2)}`);

          if (t >= 1) {
            console.log(`[Virus ${virus.id}] 🔚 absorbed 阶段完成 t=${t} stateDuration=${stateDuration}ms duration=${duration}ms，执行清理`);
            destroyVirus(virus, i);
          }
          break;
        }

        default: {
          const _exhaustiveCheck: never = virus.state;
          break;
        }
      }
    }

    if (onVirusCountChange) {
      onVirusCountChange(virusesRef.current.length);
    }
    onDeformationPointsChange(activeDeformationPoints);
  });

  return (
    <>
      {virusesRef.current.map((virus) => (
        <Virus
          key={virus.id}
          position={virus.position}
          scale={virus.scale}
          opacity={virus.opacity}
          rotationSpeed={virus.state === 'approaching' ? 0.8 : virus.state === 'attaching' ? 0.4 : 0.15}
        />
      ))}
    </>
  );
};

export default VirusManager;
