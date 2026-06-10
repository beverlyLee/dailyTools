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

  let shadowLength = 0;
  if (altitudeRad > 0.001) {
    shadowLength = heightDiff / Math.tan(altitudeRad);
  } else {
    shadowLength = heightDiff * 100;
  }

  const offsetX = -shadowLength * Math.sin(azimuthRad);
  const offsetZ = -shadowLength * Math.cos(azimuthRad);

  const centerX = treePosition[0] + offsetX;
  const centerZ = treePosition[2] + offsetZ;

  const spreadFactor = 0.4;
  const radiusBase = canopy.radius + shadowLength * spreadFactor;

  const perpX = Math.cos(azimuthRad);
  const perpZ = -Math.sin(azimuthRad);
  const stretchAlongAzimuth = radiusBase * 1.0;
  const stretchPerpendicular = radiusBase * 0.85;

  return {
    centerX,
    centerZ,
    radiusX: Math.abs(perpX) * stretchPerpendicular + Math.abs(Math.sin(azimuthRad)) * stretchAlongAzimuth,
    radiusZ: Math.abs(perpZ) * stretchPerpendicular + Math.abs(Math.cos(azimuthRad)) * stretchAlongAzimuth,
    altitudeDeg: sunAltitudeDeg,
    azimuthDeg: sunAzimuthDeg,
  };
}

export function pointInShadowEllipse(
  point: [number, number, number],
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunAltitudeDeg: number,
  sunAzimuthDeg: number = DEFAULT_SOLAR_AZIMUTH
): boolean {
  const proj = calculateShadowProjection(
    treePosition,
    canopy,
    sunAltitudeDeg,
    sunAzimuthDeg,
    point[1]
  );

  const azimuthRad = degToRad(sunAzimuthDeg);
  const dx = point[0] - proj.centerX;
  const dz = point[2] - proj.centerZ;

  const localX = dx * Math.cos(-azimuthRad) - dz * Math.sin(-azimuthRad);
  const localZ = dx * Math.sin(-azimuthRad) + dz * Math.cos(-azimuthRad);

  const a = proj.radiusX;
  const b = proj.radiusZ * 0.95;
  const normalized = (localX * localX) / (a * a) + (localZ * localZ) / (b * b);

  if (normalized <= 1.0) {
    return true;
  }

  const directDx = point[0] - treePosition[0];
  const directDz = point[2] - treePosition[2];
  const directDist = Math.sqrt(directDx * directDx + directDz * directDz);
  const canopyHeightAtPoint = getCanopyHeightAtDistance(
    canopy,
    Math.max(0, point[1] - canopy.trunkHeight)
  );
  if (canopyHeightAtPoint > 0) {
    const effectiveRadius = canopyHeightAtPoint * 0.8;
    if (directDist <= effectiveRadius) {
      return true;
    }
  }

  return false;
}

function getCanopyHeightAtDistance(canopy: CanopySize, heightAboveTrunk: number): number {
  const halfH = canopy.height * 0.5;
  if (heightAboveTrunk < 0 || heightAboveTrunk > canopy.height) {
    return 0;
  }
  const t = (heightAboveTrunk - halfH) / halfH;
  const radiusAtHeight = canopy.radius * Math.sqrt(Math.max(0, 1 - t * t));
  return radiusAtHeight;
}

export function calculateWindowShadowCoverage(
  window: WindowData,
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunAltitudeDeg: number,
  sunAzimuthDeg: number = DEFAULT_SOLAR_AZIMUTH,
  samples: number = 49
): number {
  const [wx, wy, wz] = window.position;
  const [w, h] = window.size;
  let covered = 0;
  const step = Math.ceil(Math.sqrt(samples));
  const total = step * step;
  for (let i = 0; i < step; i++) {
    for (let j = 0; j < step; j++) {
      const px = wx + ((i + 0.5) / step) * w - w / 2;
      const py = wy + ((j + 0.5) / step) * h - h / 2;
      const pz = wz;
      const samplePoint: [number, number, number] = [px, py, pz];
      if (
        pointInShadowEllipse(
          samplePoint,
          treePosition,
          canopy,
          sunAltitudeDeg,
          sunAzimuthDeg
        )
      ) {
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
      fullSummerCoverage >= 0.95 &&
      winterCoverage >= 0.95;

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
      warnings.push(`窗户 ${w.id}: 此处窗户将常年无直射光`);
    } else if (w.shadowCoverage > 0.8) {
      warnings.push(
        `窗户 ${w.id}: 大部分时间被遮挡 (${(w.shadowCoverage * 100).toFixed(0)}%)`
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
