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

  getThermalResistance(): number {
    let R = 0.12 + 0.04;
    for (const layer of this.wallLayers) {
      R += layer.thickness / layer.thermalConductivity;
    }
    return R;
  }

  getHeatFlux(): number {
    const R = this.getThermalResistance();
    return (this.env.outdoorTemp - this.env.indoorTemp) / R;
  }

  getTemperatureGradient(): number {
    const deltaT = this.env.outdoorTemp - this.env.indoorTemp;
    const totalThickness = this.getTotalThickness();
    return Math.abs(deltaT) / totalThickness;
  }

  getTemperatureAtDepth(depth: number, heightFactor: number = 0): number {
    const floorCooling = this.calculateFloorCooling(heightFactor);
    const cornerCooling = this.calculateCornerEffect(heightFactor);
    let accumulatedDepth = 0;
    let currentTemp = this.env.indoorTemp;
    const q = this.getHeatFlux();

    for (const layer of this.wallLayers) {
      if (depth <= accumulatedDepth + layer.thickness) {
        const layerDepth = depth - accumulatedDepth;
        const layerDrop = q * (layerDepth / layer.thermalConductivity);
        currentTemp += layerDrop;
        break;
      } else {
        const layerDrop = q * (layer.thickness / layer.thermalConductivity);
        currentTemp += layerDrop;
        accumulatedDepth += layer.thickness;
      }
    }

    return currentTemp - floorCooling - cornerCooling;
  }

  private calculateFloorCooling(heightFactor: number): number {
    const groundTemp = Math.min(this.env.indoorTemp, this.env.outdoorTemp) - 2;
    const floorInfluence = Math.exp(-heightFactor * 2.5);
    const maxCooling = 3.5;
    return floorInfluence * maxCooling * (1 - (this.env.indoorTemp - groundTemp) / 30);
  }

  private calculateCornerEffect(heightFactor: number): number {
    const edgeFactor = Math.exp(-Math.pow(heightFactor - 0.15, 2) * 20);
    const sideFactor = 0.6;
    return edgeFactor * sideFactor * 2.0;
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
