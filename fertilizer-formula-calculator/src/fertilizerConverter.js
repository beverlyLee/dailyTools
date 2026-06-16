import { FERTILIZERS } from './agronomyData.js';

export function calculateSingleFertilizerAmount(nutrientNeeded, fertilizerKey) {
  const fertilizer = FERTILIZERS[fertilizerKey];
  if (!fertilizer) {
    throw new Error(`未知肥料类型: ${fertilizerKey}`);
  }

  if (typeof fertilizer.nutrient === 'string') {
    const nutrientType = fertilizer.nutrient;
    const needed = nutrientNeeded[nutrientType] || 0;
    return {
      fertilizer: fertilizer.name,
      amount: needed / fertilizer.content,
      nutrientType,
      nutrientProvided: needed,
      price: fertilizer.price,
      unit: '公斤/亩'
    };
  }

  return null;
}

export function calculateCompoundFertilizerAmount(nutrientNeeded, fertilizerKey) {
  const fertilizer = FERTILIZERS[fertilizerKey];
  if (!fertilizer || typeof fertilizer.nutrient !== 'object') {
    return null;
  }

  let limitingAmount = Infinity;
  let limitingNutrient = null;

  for (const [nutrient, content] of Object.entries(fertilizer.nutrient)) {
    const needed = nutrientNeeded[nutrient] || 0;
    if (needed > 0 && content > 0) {
      const amount = needed / content;
      if (amount < limitingAmount) {
        limitingAmount = amount;
        limitingNutrient = nutrient;
      }
    }
  }

  if (limitingAmount === Infinity) {
    return null;
  }

  const nutrientsProvided = {};
  for (const [nutrient, content] of Object.entries(fertilizer.nutrient)) {
    nutrientsProvided[nutrient] = limitingAmount * content;
  }

  const remainingNeeded = {};
  for (const [nutrient, needed] of Object.entries(nutrientNeeded)) {
    remainingNeeded[nutrient] = Math.max(0, needed - (nutrientsProvided[nutrient] || 0));
  }

  return {
    fertilizer: fertilizer.name,
    amount: limitingAmount,
    limitingNutrient,
    nutrientsProvided,
    remainingNeeded,
    price: fertilizer.price,
    unit: '公斤/亩'
  };
}

export function generateFertilizerPlan(nutrientNeeded, planType = 'optimal') {
  const plan = [];
  let remainingNeeded = { ...nutrientNeeded };

  if (planType === 'optimal') {
    const compoundResult = calculateCompoundFertilizerAmount(remainingNeeded, 'compoundNPK15');
    if (compoundResult && compoundResult.amount > 0) {
      plan.push({
        type: 'compound',
        ...compoundResult
      });
      remainingNeeded = compoundResult.remainingNeeded;
    }

    if (remainingNeeded.N > 0.5) {
      const ureaAmount = remainingNeeded.N / FERTILIZERS.urea.content;
      plan.push({
        type: 'single',
        fertilizer: '尿素',
        amount: ureaAmount,
        nutrientType: 'N',
        nutrientProvided: remainingNeeded.N,
        price: FERTILIZERS.urea.price,
        unit: '公斤/亩'
      });
      remainingNeeded.N = 0;
    }

    if (remainingNeeded.P2O5 > 0.5) {
      const dapAmount = remainingNeeded.P2O5 / FERTILIZERS.diammonium.nutrient.P2O5;
      plan.push({
        type: 'single',
        fertilizer: '磷酸二铵',
        amount: dapAmount,
        nutrientType: 'P2O5',
        nutrientProvided: remainingNeeded.P2O5,
        price: FERTILIZERS.diammonium.price,
        unit: '公斤/亩'
      });
      remainingNeeded.P2O5 = 0;
    }

    if (remainingNeeded.K2O > 0.5) {
      const kclAmount = remainingNeeded.K2O / FERTILIZERS.potassiumChloride.content;
      plan.push({
        type: 'single',
        fertilizer: '氯化钾',
        amount: kclAmount,
        nutrientType: 'K2O',
        nutrientProvided: remainingNeeded.K2O,
        price: FERTILIZERS.potassiumChloride.price,
        unit: '公斤/亩'
      });
      remainingNeeded.K2O = 0;
    }
  } else if (planType === 'traditional') {
    if (nutrientNeeded.P2O5 > 0) {
      const dapAmount = nutrientNeeded.P2O5 / FERTILIZERS.diammonium.nutrient.P2O5;
      const nFromDap = dapAmount * FERTILIZERS.diammonium.nutrient.N;
      plan.push({
        type: 'single',
        fertilizer: '磷酸二铵',
        amount: dapAmount,
        nutrientType: 'P2O5',
        nutrientProvided: nutrientNeeded.P2O5,
        additionalN: nFromDap,
        price: FERTILIZERS.diammonium.price,
        unit: '公斤/亩'
      });
      remainingNeeded.N = Math.max(0, nutrientNeeded.N - nFromDap);
      remainingNeeded.P2O5 = 0;
    }

    if (remainingNeeded.N > 0) {
      const ureaAmount = remainingNeeded.N / FERTILIZERS.urea.content;
      plan.push({
        type: 'single',
        fertilizer: '尿素',
        amount: ureaAmount,
        nutrientType: 'N',
        nutrientProvided: remainingNeeded.N,
        price: FERTILIZERS.urea.price,
        unit: '公斤/亩'
      });
      remainingNeeded.N = 0;
    }

    if (nutrientNeeded.K2O > 0) {
      const kclAmount = nutrientNeeded.K2O / FERTILIZERS.potassiumChloride.content;
      plan.push({
        type: 'single',
        fertilizer: '氯化钾',
        amount: kclAmount,
        nutrientType: 'K2O',
        nutrientProvided: nutrientNeeded.K2O,
        price: FERTILIZERS.potassiumChloride.price,
        unit: '公斤/亩'
      });
      remainingNeeded.K2O = 0;
    }
  }

  const totalCost = plan.reduce((sum, item) => sum + item.amount * item.price, 0);

  return {
    items: plan,
    totalCost,
    currencyUnit: '元/亩',
    remainingNeeded
  };
}

export function formatFertilizerPlan(plan) {
  const format = (val) => val.toFixed(2);

  const items = plan.items.map((item, index) => ({
    序号: index + 1,
    肥料名称: item.fertilizer,
    用量: `${format(item.amount)} ${item.unit}`,
    单价: `${item.price} ${FERTILIZERS[Object.keys(FERTILIZERS).find(k => FERTILIZERS[k].name === item.fertilizer)]?.unit || '元/公斤'}`,
    金额: `${format(item.amount * item.price)} 元/亩`,
    提供养分: item.nutrientType 
      ? `${item.nutrientType}: ${format(item.nutrientProvided)} 公斤`
      : Object.entries(item.nutrientsProvided || {}).map(([n, v]) => `${n}: ${format(v)} 公斤`).join(', ')
  }));

  return {
    title: '采购清单',
    items,
    summary: {
      '总投入': `${format(plan.totalCost)} ${plan.currencyUnit}`
    }
  };
}
