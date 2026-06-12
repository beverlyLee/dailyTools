import type {
  EnvironmentParams,
  WallMaterial,
  InsulationConfig,
  VentilationConfig,
  DewPointData,
  MoldRiskData,
} from './types';

export class MoldRiskAssessor {
  private resolution: { x: number; y: number } = { x: 45, y: 40 };
  private ventilation: VentilationConfig;

  constructor(
    private env: EnvironmentParams,
    private material: WallMaterial,
    private insulation: InsulationConfig,
    ventilation: VentilationConfig
  ) {
    this.ventilation = ventilation;
  }

  calculateTimeWeightFactor(effectiveDays: number, _hasCondensation: boolean): number {
    if (this.ventilation?.enabled) {
      const idx = Math.min((this.ventilation.intensity || 2) - 1, 2);
      const caps = [2.0, 1.2, 0.6];
      const caps_risk = [0.30, 0.25, 0.18];
      const cap = caps[idx];
      const days = Math.min(Math.max(0, effectiveDays), cap);
      const t = Math.max(0, days);
      const slow = 0.08 + (caps_risk[idx] - 0.08) * (1 - Math.exp(-t * 0.7));
      return Math.min(caps_risk[idx], slow);
    }

    const days = Math.max(0, effectiveDays);
    if (days <= 1) return 0.1;
    if (days >= 21) return 1.0;
    const t = (days - 1) / 20;
    const smooth = 0.1 + 0.9 * (1 - Math.exp(-t * 3.5));
    return Math.min(1, Math.max(0, smooth));
  }

  calculateMaterialFactor(): number {
    const porosityFactor = this.material.porosity * 0.8;
    const resistanceFactor = (1 - this.material.moistureResistance) * 0.6;
    return Math.min(1, porosityFactor + resistanceFactor);
  }

  calculateCondensationFactor(dewDurationHours: number): number {
    if (dewDurationHours <= 0) return 0;

    let raw: number;
    if (dewDurationHours <= 6) raw = 0.2;
    else if (dewDurationHours <= 24) raw = 0.5;
    else if (dewDurationHours <= 72) raw = 0.8;
    else raw = Math.min(1, 0.85 + dewDurationHours / 500);

    if (this.ventilation?.enabled) {
      const idx = Math.min((this.ventilation.intensity || 2) - 1, 2);
      const caps = [0.45, 0.3, 0.15];
      raw = Math.min(raw, caps[idx]);
    }

    return raw;
  }

  calculateHumidityFactor(indoorHumidity: number): number {
    if (indoorHumidity < 60) return 0;
    if (indoorHumidity >= 95) return 1.0;
    const t = (indoorHumidity - 60) / 35;
    return Math.min(1, Math.max(0, t * (2 - t)));
  }

  calculateTemperatureFactor(surfaceTemp: number): number {
    if (surfaceTemp < 5) return 0.3;
    if (surfaceTemp < 10) return 0.6;
    if (surfaceTemp < 15) return 0.85;
    if (surfaceTemp < 25) return 1.0;
    if (surfaceTemp < 30) return 0.9;
    return 0.7;
  }

  calculateRiskAtPoint(
    surfaceTemp: number,
    dewDurationHours: number,
    indoorHumidity: number,
    x: number,
    y: number,
    dewPointTemp: number = 0,
    effectiveDays: number = 0
  ): { risk: number; breakdown: { condensation: number; humidity: number; material: number; time: number; temperature: number } } {
    const materialFactor = this.calculateMaterialFactor();
    const condensationFactor = this.calculateCondensationFactor(dewDurationHours);
    const humidityFactor = this.calculateHumidityFactor(indoorHumidity);
    const tempFactor = this.calculateTemperatureFactor(surfaceTemp);
    const hasCondensation = condensationFactor > 0;
    const timeWeight = this.calculateTimeWeightFactor(effectiveDays, hasCondensation);

    let baseRisk: number;
    let cContrib = 0;
    let hContrib = 0;
    let mContrib = 0;
    let tContrib = 0;
    let tempContrib = 0;

    if (hasCondensation) {
      const cTerm = condensationFactor * 0.45;
      const hTerm = humidityFactor * 0.25;
      const mTerm = materialFactor * 0.15;
      const tempTerm = tempFactor * 0.15;
      const primaryRisks = cTerm + hTerm;
      const secondaryRisks = mTerm + tempTerm;
      baseRisk = (primaryRisks + secondaryRisks) * timeWeight;

      cContrib = cTerm * timeWeight;
      hContrib = hTerm * timeWeight;
      mContrib = mTerm * timeWeight;
      tempContrib = tempTerm * timeWeight;
      tContrib = (primaryRisks + secondaryRisks) * timeWeight * 0.15;
    } else {
      const surfaceMargin = this.calculateSurfaceMarginFactor(surfaceTemp, dewPointTemp);
      const hTerm = humidityFactor * 0.25;
      const mTerm = materialFactor * 0.10;
      const tempTerm = tempFactor * 0.05;
      const dryRisk = hTerm + mTerm + tempTerm;
      baseRisk = dryRisk * timeWeight * surfaceMargin;

      if (this.ventilation?.enabled) {
        const idx = Math.min((this.ventilation.intensity || 2) - 1, 2);
        const residualFloors = [0.08, 0.05, 0.02];
        const floor = residualFloors[idx];
        baseRisk = Math.max(floor, baseRisk);
      }

      hContrib = hTerm * timeWeight * surfaceMargin;
      mContrib = mTerm * timeWeight * surfaceMargin;
      tempContrib = tempTerm * timeWeight * surfaceMargin;
      tContrib = dryRisk * timeWeight * surfaceMargin * 0.2;
    }

    const cornerFactor = hasCondensation
      ? this.calculatePositionFactor(x, y)
      : 1.0 + (this.calculatePositionFactor(x, y) - 1.0) * 0.15;

    const insulationBonus = this.calculateInsulationSurfaceTempBonus();
    baseRisk *= insulationBonus;

    const adjustedRisk = baseRisk * cornerFactor;
    const c = Math.max(0, cContrib * insulationBonus * cornerFactor);
    const h = Math.max(0, hContrib * insulationBonus * cornerFactor);
    const m = Math.max(0, mContrib * insulationBonus * cornerFactor);
    const t = Math.max(0, tContrib * insulationBonus * cornerFactor);
    const tp = Math.max(0, tempContrib * insulationBonus * cornerFactor);
    const totalRaw = c + h + m + t + tp + 1e-9;
    return {
      risk: Math.min(1, Math.max(0, adjustedRisk)),
      breakdown: {
        condensation: (c / totalRaw) * 100,
        humidity: (h / totalRaw) * 100,
        material: (m / totalRaw) * 100,
        time: (t / totalRaw) * 100,
        temperature: (tp / totalRaw) * 100,
      },
    };
  }

  private calculateSurfaceMarginFactor(surfaceTemp: number, dewPointTemp: number): number {
    const margin = surfaceTemp - dewPointTemp;
    if (margin < 0) return 1.0;
    if (margin < 2) return 0.5 + 0.25 * (margin / 2);
    if (margin < 5) return 0.3 - 0.15 * ((margin - 2) / 3);
    return 0.15;
  }

  private calculateInsulationSurfaceTempBonus(): number {
    if (!this.insulation.enabled || this.insulation.thickness <= 0) return 1.0;
    const thicknessM = this.insulation.thickness / 1000;
    const lambda = this.insulation.thermalConductivity;
    const R_insulation = thicknessM / lambda;
    const reduction = 1 / (1 + R_insulation * 2.5);
    return reduction;
  }

  private calculatePositionFactor(x: number, y: number): number {
    const floorFactor = Math.exp(-y * 2.2) * 0.5;
    const leftCornerFactor = Math.exp(-Math.pow((x - 0.05) * 4, 2)) * 0.4;
    const rightCornerFactor = Math.exp(-Math.pow((x - 0.95) * 4, 2)) * 0.4;
    const wallEdgeFactor = Math.exp(-Math.pow((x - 0.5) * 3, 2)) * (-0.1) + 0.1;
    return 1 + floorFactor + leftCornerFactor + rightCornerFactor + wallEdgeFactor;
  }

  getRiskLevel(risk: number): 0 | 1 | 2 | 3 | 4 {
    if (risk < 0.2) return 0;
    if (risk < 0.4) return 1;
    if (risk < 0.6) return 2;
    if (risk < 0.8) return 3;
    return 4;
  }

  getRiskColor(risk: number): { r: number; g: number; b: number } {
    const colors = [
      { r: 0.13, g: 0.77, b: 0.37 },
      { r: 0.52, g: 0.80, b: 0.09 },
      { r: 0.98, g: 0.75, b: 0.14 },
      { r: 0.98, g: 0.45, b: 0.09 },
      { r: 0.94, g: 0.27, b: 0.27 },
    ];
    const level = this.getRiskLevel(risk);
    return colors[level];
  }

  getRiskColorInterpolated(risk: number): { r: number; g: number; b: number } {
    const stops = [
      { pos: 0.0, r: 0.13, g: 0.77, b: 0.37 },
      { pos: 0.25, r: 0.52, g: 0.80, b: 0.09 },
      { pos: 0.5, r: 0.98, g: 0.75, b: 0.14 },
      { pos: 0.75, r: 0.98, g: 0.45, b: 0.09 },
      { pos: 1.0, r: 0.94, g: 0.27, b: 0.27 },
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      if (risk >= stops[i].pos && risk <= stops[i + 1].pos) {
        const t = (risk - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
        return {
          r: stops[i].r + t * (stops[i + 1].r - stops[i].r),
          g: stops[i].g + t * (stops[i + 1].g - stops[i].g),
          b: stops[i].b + t * (stops[i + 1].b - stops[i].b),
        };
      }
    }
    return { r: 0.13, g: 0.77, b: 0.37 };
  }

  calculateOverallRisk(maxRisk: number): 'safe' | 'moderate' | 'danger' {
    if (maxRisk < 0.3) return 'safe';
    if (maxRisk < 0.6) return 'moderate';
    return 'danger';
  }

  assessMoldRisk(
    surfaceTempProfile: Array<{ y: number; temp: number }>,
    dewData: DewPointData,
    indoorHumidity: number
  ): MoldRiskData {
    const riskMap: Array<{ x: number; y: number; risk: number }> = [];
    const highRiskZones: Array<{ x: number; y: number; severity: number }> = [];
    let maxRisk = 0;
    let maxBreakdown = { condensation: 0, humidity: 0, material: 0, time: 0, temperature: 0 };
    const dewPointTemp = dewData.dewPointTemp;
    const effectiveDays = dewData.effectiveRainyDays;

    for (let i = 0; i < this.resolution.x; i++) {
      for (let j = 0; j < this.resolution.y; j++) {
        const x = i / (this.resolution.x - 1);
        const y = j / (this.resolution.y - 1);
        const surfaceTemp = this.interpolateProfileTemp(surfaceTempProfile, y);
        const localDewDuration = dewData.dewDurationHours * (1 + (1 - y) * 0.5);
        const result = this.calculateRiskAtPoint(
          surfaceTemp,
          localDewDuration,
          indoorHumidity,
          x,
          y,
          dewPointTemp,
          effectiveDays
        );
        const risk = result.risk;

        riskMap.push({ x, y, risk });

        if (risk > maxRisk) {
          maxRisk = risk;
          maxBreakdown = result.breakdown;
        }
        if (risk >= 0.7) {
          highRiskZones.push({ x, y, severity: risk });
        }
      }
    }

    return {
      riskLevel: maxRisk,
      riskMap,
      highRiskZones,
      overallRisk: this.calculateOverallRisk(maxRisk),
      riskBreakdown: maxBreakdown,
    };
  }

  private interpolateProfileTemp(
    profile: Array<{ y: number; temp: number }>,
    targetY: number
  ): number {
    if (profile.length === 0) return this.env.indoorTemp;
    for (let i = 0; i < profile.length - 1; i++) {
      if (targetY >= profile[i].y && targetY <= profile[i + 1].y) {
        const t = (targetY - profile[i].y) / Math.max(0.001, profile[i + 1].y - profile[i].y);
        return profile[i].temp + t * (profile[i + 1].temp - profile[i].temp);
      }
    }
    return profile[0].temp;
  }

  getMoldSporePattern(): Array<{ x: number; y: number; size: number; risk: number }> {
    const spores: Array<{ x: number; y: number; size: number; risk: number }> = [];
    return spores;
  }

  update(
    env?: EnvironmentParams,
    material?: WallMaterial,
    insulation?: InsulationConfig,
    ventilation?: VentilationConfig
  ) {
    if (env) this.env = env;
    if (material) this.material = material;
    if (insulation) this.insulation = insulation;
    if (ventilation) this.ventilation = ventilation;
  }
}
