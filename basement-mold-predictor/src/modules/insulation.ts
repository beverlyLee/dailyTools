import type { InsulationConfig, WallLayer } from './types';

export interface InsulationLayer {
  thickness: number;
  thermalConductivity: number;
  name: string;
  color: { r: number; g: number; b: number };
  effectiveRValue: number;
  heatLossReduction: number;
  dewPointElimination: number;
}

export interface InsulationRecommendation {
  currentRValue: number;
  recommendedRValue: number;
  gap: number;
  suggestions: string[];
  costEstimate: string;
  energySavings: string;
}

export class InsulationVisualizer {
  private insulationLayers: InsulationLayer[] = [];

  constructor(private insulation: InsulationConfig) {
    this.buildInsulationLayers();
  }

  private buildInsulationLayers() {
    this.insulationLayers = [];

    if (this.insulation.enabled) {
      const epsLayer: InsulationLayer = {
        thickness: this.insulation.thickness,
        thermalConductivity: this.insulation.thermalConductivity,
        name: 'EPS聚苯板保温层',
        color: { r: 0.96, g: 0.88, b: 0.67 },
        effectiveRValue: (this.insulation.thickness / 1000) / this.insulation.thermalConductivity,
        heatLossReduction: this.calculateHeatLossReduction(),
        dewPointElimination: this.calculateDewPointElimination(),
      };
      this.insulationLayers.push(epsLayer);
    }
  }

  calculateHeatLossReduction(): number {
    if (!this.insulation.enabled) return 0;
    const thicknessRatio = this.insulation.thickness / 50;
    const baseReduction = 0.3 + thicknessRatio * 0.4;
    return Math.min(0.85, baseReduction);
  }

  calculateDewPointElimination(): number {
    if (!this.insulation.enabled) return 0;
    const thicknessRatio = this.insulation.thickness / 60;
    return Math.min(0.95, 0.4 + thicknessRatio * 0.55);
  }

  getEffectiveThermalResistance(): number {
    let totalR = 0;
    for (const layer of this.insulationLayers) {
      totalR += (layer.thickness / 1000) / layer.thermalConductivity;
    }
    return totalR;
  }

  getInsulationLayers(): InsulationLayer[] {
    return this.insulationLayers;
  }

  getInsulationGeometry(wallLayers: WallLayer[]): {
    position: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
    color: { r: number; g: number; b: number };
  }[] {
    const geometries: {
      position: { x: number; y: number; z: number };
      size: { x: number; y: number; z: number };
      color: { r: number; g: number; b: number };
    }[] = [];

    if (!this.insulation.enabled) return geometries;

    let totalWallThickness = 0;
    for (const layer of wallLayers) {
      if (layer.position !== 'insulation' && layer.position !== 'outer') {
        totalWallThickness += layer.thickness * 1000;
      }
    }

    const insulationInMM = this.insulation.thickness;
    const wallHeight = 3.0;
    const wallWidth = 4.0;

    geometries.push({
      position: {
        x: 0,
        y: wallHeight / 2,
        z: (totalWallThickness + insulationInMM / 2) / 1000,
      },
      size: {
        x: wallWidth,
        y: wallHeight,
        z: insulationInMM / 1000,
      },
      color: { r: 0.96, g: 0.88, b: 0.67 },
    });

    return geometries;
  }

  getInsulationEffectData(baseTemp: number, dewPoint: number): {
    withoutInsulation: { surfaceTemp: number; deltaDew: number; condensationRisk: number };
    withInsulation: { surfaceTemp: number; deltaDew: number; condensationRisk: number };
    improvement: { tempIncrease: number; riskReduction: number };
  } {
    const withoutSurfaceTemp = baseTemp;
    const withoutDeltaDew = withoutSurfaceTemp - dewPoint;
    const withoutRisk = withoutDeltaDew < 0 ? Math.min(1, Math.abs(withoutDeltaDew) / 5) : 0;

    const tempIncrease = this.insulation.enabled ? this.calculateSurfaceTempIncrease() : 0;
    const withSurfaceTemp = withoutSurfaceTemp + tempIncrease;
    const withDeltaDew = withSurfaceTemp - dewPoint;
    const withRisk = withDeltaDew < 0 ? Math.min(1, Math.abs(withDeltaDew) / 5) : 0;

    return {
      withoutInsulation: {
        surfaceTemp: withoutSurfaceTemp,
        deltaDew: withoutDeltaDew,
        condensationRisk: withoutRisk,
      },
      withInsulation: {
        surfaceTemp: withSurfaceTemp,
        deltaDew: withDeltaDew,
        condensationRisk: withRisk,
      },
      improvement: {
        tempIncrease,
        riskReduction: Math.max(0, withoutRisk - withRisk),
      },
    };
  }

  private calculateSurfaceTempIncrease(): number {
    if (!this.insulation.enabled) return 0;
    const thicknessFactor = this.insulation.thickness / 100;
    const baseIncrease = 0.8 + thicknessFactor * 3.5;
    return Math.min(6, baseIncrease);
  }

  getCrossSectionData(wallLayers: WallLayer[]): Array<{
    name: string;
    position: number;
    thickness: number;
    color: { r: number; g: number; b: number };
    label: string;
  }> {
    const crossSection: Array<{
      name: string;
      position: number;
      thickness: number;
      color: { r: number; g: number; b: number };
      label: string;
    }> = [];

    let currentPos = 0;
    for (const layer of wallLayers) {
      let color: { r: number; g: number; b: number };
      switch (layer.position) {
        case 'inner':
          color = { r: 0.82, g: 0.78, b: 0.72 };
          break;
        case 'main':
          color = { r: 0.65, g: 0.58, b: 0.5 };
          break;
        case 'insulation':
          color = { r: 0.96, g: 0.88, b: 0.67 };
          break;
        case 'outer':
          color = { r: 0.55, g: 0.52, b: 0.48 };
          break;
        default:
          color = { r: 0.7, g: 0.7, b: 0.7 };
      }

      crossSection.push({
        name: layer.name,
        position: currentPos,
        thickness: layer.thickness * 1000,
        color,
        label: `${layer.name}\n${(layer.thickness * 1000).toFixed(0)}mm\nλ=${layer.thermalConductivity.toFixed(3)}`,
      });
      currentPos += layer.thickness * 1000;
    }

    return crossSection;
  }

  getInsulationRecommendation(
    outdoorTemp: number,
    indoorTemp: number,
    outdoorHumidity: number
  ): InsulationRecommendation {
    const baseR = this.insulation.enabled
      ? 2.0 + this.insulation.thickness / 100
      : 2.0;
    const recommendedR = Math.max(2.5, 3.5 - (indoorTemp - outdoorTemp) / 15);
    const gap = Math.max(0, recommendedR - baseR);

    const suggestions: string[] = [];

    if (gap > 0 && !this.insulation.enabled) {
      suggestions.push('建议在墙体外侧添加 EPS/XPS 保温层');
      suggestions.push('推荐保温层厚度: 30-50mm');
      if (outdoorHumidity > 80) {
        suggestions.push('高湿度环境建议增加隔汽层');
      }
    } else if (gap > 0 && this.insulation.enabled) {
      const additionalThickness = Math.ceil(gap * 38);
      if (additionalThickness > 10) {
        suggestions.push(`当前保温层厚度不足，建议增加至 ${this.insulation.thickness + additionalThickness}mm`);
      }
    } else {
      suggestions.push('当前保温效果良好，满足节能要求');
    }

    if (indoorTemp < 18) {
      suggestions.push('室内温度偏低，建议提高供暖温度以减少结露风险');
    }

    if (outdoorHumidity > 85) {
      suggestions.push('高湿度期建议加强机械通风，避免水蒸气在墙体内部凝结');
    }

    const currentCost = this.insulation.enabled
      ? `已投入: RMB ${(this.insulation.thickness * 80).toFixed(0)}`
      : '尚未安装';
    const projectedSavings = gap > 0
      ? `预计节能: ${(gap * 8).toFixed(1)}% 空调/采暖能耗`
      : '当前已达节能标准';

    return {
      currentRValue: baseR,
      recommendedRValue: recommendedR,
      gap,
      suggestions,
      costEstimate: currentCost,
      energySavings: projectedSavings,
    };
  }

  update(insulation: InsulationConfig) {
    this.insulation = insulation;
    this.buildInsulationLayers();
  }
}
