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
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
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
    gradient.addColorStop(0, 'rgba(255, 245, 230, 1)');
    gradient.addColorStop(0.2, 'rgba(230, 210, 185, 0.85)');
    gradient.addColorStop(0.4, 'rgba(200, 175, 145, 0.6)');
    gradient.addColorStop(0.6, 'rgba(170, 145, 115, 0.35)');
    gradient.addColorStop(0.8, 'rgba(140, 115, 90, 0.15)');
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

    const upwardSpeed = 1.2 + Math.random() * 1.0;
    const horizontalSpeed = (Math.random() - 0.5) * 0.3;
    
    const velocity = new THREE.Vector3(
      horizontalSpeed,
      upwardSpeed * this.config.firePower,
      horizontalSpeed * 0.5
    );

    const baseLife = 5 + Math.random() * 3;
    
    return {
      id: this.nextId++,
      position,
      velocity,
      size: 0.07 + Math.random() * 0.06,
      life: baseLife,
      maxLife: baseLife,
      opacity: 0.85,
      mass: 0.002 + Math.random() * 0.002,
      temperature: 90 + Math.random() * 30,
      captured: false,
      escaped: false,
      deposited: false,
    };
  }

  public update(deltaTime: number, forces: THREE.Vector3[]): void {
    this.emitTimer += deltaTime;
    const emitInterval = 0.02 / this.config.firePower;
    
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

      const buoyancyForce = new THREE.Vector3(0, this.config.buoyancy * (p.temperature / 100) * this.config.firePower, 0);
      
      const gravityForce = new THREE.Vector3(0, -this.config.gravity * p.mass, 0);
      
      const dragForce = p.velocity.clone().multiplyScalar(-this.config.airResistance);
      
      const totalForce = new THREE.Vector3();
      totalForce.add(buoyancyForce);
      totalForce.add(gravityForce);
      totalForce.add(dragForce);
      totalForce.add(forces[i] || new THREE.Vector3());

      const acceleration = totalForce.divideScalar(p.mass);
      p.velocity.add(acceleration.multiplyScalar(deltaTime));
      
      const diffusionVec = new THREE.Vector3(
        (Math.random() - 0.5) * this.config.diffusion,
        (Math.random() - 0.5) * this.config.diffusion * 0.3,
        (Math.random() - 0.5) * this.config.diffusion
      );
      p.velocity.add(diffusionVec);

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));

      p.temperature = Math.max(20, p.temperature - deltaTime * 15);

      p.size += deltaTime * 0.05;

      const lifeRatio = p.life / p.maxLife;
      p.opacity = Math.max(0, 0.8 * lifeRatio * (1 - lifeRatio * 0.3));
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
        
        const r = 0.55 + tempRatio * 0.25 - ageFactor * 0.15;
        const g = 0.42 + tempRatio * 0.18 - ageFactor * 0.2;
        const b = 0.28 + tempRatio * 0.05 - ageFactor * 0.15;
        colorAttr.setXYZ(i, Math.max(0.2, r), Math.max(0.15, g), Math.max(0.08, b));
        
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
