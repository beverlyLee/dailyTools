import * as THREE from 'three';
import {
  IndirectLightConfig,
  LightSourceData,
  BouncePoint,
  gaussianFalloff,
  clamp,
  lerp,
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

  private wallBounceTexture: THREE.CanvasTexture | null = null;
  private ceilingBounceTexture: THREE.CanvasTexture | null = null;

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

    const wallSamplesH = 12;
    const wallSamplesV = 8;

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

    const ceilingSamples = 8;
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

  public updateLightSources(sources: LightSourceData[]): void {
    this.clearBounceLights();
    this.bouncePoints = [];

    if (this.config.bounceCount <= 0) return;

    this.calculateFirstBounce(sources);

    for (let bounce = 1; bounce < this.config.bounceCount; bounce++) {
      this.calculateSubsequentBounces(bounce);
    }

    this.createBounceLights();
  }

  private calculateFirstBounce(sources: LightSourceData[]): void {
    const allPoints = [...this.wallSamplePoints, ...this.ceilingSamplePoints];

    for (const point of allPoints) {
      let totalIntensity = 0;
      let totalColor = new THREE.Color(0, 0, 0);

      for (const source of sources) {
        const distance = point.distanceTo(source.position);
        if (distance < 0.01) continue;

        const toPoint = new THREE.Vector3().subVectors(point, source.position).normalize();
        const lightDir = source.direction.clone().normalize();
        const cosAngle = toPoint.dot(lightDir);

        if (cosAngle <= 0) continue;

        const directFactor = cosAngle / (distance * distance);
        const beamAngleRad = (source.type === 'area' ? Math.PI / 3 : Math.PI / 4);
        const beamFactor = this.beamDistribution(cosAngle, beamAngleRad);

        const intensity = source.intensity * directFactor * beamFactor * 0.1;

        if (intensity > 0.001) {
          totalIntensity += intensity;
          totalColor.add(source.color.clone().multiplyScalar(intensity));
        }
      }

      if (totalIntensity > 0.001) {
        const isWall = this.wallSamplePoints.some(
          (p) => p.distanceTo(point) < 0.01
        );
        const albedo = isWall ? this.config.wallAlbedo : this.config.ceilingAlbedo;

        const bounceColor = totalColor.clone().multiplyScalar(albedo);
        const bounceIntensity = totalIntensity * albedo;

        let normal: THREE.Vector3;
        if (isWall) {
          const roomConfig = this.ceilingGenerator.getRoomConfig();
          if (Math.abs(point.x + roomConfig.width / 2) < 0.01) {
            normal = new THREE.Vector3(1, 0, 0);
          } else if (Math.abs(point.x - roomConfig.width / 2) < 0.01) {
            normal = new THREE.Vector3(-1, 0, 0);
          } else if (Math.abs(point.z + roomConfig.depth / 2) < 0.01) {
            normal = new THREE.Vector3(0, 0, 1);
          } else {
            normal = new THREE.Vector3(0, 0, -1);
          }
        } else {
          normal = new THREE.Vector3(0, -1, 0);
        }

        this.bouncePoints.push({
          position: point.clone(),
          normal,
          color: bounceColor,
          intensity: bounceIntensity,
          bounceLevel: 1,
        });
      }
    }
  }

  private calculateSubsequentBounces(bounceLevel: number): void {
    const firstBouncePoints = this.bouncePoints.filter(
      (p) => p.bounceLevel === bounceLevel
    );

    if (firstBouncePoints.length === 0) return;

    const allPoints = [...this.wallSamplePoints, ...this.ceilingSamplePoints];
    const newBouncePoints: BouncePoint[] = [];

    for (const point of allPoints) {
      let totalIntensity = 0;
      let totalColor = new THREE.Color(0, 0, 0);

      for (const bouncePoint of firstBouncePoints) {
        const distance = point.distanceTo(bouncePoint.position);
        if (distance < 0.1) continue;

        const toPoint = new THREE.Vector3()
          .subVectors(point, bouncePoint.position)
          .normalize();
        const cosIncoming = toPoint.dot(bouncePoint.normal);

        if (cosIncoming <= 0) continue;

        const isWall = this.wallSamplePoints.some(
          (p) => p.distanceTo(point) < 0.01
        );
        let outgoingNormal: THREE.Vector3;
        if (isWall) {
          const roomConfig = this.ceilingGenerator.getRoomConfig();
          if (Math.abs(point.x + roomConfig.width / 2) < 0.01) {
            outgoingNormal = new THREE.Vector3(1, 0, 0);
          } else if (Math.abs(point.x - roomConfig.width / 2) < 0.01) {
            outgoingNormal = new THREE.Vector3(-1, 0, 0);
          } else if (Math.abs(point.z + roomConfig.depth / 2) < 0.01) {
            outgoingNormal = new THREE.Vector3(0, 0, 1);
          } else {
            outgoingNormal = new THREE.Vector3(0, 0, -1);
          }
        } else {
          outgoingNormal = new THREE.Vector3(0, -1, 0);
        }

        const cosOutgoing = -toPoint.dot(outgoingNormal);
        if (cosOutgoing <= 0) continue;

        const lambertFactor = cosIncoming * cosOutgoing;
        const distanceFactor = 1 / (distance * distance + 0.1);
        const intensity = bouncePoint.intensity * lambertFactor * distanceFactor * 0.5;

        if (intensity > 0.0001) {
          totalIntensity += intensity;
          totalColor.add(bouncePoint.color.clone().multiplyScalar(intensity));
        }
      }

      if (totalIntensity > 0.001) {
        const isWall = this.wallSamplePoints.some(
          (p) => p.distanceTo(point) < 0.01
        );
        const albedo = isWall ? this.config.wallAlbedo : this.config.ceilingAlbedo;

        newBouncePoints.push({
          position: point.clone(),
          normal: isWall
            ? new THREE.Vector3(0, 0, 1)
            : new THREE.Vector3(0, -1, 0),
          color: totalColor.clone().multiplyScalar(albedo),
          intensity: totalIntensity * albedo,
          bounceLevel: bounceLevel + 1,
        });
      }
    }

    this.bouncePoints.push(...newBouncePoints);
  }

  private beamDistribution(cosAngle: number, beamAngleRad: number): number {
    const angle = Math.acos(clamp(cosAngle, -1, 1));
    if (angle >= beamAngleRad) return 0;

    const t = angle / beamAngleRad;
    return Math.pow(1 - t, 1.5);
  }

  private createBounceLights(): void {
    const maxLights = 50;
    const sortedPoints = [...this.bouncePoints]
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, maxLights);

    for (const point of sortedPoints) {
      const light = new THREE.PointLight(
        point.color,
        point.intensity * 5,
        10,
        2
      );
      light.position.copy(point.position);
      this.bounceLights.push(light);
      this.indirectLightGroup.add(light);
    }
  }

  private clearBounceLights(): void {
    this.bounceLights.forEach((light) => light.dispose());
    this.bounceLights = [];

    while (this.indirectLightGroup.children.length > 0) {
      this.indirectLightGroup.remove(this.indirectLightGroup.children[0]);
    }
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

  public calculateAverageWallBrightness(sources: LightSourceData[]): number {
    let totalBrightness = 0;
    let sampleCount = 0;

    const wallPoints = this.wallSamplePoints;

    for (const point of wallPoints) {
      let brightness = 0;

      for (const source of sources) {
        const distance = point.distanceTo(source.position);
        if (distance < 0.01) continue;

        const toPoint = new THREE.Vector3().subVectors(point, source.position).normalize();
        const cosAngle = toPoint.dot(source.direction.clone().normalize());

        if (cosAngle <= 0) continue;

        const directFactor = cosAngle / (distance * distance + 0.1);
        brightness += source.intensity * directFactor * 0.05;
      }

      for (const bouncePoint of this.bouncePoints) {
        const distance = point.distanceTo(bouncePoint.position);
        if (distance < 0.1) continue;

        const toPoint = new THREE.Vector3()
          .subVectors(point, bouncePoint.position)
          .normalize();
        const cosIncoming = toPoint.dot(bouncePoint.normal);

        if (cosIncoming <= 0) continue;

        const factor = cosIncoming / (distance * distance + 0.5);
        brightness += bouncePoint.intensity * factor * 0.3;
      }

      totalBrightness += brightness;
      sampleCount++;
    }

    return sampleCount > 0 ? totalBrightness / sampleCount : 0;
  }

  public getIndirectContributionRatio(sources: LightSourceData[]): number {
    let directBrightness = 0;
    let indirectBrightness = 0;

    const wallPoints = this.wallSamplePoints.slice(0, 20);

    for (const point of wallPoints) {
      for (const source of sources) {
        const distance = point.distanceTo(source.position);
        if (distance < 0.01) continue;

        const toPoint = new THREE.Vector3().subVectors(point, source.position).normalize();
        const cosAngle = toPoint.dot(source.direction.clone().normalize());

        if (cosAngle <= 0) continue;

        const directFactor = cosAngle / (distance * distance + 0.1);
        directBrightness += source.intensity * directFactor * 0.05;
      }

      for (const bouncePoint of this.bouncePoints) {
        const distance = point.distanceTo(bouncePoint.position);
        if (distance < 0.1) continue;

        const toPoint = new THREE.Vector3()
          .subVectors(point, bouncePoint.position)
          .normalize();
        const cosIncoming = toPoint.dot(bouncePoint.normal);

        if (cosIncoming <= 0) continue;

        const factor = cosIncoming / (distance * distance + 0.5);
        indirectBrightness += bouncePoint.intensity * factor * 0.3;
      }
    }

    const total = directBrightness + indirectBrightness;
    return total > 0 ? indirectBrightness / total : 0;
  }

  public rebuild(): void {
    this.initializeSamplePoints();
  }

  public dispose(): void {
    this.clearBounceLights();
    if (this.wallBounceTexture) this.wallBounceTexture.dispose();
    if (this.ceilingBounceTexture) this.ceilingBounceTexture.dispose();
  }
}
