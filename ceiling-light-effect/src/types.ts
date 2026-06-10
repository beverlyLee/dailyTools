import * as THREE from 'three';

export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
}

export interface CeilingConfig {
  drop: number;
  trenchWidth: number;
  trenchDepth: number;
  trenchOffset: number;
}

export interface LightConfig {
  type: 'area' | 'tube';
  intensity: number;
  colorTemp: number;
  color: THREE.Color;
  beamAngle: number;
}

export interface IndirectLightConfig {
  bounceCount: number;
  wallAlbedo: number;
  ceilingAlbedo: number;
}

export interface WallWashConfig {
  intensity: number;
  beamAngle: number;
  haloSpread: number;
}

export interface LightSourceData {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  intensity: number;
  color: THREE.Color;
  width: number;
  height: number;
  type: 'area' | 'tube';
}

export interface BouncePoint {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  bounceLevel: number;
}

export interface GlareResult {
  hasGlare: boolean;
  glareAmount: number;
  ugr: number;
}

export interface MaterialColors {
  wall: THREE.Color;
  ceiling: THREE.Color;
  floor: THREE.Color;
  ceilingTrim: THREE.Color;
}

export const MATERIAL_COLORS: MaterialColors = {
  wall: new THREE.Color(0xe8e4dc),
  ceiling: new THREE.Color(0xf5f5f2),
  floor: new THREE.Color(0x8b7355),
  ceilingTrim: new THREE.Color(0xd0ccc4),
};

export function kelvinToRGB(kelvin: number): THREE.Color {
  const temp = kelvin / 100;
  let red: number, green: number, blue: number;

  if (temp <= 66) {
    red = 255;
    green = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    red = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    green = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    blue = 255;
  } else if (temp <= 19) {
    blue = 0;
  } else {
    blue = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return new THREE.Color(red / 255, green / 255, blue / 255);
}

export function gaussianFalloff(distance: number, radius: number): number {
  const t = distance / radius;
  return Math.exp(-t * t * 2);
}

export function linearFalloff(distance: number, maxDistance: number): number {
  if (distance >= maxDistance) return 0;
  return 1 - distance / maxDistance;
}

export function cosineFalloff(angle: number, maxAngle: number): number {
  if (angle >= maxAngle) return 0;
  const t = angle / maxAngle;
  return Math.pow(1 - t, 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export const PHYSICS = {
  MAX_CONE_ANGLE: Math.PI * 0.45,
  LUMINOUS_EFFICACY: 1.0,
  INDIRECT_BOUNCE_DECAY: 0.4,
  WALL_SAMPLE_HEIGHT_RATIO: 0.5,
  MIN_INDIRECT_RATIO: 0.35,
  MAX_INDIRECT_RATIO: 0.48,
  TARGET_INDIRECT_RATIO: 0.40,
};

export function calculateDirectIlluminance(
  sourceLuminance: number,
  sourceArea: number,
  sourceDirection: THREE.Vector3,
  surfacePoint: THREE.Vector3,
  surfaceNormal: THREE.Vector3,
  sourcePosition: THREE.Vector3
): number {
  const toSurface = new THREE.Vector3().subVectors(surfacePoint, sourcePosition);
  const distance = toSurface.length();
  if (distance < 0.01) return 0;

  toSurface.normalize();

  const cosEmission = sourceDirection.dot(toSurface);
  if (cosEmission <= 0) return 0;

  const cosIncident = -toSurface.dot(surfaceNormal);
  if (cosIncident <= 0) return 0;

  const intensity = sourceLuminance * sourceArea * cosEmission;
  const illuminance = (intensity * cosIncident) / (distance * distance);

  return Math.max(0, illuminance);
}

export function calculateAreaLightIlluminance(
  sourceLuminance: number,
  sourceWidth: number,
  sourceHeight: number,
  sourceDirection: THREE.Vector3,
  surfacePoint: THREE.Vector3,
  surfaceNormal: THREE.Vector3,
  sourcePosition: THREE.Vector3,
  beamAngle: number = Math.PI / 2
): number {
  const toSurface = new THREE.Vector3().subVectors(surfacePoint, sourcePosition);
  const distance = toSurface.length();
  if (distance < 0.01) return 0;

  toSurface.normalize();

  const cosEmission = sourceDirection.dot(toSurface);
  if (cosEmission <= 0) return 0;

  const emissionAngle = Math.acos(cosEmission);
  if (emissionAngle > beamAngle / 2) {
    const t = (emissionAngle - beamAngle / 2) / (beamAngle / 2);
    if (t > 1) return 0;
  }

  const cosIncident = -toSurface.dot(surfaceNormal);
  if (cosIncident <= 0) return 0;

  const sourceArea = sourceWidth * sourceHeight;
  const solidAngleApprox = sourceArea * cosEmission / (distance * distance);

  const beamFactor = emissionAngle < beamAngle / 2
    ? 1.0
    : Math.pow(1 - (emissionAngle - beamAngle / 2) / (beamAngle / 2), 2);

  const illuminance = sourceLuminance * solidAngleApprox * cosIncident * beamFactor;

  return Math.max(0, illuminance);
}

export function calculateBounceIntensity(
  incomingIlluminance: number,
  albedo: number,
  surfaceArea: number
): number {
  const reflectedFlux = incomingIlluminance * surfaceArea * albedo;
  return reflectedFlux / Math.PI;
}
