import dayjs from 'dayjs';
import type {
  SoilSimulationRequest,
  SoilSimulationResponse,
  SoilMoisturePoint,
  MoistureStatus,
  WeatherResponse,
} from '../../shared/types.js';
import { generateMockWeather } from './weatherService.js';

function getMoistureStatus(moisture: number, fieldCapacity: number): MoistureStatus {
  const ratio = moisture / fieldCapacity;
  if (ratio > 0.7) return 'sufficient';
  if (ratio > 0.5) return 'moderate';
  if (ratio > 0.3) return 'deficit';
  return 'severe';
}

function aggregateDailyWeather(
  weather: WeatherResponse,
  startDate: string,
): { rainfall: number; et0: number }[] {
  const days: { rainfall: number; et0: number }[] = [];
  const start = dayjs(startDate);
  for (let d = 0; d < 7; d++) {
    const dateStr = start.add(d, 'day').format('YYYY-MM-DD');
    const dayHours = weather.hourly.filter((h) => h.time.startsWith(dateStr));
    const rainfall = dayHours.reduce((s, h) => s + h.precipitation, 0);
    const et0 = dayHours.reduce((s, h) => s + h.evaporation, 0);
    days.push({ rainfall, et0 });
  }
  return days;
}

function calcEffectiveRainfall(rainfall: number): number {
  if (rainfall <= 0) return 0;
  if (rainfall < 5) return rainfall * 0.7;
  if (rainfall < 20) return rainfall * 0.85;
  return rainfall * 0.9;
}

function calcDeepPercolation(
  moisture: number,
  fieldCapacity: number,
  soilTexture: string,
): number {
  if (moisture <= fieldCapacity) return 0;
  const excess = moisture - fieldCapacity;
  const rate = soilTexture === 'sand' ? 0.8 : soilTexture === 'clay' ? 0.3 : 0.5;
  return excess * rate;
}

export function simulateMoisture(req: SoilSimulationRequest): SoilSimulationResponse {
  const { crop, soil, startDate, city } = req;
  const weather = generateMockWeather(city, false);
  const dailyWeather = aggregateDailyWeather(weather, startDate);

  let currentMoisture = soil.initialMoisture;
  const moistureCurve: SoilMoisturePoint[] = [];
  const deficitDays: number[] = [];
  const start = dayjs(startDate);
  const criticalMoisture = soil.fieldCapacity * 0.5;

  for (let d = 0; d < 7; d++) {
    const dateStr = start.add(d, 'day').format('YYYY-MM-DD');
    const { rainfall, et0 } = dailyWeather[d];
    const effectiveRain = calcEffectiveRainfall(rainfall);
    const etc = crop.cropCoefficient * et0;
    const percolation = calcDeepPercolation(
      currentMoisture + effectiveRain,
      soil.fieldCapacity,
      soil.soilTexture,
    );

    let moistureChange = effectiveRain - etc - percolation;
    currentMoisture = currentMoisture + moistureChange;
    currentMoisture = Math.min(soil.fieldCapacity, currentMoisture);
    currentMoisture = Math.max(soil.wiltingPoint, currentMoisture);

    const status = getMoistureStatus(currentMoisture, soil.fieldCapacity);
    const deficitMm =
      currentMoisture < soil.fieldCapacity
        ? ((soil.fieldCapacity - currentMoisture) / 100) * soil.bulkDensity * crop.rootDepth * 10
        : 0;

    if (status === 'deficit' || status === 'severe') {
      deficitDays.push(d);
    }

    moistureCurve.push({
      date: dateStr,
      moisture: Math.round(currentMoisture * 100) / 100,
      moistureStatus: status,
      deficitMm: Math.round(deficitMm * 100) / 100,
      evaporationMm: Math.round(etc * 100) / 100,
      rainfallMm: Math.round(rainfall * 100) / 100,
    });
  }

  const todayStatus = moistureCurve[0]?.moistureStatus ?? 'sufficient';
  const needsIrrigation = todayStatus === 'deficit' || todayStatus === 'severe' || deficitDays.length > 0;
  const currentDeficit = moistureCurve[0]?.deficitMm ?? 0;

  return {
    moistureCurve,
    currentDeficit: Math.round(currentDeficit * 100) / 100,
    needsIrrigation,
    deficitDays,
    criticalMoisture: Math.round(criticalMoisture * 100) / 100,
    fieldCapacity: soil.fieldCapacity,
    wiltingPoint: soil.wiltingPoint,
  };
}
