import { CROPS, FERTILIZER_EFFICIENCY, SOIL_NUTRIENT_COEFFICIENT } from './agronomyData.js';

export function calculateNutrientDemand(cropType, targetYield) {
  const crop = CROPS[cropType];
  if (!crop) {
    throw new Error(`未知作物类型: ${cropType}`);
  }

  const { nutrientUptake } = crop;

  return {
    N: targetYield * nutrientUptake.N / 100,
    P2O5: targetYield * nutrientUptake.P2O5 / 100,
    K2O: targetYield * nutrientUptake.K2O / 100
  };
}

export function calculateSoilSupply(soilNutrients) {
  return {
    N: soilNutrients.N * SOIL_NUTRIENT_COEFFICIENT.N,
    P2O5: soilNutrients.P2O5 * SOIL_NUTRIENT_COEFFICIENT.P2O5,
    K2O: soilNutrients.K2O * SOIL_NUTRIENT_COEFFICIENT.K2O
  };
}

export function calculateNutrientBalance(cropType, targetYield, soilNutrients) {
  const demand = calculateNutrientDemand(cropType, targetYield);
  const supply = calculateSoilSupply(soilNutrients);

  const balance = {
    N: demand.N - supply.N,
    P2O5: demand.P2O5 - supply.P2O5,
    K2O: demand.K2O - supply.K2O
  };

  return {
    demand,
    supply,
    balance,
    fertilizerNeeded: {
      N: balance.N > 0 ? balance.N / FERTILIZER_EFFICIENCY.N : 0,
      P2O5: balance.P2O5 > 0 ? balance.P2O5 / FERTILIZER_EFFICIENCY.P2O5 : 0,
      K2O: balance.K2O > 0 ? balance.K2O / FERTILIZER_EFFICIENCY.K2O : 0
    }
  };
}

export function formatNutrientResult(result, cropType, targetYield) {
  const crop = CROPS[cropType];
  const { demand, supply, balance, fertilizerNeeded } = result;

  const format = (val) => val.toFixed(2);

  return {
    cropInfo: `${crop.name} 目标产量：${targetYield} ${crop.unit}`,
    nutrientDemand: {
      title: '目标产量养分需求量（公斤/亩）',
      data: {
        '氮(N)': format(demand.N),
        '磷(P₂O₅)': format(demand.P2O5),
        '钾(K₂O)': format(demand.K2O)
      }
    },
    soilSupply: {
      title: '土壤供肥量（公斤/亩）',
      data: {
        '氮(N)': format(supply.N),
        '磷(P₂O₅)': format(supply.P2O5),
        '钾(K₂O)': format(supply.K2O)
      }
    },
    nutrientBalance: {
      title: '土壤养分盈亏（公斤/亩）',
      data: {
        '氮(N)': format(balance.N),
        '磷(P₂O₅)': format(balance.P2O5),
        '钾(K₂O)': format(balance.K2O)
      }
    },
    fertilizerNeeded: {
      title: '需要补充的纯养分量（公斤/亩）',
      data: {
        '氮(N)': format(fertilizerNeeded.N),
        '磷(P₂O₅)': format(fertilizerNeeded.P2O5),
        '钾(K₂O)': format(fertilizerNeeded.K2O)
      }
    }
  };
}
