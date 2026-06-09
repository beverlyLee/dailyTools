import * as THREE from 'three';
import { SmokeParticle, SimulationConfig } from '../types/Particle';

export class SmokeEmitter {
  private scene: THREE.Scene;
  private particles: SmokeParticle[] = [];
  private particleSystem!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private config: SimulationConfig;
  private emitterPosition: THREE.Vector3;
  private nextId = 0;
  private emitTimer = 0;
  private maxParticles: number;

  constructor(scene: THREE.Scene, config: SimulationConfig, emitterPos: THREE.Vector3, maxParticles: number) {
    this.scene = scene;
    this.config = config;
    this.emitterPosition = emitterPos.clone();
    this.maxParticles = maxParticles;
    
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    
    this.initParticleSystem();
  }

  private initParticleSystem(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const smokeTexture = this.createSmokeTexture();

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.NormalBlending,
      depthWrite: false,
      map: smokeTexture,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, particleMaterial);
    this.scene.add(this.particleSystem);
  }

  private createSmokeTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 250, 240, 0.95)');
    gradient.addColorStop(0.15, 'rgba(240, 220, 195, 0.85)');
    gradient.addColorStop(0.3, 'rgba(220, 195, 165, 0.7)');
    gradient.addColorStop(0.5, 'rgba(190, 160, 125, 0.5)');
    gradient.addColorStop(0.7, 'rgba(160, 130, 100, 0.3)');
    gradient.addColorStop(0.85, 'rgba(130, 105, 75, 0.12)');
    gradient.addColorStop(1, 'rgba(100, 80, 60, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public emit(count: number): void {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const particle = this.createParticle();
      this.particles.push(particle);
    }
  }

  private createParticle(): SmokeParticle {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.12 * this.config.firePower;
    
    const offsetX = Math.cos(angle) * radius;
    const offsetZ = Math.sin(angle) * radius;
    
    const position = new THREE.Vector3(
      this.emitterPosition.x + offsetX,
      this.emitterPosition.y,
      this.emitterPosition.z + offsetZ
    );

    const upwardSpeed = 0.5 + Math.random() * 0.4;
    const horizontalSpeed = (Math.random() - 0.5) * 0.1;
    
    const velocity = new THREE.Vector3(
      horizontalSpeed,
      upwardSpeed * this.config.firePower,
      horizontalSpeed * 0.5
    );

    const baseLife = 12 + Math.random() * 6;
    
    return {
      id: this.nextId++,
      position,
      velocity,
      size: 0.07 + Math.random() * 0.05,
      life: baseLife,
      maxLife: baseLife,
      opacity: 0.85,
      mass: 0.01 + Math.random() * 0.008,
      temperature: 85 + Math.random() * 25,
      captured: false,
      escaped: false,
      deposited: false,
    };
  }

  public update(deltaTime: number, forces: THREE.Vector3[]): void {
    this.emitTimer += deltaTime;
    const emitInterval = 0.01 / this.config.firePower;
    
    while (this.emitTimer >= emitInterval && this.particles.length < this.maxParticles) {
      this.emit(1);
      this.emitTimer -= emitInterval;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      if (p.captured || p.escaped || p.deposited) {
        this.particles.splice(i, 1);
        continue;
      }

      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const tempFactor = (p.temperature - 20) / 100;
      const buoyancyAccel = this.config.buoyancy * tempFactor * this.config.firePower;
      
      const gravityAccel = -this.config.gravity;
      
      const dragAccel = p.velocity.clone().multiplyScalar(-this.config.airResistance);
      
      const externalForce = forces[i] || new THREE.Vector3();
      const externalAccel = externalForce.divideScalar(p.mass);

      const totalAccel = new THREE.Vector3();
      totalAccel.x = dragAccel.x + externalAccel.x;
      totalAccel.y = buoyancyAccel + gravityAccel + dragAccel.y + externalAccel.y;
      totalAccel.z = dragAccel.z + externalAccel.z;

      p.velocity.add(totalAccel.multiplyScalar(deltaTime));
      
      if (p.velocity.y > 2.0) { p.velocity.y = 2.0; }
      if (p.velocity.y < -0.5) { p.velocity.y = -0.5; }
      if (Math.abs(p.velocity.x) > 1.5) { p.velocity.x = Math.sign(p.velocity.x) * 1.5; }
      if (Math.abs(p.velocity.z) > 1.5) { p.velocity.z = Math.sign(p.velocity.z) * 1.5; }
      
      const diffusionVec = new THREE.Vector3(
        (Math.random() - 0.5) * this.config.diffusion * deltaTime * 60,
        (Math.random() - 0.5) * this.config.diffusion * 0.3 * deltaTime * 60,
        (Math.random() - 0.5) * this.config.diffusion * deltaTime * 60
      );
      p.velocity.add(diffusionVec);

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));

      p.temperature = Math.max(20, p.temperature - deltaTime * 6);

      const tempRatio = (p.temperature - 20) / 80;
      p.size += deltaTime * (0.04 + tempRatio * 0.06);

      const lifeRatio = p.life / p.maxLife;
      const ageFactor = 1 - lifeRatio;
      p.opacity = Math.max(0, 0.75 * lifeRatio * (1 - ageFactor * ageFactor * 0.5));
    }

    this.updateBuffers();
  }

  private updateBuffers(): void {
    const positionAttr = this.particleGeometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.particleGeometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.attributes.size as THREE.BufferAttribute;

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        positionAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
        
        const tempRatio = Math.min(1, p.temperature / 120);
        const lifeRatio = p.life / p.maxLife;
        const ageFactor = 1 - lifeRatio;
        
        const r = 0.6 + tempRatio * 0.2 - ageFactor * 0.2;
        const g = 0.45 + tempRatio * 0.15 - ageFactor * 0.25;
        const b = 0.28 + tempRatio * 0.05 - ageFactor * 0.18;
        colorAttr.setXYZ(i, Math.max(0.15, r), Math.max(0.1, g), Math.max(0.05, b));
        
        sizeAttr.setX(i, p.size);
      } else {
        positionAttr.setXYZ(i, 0, -1000, 0);
        colorAttr.setXYZ(i, 0, 0, 0);
        sizeAttr.setX(i, 0);
      }
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, this.maxParticles);
  }

  public getParticles(): SmokeParticle[] {
    return this.particles;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public setConfig(config: SimulationConfig): void {
    this.config = config;
  }

  public setEmitterPosition(pos: THREE.Vector3): void {
    this.emitterPosition.copy(pos);
  }

  public captureParticle(particle: SmokeParticle): void {
    particle.captured = true;
  }

  public markEscaped(particle: SmokeParticle): void {
    particle.escaped = true;
  }

  public markDeposited(particle: SmokeParticle): void {
    particle.deposited = true;
  }

  public dispose(): void {
    this.scene.remove(this.particleSystem);
    this.particleGeometry.dispose();
    if (this.particleSystem.material instanceof THREE.Material) {
      this.particleSystem.material.dispose();
    }
  }
}
