import type {
  CanopySize, WindowData, WindowAssessment, LightingAssessment
} from '../types';
import { calculateCanopySize } from './growth';
import { calculateSolarAltitude, degToRad } from './solar';

export function calculateShadowRadiusAtHeight(
  canopy: CanopySize,
  canopyCenterHeight: number,
  sunAltitudeDeg: number,
  targetHeight: number
): number {
  const altitudeRad = degToRad(sunAltitudeDeg);
  if (altitudeRad <= 0) return Infinity;
  const heightDiff = canopyCenterHeight - targetHeight;
  const shadowSpread = heightDiff / Math.tan(altitudeRad);
  return canopy.radius + shadowSpread * 0.3;
}

export function calculateShadowCenter(
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunAltitudeDeg: number,
  targetHeight: number
): [number, number, number] {
  const altitudeRad = degToRad(sunAltitudeDeg);
  if (altitudeRad <= 0) {
    return [treePosition[0], targetHeight, treePosition[2]];
  }
  const canopyCenterHeight = canopy.trunkHeight + canopy.height * 0.5;
  const heightDiff = canopyCenterHeight - targetHeight;
  const shadowDistance = heightDiff / Math.tan(altitudeRad);
  return [
    treePosition[0] - shadowDistance * 0.3,
    targetHeight,
    treePosition[2],
  ];
}

export function pointInShadow(
  point: [number, number, number],
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunAltitudeDeg: number
): boolean {
  const shadowCenter = calculateShadowCenter(
    treePosition,
    canopy,
    sunAltitudeDeg,
    point[1]
  );
  const shadowRadius = calculateShadowRadiusAtHeight(
    canopy,
    canopy.trunkHeight + canopy.height * 0.5,
    sunAltitudeDeg,
    point[1]
  );
  const dx = point[0] - shadowCenter[0];
  const dz = point[2] - shadowCenter[2];
  const distance = Math.sqrt(dx * dx + dz * dz);
  return distance <= shadowRadius;
}

export function calculateWindowShadowCoverage(
  window: WindowData,
  treePosition: [number, number, number],
  canopy: CanopySize,
  sunAltitudeDeg: number,
  samples: number = 25
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
      if (pointInShadow(samplePoint, treePosition, canopy, sunAltitudeDeg)) {
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
  season: 'summer' | 'winter'
): LightingAssessment {
  const canopy = calculateCanopySize(treeSpecies, treeYears);
  const isWinterDeciduous = season === 'winter' && treeSpecies === 'deciduous';
  const effectiveCanopy = isWinterDeciduous
    ? { ...canopy, radius: 0.05, height: 0.05 }
    : canopy;
  const summerAlt = calculateSolarAltitude(latitude, 'summer');
  const winterAlt = calculateSolarAltitude(latitude, 'winter');
  const currentAlt = season === 'summer' ? summerAlt : winterAlt;
  const windowAssessments: WindowAssessment[] = windows.map((w) => {
    const currentCoverage = isWinterDeciduous
      ? 0
      : calculateWindowShadowCoverage(
          w,
          treePosition,
          effectiveCanopy,
          currentAlt
        );
    const winterCoverage =
      treeSpecies === 'deciduous'
        ? 0
        : calculateWindowShadowCoverage(
            w,
            treePosition,
            canopy,
            winterAlt
          );
    const summerCoverage = calculateWindowShadowCoverage(
      w,
      treePosition,
      canopy,
      summerAlt
    );
    const isPermanentlyBlocked =
      treeSpecies === 'evergreen' &&
      summerCoverage > 0.95 &&
      winterCoverage > 0.95;
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
