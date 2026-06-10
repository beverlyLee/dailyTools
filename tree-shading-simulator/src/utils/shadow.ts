import type {
  CanopySize,
  WindowData,
  WindowAssessment,
  LightingAssessment,
} from '../types';
import { calculateCanopySize } from './growth';
import {
  calculateSolarAltitude,
  degToRad,
  DEFAULT_SOLAR_AZIMUTH,
} from './solar';

export interface ShadowProjection {
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  altitudeDeg: number;
  azimuthDeg: number;
}

function getCanopyCenter(
  treePosition: [number, number, number],
  canopy: CanopySize
): [number, number, number] {
  return [
    treePosition[0],
    treePosition[1] + canopy.trunkHeight + canopy.height * 0.5,
    treePosition[2],
  ];
}

function rayIntersectsCanopyEllipsoid(
  point: [number, number, number],
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunDir: [number, number, number]
): boolean {
  const [cx, cy, cz] = getCanopyCenter(treePosition, canopy);
  const rx = canopy.radius;
  const ry = canopy.height * 0.5;
  const rz = canopy.radius;

  const px = point[0] - cx;
  const py = point[1] - cy;
  const pz = point[2] - cz;

  const dx = sunDir[0];
  const dy = sunDir[1];
  const dz = sunDir[2];

  const a = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) + (dz * dz) / (rz * rz);
  const b = 2 * ((px * dx) / (rx * rx) + (py * dy) / (ry * ry) + (pz * dz) / (rz * rz));
  const c = (px * px) / (rx * rx) + (py * py) / (ry * ry) + (pz * pz) / (rz * rz) - 1;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return false;
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  const tMin = Math.min(t1, t2);
  const tMax = Math.max(t1, t2);

  return tMax >= 0;
}

export function pointInShadowEllipse(
  point: [number, number, number],
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunAltitudeDeg: number,
  sunAzimuthDeg: number = DEFAULT_SOLAR_AZIMUTH
): boolean {
  const altitudeRad = degToRad(sunAltitudeDeg);
  const azimuthRad = degToRad(sunAzimuthDeg);

  const sunDir: [number, number, number] = [
    Math.cos(altitudeRad) * Math.sin(azimuthRad),
    Math.sin(altitudeRad),
    Math.cos(altitudeRad) * Math.cos(azimuthRad),
  ];

  return rayIntersectsCanopyEllipsoid(point, treePosition, canopy, sunDir);
}

export function calculateShadowProjection(
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunAltitudeDeg: number,
  sunAzimuthDeg: number = DEFAULT_SOLAR_AZIMUTH,
  targetHeight: number = 0
): ShadowProjection {
  const altitudeRad = degToRad(sunAltitudeDeg);
  const azimuthRad = degToRad(sunAzimuthDeg);

  const canopyCenterHeight = canopy.trunkHeight + canopy.height * 0.5;
  const heightDiff = Math.max(0, canopyCenterHeight - targetHeight);

  let shadowOffset = 0;
  if (altitudeRad > 0.001) {
    shadowOffset = heightDiff / Math.tan(altitudeRad);
  } else {
    shadowOffset = heightDiff * 100;
  }

  const offsetX = -shadowOffset * Math.sin(azimuthRad);
  const offsetZ = -shadowOffset * Math.cos(azimuthRad);

  const centerX = treePosition[0] + offsetX;
  const centerZ = treePosition[2] + offsetZ;

  const perpX = Math.cos(azimuthRad);
  const perpZ = -Math.sin(azimuthRad);

  const stretchAlongAzimuth = canopy.radius * 1.0;
  const stretchPerpendicular = canopy.radius * 0.92;

  return {
    centerX,
    centerZ,
    radiusX:
      Math.abs(perpX) * stretchPerpendicular +
      Math.abs(Math.sin(azimuthRad)) * stretchAlongAzimuth,
    radiusZ:
      Math.abs(perpZ) * stretchPerpendicular +
      Math.abs(Math.cos(azimuthRad)) * stretchAlongAzimuth,
    altitudeDeg: sunAltitudeDeg,
    azimuthDeg: sunAzimuthDeg,
  };
}

export function calculateWindowShadowCoverage(
  window: WindowData,
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunAltitudeDeg: number,
  sunAzimuthDeg: number = DEFAULT_SOLAR_AZIMUTH,
  samples: number = 121
): number {
  const [wx, wy, wz] = window.position;
  const [w, h] = window.size;

  const altitudeRad = degToRad(sunAltitudeDeg);
  const azimuthRad = degToRad(sunAzimuthDeg);
  const sunDir: [number, number, number] = [
    Math.cos(altitudeRad) * Math.sin(azimuthRad),
    Math.sin(altitudeRad),
    Math.cos(altitudeRad) * Math.cos(azimuthRad),
  ];

  let covered = 0;
  const step = Math.ceil(Math.sqrt(samples));
  const total = step * step;

  for (let i = 0; i < step; i++) {
    for (let j = 0; j < step; j++) {
      const px = wx + ((i + 0.5) / step) * w - w / 2;
      const py = wy + ((j + 0.5) / step) * h - h / 2;
      const pz = wz;
      const samplePoint: [number, number, number] = [px, py, pz];
      if (rayIntersectsCanopyEllipsoid(samplePoint, treePosition, canopy, sunDir)) {
        covered++;
      }
    }
  }
  return covered / total;
}

export function assessWindowLighting(
  windows: WindowData[],
  treeSpecies: 'deciduous' | 'evergreen',
  treeYears: 5 | 10,
  treePosition: [number, number, number],
  latitude: number,
  season: 'summer' | 'winter',
  sunAzimuthDeg: number = DEFAULT_SOLAR_AZIMUTH
): LightingAssessment {
  const canopy = calculateCanopySize(treeSpecies, treeYears);
  const isWinterDeciduous = season === 'winter' && treeSpecies === 'deciduous';
  const winterCanopy =
    treeSpecies === 'deciduous'
      ? { radius: 0.15, height: 0.15, trunkHeight: canopy.trunkHeight }
      : canopy;
  const effectiveCanopy = isWinterDeciduous ? winterCanopy : canopy;

  const summerAlt = calculateSolarAltitude(latitude, 'summer');
  const winterAlt = calculateSolarAltitude(latitude, 'winter');
  const currentAlt = season === 'summer' ? summerAlt : winterAlt;

  const windowAssessments: WindowAssessment[] = windows.map((w) => {
    const currentCoverage = calculateWindowShadowCoverage(
      w,
      treePosition,
      effectiveCanopy,
      currentAlt,
      sunAzimuthDeg
    );

    const winterCoverage = calculateWindowShadowCoverage(
      w,
      treePosition,
      winterCanopy,
      winterAlt,
      sunAzimuthDeg
    );

    const fullSummerCoverage = calculateWindowShadowCoverage(
      w,
      treePosition,
      canopy,
      summerAlt,
      sunAzimuthDeg
    );

    const isPermanentlyBlocked =
      treeSpecies === 'evergreen' &&
      fullSummerCoverage >= 0.98 &&
      winterCoverage >= 0.98;

    return {
      id: w.id,
      shadowCoverage: currentCoverage,
      isPermanentlyBlocked,
      hasDirectLight: currentCoverage < 0.9,
    };
  });

  const blockedWindows = windowAssessments.filter(
    (w) => w.shadowCoverage > 0.5
  ).length;
  const averageCoverage =
    windowAssessments.reduce((sum, w) => sum + w.shadowCoverage, 0) /
    Math.max(1, windows.length);

  const warnings: string[] = [];
  windowAssessments.forEach((w) => {
    if (w.isPermanentlyBlocked) {
      warnings.push(`🚫 窗户 ${w.id}: 此处窗户将常年无直射光`);
    } else if (w.shadowCoverage >= 0.99) {
      warnings.push(`⬛ 窗户 ${w.id}: 完全被树荫遮挡 (${(w.shadowCoverage * 100).toFixed(0)}%)`);
    } else if (w.shadowCoverage >= 0.85) {
      warnings.push(
        `🟫 窗户 ${w.id}: 绝大部分面积被遮挡 (${(w.shadowCoverage * 100).toFixed(0)}%)`
      );
    } else if (w.shadowCoverage >= 0.6) {
      warnings.push(
        `🟨 窗户 ${w.id}: 大部分面积被遮挡 (${(w.shadowCoverage * 100).toFixed(0)}%)`
      );
    } else if (w.shadowCoverage >= 0.3) {
      warnings.push(
        `🟩 窗户 ${w.id}: 部分面积被遮挡 (${(w.shadowCoverage * 100).toFixed(0)}%)`
      );
    }
  });

  return {
    totalWindows: windows.length,
    blockedWindows,
    averageCoverage,
    windows: windowAssessments,
    warnings,
  };
}
