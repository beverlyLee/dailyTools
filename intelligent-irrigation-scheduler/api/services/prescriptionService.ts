import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type {
  PrescriptionRequest,
  PrescriptionResponse,
} from '../../shared/types.js';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function findRainEndDate(weather: PrescriptionRequest['weather']): string | undefined {
  const { hourly } = weather;
  let lastRainHour = -1;
  for (let i = 0; i < hourly.length; i++) {
    if (hourly[i].precipitationProb > 60 && hourly[i].precipitation > 1) {
      lastRainHour = i;
    }
  }
  if (lastRainHour === -1) return undefined;
  const rainEnd = dayjs().add(lastRainHour + 1, 'hour');
  const nextDay = rainEnd.startOf('day').add(1, 'day');
  return nextDay.format('YYYY-MM-DD');
}

export function generatePrescription(req: PrescriptionRequest): PrescriptionResponse {
  const { crop, soil, soilSimulation, weather, pumpFlow, irrigationEfficiency, preferredTime, preferredDate } = req;

  const warnings: string[] = [];
  const isValid = !weather.hasEffectiveRain;

  if (weather.hasEffectiveRain) {
    warnings.push(`未来72小时预计累计降水${weather.totalExpectedRain}mm，建议延后灌溉`);
  }

  const fieldCapacityMm = (soil.fieldCapacity / 100) * soil.bulkDensity * crop.rootDepth * 10;
  const currentMoistureMm = (soil.initialMoisture / 100) * soil.bulkDensity * crop.rootDepth * 10;
  const deficit = Math.max(0, fieldCapacityMm - currentMoistureMm);

  const targetMoistureMm = deficit * 0.9;
  const waterDepth = round2(targetMoistureMm / irrigationEfficiency);
  const waterAmount = round2(waterDepth * crop.plantingArea * (2000 / 3) / 1000);
  const durationMinutes = round2((waterAmount / pumpFlow) * 60);

  const waterAmountMin = round2(waterAmount * 0.8);
  const waterAmountMax = round2(waterAmount * 1.2);
  const durationMin = round2(durationMinutes * 0.8);
  const durationMax = round2(durationMinutes * 1.2);

  const today = dayjs();
  const baseDate = preferredDate ?? today.format('YYYY-MM-DD');
  const recDate = preferredDate
    ? dayjs(preferredDate).format('YYYY-MM-DD')
    : today.format('YYYY-MM-DD');
  const recTime = preferredTime ?? '06:00';

  const suggestedAlternativeDate = weather.hasEffectiveRain
    ? findRainEndDate(weather) ?? today.add(3, 'day').format('YYYY-MM-DD')
    : undefined;

  const delayReason = weather.hasEffectiveRain
    ? '未来72小时预计有中雨，建议待雨后再评估'
    : undefined;

  if (soilSimulation.currentDeficit > 60) {
    warnings.push(`当前土壤水分亏缺${soilSimulation.currentDeficit}mm，建议尽早灌溉避免影响产量`);
  }
  if (crop.cropCoefficient > 1.0) {
    warnings.push(`当前处于作物${crop.growthStage}，作物系数较高，水分需求旺盛`);
  }
  if (soil.soilTexture === 'sand') {
    warnings.push('砂质土壤保水能力差，建议采用少量多次灌溉策略');
  }
  if (soil.soilTexture === 'clay') {
    warnings.push('黏质土壤入渗慢，注意控制灌溉强度避免地表径流');
  }

  const rainfallBackupPlan = weather.hasEffectiveRain
    ? `建议于${suggestedAlternativeDate ?? '降雨结束后1-2天'}重新评估土壤墒情，若雨后含水量仍低于田间持水量60%再进行补灌`
    : '灌溉后如遇有效降雨，可在下一周期减少20%-30%灌水量，避免涝害和养分淋失';

  return {
    prescriptionId: uuidv4(),
    recommendedDate: recDate,
    recommendedTime: recTime,
    waterAmount,
    waterDepth,
    durationMinutes,
    estimatedCost: 0,
    isValid,
    delayReason,
    suggestedAlternativeDate,
    adjustments: {
      waterAmountMin,
      waterAmountMax,
      durationMin,
      durationMax,
    },
    rainfallBackupPlan,
    warnings,
  };
}
