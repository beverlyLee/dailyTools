import * as THREE from 'three';
import { GlareResult, LightSourceData, clamp } from './types';
import { CeilingGenerator } from './CeilingGenerator';

export class GlareAnalyzer {
  private scene: THREE.Scene;
  private ceilingGenerator: CeilingGenerator;

  private eyePosition: THREE.Vector3;
  private viewDirection: THREE.Vector3;
  private fov: number;

  private glareIndicator: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, ceilingGenerator: CeilingGenerator) {
    this.scene = scene;
    this.ceilingGenerator = ceilingGenerator;

    const roomConfig = this.ceilingGenerator.getRoomConfig();
    this.eyePosition = new THREE.Vector3(0, roomConfig.height * 0.6, roomConfig.depth * 0.3);
    this.viewDirection = new THREE.Vector3(0, -0.1, -1).normalize();
    this.fov = 60;

    this.createGlareIndicator();
  }

  private createGlareIndicator(): void {
    const geometry = new THREE.RingGeometry(0.05, 0.08, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.glareIndicator = new THREE.Mesh(geometry, material);
    this.glareIndicator.visible = false;
    this.scene.add(this.glareIndicator);
  }

  public analyze(sources: LightSourceData[]): GlareResult {
    let totalGlare = 0;
    let visibleSources = 0;

    const fovHalf = (this.fov / 2) * (Math.PI / 180);

    for (const source of sources) {
      const toLight = new THREE.Vector3()
        .subVectors(source.position, this.eyePosition)
        .normalize();

      const angle = Math.acos(
        clamp(this.viewDirection.dot(toLight), -1, 1)
      );

      if (angle < fovHalf) {
        const distance = source.position.distanceTo(this.eyePosition);
        const solidAngle = this.calculateSolidAngle(source, distance);
        const luminance = source.intensity / solidAngle;

        const positionFactor = this.positionFactor(angle, fovHalf);

        const glareValue = (luminance * solidAngle * positionFactor) / (distance * distance + 0.1);
        totalGlare += glareValue;
        visibleSources++;
      }
    }

    const ugr = this.calculateUGR(totalGlare, sources.length);

    return {
      hasGlare: ugr > 19,
      glareAmount: totalGlare,
      ugr: Math.round(ugr),
    };
  }

  private calculateSolidAngle(source: LightSourceData, distance: number): number {
    if (source.type === 'area') {
      const width = source.width;
      const height = source.height;
      const area = width * height;
      return area / (distance * distance + 0.01);
    } else {
      const radius = source.height * 0.3;
      const area = Math.PI * radius * radius + source.width * radius * 2;
      return area / (distance * distance + 0.01);
    }
  }

  private positionFactor(angle: number, fovHalf: number): number {
    const relativeAngle = angle / fovHalf;
    if (relativeAngle < 0.2) return 1.0;
    if (relativeAngle < 0.6) return 0.8;
    if (relativeAngle < 0.8) return 0.5;
    return 0.2;
  }

  private calculateUGR(totalGlare: number, sourceCount: number): number {
    const backgroundLuminance = 50;
    const ugr = 8 * Math.log10((0.25 * totalGlare * 1000) / backgroundLuminance);
    return clamp(ugr, 10, 40);
  }

  public updateEyePosition(position: THREE.Vector3): void {
    this.eyePosition.copy(position);
  }

  public updateViewDirection(direction: THREE.Vector3): void {
    this.viewDirection.copy(direction).normalize();
  }

  public updateFOV(fov: number): void {
    this.fov = fov;
  }

  public setGlareVisualization(visible: boolean, intensity: number = 0): void {
    if (!this.glareIndicator) return;

    this.glareIndicator.visible = visible;

    if (visible) {
      const material = this.glareIndicator.material as THREE.MeshBasicMaterial;
      material.opacity = Math.min(intensity * 0.5, 0.8);

      this.glareIndicator.position.copy(this.eyePosition);
      this.glareIndicator.position.add(
        this.viewDirection.clone().multiplyScalar(0.5)
      );
      this.glareIndicator.lookAt(
        this.glareIndicator.position.clone().add(this.viewDirection)
      );
    }
  }

  public getEyePosition(): THREE.Vector3 {
    return this.eyePosition.clone();
  }

  public getViewDirection(): THREE.Vector3 {
    return this.viewDirection.clone();
  }

  public dispose(): void {
    if (this.glareIndicator) {
      if (this.glareIndicator.geometry) this.glareIndicator.geometry.dispose();
      const mat = this.glareIndicator.material as THREE.Material;
      if (mat) mat.dispose();
      this.scene.remove(this.glareIndicator);
    }
  }
}
