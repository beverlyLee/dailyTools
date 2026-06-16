const STORAGE_KEY = 'fertilizer_calculator_custom_crops';

export function getCustomCrops() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

export function saveCustomCrop(id, cropData) {
  const crops = getCustomCrops();
  crops[id] = {
    ...cropData,
    id,
    isCustom: true,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(crops));
  return crops;
}

export function deleteCustomCrop(id) {
  const crops = getCustomCrops();
  delete crops[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(crops));
  return crops;
}

export function getAllCrops(builtInCrops) {
  const customCrops = getCustomCrops();
  return { ...builtInCrops, ...customCrops };
}

export function generateCropId() {
  return 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function isValidCropData(data) {
  if (!data.name || !data.name.trim()) return false;
  if (!data.nutrientUptake) return false;
  if (typeof data.nutrientUptake.N !== 'number' || data.nutrientUptake.N <= 0) return false;
  if (typeof data.nutrientUptake.P2O5 !== 'number' || data.nutrientUptake.P2O5 <= 0) return false;
  if (typeof data.nutrientUptake.K2O !== 'number' || data.nutrientUptake.K2O <= 0) return false;
  return true;
}

export function getDefaultCropTemplate() {
  return {
    name: '',
    unit: '公斤/亩',
    nutrientUptake: {
      N: 2.5,
      P2O5: 1.0,
      K2O: 2.5
    },
    baseFertilizerRatio: {
      N: 0.5,
      P2O5: 0.7,
      K2O: 0.7
    },
    topDressingRatio: {
      N: 0.5,
      P2O5: 0.3,
      K2O: 0.3
    },
    topDressingStage: '旺盛生长期',
    applicationMethod: {
      base: '深施（15-20cm）',
      top: '条施或穴施'
    },
    growthStages: [
      { name: '基肥', timing: '播种/移栽前', ratio: 0.3 },
      { name: '苗肥', timing: '苗期', ratio: 0.2 },
      { name: '花果肥', timing: '开花结果期', ratio: 0.3 },
      { name: '壮果肥', timing: '果实膨大期', ratio: 0.2 }
    ]
  };
}
