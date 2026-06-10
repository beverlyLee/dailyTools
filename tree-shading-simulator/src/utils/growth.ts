import type { TreeSpecies, GrowthYear, CanopySize } from '../types';

const GROWTH_TABLE: Record<TreeSpecies, Record<GrowthYear, CanopySize>> = {
  deciduous: {
    5: { radius: 3.0, height: 8.0, trunkHeight: 2.5 },
    10: { radius: 5.0, height: 12.0, trunkHeight: 3.5 },
  },
  evergreen: {
    5: { radius: 2.0, height: 6.0, trunkHeight: 1.5 },
    10: { radius: 3.5, height: 9.0, trunkHeight: 2.5 },
  },
};

export function calculateCanopySize(
  species: TreeSpecies,
  years: GrowthYear
): CanopySize {
  return GROWTH_TABLE[species][years];
}

export function interpolateCanopySize(
  species: TreeSpecies,
  targetYears: number
): CanopySize {
  const base = GROWTH_TABLE[species];
  if (targetYears <= 5) {
    const t = targetYears / 5;
    return {
      radius: base[5].radius * t + 0.5 * (1 - t),
      height: base[5].height * t + 1.5 * (1 - t),
      trunkHeight: base[5].trunkHeight * t + 0.8 * (1 - t),
    };
  } else if (targetYears >= 10) {
    const extra = (targetYears - 10) * 0.05;
    return {
      radius: base[10].radius * (1 + extra),
      height: base[10].height * (1 + extra),
      trunkHeight: base[10].trunkHeight * (1 + extra * 0.5),
    };
  } else {
    const t = (targetYears - 5) / 5;
    return {
      radius: base[5].radius + (base[10].radius - base[5].radius) * t,
      height: base[5].height + (base[10].height - base[5].height) * t,
      trunkHeight:
        base[5].trunkHeight + (base[10].trunkHeight - base[5].trunkHeight) * t,
    };
  }
}

export function getSpeciesName(species: TreeSpecies): string {
  return species === 'deciduous' ? '落叶乔木' : '常绿乔木';
}

export function getSpeciesDescription(species: TreeSpecies): string {
  return species === 'deciduous'
    ? '冬季落叶，树冠消失，阳光可射入室内'
    : '四季常青，全年保持树冠，持续遮阴';
}
