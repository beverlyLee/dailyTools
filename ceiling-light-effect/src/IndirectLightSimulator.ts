import * as THREE from 'three';
import {
  IndirectLightConfig,
  LightSourceData,
  BouncePoint,
  clamp,
  PHYSICS,
  calculateAreaLightIlluminance,
} from './types';
import { CeilingGenerator } from './CeilingGenerator';

export class IndirectLightSimulator {
  private scene: THREE.Scene;
  private ceilingGenerator: CeilingGenerator;
  private config: IndirectLightConfig;

  private indirectLightGroup: THREE.Group;
  private bounceLights: THREE.PointLight[] = [];
  private bouncePoints: BouncePoint[] = [];

  private wallSamplePoints: THREE.Vector3[] = [];
  private ceilingSamplePoints: THREE.Vector3[] = [];

  private cachedDirectLux: number = 0;
  private cachedIndirectLux: number = 0;

  private readonly VISUAL_INTENSITY_SCALE = 3.5;
  private readonly LUX_CALIBRATION = 4.2;
  private readonly INDIRECT_RATIO_CALIBRATION = 1.18;

  constructor(scene: THREE.Scene, ceilingGenerator: CeilingGenerator, config: IndirectLightConfig) {
    this.scene = scene;
    this.ceilingGenerator = ceilingGenerator;
    this.config = { ...config };

    this.indirectLightGroup = new THREE.Group();
    this.scene.add(this.indirectLightGroup);

    this.initializeSamplePoints();
  }

  private initializeSamplePoints(): void {
    this.wallSamplePoints = [];
    this.ceilingSamplePoints = [];

    const roomConfig = this.ceilingGenerator.getRoomConfig();
    const { width, depth, height } = roomConfig;

    const wallSamplesH = 10;
    const wallSamplesV = 6;

    for (let i = 0; i < wallSamplesH; i++) {
      for (let j = 0; j < wallSamplesV; j++) {
        const u = (i + 0.5) / wallSamplesH;
        const v = (j + 0.5) / wallSamplesV;

        this.wallSamplePoints.push(
          new THREE.Vector3(
            -width / 2 + u * width,
            v * height,
            -depth / 2
          )
        );

        this.wallSamplePoints.push(
          new THREE.Vector3(
            -width / 2 + u * width,
            v * height,
            depth / 2
          )
        );

        this.wallSamplePoints.push(
          new THREE.Vector3(
            -width / 2,
            v * height,
            -depth / 2 + u * depth
          )
        );

        this.wallSamplePoints.push(
          new THREE.Vector3(
            width / 2,
            v * height,
            -depth / 2 + u * depth
          )
        );
      }
    }

    const ceilingSamples = 6;
    const ceilingHeight = height - this.ceilingGenerator.getCeilingConfig().drop;

    for (let i = 0; i < ceilingSamples; i++) {
      for (let j = 0; j < ceilingSamples; j++) {
        const u = (i + 0.5) / ceilingSamples;
        const v = (j + 0.5) / ceilingSamples;
        this.ceilingSamplePoints.push(
          new THREE.Vector3(
            -width / 2 + u * width,
            ceilingHeight,
            -depth / 2 + v * depth
          )
        );
      }
    }
  }

  private getWallNormal(point: THREE.Vector3): THREE.Vector3 {
    const roomConfig = this.ceilingGenerator.getRoomConfig();
    const eps = 0.02;

    if (Math.abs(point.x + roomConfig.width / 2) < eps) {
      return new THREE.Vector3(1, 0, 0);
    } else if (Math.abs(point.x - roomConfig.width / 2) < eps) {
      return new THREE.Vector3(-1, 0, 0);
    } else if (Math.abs(point.z + roomConfig.depth / 2) < eps) {
      return new THREE.Vector3(0, 0, 1);
    } else {
      return new THREE.Vector3(0, 0, -1);
    }
  }

  public updateLightSources(sources: LightSourceData[]): void {
    this.clearBounceLights();
    this.bouncePoints = [];

    if (this.config.bounceCount > 0) {
      this.calculateFirstBounce(sources);

      for (let bounce = 1; bounce < this.config.bounceCount; bounce++) {
        this.calculateSubsequentBounces(bounce);
      }

      this.createBounceLights();
    }

    this.updateStats(sources);
  }

  private calculateFirstBounce(sources: LightSourceData[]): void {
    const allPoints = [...this.wallSamplePoints, ...this.ceilingSamplePoints];

    for (const point of allPoints) {
      let totalLux = 0;
      let totalColor = new THREE.Color(0, 0, 0);

      const isWall = this.wallSamplePoints.some(p => p.distanceTo(point) < 0.01);
      const normal = isWall
        ? this.getWallNormal(point)
        : new THREE.Vector3(0, -1, 0);

      for (const source of sources) {
        const lux = calculateAreaLightIlluminance(
          source.intensity,
          source.width,
          source.height,
          source.direction.clone().normalize(),
          point,
          normal,
          source.position,
          Math.PI / 2.5
        );

        if (lux > 0.001) {
          totalLux += lux;
          totalColor.add(source.color.clone().multiplyScalar(lux));
        }
      }

      if (totalLux > 0.01) {
        const albedo = isWall ? this.config.wallAlbedo : this.config.ceilingAlbedo;

        const bounceColor = totalColor.clone().multiplyScalar(albedo / totalLux);
        const bounceIntensity = totalLux * albedo / Math.PI;

        this.bouncePoints.push({
          position: point.clone(),
          normal: normal.clone(),
          color: bounceColor,
          intensity: bounceIntensity,
          bounceLevel: 1,
        });
      }
    }
  }

  private calculateSubsequentBounces(bounceLevel: number): void {
    const prevBouncePoints = this.bouncePoints.filter(p => p.bounceLevel === bounceLevel);

    if (prevBouncePoints.length === 0) return;

    const allPoints = [...this.wallSamplePoints, ...this.ceilingSamplePoints];
    const newBouncePoints: BouncePoint[] = [];

    const decayFactor = Math.pow(PHYSICS.INDIRECT_BOUNCE_DECAY, bounceLevel);

    for (const point of allPoints) {
      let totalLux = 0;
      let totalColor = new THREE.Color(0, 0, 0);

      const isWall = this.wallSamplePoints.some(p => p.distanceTo(point) < 0.01);
      const normal = isWall
        ? this.getWallNormal(point)
        : new THREE.Vector3(0, -1, 0);

      for (const bouncePoint of prevBouncePoints) {
        const toPoint = new THREE.Vector3()
          .subVectors(point, bouncePoint.position)
          .normalize();

        const distance = point.distanceTo(bouncePoint.position);
        if (distance < 0.1) continue;

        const cosOut = toPoint.dot(bouncePoint.normal);
        if (cosOut <= 0) continue;

        const cosIn = -toPoint.dot(normal);
        if (cosIn <= 0) continue;

        const intensity = bouncePoint.intensity * cosOut * cosIn / (distance * distance);
        const lux = intensity * decayFactor;

        if (lux > 0.001) {
          totalLux += lux;
          totalColor.add(bouncePoint.color.clone().multiplyScalar(lux));
        }
      }

      if (totalLux > 0.01) {
        const albedo = isWall ? this.config.wallAlbedo : this.config.ceilingAlbedo;

        newBouncePoints.push({
          position: point.clone(),
          normal: normal.clone(),
          color: totalColor.clone().multiplyScalar(albedo / totalLux),
          intensity: totalLux * albedo / Math.PI,
          bounceLevel: bounceLevel + 1,
        });
      }
    }

    this.bouncePoints.push(...newBouncePoints);
  }

  private createBounceLights(): void {
    const maxLights = 36;
    const sortedPoints = [...this.bouncePoints]
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, maxLights);

    for (const point of sortedPoints) {
      const visualIntensity = point.intensity * this.VISUAL_INTENSITY_SCALE;
      const light = new THREE.PointLight(
        point.color,
        visualIntensity,
        12,
        2
      );
      light.position.copy(point.position);
      this.bounceLights.push(light);
      this.indirectLightGroup.add(light);
    }
  }

  private clearBounceLights(): void {
    this.bounceLights.forEach(light => light.dispose());
    this.bounceLights = [];

    while (this.indirectLightGroup.children.length > 0) {
      this.indirectLightGroup.remove(this.indirectLightGroup.children[0]);
    }
  }

  private updateStats(sources: LightSourceData[]): void {
    let directTotal = 0;
    let indirectTotal = 0;
    let sampleCount = 0;

    const wallUpperPoints = this.wallSamplePoints.filter(p => {
      const height = this.ceilingGenerator.getRoomConfig().height;
      return p.y > height * 0.4 && p.y < height * 0.7;
    });

    for (const point of wallUpperPoints) {
      const normal = this.getWallNormal(point);

      let directLux = 0;
      for (const source of sources) {
        directLux += calculateAreaLightIlluminance(
          source.intensity,
          source.width,
          source.height,
          source.direction.clone().normalize(),
          point,
          normal,
          source.position,
          Math.PI / 2.5
        );
      }

      let indirectLux = 0;
      for (const bouncePoint of this.bouncePoints) {
        const toPoint = new THREE.Vector3()
          .subVectors(point, bouncePoint.position)
          .normalize();
        const distance = point.distanceTo(bouncePoint.position);
        if (distance < 0.1) continue;

        const cosOut = toPoint.dot(bouncePoint.normal);
        const cosIn = -toPoint.dot(normal);
        if (cosOut <= 0 || cosIn <= 0) continue;

        indirectLux += bouncePoint.intensity * cosOut * cosIn / (distance * distance);
      }

      directTotal += directLux;
      indirectTotal += indirectLux;
      sampleCount++;
    }

    this.cachedDirectLux = sampleCount > 0 ? directTotal / sampleCount : 0;
    this.cachedIndirectLux = sampleCount > 0 ? indirectTotal / sampleCount : 0;
  }

  public updateConfig(config: Partial<IndirectLightConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getIndirectLightGroup(): THREE.Group {
    return this.indirectLightGroup;
  }

  public getBouncePoints(): BouncePoint[] {
    return [...this.bouncePoints];
  }

  public calculateAverageWallBrightness(_sources: LightSourceData[]): number {
    const adjustedIndirect = this.cachedIndirectLux * this.INDIRECT_RATIO_CALIBRATION;
    return (this.cachedDirectLux + adjustedIndirect) * this.LUX_CALIBRATION;
  }

  public getIndirectContributionRatio(_sources: LightSourceData[]): number {
    const total = this.cachedDirectLux + this.cachedIndirectLux;
    if (total <= 0) return 0;

    const rawIndirect = this.cachedIndirectLux * this.INDIRECT_RATIO_CALIBRATION;
    const adjustedTotal = this.cachedDirectLux + rawIndirect;
    const ratio = rawIndirect / adjustedTotal;

    if (this.config.bounceCount <= 0) {
      return Math.max(0, ratio);
    }

    return clamp(ratio, PHYSICS.MIN_INDIRECT_RATIO, PHYSICS.MAX_INDIRECT_RATIO);
  }

  public getDirectLux(): number {
    return this.cachedDirectLux;
  }

  public getIndirectLux(): number {
    return this.cachedIndirectLux;
  }

  public rebuild(): void {
    this.initializeSamplePoints();
  }

  public dispose(): void {
    this.clearBounceLights();
  }
}
