import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

export interface PetAIState {
  distance: number;
  excitement: number;
  isSleeping: boolean;
  isScared: boolean;
  status: 'sleeping' | 'awake' | 'excited' | 'scared';
}

export function usePetAI(): PetAIState {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [excitement, setExcitement] = useState(0);
  const [isScared, setIsScared] = useState(false);
  
  const targetExcitementRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const isInitializedRef = useRef(false);
  const initTimerRef = useRef<number>();
  
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const speedRef = useRef(0);
  const distanceRateRef = useRef(0);
  const lastDistanceRef = useRef(0);
  const scaredTimerRef = useRef<number>();

  const petCenter = new THREE.Vector2(0, 0);
  const maxScreenDistance = Math.sqrt(2);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = performance.now();
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    const dt = Math.max(now - lastTimeRef.current, 16);
    const dx = x - lastPosRef.current.x;
    const dy = y - lastPosRef.current.y;
    const pixelSpeed = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);
    const normalizedSpeed = Math.min(pixelSpeed / 4, 1);
    
    speedRef.current = THREE.MathUtils.lerp(speedRef.current, normalizedSpeed, 0.3);
    
    const currentDistance = Math.sqrt(x * x + y * y);
    const distanceDelta = currentDistance - lastDistanceRef.current;
    distanceRateRef.current = THREE.MathUtils.lerp(distanceRateRef.current, distanceDelta, 0.3);
    
    lastPosRef.current = { x, y };
    lastTimeRef.current = now;
    lastDistanceRef.current = currentDistance;
    
    setMousePos({ x, y });
  }, []);

  useEffect(() => {
    initTimerRef.current = window.setTimeout(() => {
      isInitializedRef.current = true;
    }, 800);

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
      }
      if (scaredTimerRef.current) {
        clearTimeout(scaredTimerRef.current);
      }
    };
  }, [handleMouseMove]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      targetExcitementRef.current = 0;
      return;
    }

    const mouseVector = new THREE.Vector2(mousePos.x, mousePos.y);
    const distance = mouseVector.distanceTo(petCenter);
    
    const normalizedDistance = Math.min(distance / maxScreenDistance, 1);
    
    const targetExcitement = 1 - normalizedDistance;
    
    const minExcitement = 0.05;
    const maxExcitement = 1;
    const scaledExcitement = minExcitement + (maxExcitement - minExcitement) * targetExcitement;
    
    const speed = speedRef.current;
    const distanceRate = distanceRateRef.current;
    const isFastApproaching = distanceRate < -0.02 && speed > 0.3;
    const isCloseAndFast = normalizedDistance < 0.5 && speed > 0.5;
    
    const shouldScare = isFastApproaching || isCloseAndFast;
    
    if (shouldScare && normalizedDistance < 0.6) {
      setIsScared(true);
      if (scaredTimerRef.current) {
        clearTimeout(scaredTimerRef.current);
      }
      scaredTimerRef.current = window.setTimeout(() => {
        setIsScared(false);
      }, 800);
    }
    
    targetExcitementRef.current = Math.max(minExcitement, Math.min(maxExcitement, scaledExcitement));
  }, [mousePos]);

  useEffect(() => {
    const animate = () => {
      setExcitement(prev => {
        const diff = targetExcitementRef.current - prev;
        const smoothed = prev + diff * 0.06;
        return Math.max(0, Math.min(1, smoothed));
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const isSleeping = !isScared && excitement < 0.25;
  
  let status: 'sleeping' | 'awake' | 'excited' | 'scared';
  if (isScared) {
    status = 'scared';
  } else if (excitement < 0.25) {
    status = 'sleeping';
  } else if (excitement < 0.75) {
    status = 'awake';
  } else {
    status = 'excited';
  }

  return {
    distance: 1 - excitement,
    excitement,
    isSleeping,
    isScared,
    status
  };
}
