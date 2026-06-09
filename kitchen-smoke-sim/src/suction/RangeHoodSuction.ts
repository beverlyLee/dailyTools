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

  constructor(scene: THREE.Scene, config: SimulationConfig, hoodPos: THREE.Vector3) {
    this.scene = scene;
    this.config = config;
    this.hoodPosition = hoodPos.clone();
    this.hoodSize = new THREE.Vector2(0.9, 0.5);
    this.suctionStrength = config.suctionPower;
    this.isActive = true;
    this.intakeRadius = 0.5;
    this.suctionHeight = 1.2;

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

    if (particleY > hoodBottomY + this.suctionHeight) {
      return new THREE.Vector3();
    }

    if (particleY > hoodBottomY) {
      const distToIntake = particle.position.distanceTo(
        new THREE.Vector3(this.hoodPosition.x, hoodBottomY, this.hoodPosition.z)
      );
      if (distToIntake < this.intakeRadius * 0.8) {
        particle.captured = true;
        this.capturedCount++;
        return new THREE.Vector3();
      }
    }

    const heightDiff = hoodBottomY - particleY;
    const heightFactor = Math.max(0, 1 - heightDiff / this.suctionHeight);
    const heightFactorSq = heightFactor * heightFactor;

    const horizontalDist = Math.sqrt(
      Math.pow(particle.position.x - this.hoodPosition.x, 2) +
      Math.pow(particle.position.z - this.hoodPosition.z, 2)
    );

    const maxHorizontalRadius = this.intakeRadius + (this.suctionHeight - heightDiff) * 0.8;
    const horizontalFactor = Math.max(0, 1 - horizontalDist / maxHorizontalRadius);
    const horizontalFactorSq = horizontalFactor * horizontalFactor;

    const strength = this.suctionStrength * heightFactorSq * horizontalFactorSq;

    const direction = new THREE.Vector3(
      this.hoodPosition.x - particle.position.x,
      hoodBottomY - particle.position.y,
      this.hoodPosition.z - particle.position.z
    ).normalize();

    const swirlStrength = strength * 0.3;
    const swirlDir = new THREE.Vector3(
      -(particle.position.z - this.hoodPosition.z),
      0,
      particle.position.x - this.hoodPosition.x
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
