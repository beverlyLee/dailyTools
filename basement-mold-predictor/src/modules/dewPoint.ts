import type { EnvironmentParams, VentilationConfig, DewPointData } from './types';

export class DewPointCalculator {
  private resolution: { x: number; y: number } = { x: 40, y: 35 };

  constructor(
    private env: EnvironmentParams,
    private ventilation: VentilationConfig
  ) {}

  calculateSaturationVaporPressure(tempC: number): number {
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * tempC) / (b + tempC);
    return 6.1078 * Math.exp(alpha);
  }

  calculateActualVaporPressure(): number {
    const pSat = this.calculateSaturationVaporPressure(this.env.indoorTemp);
    let effectiveHumidity = this.env.outdoorHumidity;

    if (this.ventilation.enabled) {
      const ventFactor = 1 - (this.ventilation.intensity * 0.12);
      effectiveHumidity = Math.max(30, this.env.outdoorHumidity * ventFactor);
    }

    return (effectiveHumidity / 100) * pSat;
  }

  calculateDewPoint(): number {
    const pActual = this.calculateActualVaporPressure();
    const a = 17.27;
    const b = 237.7;
    const gamma = Math.log(pActual / 6.1078);
    return (b * gamma) / (a - gamma);
  }

  calculateIndoorHumidity(): number {
    let baseHumidity = this.env.outdoorHumidity;
    const tempDiff = this.env.indoorTemp - this.env.outdoorTemp;
    if (tempDiff > 0) {
      const pSatOutdoor = this.calculateSaturationVaporPressure(this.env.outdoorTemp);
      const pSatIndoor = this.calculateSaturationVaporPressure(this.env.indoorTemp);
      const pActual = (this.env.outdoorHumidity / 100) * pSatOutdoor;
      baseHumidity = (pActual / pSatIndoor) * 100;
    }

    if (this.ventilation.enabled) {
      const ventFactor = 1 - (this.ventilation.intensity * 0.12);
      baseHumidity = Math.max(30, baseHumidity * ventFactor);
    }

    return Math.min(100, baseHumidity);
  }

  checkCondensationAtPoint(surfaceTemp: number): boolean {
    const dewPoint = this.calculateDewPoint();
    return surfaceTemp <= dewPoint;
  }

  getCondensationIntensity(surfaceTemp: number, dewPoint: number): number {
    if (surfaceTemp > dewPoint) return 0;
    const diff = dewPoint - surfaceTemp;
    return Math.min(1, diff / 5);
  }

  calculateDewPointData(surfaceTempProfile: Array<{ y: number; temp: number }>): DewPointData {
    const dewPoint = this.calculateDewPoint();
    const condensationPoints: Array<{ x: number; y: number; intensity: number }> = [];
    let hasCondensation = false;
    let lowestSurfaceTemp = Infinity;
    let totalDewHours = 0;

    for (const point of surfaceTempProfile) {
      if (point.temp < lowestSurfaceTemp) {
        lowestSurfaceTemp = point.temp;
      }

      const temp = point.temp;
      if (temp <= dewPoint) {
        hasCondensation = true;
        const intensity = this.getCondensationIntensity(temp, dewPoint);

        const pointsAtHeight = 8;
        for (let k = 0; k < pointsAtHeight; k++) {
          const x = 0.1 + (k / (pointsAtHeight - 1)) * 0.8;
          const jitterIntensity = intensity * (0.7 + Math.random() * 0.6);
          if (jitterIntensity > 0.05) {
            condensationPoints.push({
              x: x + (Math.random() - 0.5) * 0.08,
              y: point.y + (Math.random() - 0.5) * 0.02,
              intensity: jitterIntensity,
            });
          }
        }

        const dewHoursAtPoint = this.env.rainyDays * 24 * intensity * 0.4;
        totalDewHours = Math.max(totalDewHours, dewHoursAtPoint);
      }
    }

    const cornerY = 0.05;
    const cornerTemp = this.findProfileTemp(surfaceTempProfile, cornerY);
    if (cornerTemp <= dewPoint) {
      const cornerIntensity = this.getCondensationIntensity(cornerTemp, dewPoint) * 1.3;
      for (let i = 0; i < 15; i++) {
        condensationPoints.push({
          x: 0.02 + Math.random() * 0.15,
          y: 0.02 + Math.random() * 0.1,
          intensity: Math.min(1, cornerIntensity * (0.6 + Math.random() * 0.6)),
        });
      }
      hasCondensation = true;
      const cornerHours = this.env.rainyDays * 24 * cornerIntensity * 0.5;
      totalDewHours = Math.max(totalDewHours, cornerHours);
    }

    const anotherCornerY = 0.05;
    const anotherCornerTemp = this.findProfileTemp(surfaceTempProfile, anotherCornerY);
    if (anotherCornerTemp <= dewPoint) {
      const anotherCornerIntensity = this.getCondensationIntensity(anotherCornerTemp, dewPoint) * 1.2;
      for (let i = 0; i < 15; i++) {
        condensationPoints.push({
          x: 0.83 + Math.random() * 0.15,
          y: 0.02 + Math.random() * 0.1,
          intensity: Math.min(1, anotherCornerIntensity * (0.6 + Math.random() * 0.6)),
        });
      }
      hasCondensation = true;
    }

    return {
      dewPointTemp: dewPoint,
      surfaceTemp: lowestSurfaceTemp,
      hasCondensation,
      condensationPoints,
      dewDurationHours: totalDewHours,
    };
  }

  private findProfileTemp(profile: Array<{ y: number; temp: number }>, targetY: number): number {
    if (profile.length === 0) return this.env.indoorTemp;
    for (let i = 0; i < profile.length - 1; i++) {
      if (targetY >= profile[i].y && targetY <= profile[i + 1].y) {
        const t = (targetY - profile[i].y) / (profile[i + 1].y - profile[i].y);
        return profile[i].temp + t * (profile[i + 1].temp - profile[i].temp);
      }
    }
    return profile[profile.length - 1].temp;
  }

  generateDewDropField(): Array<{ x: number; y: number; size: number; opacity: number }> {
    const dewDrops: Array<{ x: number; y: number; size: number; opacity: number }> = [];
    const dewPoint = this.calculateDewPoint();

    for (let i = 0; i < this.resolution.x; i++) {
      for (let j = 0; j < this.resolution.y; j++) {
        const x = i / (this.resolution.x - 1);
        const y = j / (this.resolution.y - 1);
        const simulatedTemp = this.env.indoorTemp - 3 * Math.exp(-y * 2.5) - 1.5 * Math.exp(-Math.pow((x - 0.5) * 3, 2));

        if (simulatedTemp <= dewPoint && Math.random() > 0.6) {
          dewDrops.push({
            x: x + (Math.random() - 0.5) * 0.02,
            y: y + (Math.random() - 0.5) * 0.02,
            size: 0.003 + Math.random() * 0.008,
            opacity: 0.4 + Math.random() * 0.5,
          });
        }
      }
    }

    return dewDrops;
  }

  update(env?: EnvironmentParams, ventilation?: VentilationConfig) {
    if (env) this.env = env;
    if (ventilation) this.ventilation = ventilation;
  }
}
