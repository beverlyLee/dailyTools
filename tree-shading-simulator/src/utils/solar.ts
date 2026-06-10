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

export function calculateSolarPosition(
  latitude: number,
  season: Season,
  hourAngle: number = 0
): { azimuth: number; altitude: number; direction: [number, number, number] } {
  const altitudeDeg = calculateSolarAltitude(latitude, season);
  const altitudeRad = degToRad(altitudeDeg);
  const azimuthRad = degToRad(hourAngle);

  const x = -Math.cos(altitudeRad) * Math.sin(azimuthRad);
  const y = Math.sin(altitudeRad);
  const z = -Math.cos(altitudeRad) * Math.cos(azimuthRad);

  return {
    azimuth: hourAngle,
    altitude: altitudeDeg,
    direction: [x, y, z],
  };
}

export function getSeasonName(season: Season): string {
  return season === 'summer' ? '夏季（夏至）' : '冬季（冬至）';
}

export function getSeasonDescription(season: Season, latitude: number): string {
  const alt = calculateSolarAltitude(latitude, season);
  return `正午太阳高度角：${alt.toFixed(1)}°`;
}

export function getSunLightIntensity(season: Season): number {
  return season === 'summer' ? 1.8 : 1.2;
}

export function getSunColor(season: Season): string {
  return season === 'summer' ? '#fff4d6' : '#ffe0b2';
}

export function getSkyColor(season: Season): string {
  return season === 'summer' ? '#87ceeb' : '#b0c4de';
}
