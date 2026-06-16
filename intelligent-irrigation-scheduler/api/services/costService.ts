import dayjs from 'dayjs';
import type {
  CostCalculateRequest,
  CostDetail,
  CostCompareRequest,
  CostCompareResponse,
} from '../../shared/types.js';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateCost(req: CostCalculateRequest): CostDetail {
  const { config, waterAmount, durationMinutes, area } = req;
  const durationHours = durationMinutes / 60;

  const electricityCost = round2(config.pumpPower * durationHours * config.electricityPrice);
  const waterCost = round2(waterAmount * config.waterPrice);
  const laborCost = round2(durationHours * config.laborCostPerHour);
  const totalCost = round2(electricityCost + waterCost + laborCost);

  const unitCostPerMu = round2(area > 0 ? totalCost / area : 0);
  const unitCostPerM3 = round2(waterAmount > 0 ? totalCost / waterAmount : 0);

  const breakdown = [
    { label: '电费', value: electricityCost, percent: totalCost > 0 ? round2((electricityCost / totalCost) * 100) : 0 },
    { label: '水费', value: waterCost, percent: totalCost > 0 ? round2((waterCost / totalCost) * 100) : 0 },
    { label: '人工费', value: laborCost, percent: totalCost > 0 ? round2((laborCost / totalCost) * 100) : 0 },
  ];

  return {
    electricityCost,
    waterCost,
    laborCost,
    totalCost,
    unitCostPerMu,
    unitCostPerM3,
    breakdown,
  };
}

export function compareCosts(req: CostCompareRequest): CostCompareResponse {
  const { config, months, area, irrigationFrequency, avgWaterPerIrrigation } = req;
  const monthList: string[] = [];
  const traditionalCostPerMonth: number[] = [];
  const smartCostPerMonth: number[] = [];
  let traditionalTotalWater = 0;
  let smartTotalWater = 0;

  for (let i = 0; i < months; i++) {
    const m = dayjs().add(i - months + 1, 'month');
    monthList.push(m.format('YYYY-MM'));

    const seasonalFactor = 0.8 + Math.sin((i / months) * Math.PI) * 0.4;

    const tradFreq = irrigationFrequency.traditional * seasonalFactor;
    const smartFreq = irrigationFrequency.smart * seasonalFactor;

    const tradWater = avgWaterPerIrrigation.traditional * tradFreq;
    const smartWater = avgWaterPerIrrigation.smart * smartFreq;

    traditionalTotalWater += tradWater;
    smartTotalWater += smartWater;

    const tradHours = tradWater / config.pumpFlow;
    const smartHours = smartWater / config.pumpFlow;

    const tradCost =
      config.pumpPower * tradHours * config.electricityPrice +
      tradWater * config.waterPrice +
      tradHours * config.laborCostPerHour;
    const smartCost =
      config.pumpPower * smartHours * config.electricityPrice +
      smartWater * config.waterPrice +
      smartHours * config.laborCostPerHour;

    traditionalCostPerMonth.push(round2(tradCost));
    smartCostPerMonth.push(round2(smartCost));
  }

  const traditionalTotalCost = round2(traditionalCostPerMonth.reduce((s, v) => s + v, 0));
  const smartTotalCost = round2(smartCostPerMonth.reduce((s, v) => s + v, 0));

  const savingsCost = round2(traditionalTotalCost - smartTotalCost);
  const savingsWater = round2(traditionalTotalWater - smartTotalWater);
  const savingsPercent = round2(traditionalTotalCost > 0 ? (savingsCost / traditionalTotalCost) * 100 : 0);

  const monthlyComparison = monthList.map((month, i) => ({
    month,
    traditional: traditionalCostPerMonth[i],
    smart: smartCostPerMonth[i],
  }));

  return {
    months,
    traditional: {
      totalCost: traditionalTotalCost,
      totalWater: round2(traditionalTotalWater),
      costPerMonth: traditionalCostPerMonth,
    },
    smart: {
      totalCost: smartTotalCost,
      totalWater: round2(smartTotalWater),
      costPerMonth: smartCostPerMonth,
    },
    savings: {
      cost: savingsCost,
      water: savingsWater,
      percent: savingsPercent,
    },
    monthlyComparison,
  };
}
