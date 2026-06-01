import { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import HostCell from '../cells/HostCell';
import VirusManager from '../components/VirusManager';
import SceneControls from '../components/SceneControls';
import UIPanel from '../components/UIPanel';
import { DeformationPoint } from '../utils/math';

type VirusState = 'approaching' | 'attaching' | 'fusing' | 'absorbed';

interface StateTransition {
  virusId: number;
  oldState: VirusState;
  newState: VirusState;
  timestamp: number;
  isValid: boolean;
}

const CELL_RADIUS = 3.5;
const PHASE_DURATION = 2500;

export default function Home() {
  const [isPaused, setIsPaused] = useState(false);
  const [deformationPoints, setDeformationPoints] = useState<DeformationPoint[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [activeViruses, setActiveViruses] = useState(0);
  const [, setTransitionCount] = useState(0);
  const transitionHistoryRef = useRef<StateTransition[]>([]);
  const maxTransitionHistory = 50;

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setDeformationPoints([]);
    transitionHistoryRef.current = [];
    setResetKey((prev) => prev + 1);
  }, []);

  const handleDeformationPointsChange = useCallback((points: DeformationPoint[]) => {
    setDeformationPoints(points);
  }, []);

  const handleVirusCountChange = useCallback((count: number) => {
    setActiveViruses(count);
  }, []);

  const handleVirusCleanup = useCallback((virusId: number) => {
    console.log(`[Virus ${virusId}] 🗑️ 生命周期结束，资源已清理`);
    const index = transitionHistoryRef.current.findIndex(t => t.virusId === virusId);
    if (index !== -1) {
      const transition = transitionHistoryRef.current[index];
      transitionHistoryRef.current.splice(index, 1);
    }
  }, []);

  const handleVirusStateChange = useCallback((virusId: number, oldState: VirusState, newState: VirusState) => {
    const validTransitions: Record<VirusState, VirusState[]> = {
      approaching: ['attaching'],
      attaching: ['fusing', 'approaching'],
      fusing: ['absorbed', 'attaching'],
      absorbed: ['approaching'],
    };

    const isValid = validTransitions[oldState]?.includes(newState) ?? false;

    const transition: StateTransition = {
      virusId,
      oldState,
      newState,
      timestamp: Date.now(),
      isValid,
    };

    transitionHistoryRef.current.push(transition);
    
    if (transitionHistoryRef.current.length > maxTransitionHistory) {
      transitionHistoryRef.current.shift();
    }

    if (!isValid) {
      console.error(`[State Machine] Invalid transition detected: Virus ${virusId} ${oldState} -> ${newState}`);
    }

    setTransitionCount((prev) => prev + 1);

    if (newState === 'attaching') {
      console.log(`[Virus ${virusId}] 🎯 接近 → 附着`);
    } else if (newState === 'fusing') {
      console.log(`[Virus ${virusId}] 🔗 附着 → 融合`);
    } else if (newState === 'absorbed') {
      console.log(`[Virus ${virusId}] 🧬 融合 → 吸收`);
    }
  }, []);

  return (
    <div className="w-full h-screen bg-[#0a0514] overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a1a] via-[#0a0514] to-[#050208]">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
        </div>
      </div>

      <Canvas
        key={resetKey}
        camera={{ position: [0, 4, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        className="absolute inset-0"
      >
        <color attach="background" args={['#0a0514']} />
        
        <SceneControls />
        <HostCell radius={CELL_RADIUS} deformationPoints={deformationPoints} />
        <VirusManager
          cellRadius={CELL_RADIUS}
          maxViruses={5}
          spawnInterval={4000}
          phaseDuration={PHASE_DURATION}
          isPaused={isPaused}
          onDeformationPointsChange={handleDeformationPointsChange}
          onVirusStateChange={handleVirusStateChange}
          onVirusCountChange={handleVirusCountChange}
          onVirusCleanup={handleVirusCleanup}
        />
      </Canvas>

      <UIPanel
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        onReset={handleReset}
        activeViruses={activeViruses}
      />
    </div>
  );
}
