import type {
  EnvironmentParams,
  WallMaterial,
  InsulationConfig,
  WallLayer,
  TemperaturePoint,
} from './types';

export class TemperatureFieldSimulator {
  private wallLayers: WallLayer[] = [];
  private resolution: { x: number; y: number } = { x: 50, y: 40 };

  readonly R_INNER_SURFACE = 0.11;
  readonly R_OUTER_SURFACE = 0.04;

  constructor(
    private env: EnvironmentParams,
    private material: WallMaterial,
    private insulation: InsulationConfig,
    private wallThickness: number
  ) {
    this.buildWallLayers();
  }

  private buildWallLayers() {
    this.wallLayers = [];

    this.wallLayers.push({
      thickness: 0.015,
      thermalConductivity: 0.9,
      name: '水泥砂浆面层',
      position: 'inner',
    });

    this.wallLayers.push({
      thickness: this.wallThickness / 1000,
      thermalConductivity: this.material.thermalConductivity,
      name: this.material.name,
      position: 'main',
    });

    if (this.insulation.enabled) {
      this.wallLayers.push({
        thickness: this.insulation.thickness / 1000,
        thermalConductivity: this.insulation.thermalConductivity,
        name: 'EPS保温层',
        position: 'insulation',
      });
    }

    this.wallLayers.push({
      thickness: 0.01,
      thermalConductivity: 1.2,
      name: '外墙面层',
      position: 'outer',
    });
  }

  getWallLayers(): WallLayer[] {
    return this.wallLayers;
  }

  getTotalThickness(): number {
    return this.wallLayers.reduce((sum, layer) => sum + layer.thickness, 0);
  }

  getLayersThermalResistance(): number {
    let R = 0;
    for (const layer of this.wallLayers) {
      R += layer.thickness / layer.thermalConductivity;
    }
    return R;
  }

  getTotalThermalResistance(): number {
    return this.R_INNER_SURFACE + this.getLayersThermalResistance() + this.R_OUTER_SURFACE;
  }

  getHeatFlux(): number {
    const R_total = this.getTotalThermalResistance();
    return (this.env.indoorTemp - this.env.outdoorTemp) / R_total;
  }

  getTemperatureGradient(): number {
    const deltaT = this.env.indoorTemp - this.env.outdoorTemp;
    const totalThickness = this.getTotalThickness();
    return Math.abs(deltaT) / Math.max(totalThickness, 0.001);
  }

  getInnerSurfaceTempBase(): number {
    const R_total = this.getTotalThermalResistance();
    const R_ratio = this.R_INNER_SURFACE / R_total;
    const deltaT_total = this.env.indoorTemp - this.env.outdoorTemp;
    return this.env.indoorTemp - deltaT_total * R_ratio;
  }

  getTemperatureAtDepth(depth: number, heightFactor: number = 0): number {
    const floorCooling = this.calculateFloorCooling(heightFactor);
    const cornerCooling = this.calculateCornerEffect(heightFactor);

    const Q = this.getHeatFlux();
    const R_inner = this.R_INNER_SURFACE;
    let currentTemp = this.env.indoorTemp - Q * R_inner;

    let accumulatedDepth = 0;
    for (const layer of this.wallLayers) {
      if (depth <= accumulatedDepth + layer.thickness) {
        const layerDepth = depth - accumulatedDepth;
        const R_layer = layerDepth / layer.thermalConductivity;
        currentTemp -= Q * R_layer;
        break;
      } else {
        const R_layer = layer.thickness / layer.thermalConductivity;
        currentTemp -= Q * R_layer;
        accumulatedDepth += layer.thickness;
      }
    }

    return currentTemp - floorCooling - cornerCooling;
  }

  private calculateFloorCooling(heightFactor: number): number {
    const baseIndoor = this.getInnerSurfaceTempBase();
    const groundTempBase = Math.min(this.env.indoorTemp, this.env.outdoorTemp);
    const groundTemp = groundTempBase - 3.5;
    const tempDiff = baseIndoor - groundTemp;
    const floorInfluence = Math.exp(-heightFactor * 3.0);

    const R_base = 0.11 + (0.015 / 0.9) + (0.240 / 0.8) + (0.01 / 1.2) + 0.04;
    const R_current = this.getTotalThermalResistance();
    const insulationAttenuation = R_base / R_current;

    const maxCooling = Math.min(5.5, tempDiff * 0.8) * insulationAttenuation;
    return floorInfluence * maxCooling;
  }

  private calculateCornerEffect(heightFactor: number): number {
    const edgeFactor = Math.exp(-Math.pow(heightFactor - 0.10, 2) * 22);
    const sideFactor = 0.85;
    const tempDiff = this.env.indoorTemp - this.env.outdoorTemp;
    const baseDiff = Math.max(2, Math.abs(tempDiff));

    const R_base = 0.11 + (0.015 / 0.9) + (0.240 / 0.8) + (0.01 / 1.2) + 0.04;
    const R_current = this.getTotalThermalResistance();
    const insulationAttenuation = Math.pow(R_base / R_current, 0.7);

    const extraCooling = edgeFactor * sideFactor * Math.min(3.8, baseDiff * 0.55) * insulationAttenuation;
    return extraCooling;
  }

  getInnerSurfaceTemp(_x: number = 0.5, y: number = 0): number {
    return this.getTemperatureAtDepth(0, y);
  }

  getOuterSurfaceTemp(_x: number = 0.5, y: number = 0): number {
    return this.getTemperatureAtDepth(this.getTotalThickness(), y);
  }

  generateTemperatureField(): TemperaturePoint[] {
    const points: TemperaturePoint[] = [];
    const totalThickness = this.getTotalThickness();

    for (let i = 0; i < this.resolution.x; i++) {
      for (let j = 0; j < this.resolution.y; j++) {
        const x = i / (this.resolution.x - 1);
        const y = j / (this.resolution.y - 1);
        const depth = x * totalThickness;
        const temp = this.getTemperatureAtDepth(depth, y);

        points.push({
          x,
          y,
          temperature: temp,
          depth,
        });
      }
    }

    return points;
  }

  getSurfaceTemperatureProfile(): Array<{ y: number; temp: number }> {
    const profile: Array<{ y: number; temp: number }> = [];
    for (let j = 0; j < this.resolution.y; j++) {
      const y = j / (this.resolution.y - 1);
      profile.push({
        y,
        temp: this.getInnerSurfaceTemp(0, y),
      });
    }
    return profile;
  }

  getTemperatureDrops(): {
    R_inner: number;
    R_layers: number;
    R_outer: number;
    R_total: number;
    Q: number;
    drop_inner_surface: number;
    drop_wall: number;
    drop_outer_surface: number;
    T_inner_surface: number;
    T_outer_surface: number;
  } {
    const R_inner = this.R_INNER_SURFACE;
    const R_layers = this.getLayersThermalResistance();
    const R_outer = this.R_OUTER_SURFACE;
    const R_total = R_inner + R_layers + R_outer;
    const Q = this.getHeatFlux();
    const deltaT = this.env.indoorTemp - this.env.outdoorTemp;

    return {
      R_inner,
      R_layers,
      R_outer,
      R_total,
      Q,
      drop_inner_surface: deltaT * (R_inner / R_total),
      drop_wall: deltaT * (R_layers / R_total),
      drop_outer_surface: deltaT * (R_outer / R_total),
      T_inner_surface: this.env.indoorTemp - deltaT * (R_inner / R_total),
      T_outer_surface: this.env.outdoorTemp + deltaT * (R_outer / R_total),
    };
  }

  update(
    env?: EnvironmentParams,
    material?: WallMaterial,
    insulation?: InsulationConfig,
    wallThickness?: number
  ) {
    if (env) this.env = env;
    if (material) this.material = material;
    if (insulation) this.insulation = insulation;
    if (wallThickness) this.wallThickness = wallThickness;
    this.buildWallLayers();
  }
}
