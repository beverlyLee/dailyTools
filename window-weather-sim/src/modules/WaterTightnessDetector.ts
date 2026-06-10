import * as THREE from 'three';
import type { WindowGap } from '../types';
import { WindowSystem } from './WindowSystem';
import { RainParticleSystem } from './RainParticleSystem';

export class WaterTightnessDetector {
  private scene: THREE.Scene;
  private windowSystem: WindowSystem;
  private rainSystem: RainParticleSystem;
  private waterAmount: number = 0;
  private maxWaterAmount: number = 50;
  private warningThreshold: number = 2.5;
  private dangerThreshold: number = 12;
  private waterStains: { x: number; y: number; size: number; alpha: number }[] = [];
  private stainTexture: THREE.CanvasTexture | null = null;
  private stainMesh: THREE.Mesh | null = null;
  private splashParticles: THREE.Points | null = null;
  private splashPositions: Float32Array | null = null;
  private splashVelocities: Float32Array | null = null;
  private splashLifetimes: Float32Array | null = null;
  private maxSplashes: number = 200;
  private activeSplashes: number = 0;
  private windowSill: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, windowSystem: WindowSystem, rainSystem: RainParticleSystem) {
    this.scene = scene;
    this.windowSystem = windowSystem;
    this.rainSystem = rainSystem;
    
    this.createWindowSill();
    this.createWaterStainTexture();
    this.createSplashParticles();
  }

  private createWindowSill(): void {
    const sillMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4c4a8,
      roughness: 0.7,
      metalness: 0.1
    });

    const dimensions = this.windowSystem.getDimensions();
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions.width + 0.4, 0.08, 0.4),
      sillMaterial
    );
    sill.position.set(0, -dimensions.height / 2 - 0.04, 0.25);
    this.scene.add(sill);
    this.windowSill = sill;

    const sillTop = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions.width + 0.3, 0.02, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0xe8dcc8,
        roughness: 0.6,
        metalness: 0.1
      })
    );
    sillTop.position.set(0, -dimensions.height / 2 + 0.01, 0.25);
    this.scene.add(sillTop);
  }

  private createWaterStainTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    
    this.stainTexture = new THREE.CanvasTexture(canvas);
    this.stainTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.stainTexture.wrapT = THREE.ClampToEdgeWrapping;

    const dimensions = this.windowSystem.getDimensions();
    const geometry = new THREE.PlaneGeometry(dimensions.width + 0.2, 0.3);
    const material = new THREE.MeshBasicMaterial({
      map: this.stainTexture,
      transparent: true,
      opacity: 0.8
    });

    this.stainMesh = new THREE.Mesh(geometry, material);
    this.stainMesh.rotation.x = -Math.PI / 2;
    this.stainMesh.position.set(0, -dimensions.height / 2 + 0.031, 0.25);
    this.scene.add(this.stainMesh);
  }

  private createSplashParticles(): void {
    const geometry = new THREE.BufferGeometry();
    this.splashPositions = new Float32Array(this.maxSplashes * 3);
    this.splashVelocities = new Float32Array(this.maxSplashes * 3);
    this.splashLifetimes = new Float32Array(this.maxSplashes);

    for (let i = 0; i < this.maxSplashes; i++) {
      this.splashPositions[i * 3 + 1] = -100;
      this.splashLifetimes[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.splashPositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x66b3ff,
      size: 0.04,
      transparent: true,
      opacity: 0.8
    });

    this.splashParticles = new THREE.Points(geometry, material);
    this.scene.add(this.splashParticles);
  }

  private checkGapCollision(
    px: number, py: number, pz: number,
    vx: number, vy: number, vz: number,
    gap: WindowGap,
    deltaTime: number
  ): boolean {
    const gapLeft = gap.position.x - gap.width / 2;
    const gapRight = gap.position.x + gap.width / 2;
    const gapBottom = gap.position.y - gap.height / 2;
    const gapTop = gap.position.y + gap.height / 2;
    const gapFront = gap.position.z - gap.depth / 2;
    const gapBack = gap.position.z + gap.depth / 2;

    const nextX = px + vx * deltaTime;
    const nextY = py + vy * deltaTime;
    const nextZ = pz + vz * deltaTime;

    const inX = nextX > gapLeft && nextX < gapRight;
    const inY = nextY > gapBottom && nextY < gapTop;
    const crossZ = pz <= gapFront && nextZ >= gapFront;

    return inX && inY && crossZ && vz > 0;
  }

  private addSplash(x: number, y: number, z: number): void {
    if (!this.splashPositions || !this.splashVelocities || !this.splashLifetimes) return;
    
    const count = 5 + Math.floor(Math.random() * 5);
    
    for (let j = 0; j < count; j++) {
      if (this.activeSplashes >= this.maxSplashes) break;
      
      const idx = this.activeSplashes;
      const i3 = idx * 3;
      
      this.splashPositions[i3] = x + (Math.random() - 0.5) * 0.05;
      this.splashPositions[i3 + 1] = y;
      this.splashPositions[i3 + 2] = z + (Math.random() - 0.5) * 0.05;
      
      this.splashVelocities[i3] = (Math.random() - 0.5) * 0.5;
      this.splashVelocities[i3 + 1] = Math.random() * 1.5 + 0.5;
      this.splashVelocities[i3 + 2] = Math.random() * 0.3;
      
      this.splashLifetimes[idx] = 0;
      this.activeSplashes++;
    }
  }

  private addWaterStain(x: number, amount: number): void {
    const dimensions = this.windowSystem.getDimensions();
    const stainX = (x + (dimensions.width + 0.2) / 2) / (dimensions.width + 0.2);
    
    this.waterStains.push({
      x: stainX + (Math.random() - 0.5) * 0.05,
      y: 0.45 + Math.random() * 0.35,
      size: 0.04 + amount * 0.08 + Math.random() * 0.02,
      alpha: 0.5 + amount * 0.4
    });

    if (this.waterStains.length > 200) {
      this.waterStains.shift();
    }

    this.updateStainTexture();
  }

  private updateStainTexture(): void {
    if (!this.stainTexture) return;
    
    const canvas = this.stainTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.waterStains.forEach(stain => {
      const x = stain.x * canvas.width;
      const y = stain.y * canvas.height;
      const radiusX = stain.size * canvas.width;
      const radiusY = stain.size * canvas.height * 0.6;
      const alpha = stain.alpha;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(radiusX, radiusY));
      gradient.addColorStop(0, `rgba(60, 110, 170, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(70, 120, 180, ${alpha * 0.75})`);
      gradient.addColorStop(0.7, `rgba(80, 130, 190, ${alpha * 0.45})`);
      gradient.addColorStop(1, 'rgba(100, 150, 200, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    this.stainTexture.needsUpdate = true;
  }

  update(deltaTime: number): void {
    const positions = this.rainSystem.getParticlePositions();
    const velocities = this.rainSystem.getParticleVelocities();
    const activeCount = this.rainSystem.getActiveParticleCount();
    const gaps = this.windowSystem.getGaps();
    const rainIntensity = this.rainSystem.getConfig().intensity;

    const dimensions = this.windowSystem.getDimensions();

    let waterThisFrame = 0;
    let shouldAddStain = false;
    let lastStainX = 0;

    for (let i = 0; i < activeCount; i++) {
      const i3 = i * 3;
      const px = positions[i3];
      const py = positions[i3 + 1];
      const pz = positions[i3 + 2];
      const vx = velocities[i3];
      const vy = velocities[i3 + 1];
      const vz = velocities[i3 + 2];

      if (pz > -0.8 && pz < 0.05 && py < dimensions.height / 2 && py > -dimensions.height / 2) {
        for (const gap of gaps) {
          if (this.checkGapCollision(px, py, pz, vx, vy, vz, gap, deltaTime)) {
            const gapSize = gap.width * gap.height;
            const penetrationAmount = Math.min(1, gapSize * 200) * 0.6;
            const windFactor = Math.min(1, Math.abs(vz) / 5);
            
            const totalProbability = penetrationAmount * windFactor * 0.8;
            
            if (Math.random() < totalProbability) {
              waterThisFrame += 0.06 + Math.random() * 0.04;
              lastStainX = px;
              shouldAddStain = true;
            }
            break;
          }
        }
      }
    }

    if (shouldAddStain && Math.random() < 0.7) {
      this.addWaterStain(lastStainX, 0.6);
    }

    this.waterAmount += waterThisFrame;
    this.waterAmount = Math.min(this.waterAmount, this.maxWaterAmount);

    this.updateSplashParticles(deltaTime);

    if (rainIntensity < 0.05 && this.waterAmount > 0.1) {
      this.waterAmount -= deltaTime * 0.5;
      this.waterAmount = Math.max(0, this.waterAmount);
      
      if (this.waterStains.length > 0 && Math.random() < 0.02) {
        this.waterStains.shift();
        this.updateStainTexture();
      }
    }
  }

  private updateSplashParticles(deltaTime: number): void {
    if (!this.splashPositions || !this.splashVelocities || !this.splashLifetimes || !this.splashParticles) return;

    const gravity = 9.8;
    let writeIdx = 0;

    for (let i = 0; i < this.activeSplashes; i++) {
      const i3 = i * 3;
      
      this.splashLifetimes[i] += deltaTime;
      
      if (this.splashLifetimes[i] > 0.8) {
        continue;
      }

      this.splashVelocities[i3 + 1] -= gravity * deltaTime;
      
      this.splashPositions[i3] += this.splashVelocities[i3] * deltaTime;
      this.splashPositions[i3 + 1] += this.splashVelocities[i3 + 1] * deltaTime;
      this.splashPositions[i3 + 2] += this.splashVelocities[i3 + 2] * deltaTime;

      const dimensions = this.windowSystem.getDimensions();
      if (this.splashPositions[i3 + 1] < -dimensions.height / 2 + 0.03) {
        this.splashVelocities[i3 + 1] *= -0.3;
        this.splashPositions[i3 + 1] = -dimensions.height / 2 + 0.03;
      }

      if (writeIdx !== i) {
        const w3 = writeIdx * 3;
        this.splashPositions[w3] = this.splashPositions[i3];
        this.splashPositions[w3 + 1] = this.splashPositions[i3 + 1];
        this.splashPositions[w3 + 2] = this.splashPositions[i3 + 2];
        this.splashVelocities[w3] = this.splashVelocities[i3];
        this.splashVelocities[w3 + 1] = this.splashVelocities[i3 + 1];
        this.splashVelocities[w3 + 2] = this.splashVelocities[i3 + 2];
        this.splashLifetimes[writeIdx] = this.splashLifetimes[i];
      }
      writeIdx++;
    }

    for (let i = writeIdx; i < this.maxSplashes; i++) {
      this.splashPositions[i * 3 + 1] = -100;
    }

    this.activeSplashes = writeIdx;
    (this.splashParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  getWaterAmount(): number {
    return this.waterAmount;
  }

  getWaterTightnessStatus(): 'good' | 'warning' | 'danger' {
    if (this.waterAmount < this.warningThreshold) return 'good';
    if (this.waterAmount < this.dangerThreshold) return 'warning';
    return 'danger';
  }

  getMaxWaterAmount(): number {
    return this.maxWaterAmount;
  }

  reset(): void {
    this.waterAmount = 0;
    this.waterStains = [];
    this.activeSplashes = 0;
    this.updateStainTexture();
  }

  dispose(): void {
    if (this.stainMesh) {
      this.scene.remove(this.stainMesh);
      this.stainMesh.geometry.dispose();
      (this.stainMesh.material as THREE.Material).dispose();
    }
    if (this.stainTexture) {
      this.stainTexture.dispose();
    }
    if (this.splashParticles) {
      this.scene.remove(this.splashParticles);
      this.splashParticles.geometry.dispose();
      (this.splashParticles.material as THREE.Material).dispose();
    }
    if (this.windowSill) {
      this.scene.remove(this.windowSill);
      this.windowSill.geometry.dispose();
      (this.windowSill.material as THREE.Material).dispose();
    }
  }
}
