import * as THREE from 'three';

export interface SmokeParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
  mass: number;
  temperature: number;
  captured: boolean;
  escaped: boolean;
  deposited: boolean;
}

export interface SimulationConfig {
  maxParticles: number;
  emissionRate: number;
  firePower: number;
  suctionPower: number;
  hoodHeight: number;
  windowOpen: boolean;
  gravity: number;
  buoyancy: number;
  diffusion: number;
  airResistance: number;
}

export interface SurfacePoint {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  intensity: number;
  age: number;
}

export type SurfaceType = 'wall' | 'cabinet' | 'ceiling' | 'floor';

export interface DepositionPoint extends SurfacePoint {
  surfaceType: SurfaceType;
}
