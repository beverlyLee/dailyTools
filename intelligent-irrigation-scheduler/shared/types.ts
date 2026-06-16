// ============================================================
// 共享类型定义 - 前后端共用
// ============================================================

// ===== 气象相关 =====
export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  precipitationProb: number;
  precipitation: number;
  evaporation: number;
  weather: string;
  windSpeed: number;
}

export interface DailyForecast {
  date: string;
  dayWeather: string;
  nightWeather: string;
  tempMax: number;
  tempMin: number;
  precipitationProb: number;
  precipitation: number;
}

export interface WeatherResponse {
  city: string;
  current: {
    temperature: number;
    humidity: number;
    weather: string;
    updateTime: string;
    windSpeed: number;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  hasEffectiveRain: boolean;
  suggestedDelayDays: number;
  nextRainDate?: string;
  totalExpectedRain: number;
}

// ===== 土壤墒情 =====
export type CropType = 'wheat' | 'corn' | 'cotton' | 'soybean' | 'rice' | 'other';
export type SoilTexture = 'sand' | 'loam' | 'clay';
export type MoistureStatus = 'sufficient' | 'moderate' | 'deficit' | 'severe';

export interface CropParams {
  cropType: CropType;
  cropName: string;
  growthStage: string;
  rootDepth: number;
  plantingArea: number;
  cropCoefficient: number;
}

export interface SoilParams {
  fieldCapacity: number;
  wiltingPoint: number;
  bulkDensity: number;
  initialMoisture: number;
  soilTexture: SoilTexture;
}

export interface SoilMoisturePoint {
  date: string;
  moisture: number;
  moistureStatus: MoistureStatus;
  deficitMm: number;
  evaporationMm: number;
  rainfallMm: number;
}

export interface SoilSimulationRequest {
  crop: CropParams;
  soil: SoilParams;
  startDate: string;
  city: string;
}

export interface SoilSimulationResponse {
  moistureCurve: SoilMoisturePoint[];
  currentDeficit: number;
  needsIrrigation: boolean;
  deficitDays: number[];
  criticalMoisture: number;
  fieldCapacity: number;
  wiltingPoint: number;
}

// ===== 灌溉处方 =====
export interface PrescriptionRequest {
  crop: CropParams;
  soil: SoilParams;
  soilSimulation: SoilSimulationResponse;
  weather: WeatherResponse;
  pumpFlow: number;
  irrigationEfficiency: number;
  preferredTime?: string;
  preferredDate?: string;
}

export interface PrescriptionResponse {
  prescriptionId: string;
  recommendedDate: string;
  recommendedTime: string;
  waterAmount: number;
  waterDepth: number;
  durationMinutes: number;
  estimatedCost: number;
  delayReason?: string;
  isValid: boolean;
  suggestedAlternativeDate?: string;
  adjustments: {
    waterAmountMin: number;
    waterAmountMax: number;
    durationMin: number;
    durationMax: number;
  };
  rainfallBackupPlan: string;
  warnings: string[];
}

// ===== 成本核算 =====
export interface CostConfig {
  electricityPrice: number;
  waterPrice: number;
  pumpPower: number;
  pumpFlow: number;
  laborCostPerHour: number;
}

export interface CostDetail {
  electricityCost: number;
  waterCost: number;
  laborCost: number;
  totalCost: number;
  unitCostPerMu: number;
  unitCostPerM3: number;
  breakdown: {
    label: string;
    value: number;
    percent: number;
  }[];
}

export interface CostCalculateRequest {
  config: CostConfig;
  waterAmount: number;
  durationMinutes: number;
  area: number;
}

export interface CostCompareRequest {
  config: CostConfig;
  months: number;
  area: number;
  irrigationFrequency: {
    traditional: number;
    smart: number;
  };
  avgWaterPerIrrigation: {
    traditional: number;
    smart: number;
  };
}

export interface CostCompareResponse {
  months: number;
  traditional: {
    totalCost: number;
    totalWater: number;
    costPerMonth: number[];
  };
  smart: {
    totalCost: number;
    totalWater: number;
    costPerMonth: number[];
  };
  savings: {
    cost: number;
    water: number;
    percent: number;
  };
  monthlyComparison: Array<{
    month: string;
    traditional: number;
    smart: number;
  }>;
}

// ===== 日历任务 =====
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface CalendarTask {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  status: TaskStatus;
  extendedProps: {
    prescriptionId?: string;
    waterAmount: number;
    durationMinutes: number;
    estimatedCost: number;
    cropType: string;
    cropName: string;
    area: number;
    delayByRain?: boolean;
    actualWaterAmount?: number;
    actualCost?: number;
    notes?: string;
  };
  backgroundColor?: string;
  borderColor?: string;
}

export interface TaskCreateRequest {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  status?: TaskStatus;
  extendedProps: CalendarTask['extendedProps'];
}

export interface TaskUpdateRequest {
  title?: string;
  start?: string;
  end?: string;
  status?: TaskStatus;
  extendedProps?: Partial<CalendarTask['extendedProps']>;
}

// ===== 用户配置 =====
export interface UserConfig {
  id: string;
  electricityPrice: number;
  waterPrice: number;
  pumpPower: number;
  pumpFlow: number;
  laborCost: number;
  defaultCity: string;
  defaultCrop: CropType;
  irrigationEfficiency: number;
  plantingArea: number;
  defaultSoilTexture: SoilTexture;
}

// ===== 通用响应 =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
