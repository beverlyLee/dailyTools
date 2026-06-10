import type { Season } from '../types';

const EARTH_AXIAL_TILT = 23.44;

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function calculateSolarAltitude(
  latitude: number,
  season: Season
): number {
  const declination =
    season === 'summer' ? EARTH_AXIAL_TILT : -EARTH_AXIAL_TILT;
  const altitude = 90 - latitude + declination;
  return Math.max(0, Math.min(90, altitude));
}

export const DEFAULT_SOLAR_AZIMUTH = 30;

export function calculateSolarPosition(
  latitude: number,
  season: Season,
  azimuthDeg: number = DEFAULT_SOLAR_AZIMUTH
): {
  azimuth: number;
  altitude: number;
  direction: [number, number, number];
  lightPosition: [number, number, number];
} {
  const altitudeDeg = calculateSolarAltitude(latitude, season);
  const altitudeRad = degToRad(altitudeDeg);
  const azimuthRad = degToRad(azimuthDeg);

  const dirX = Math.cos(altitudeRad) * Math.sin(azimuthRad);
  const dirY = Math.sin(altitudeRad);
  const dirZ = Math.cos(altitudeRad) * Math.cos(azimuthRad);

  const dist = 40;
  const lightPos: [number, number, number] = [
    dirX * dist,
    Math.max(dirY * dist, 8),
    dirZ * dist,
  ];

  return {
    azimuth: azimuthDeg,
    altitude: altitudeDeg,
    direction: [dirX, dirY, dirZ],
    lightPosition: lightPos,
  };
}

export function getSeasonName(season: Season): string {
  return season === 'summer' ? '夏季（夏至）' : '冬季（冬至）';
}

export function getSeasonDescription(
  season: Season,
  latitude: number
): string {
  const alt = calculateSolarAltitude(latitude, season);
  return `正午太阳高度角：${alt.toFixed(1)}°（方位角：${DEFAULT_SOLAR_AZIMUTH}°）`;
}

export function getSunLightIntensity(season: Season): number {
  return season === 'summer' ? 2.0 : 1.3;
}

export function getSunColor(season: Season): string {
  return season === 'summer' ? '#fff4d6' : '#ffe0b2';
}

export function getSkyColor(season: Season): string {
  return season === 'summer' ? '#87ceeb' : '#b0c4de';
}
