import * as THREE from 'three';

export interface RainConfig {
  intensity: number;
  windSpeed: number;
  windDirection: number;
  particleCount: number;
}

export class RainParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private maxParticles: number;
  private config: RainConfig;
  private emitterArea: { width: number; height: number; depth: number };
  private gravity: number = 9.8;

  private readonly windScale: number = 15;

  constructor(scene: THREE.Scene, maxParticles: number = 5000) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.config = {
      intensity: 0.5,
      windSpeed: 0.5,
      windDirection: 0,
      particleCount: maxParticles
    };

    this.emitterArea = {
      width: 8,
      height: 6,
      depth: 4
    };

    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.lifetimes = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      this.resetParticle(i);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private resetParticle(index: number): void {
    const i3 = index * 3;
    
    this.positions[i3] = (Math.random() - 0.5) * this.emitterArea.width;
    this.positions[i3 + 1] = Math.random() * this.emitterArea.height + 2;
    this.positions[i3 + 2] = -this.emitterArea.depth - Math.random() * 2;

    const windSpeedScaled = this.config.windSpeed * this.windScale;
    const windX = Math.sin(this.config.windDirection) * windSpeedScaled;

    this.velocities[i3] = windX * (0.8 + Math.random() * 0.4);
    this.velocities[i3 + 1] = -5 - Math.random() * 5;
    this.velocities[i3 + 2] = 3 + Math.random() * 4 + windSpeedScaled * 0.3;

    this.lifetimes[index] = 0;
  }

  update(deltaTime: number): void {
    const activeCount = Math.floor(this.maxParticles * this.config.intensity);
    const windSpeedScaled = this.config.windSpeed * this.windScale;
    
    for (let i = 0; i < activeCount; i++) {
      const i3 = i * 3;
      
      this.lifetimes[i] += deltaTime;
      
      this.velocities[i3 + 1] -= this.gravity * deltaTime * 0.5;
      
      const windX = Math.sin(this.config.windDirection) * windSpeedScaled;
      const targetVZ = 3 + windSpeedScaled * 0.4;
      this.velocities[i3] += (windX - this.velocities[i3]) * deltaTime * 0.5;
      this.velocities[i3 + 2] += (targetVZ - this.velocities[i3 + 2]) * deltaTime * 0.2;

      this.positions[i3] += this.velocities[i3] * deltaTime;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;

      if (this.positions[i3 + 1] < -2 || this.positions[i3 + 2] > 5 ||
          Math.abs(this.positions[i3]) > this.emitterArea.width + 3) {
        this.resetParticle(i);
      }
    }

    for (let i = activeCount; i < this.maxParticles; i++) {
      const i3 = i * 3;
      this.positions[i3 + 1] = -100;
    }

    (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
  }

  setWindSpeed(speed: number): void {
    this.config.windSpeed = Math.max(0, Math.min(1, speed));
  }

  setWindDirection(direction: number): void {
    this.config.windDirection = direction;
  }

  getConfig(): RainConfig {
    return { ...this.config };
  }

  getParticlePositions(): Float32Array {
    return this.positions;
  }

  getParticleVelocities(): Float32Array {
    return this.velocities;
  }

  getActiveParticleCount(): number {
    return Math.floor(this.maxParticles * this.config.intensity);
  }

  dispose(): void {
    this.scene.remove(this.particles);
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}
