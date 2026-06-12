export interface EnvironmentParams {
  outdoorTemp: number;
  outdoorHumidity: number;
  indoorTemp: number;
  rainyDays: number;
}

export interface WallMaterial {
  name: string;
  key: string;
  thermalConductivity: number;
  specificHeat: number;
  density: number;
  moistureResistance: number;
  porosity: number;
}

export interface InsulationConfig {
  enabled: boolean;
  thickness: number;
  thermalConductivity: number;
}

export interface VentilationConfig {
  enabled: boolean;
  intensity: number;
}

export interface WallLayer {
  thickness: number;
  thermalConductivity: number;
  name: string;
  position: 'inner' | 'main' | 'outer' | 'insulation';
}

export interface TemperaturePoint {
  x: number;
  y: number;
  temperature: number;
  depth: number;
}

export interface DewPointData {
  dewPointTemp: number;
  surfaceTemp: number;
  hasCondensation: boolean;
  condensationPoints: Array<{ x: number; y: number; intensity: number }>;
  dewDurationHours: number;
  effectiveRainyDays: number;
}

export interface MoldRiskData {
  riskLevel: number;
  riskMap: Array<{ x: number; y: number; risk: number }>;
  highRiskZones: Array<{ x: number; y: number; severity: number }>;
  overallRisk: 'safe' | 'moderate' | 'danger';
}

export interface SimulationState {
  environment: EnvironmentParams;
  wallMaterial: WallMaterial;
  insulation: InsulationConfig;
  ventilation: VentilationConfig;
  wallThickness: number;
  wallLayers: WallLayer[];
  temperatureField: TemperaturePoint[];
  dewPoint: DewPointData;
  moldRisk: MoldRiskData;
  displayMode: string;
}

export const WALL_MATERIALS: Record<string, WallMaterial> = {
  brick: {
    name: '普通砖砌体',
    key: 'brick',
    thermalConductivity: 0.8,
    specificHeat: 880,
    density: 1800,
    moistureResistance: 0.6,
    porosity: 0.35,
  },
  concrete: {
    name: '混凝土',
    key: 'concrete',
    thermalConductivity: 1.5,
    specificHeat: 960,
    density: 2400,
    moistureResistance: 0.75,
    porosity: 0.15,
  },
  aerated: {
    name: '加气混凝土',
    key: 'aerated',
    thermalConductivity: 0.2,
    specificHeat: 1050,
    density: 600,
    moistureResistance: 0.4,
    porosity: 0.65,
  },
  wood: {
    name: '木质结构',
    key: 'wood',
    thermalConductivity: 0.12,
    specificHeat: 2500,
    density: 500,
    moistureResistance: 0.3,
    porosity: 0.55,
  },
  stone: {
    name: '石材',
    key: 'stone',
    thermalConductivity: 2.5,
    specificHeat: 800,
    density: 2600,
    moistureResistance: 0.9,
    porosity: 0.08,
  },
};

export const INSULATION_TYPES = {
  eps: {
    name: 'EPS聚苯板',
    thermalConductivity: 0.038,
  },
};
