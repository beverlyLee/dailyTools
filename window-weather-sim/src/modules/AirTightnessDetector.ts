import * as THREE from 'three';
import { WindowSystem } from './WindowSystem';

export class AirTightnessDetector {
  private scene: THREE.Scene;
  private windowSystem: WindowSystem;
  private curtain: THREE.Mesh | null = null;
  private curtainGeometry: THREE.PlaneGeometry | null = null;
  private originalPositions: Float32Array | null = null;
  private windStrength: number = 0;
  private time: number = 0;
  private visible: boolean = true;
  private airLeakage: number = 0;
  private maxAirLeakage: number = 100;

  constructor(scene: THREE.Scene, windowSystem: WindowSystem) {
    this.scene = scene;
    this.windowSystem = windowSystem;
    this.createCurtain();
  }

  private createCurtain(): void {
    const dimensions = this.windowSystem.getDimensions();
    
    const curtainWidth = dimensions.width * 0.9;
    const curtainHeight = dimensions.height * 0.95;
    const segmentsW = 30;
    const segmentsH = 40;

    this.curtainGeometry = new THREE.PlaneGeometry(
      curtainWidth,
      curtainHeight,
      segmentsW,
      segmentsH
    );

    const positions = this.curtainGeometry.attributes.position.array as Float32Array;
    this.originalPositions = new Float32Array(positions.length);
    this.originalPositions.set(positions);

    const curtainMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5e6d3,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9
    });

    this.curtain = new THREE.Mesh(this.curtainGeometry, curtainMaterial);
    this.curtain.position.set(0, 0, 0.5);
    this.scene.add(this.curtain);
  }

  setWindStrength(strength: number): void {
    this.windStrength = Math.max(0, Math.min(1, strength));
    
    const windowType = this.windowSystem.getWindowType();
    const leakFactor = windowType === 'sliding' ? 0.8 : 0.15;
    this.airLeakage = this.windStrength * this.maxAirLeakage * leakFactor;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.curtain) {
      this.curtain.visible = visible;
    }
  }

  update(deltaTime: number): void {
    if (!this.curtainGeometry || !this.originalPositions || !this.curtain || !this.visible) return;

    this.time += deltaTime;

    const positions = this.curtainGeometry.attributes.position.array as Float32Array;
    const windowType = this.windowSystem.getWindowType();
    
    const effectiveWind = this.windStrength * (windowType === 'sliding' ? 0.7 : 0.12);
    
    const segmentsW = 30;
    const segmentsH = 40;

    for (let i = 0; i <= segmentsH; i++) {
      for (let j = 0; j <= segmentsW; j++) {
        const idx = (i * (segmentsW + 1) + j) * 3;
        
        const origX = this.originalPositions[idx];
        const origY = this.originalPositions[idx + 1];
        const origZ = this.originalPositions[idx + 2];

        const heightFactor = (origY + 1) / 2;
        const topFactor = Math.pow(heightFactor, 0.5);
        
        const wave1 = Math.sin(this.time * 2 + j * 0.3 + i * 0.1) * 0.05;
        const wave2 = Math.sin(this.time * 3.5 + j * 0.5 - i * 0.2) * 0.03;
        const wave3 = Math.sin(this.time * 1.8 + i * 0.4) * 0.04;
        
        const bulge = effectiveWind * topFactor * 0.4;
        
        const swayX = Math.sin(this.time * 1.5 + i * 0.3) * effectiveWind * 0.1 * topFactor;
        
        positions[idx] = origX + swayX + wave1 * effectiveWind * 0.5;
        positions[idx + 1] = origY + wave2 * effectiveWind * 0.3 * topFactor;
        positions[idx + 2] = origZ + bulge + wave3 * effectiveWind * 0.5 + Math.abs(swayX) * 0.3;

        if (i === segmentsH) {
          positions[idx] = origX;
          positions[idx + 1] = origY;
          positions[idx + 2] = origZ;
        }
      }
    }

    this.curtainGeometry.attributes.position.needsUpdate = true;
    this.curtainGeometry.computeVertexNormals();
  }

  getAirTightnessStatus(): 'good' | 'warning' | 'danger' {
    const ratio = this.airLeakage / this.maxAirLeakage;
    if (ratio < 0.2) return 'good';
    if (ratio < 0.5) return 'warning';
    return 'danger';
  }

  getAirLeakage(): number {
    return this.airLeakage;
  }

  getCurtainSwingAmount(): number {
    return this.windStrength * (this.windowSystem.getWindowType() === 'sliding' ? 0.7 : 0.12);
  }

  dispose(): void {
    if (this.curtain) {
      this.scene.remove(this.curtain);
      this.curtainGeometry?.dispose();
      (this.curtain.material as THREE.Material).dispose();
    }
  }
}
