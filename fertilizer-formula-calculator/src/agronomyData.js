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
