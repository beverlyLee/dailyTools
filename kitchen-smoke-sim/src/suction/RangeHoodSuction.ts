import * as THREE from 'three';
import { SmokeParticle, SimulationConfig } from '../types/Particle';

export class RangeHoodSuction {
  private scene: THREE.Scene;
  private config: SimulationConfig;
  private hoodPosition: THREE.Vector3;
  private hoodSize: THREE.Vector2;
  private suctionStrength: number;
  private isActive: boolean;
  private hoodMesh!: THREE.Group;
  private fanMesh!: THREE.Mesh;
  private capturedCount = 0;
  private intakeRadius: number;
  private suctionHeight: number;
  private suctionForceMultiplier: number;
  private captureRadiusMultiplier: number;

  constructor(scene: THREE.Scene, config: SimulationConfig, hoodPos: THREE.Vector3) {
    this.scene = scene;
    this.config = config;
    this.hoodPosition = hoodPos.clone();
    this.hoodSize = new THREE.Vector2(0.9, 0.5);
    this.suctionStrength = config.suctionPower;
    this.isActive = true;
    this.intakeRadius = 0.65;
    this.suctionHeight = 2.2;
    this.suctionForceMultiplier = 0.28;
    this.captureRadiusMultiplier = 2.5;

    this.createHoodModel();
  }

  private createHoodModel(): void {
    this.hoodMesh = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(this.hoodSize.x, 0.15, this.hoodSize.y);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.9,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -0.075;
    this.hoodMesh.add(body);

    const chimneyGeo = new THREE.BoxGeometry(0.3, 0.8, 0.2);
    const chimney = new THREE.Mesh(chimneyGeo, bodyMat);
    chimney.position.set(0, 0.475, 0);
    this.hoodMesh.add(chimney);

    const intakeGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.05, 32);
    const intakeMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3,
    });
    const intake = new THREE.Mesh(intakeGeo, intakeMat);
    intake.position.y = -0.15;
    this.hoodMesh.add(intake);

    const fanGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16);
    const fanMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.7,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    this.fanMesh = new THREE.Mesh(fanGeo, fanMat);
    this.fanMesh.position.y = -0.14;
    this.fanMesh.rotation.x = Math.PI / 2;
    this.hoodMesh.add(this.fanMesh);

    for (let i = 0; i < 5; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.2, 0.01, 0.04);
      const blade = new THREE.Mesh(bladeGeo, fanMat);
      blade.position.y = -0.14;
      blade.rotation.y = (i / 5) * Math.PI * 2;
      blade.position.x = Math.cos((i / 5) * Math.PI * 2) * 0.05;
      blade.position.z = Math.sin((i / 5) * Math.PI * 2) * 0.05;
      this.hoodMesh.add(blade);
    }

    const lightGeo = new THREE.RingGeometry(0.05, 0.12, 32);
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(-0.3, -0.12, 0);
    light.rotation.x = Math.PI / 2;
    this.hoodMesh.add(light);

    const light2 = light.clone();
    light2.position.x = 0.3;
    this.hoodMesh.add(light2);

    this.hoodMesh.position.copy(this.hoodPosition);
    this.scene.add(this.hoodMesh);
  }

  public calculateForces(particles: SmokeParticle[]): THREE.Vector3[] {
    const forces: THREE.Vector3[] = [];

    if (!this.isActive) {
      for (let i = 0; i < particles.length; i++) {
        forces.push(new THREE.Vector3());
      }
      return forces;
    }

    for (const particle of particles) {
      const force = this.calculateSingleForce(particle);
      forces.push(force);
    }

    return forces;
  }

  private calculateSingleForce(particle: SmokeParticle): THREE.Vector3 {
    const hoodBottomY = this.hoodPosition.y - 0.15;
    const particleY = particle.position.y;
    const distBelowHood = hoodBottomY - particleY;

    if (distBelowHood < -0.3) {
      return new THREE.Vector3();
    }
    if (distBelowHood > this.suctionHeight) {
      return new THREE.Vector3();
    }

    const dx = particle.position.x - this.hoodPosition.x;
    const dz = particle.position.z - this.hoodPosition.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    const radiusAtHeight = this.intakeRadius + distBelowHood * 1.0;
    if (horizontalDist > radiusAtHeight * 1.5) {
      return new THREE.Vector3();
    }

    if (particleY >= hoodBottomY - 0.3 && particleY <= hoodBottomY + 0.15) {
      const distToIntake = Math.sqrt(dx * dx + dz * dz);
      if (distToIntake < this.intakeRadius * this.captureRadiusMultiplier) {
        particle.captured = true;
        this.capturedCount++;
        return new THREE.Vector3();
      }
    }

    const heightFactor = Math.max(0, 1 - distBelowHood / this.suctionHeight);
    const heightFactorPow = Math.pow(heightFactor, 1.2);

    const horizontalFactor = Math.max(0, 1 - horizontalDist / radiusAtHeight);
    const horizontalFactorPow = Math.pow(horizontalFactor, 0.8);

    const proximityBoost = Math.pow(heightFactor, 3) * 0.6;
    const baseStrength = this.suctionStrength * this.suctionForceMultiplier;
    const strength = baseStrength * heightFactorPow * horizontalFactorPow * (1 + proximityBoost);

    const dirLen = Math.sqrt(dx * dx + distBelowHood * distBelowHood + dz * dz);
    if (dirLen < 0.001) {
      return new THREE.Vector3(0, -strength, 0);
    }

    const inwardPull = 0.7;
    const verticalPull = 0.5;
    const horizontalFactor2 = Math.min(1, horizontalDist / 0.5);
    const proximityFactor = Math.pow(heightFactor, 2.5);
    
    const dirX = -dx / dirLen;
    const dirY = distBelowHood / dirLen;
    const dirZ = -dz / dirLen;
    
    const adjDirX = dirX * (1 + inwardPull * proximityFactor * horizontalFactor2);
    const adjDirY = dirY * (1 + verticalPull * proximityFactor);
    const adjDirZ = dirZ * (1 + inwardPull * proximityFactor * horizontalFactor2);
    
    const direction = new THREE.Vector3(adjDirX, adjDirY, adjDirZ).normalize();

    const swirlStrength = strength * 0.1;
    const swirlDir = new THREE.Vector3(
      dz,
      0,
      -dx
    ).normalize();

    const totalForce = direction.multiplyScalar(strength).add(swirlDir.multiplyScalar(swirlStrength));

    return totalForce;
  }

  public update(deltaTime: number): void {
    if (this.isActive) {
      this.fanMesh.rotation.y += deltaTime * 20 * this.suctionStrength;
    }
  }

  public setActive(active: boolean): void {
    this.isActive = active;
  }

  public setSuctionStrength(strength: number): void {
    this.suctionStrength = strength;
  }

  public setHoodHeight(height: number): void {
    this.hoodPosition.y = height;
    this.hoodMesh.position.y = height;
  }

  public getHoodPosition(): THREE.Vector3 {
    return this.hoodPosition.clone();
  }

  public getCapturedCount(): number {
    return this.capturedCount;
  }

  public resetCapturedCount(): void {
    this.capturedCount = 0;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public dispose(): void {
    this.scene.remove(this.hoodMesh);
  }
}
