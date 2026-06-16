export const SOIL_TYPES = {
  blackSoil: {
    name: '东北黑土',
    region: '东北平原',
    description: '有机质含量高，土壤肥沃，保肥能力强',
    typicalNutrients: {
      N: 120,
      P2O5: 25,
      K2O: 180
    },
    nutrientCoefficient: {
      N: 0.07,
      P2O5: 0.035,
      K2O: 0.07
    },
    fertility: '高'
  },
  fluvoAquic: {
    name: '华北潮土',
    region: '华北平原',
    description: '土层深厚，保肥保水能力中等，是我国主要农业土壤',
    typicalNutrients: {
      N: 80,
      P2O5: 20,
      K2O: 120
    },
    nutrientCoefficient: {
      N: 0.06,
      P2O5: 0.03,
      K2O: 0.06
    },
    fertility: '中'
  },
  redSoil: {
    name: '南方红壤',
    region: '南方丘陵地区',
    description: '酸性土壤，磷易被固定，钾含量较低',
    typicalNutrients: {
      N: 60,
      P2O5: 10,
      K2O: 80
    },
    nutrientCoefficient: {
      N: 0.05,
      P2O5: 0.02,
      K2O: 0.05
    },
    fertility: '中低'
  },
  yellowBrownSoil: {
    name: '黄棕壤',
    region: '长江中下游',
    description: '介于黄壤和棕壤之间，肥力中等',
    typicalNutrients: {
      N: 70,
      P2O5: 15,
      K2O: 100
    },
    nutrientCoefficient: {
      N: 0.055,
      P2O5: 0.025,
      K2O: 0.055
    },
    fertility: '中'
  },
  purpleSoil: {
    name: '四川紫色土',
    region: '四川盆地',
    description: '矿质养分丰富，磷钾含量高，肥力较高',
    typicalNutrients: {
      N: 90,
      P2O5: 25,
      K2O: 150
    },
    nutrientCoefficient: {
      N: 0.06,
      P2O5: 0.035,
      K2O: 0.065
    },
    fertility: '中高'
  },
  loessSoil: {
    name: '黄土高原垆土',
    region: '黄土高原',
    description: '土层深厚，有机质含量低，保水保肥能力较差',
    typicalNutrients: {
      N: 50,
      P2O5: 12,
      K2O: 100
    },
    nutrientCoefficient: {
      N: 0.05,
      P2O5: 0.025,
      K2O: 0.06
    },
    fertility: '低中'
  },
  paddySoil: {
    name: '水稻土',
    region: '南方稻区',
    description: '长期水耕熟化形成，有机质含量较高，还原性强',
    typicalNutrients: {
      N: 100,
      P2O5: 18,
      K2O: 90
    },
    nutrientCoefficient: {
      N: 0.065,
      P2O5: 0.025,
      K2O: 0.05
    },
    fertility: '中高'
  },
  desertSoil: {
    name: '西北荒漠土',
    region: '西北地区',
    description: '有机质含量极低，盐分含量高，需要改良',
    typicalNutrients: {
      N: 30,
      P2O5: 8,
      K2O: 140
    },
    nutrientCoefficient: {
      N: 0.04,
      P2O5: 0.02,
      K2O: 0.07
    },
    fertility: '低'
  }
};

export const CROPS = {
  wheat: {
    name: '小麦',
    unit: '公斤/亩',
    nutrientUptake: {
      N: 3.0,
      P2O5: 1.2,
      K2O: 2.8
    },
    baseFertilizerRatio: {
      N: 0.5,
      P2O5: 0.8,
      K2O: 0.8
    },
    topDressingRatio: {
      N: 0.5,
      P2O5: 0.2,
      K2O: 0.2
    },
    topDressingStage: '返青-拔节期',
    applicationMethod: {
      base: '深施（15-20cm）',
      top: '条施（结合浇水）'
    }
  },
  corn: {
    name: '玉米',
    unit: '公斤/亩',
    nutrientUptake: {
      N: 2.6,
      P2O5: 0.9,
      K2O: 2.2
    },
    baseFertilizerRatio: {
      N: 0.4,
      P2O5: 0.7,
      K2O: 0.7
    },
    topDressingRatio: {
      N: 0.6,
      P2O5: 0.3,
      K2O: 0.3
    },
    topDressingStage: '大喇叭口期',
    applicationMethod: {
      base: '深施（15-20cm）',
      top: '穴施或条施'
    }
  },
  rice: {
    name: '水稻',
    unit: '公斤/亩',
    nutrientUptake: {
      N: 2.2,
      P2O5: 0.8,
      K2O: 2.5
    },
    baseFertilizerRatio: {
      N: 0.5,
      P2O5: 0.7,
      K2O: 0.6
    },
    topDressingRatio: {
      N: 0.5,
      P2O5: 0.3,
      K2O: 0.4
    },
    topDressingStage: '分蘖期-孕穗期',
    applicationMethod: {
      base: '全层深施',
      top: '撒施（保持水层）'
    }
  }
};

export const FERTILIZERS = {
  urea: {
    name: '尿素',
    nutrient: 'N',
    content: 0.46,
    price: 2.8,
    unit: '元/公斤'
  },
  diammonium: {
    name: '磷酸二铵',
    nutrient: { N: 0.18, P2O5: 0.46 },
    price: 3.8,
    unit: '元/公斤'
  },
  potassiumChloride: {
    name: '氯化钾',
    nutrient: 'K2O',
    content: 0.60,
    price: 3.2,
    unit: '元/公斤'
  },
  compoundNPK15: {
    name: '复合肥(15-15-15)',
    nutrient: { N: 0.15, P2O5: 0.15, K2O: 0.15 },
    price: 3.5,
    unit: '元/公斤'
  }
};

export const FERTILIZER_EFFICIENCY = {
  N: 0.40,
  P2O5: 0.25,
  K2O: 0.50
};

export const SOIL_NUTRIENT_COEFFICIENT = {
  N: 0.06,
  P2O5: 0.03,
  K2O: 0.06
};
