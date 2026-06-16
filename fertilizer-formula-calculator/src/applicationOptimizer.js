import { CROPS, FERTILIZERS, FERTILIZER_EFFICIENCY } from './agronomyData.js';
import { calculateNutrientBalance, calculateNutrientDemand } from './nutrientCalculator.js';
import { generateFertilizerPlan } from './fertilizerConverter.js';

export const FERTILIZER_PLAN_TYPE = 'traditional';

export function splitFertilizerByStage(nutrientNeeded, cropType) {
  const crop = CROPS[cropType];
  if (!crop) {
    throw new Error(`未知作物类型: ${cropType}`);
  }

  const { baseFertilizerRatio, topDressingRatio, topDressingStage, applicationMethod } = crop;

  const baseFertilizer = {
    N: nutrientNeeded.N * baseFertilizerRatio.N,
    P2O5: nutrientNeeded.P2O5 * baseFertilizerRatio.P2O5,
    K2O: nutrientNeeded.K2O * baseFertilizerRatio.K2O
  };

  const topDressing = {
    N: nutrientNeeded.N * topDressingRatio.N,
    P2O5: nutrientNeeded.P2O5 * topDressingRatio.P2O5,
    K2O: nutrientNeeded.K2O * topDressingRatio.K2O
  };

  return {
    baseFertilizer,
    topDressing,
    topDressingStage,
    applicationMethod
  };
}

export function generateApplicationPlan(nutrientNeeded, cropType) {
  const split = splitFertilizerByStage(nutrientNeeded, cropType);
  const crop = CROPS[cropType];

  const basePlan = generateFertilizerPlan(split.baseFertilizer, FERTILIZER_PLAN_TYPE);
  const topPlan = generateFertilizerPlan(split.topDressing, FERTILIZER_PLAN_TYPE);

  const format = (val) => val.toFixed(2);

  return {
    crop: crop.name,
    stages: [
      {
        stage: '基肥',
        timing: '播种前',
        method: split.applicationMethod.base,
        nutrients: {
          '氮(N)': format(split.baseFertilizer.N),
          '磷(P₂O₅)': format(split.baseFertilizer.P2O5),
          '钾(K₂O)': format(split.baseFertilizer.K2O)
        },
        fertilizers: basePlan.items.map(item => ({
          name: item.fertilizer,
          amount: `${format(item.amount)} ${item.unit}`
        })),
        cost: `${format(basePlan.totalCost)} ${basePlan.currencyUnit}`
      },
      {
        stage: '追肥',
        timing: split.topDressingStage,
        method: split.applicationMethod.top,
        nutrients: {
          '氮(N)': format(split.topDressing.N),
          '磷(P₂O₅)': format(split.topDressing.P2O5),
          '钾(K₂O)': format(split.topDressing.K2O)
        },
        fertilizers: topPlan.items.map(item => ({
          name: item.fertilizer,
          amount: `${format(item.amount)} ${item.unit}`
        })),
        cost: `${format(topPlan.totalCost)} ${topPlan.currencyUnit}`
      }
    ],
    totalCost: `${format(basePlan.totalCost + topPlan.totalCost)} 元/亩`
  };
}

export function generateBlindFertilizationPlan(cropType, targetYield) {
  const crop = CROPS[cropType];
  const demand = calculateNutrientDemand(cropType, targetYield);
  
  const overApplicationRatio = 1.2;
  
  const blindNutrientsNeeded = {
    N: (demand.N / FERTILIZER_EFFICIENCY.N) * overApplicationRatio,
    P2O5: (demand.P2O5 / FERTILIZER_EFFICIENCY.P2O5) * overApplicationRatio,
    K2O: (demand.K2O / FERTILIZER_EFFICIENCY.K2O) * overApplicationRatio
  };

  const blindPlan = generateFertilizerPlan(blindNutrientsNeeded, FERTILIZER_PLAN_TYPE);

  const format = (val) => val.toFixed(2);

  return {
    title: '盲目施肥方案（传统经验）',
    description: '基于传统经验施肥，不考虑土壤供肥能力，习惯过量施用（约超量20%）',
    nutrientsNeeded: blindNutrientsNeeded,
    nutrientDemand: demand,
    fertilizers: blindPlan.items.map(item => ({
      name: item.fertilizer,
      amount: `${format(item.amount)} ${item.unit}`,
      cost: `${format(item.amount * item.price)} 元/亩`
    })),
    totalCost: `${format(blindPlan.totalCost)} 元/亩`,
    rawCost: blindPlan.totalCost,
    rawPlan: blindPlan
  };
}

export function compareFertilizationPlans(precisionPlan, blindPlan, fertilizerNeeded) {
  const format = (val) => val.toFixed(2);
  const precisionTotal = precisionPlan.totalCost;
  const blindTotal = blindPlan.rawCost;

  const costDifference = blindTotal - precisionTotal;
  const savingRate = ((costDifference / blindTotal) * 100).toFixed(1);

  const getUreaAmount = (plan) => {
    const item = plan.items?.find(i => i.fertilizer === '尿素');
    return item ? item.amount : 0;
  };

  const ureaPrecision = getUreaAmount(precisionPlan);
  const ureaBlind = getUreaAmount(blindPlan.rawPlan);
  const ureaSaving = Math.max(0, ureaBlind - ureaPrecision);

  const blindNutrients = blindPlan.nutrientsNeeded;

  const nutrientComparison = {
    '氮(N)': {
      精准施肥: format(fertilizerNeeded.N),
      盲目施肥: format(blindNutrients.N),
      差异: format(blindNutrients.N - fertilizerNeeded.N)
    },
    '磷(P₂O₅)': {
      精准施肥: format(fertilizerNeeded.P2O5),
      盲目施肥: format(blindNutrients.P2O5),
      差异: format(blindNutrients.P2O5 - fertilizerNeeded.P2O5)
    },
    '钾(K₂O)': {
      精准施肥: format(fertilizerNeeded.K2O),
      盲目施肥: format(blindNutrients.K2O),
      差异: format(blindNutrients.K2O - fertilizerNeeded.K2O)
    }
  };

  return {
    title: '施肥方案对比分析',
    nutrientComparison,
    costComparison: {
      精准施肥: `${format(precisionTotal)} 元/亩`,
      盲目施肥: `${format(blindTotal)} 元/亩`,
      节本金额: `${format(costDifference)} 元/亩`,
      节本率: `${savingRate}%`
    },
    fertilizerSaving: {
      尿素节约: `${format(ureaSaving)} 公斤/亩`,
      总节约金额: `${format(costDifference)} 元/亩`
    },
    benefits: [
      '减少化肥过量施用，降低农业面源污染风险',
      '避免养分失衡，提高作物品质',
      '根据土壤实际情况施肥，提高肥料利用率',
      '量化节本增效，提升种植效益'
    ]
  };
}

export function generateCompletePlan(cropType, targetYield, soilNutrients) {
  const nutrientResult = calculateNutrientBalance(cropType, targetYield, soilNutrients);
  const fertilizerPlan = generateFertilizerPlan(nutrientResult.fertilizerNeeded, FERTILIZER_PLAN_TYPE);
  const applicationPlan = generateApplicationPlan(nutrientResult.fertilizerNeeded, cropType);
  const blindPlan = generateBlindFertilizationPlan(cropType, targetYield);
  const comparison = compareFertilizationPlans(fertilizerPlan, blindPlan, nutrientResult.fertilizerNeeded);

  return {
    nutrientResult,
    fertilizerPlan,
    applicationPlan,
    blindPlan,
    comparison
  };
}
