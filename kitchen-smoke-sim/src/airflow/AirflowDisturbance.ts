import * as THREE from 'three';
import { SmokeParticle, SimulationConfig } from '../types/Particle';

export class AirflowDisturbance {
  private scene: THREE.Scene;
  private config: SimulationConfig;
  private windowOpen: boolean;
  private kitchenBounds: { min: THREE.Vector3; max: THREE.Vector3 };
  private windowPosition: THREE.Vector3;
  private windowNormal: THREE.Vector3;
  private windStrength: number;
  private turbulenceScale: number;
  private time: number = 0;
  private personWalking: boolean;
  private personPosition: THREE.Vector3;
  private personVelocity: THREE.Vector3;
  private personWalkPhase: number = 0;

  constructor(
    scene: THREE.Scene,
    config: SimulationConfig,
    bounds: { min: THREE.Vector3; max: THREE.Vector3 }
  ) {
    this.scene = scene;
    this.config = config;
    this.windowOpen = config.windowOpen;
    this.kitchenBounds = bounds;
    this.windStrength = 0.5;
    this.turbulenceScale = 0.3;

    this.windowPosition = new THREE.Vector3(
      bounds.min.x + 0.1,
      bounds.max.y * 0.6,
      0
    );
    this.windowNormal = new THREE.Vector3(1, 0, 0);

    this.personWalking = false;
    this.personPosition = new THREE.Vector3(0, 0, 0);
    this.personVelocity = new THREE.Vector3(0.5, 0, 0);
  }

  public calculateForces(particles: SmokeParticle[], deltaTime: number): THREE.Vector3[] {
    this.time += deltaTime;
    const forces: THREE.Vector3[] = [];

    for (const particle of particles) {
      const force = new THREE.Vector3();

      if (this.windowOpen) {
        force.add(this.calculateWindowForce(particle));
      }

      force.add(this.calculateTurbulenceForce(particle));

      if (this.personWalking) {
        force.add(this.calculatePersonForce(particle));
      }

      forces.push(force);
    }

    if (this.personWalking) {
      this.updatePersonPosition(deltaTime);
    }

    return forces;
  }

  private calculateWindowForce(particle: SmokeParticle): THREE.Vector3 {
    const particlePos = particle.position;

    const distToWindow = Math.abs(particlePos.x - this.windowPosition.x);
    const maxDist = this.kitchenBounds.max.x - this.kitchenBounds.min.x;
    const distanceFactor = Math.max(0, 1 - distToWindow / maxDist);

    const heightDiff = Math.abs(particlePos.y - this.windowPosition.y);
    const windowHeight = this.kitchenBounds.max.y * 0.3;
    const heightFactor = Math.max(0, 1 - heightDiff / windowHeight);

    const zDiff = Math.abs(particlePos.z - this.windowPosition.z);
    const zRange = this.kitchenBounds.max.z - this.kitchenBounds.min.z;
    const zFactor = Math.max(0, 1 - zDiff / (zRange * 0.6));

    const strength = this.windStrength * distanceFactor * heightFactor * zFactor;

    const baseForce = this.windowNormal.clone().multiplyScalar(strength);

    const verticalVariation = Math.sin(this.time * 2 + particlePos.y * 5) * 0.2;
    baseForce.y += verticalVariation * strength;

    return baseForce;
  }

  private calculateTurbulenceForce(particle: SmokeParticle): THREE.Vector3 {
    const pos = particle.position;
    const scale = this.turbulenceScale;
    const speed = 1.5;

    const noiseX = this.perlinNoise(
      pos.x * scale + this.time * speed,
      pos.y * scale * 0.5,
      pos.z * scale
    );

    const noiseY = this.perlinNoise(
      pos.x * scale * 0.5,
      pos.y * scale + this.time * speed * 0.7,
      pos.z * scale * 0.8
    );

    const noiseZ = this.perlinNoise(
      pos.x * scale * 0.8,
      pos.y * scale * 0.3,
      pos.z * scale + this.time * speed * 0.9
    );

    return new THREE.Vector3(noiseX, noiseY * 0.5, noiseZ).multiplyScalar(this.config.diffusion * 2);
  }

  private perlinNoise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const hash = (n: number) => Math.sin(n * 12.9898) * 43758.5453 % 1;

    const aaa = hash(X + hash(Y + hash(Z)));
    const aba = hash(X + hash(Y + 1 + hash(Z)));
    const aab = hash(X + hash(Y + hash(Z + 1)));
    const abb = hash(X + hash(Y + 1 + hash(Z + 1)));
    const baa = hash(X + 1 + hash(Y + hash(Z)));
    const bba = hash(X + 1 + hash(Y + 1 + hash(Z)));
    const bab = hash(X + 1 + hash(Y + hash(Z + 1)));
    const bbb = hash(X + 1 + hash(Y + 1 + hash(Z + 1)));

    const x1 = this.lerp(aaa, baa, u);
    const x2 = this.lerp(aba, bba, u);
    const x3 = this.lerp(aab, bab, u);
    const x4 = this.lerp(abb, bbb, u);

    const y1 = this.lerp(x1, x2, v);
    const y2 = this.lerp(x3, x4, v);

    return (this.lerp(y1, y2, w) - 0.5) * 2;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private calculatePersonForce(particle: SmokeParticle): THREE.Vector3 {
    const dist = particle.position.distanceTo(this.personPosition);
    const influenceRadius = 1.5;

    if (dist > influenceRadius) {
      return new THREE.Vector3();
    }

    const falloff = 1 - dist / influenceRadius;
    const falloffSq = falloff * falloff;

    const direction = particle.position.clone().sub(this.personPosition).normalize();
    const strength = 0.8 * falloffSq;

    const wakeStrength = this.personVelocity.length() * 0.5 * falloff;
    const wakeForce = this.personVelocity.clone().normalize().multiplyScalar(wakeStrength);

    return direction.multiplyScalar(strength).add(wakeForce);
  }

  private updatePersonPosition(deltaTime: number): void {
    this.personWalkPhase += deltaTime * 0.5;

    const walkRange = (this.kitchenBounds.max.x - this.kitchenBounds.min.x) * 0.4;
    const targetX = Math.sin(this.personWalkPhase) * walkRange;

    this.personVelocity.x = (targetX - this.personPosition.x) / deltaTime * 0.1;
    this.personPosition.x += this.personVelocity.x * deltaTime;
    this.personPosition.y = 0.8 + Math.sin(this.personWalkPhase * 2) * 0.02;
  }

  public setWindowOpen(open: boolean): void {
    this.windowOpen = open;
  }

  public setWindStrength(strength: number): void {
    this.windStrength = strength;
  }

  public setPersonWalking(walking: boolean): void {
    this.personWalking = walking;
  }

  public getWindowOpen(): boolean {
    return this.windowOpen;
  }

  public dispose(): void {
  }
}
