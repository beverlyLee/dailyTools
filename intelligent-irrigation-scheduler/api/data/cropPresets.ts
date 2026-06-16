import type { CropType } from '../../shared/types.js';

export interface GrowthStageParams {
  stageName: string;
  stageKey: string;
  cropCoefficient: number;
  rootDepth: number;
  days?: number;
}

export interface CropPreset {
  cropType: CropType;
  cropName: string;
  stages: GrowthStageParams[];
}

export const wheatPreset: CropPreset = {
  cropType: 'wheat',
  cropName: '小麦',
  stages: [
    { stageName: '苗期', stageKey: 'seedling', cropCoefficient: 0.35, rootDepth: 40, days: 30 },
    { stageName: '越冬', stageKey: 'overwinter', cropCoefficient: 0.25, rootDepth: 60, days: 90 },
    { stageName: '返青', stageKey: 'reviving', cropCoefficient: 0.55, rootDepth: 80, days: 25 },
    { stageName: '拔节', stageKey: 'jointing', cropCoefficient: 0.95, rootDepth: 100, days: 30 },
    { stageName: '抽穗', stageKey: 'heading', cropCoefficient: 1.15, rootDepth: 120, days: 20 },
    { stageName: '灌浆', stageKey: 'filling', cropCoefficient: 0.85, rootDepth: 120, days: 35 },
  ],
};

export const cornPreset: CropPreset = {
  cropType: 'corn',
  cropName: '玉米',
  stages: [
    { stageName: '苗期', stageKey: 'seedling', cropCoefficient: 0.35, rootDepth: 30, days: 25 },
    { stageName: '拔节', stageKey: 'jointing', cropCoefficient: 0.75, rootDepth: 70, days: 25 },
    { stageName: '抽雄', stageKey: 'tasseling', cropCoefficient: 1.20, rootDepth: 110, days: 20 },
    { stageName: '灌浆', stageKey: 'filling', cropCoefficient: 1.05, rootDepth: 130, days: 35 },
    { stageName: '成熟', stageKey: 'maturity', cropCoefficient: 0.65, rootDepth: 130, days: 30 },
  ],
};

export const cottonPreset: CropPreset = {
  cropType: 'cotton',
  cropName: '棉花',
  stages: [
    { stageName: '苗期', stageKey: 'seedling', cropCoefficient: 0.35, rootDepth: 35, days: 40 },
    { stageName: '蕾期', stageKey: 'bud', cropCoefficient: 0.70, rootDepth: 75, days: 30 },
    { stageName: '花铃', stageKey: 'flower_boll', cropCoefficient: 1.15, rootDepth: 120, days: 55 },
    { stageName: '吐絮', stageKey: 'boll_opening', cropCoefficient: 0.75, rootDepth: 130, days: 60 },
  ],
};

export const soybeanPreset: CropPreset = {
  cropType: 'soybean',
  cropName: '大豆',
  stages: [
    { stageName: '苗期', stageKey: 'seedling', cropCoefficient: 0.40, rootDepth: 30, days: 25 },
    { stageName: '开花', stageKey: 'flowering', cropCoefficient: 0.85, rootDepth: 70, days: 20 },
    { stageName: '结荚', stageKey: 'pod', cropCoefficient: 1.10, rootDepth: 110, days: 30 },
    { stageName: '鼓粒', stageKey: 'seed_filling', cropCoefficient: 0.95, rootDepth: 120, days: 35 },
  ],
};

export const defaultPreset: CropPreset = {
  cropType: 'other',
  cropName: '其他作物',
  stages: [
    { stageName: '生长初期', stageKey: 'initial', cropCoefficient: 0.40, rootDepth: 40 },
    { stageName: '生长中期', stageKey: 'mid', cropCoefficient: 0.95, rootDepth: 90 },
    { stageName: '生长后期', stageKey: 'late', cropCoefficient: 0.70, rootDepth: 100 },
  ],
};

export const cropPresetsMap: Record<CropType, CropPreset> = {
  wheat: wheatPreset,
  corn: cornPreset,
  cotton: cottonPreset,
  soybean: soybeanPreset,
  rice: defaultPreset,
  other: defaultPreset,
};

export function getCropPreset(cropType: CropType): CropPreset {
  return cropPresetsMap[cropType] ?? defaultPreset;
}

export function getGrowthStageParams(
  cropType: CropType,
  stageKey?: string,
): GrowthStageParams {
  const preset = getCropPreset(cropType);
  if (!stageKey) {
    return preset.stages[Math.floor(preset.stages.length / 2)];
  }
  const stage = preset.stages.find((s) => s.stageKey === stageKey);
  return stage ?? preset.stages[0];
}

export interface SoilTextureDefaults {
  fieldCapacity: number;
  wiltingPoint: number;
  bulkDensity: number;
}

export const soilTextureDefaults: Record<string, SoilTextureDefaults> = {
  sand: { fieldCapacity: 18, wiltingPoint: 4, bulkDensity: 1.55 },
  loam: { fieldCapacity: 26, wiltingPoint: 10, bulkDensity: 1.40 },
  clay: { fieldCapacity: 34, wiltingPoint: 16, bulkDensity: 1.25 },
};

export function getSoilDefaults(soilTexture: string): SoilTextureDefaults {
  return soilTextureDefaults[soilTexture] ?? soilTextureDefaults.loam;
}
