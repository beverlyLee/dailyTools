import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

interface Bubble {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  baseScale: number;
  active: boolean;
  wobbleOffset: number;
  baseOpacity: number;
}

export class Bubbles {
  group: THREE.Group;
  spawnRate: number;
  maxBubbles: number;
  liquidSurfaceY: number;
  baseSpawnRate: number = 25;
  bubbleSpeedMultiplier: number = 1;
  bubbleSizeMultiplier: number = 1;
  bubbleOpacityMultiplier: number = 1;
  
  private bubbles: Bubble[] = [];
  private pool: Bubble[] = [];
  private spawnTimer: number = 0;
  private noise3D = createNoise3D();
  private targetColor: THREE.Color = new THREE.Color(0xffffff);
  private currentColor: THREE.Color = new THREE.Color(0xffffff);
  private targetSpawnRate: number;
  private targetSpeedMultiplier: number = 1;
  private targetSizeMultiplier: number = 1;
  private targetOpacityMultiplier: number = 1;
  private cauldronRadius: number = 1.6;
  private burstParticles: THREE.Points | null = null;
  private burstPositions: Float32Array | null = null;
  private burstColors: Float32Array | null = null;
  private burstAlphas: number[] = [];
  private burstCountMultiplier: number = 1;
  private burstSizeMultiplier: number = 1;
  private intensity: number = 1;
  private targetIntensity: number = 1;
  private bigBubbleChance: number = 0;
  private targetBigBubbleChance: number = 0;

  constructor(maxBubbles: number = 300, liquidSurfaceY: number = -0.2, cauldronRadius: number = 1.6) {
    this.group = new THREE.Group();
    this.maxBubbles = maxBubbles;
    this.spawnRate = this.baseSpawnRate;
    this.targetSpawnRate = this.baseSpawnRate;
    this.liquidSurfaceY = liquidSurfaceY;
    this.cauldronRadius = cauldronRadius;
    
    this.initializePool();
    this.initializeBurstParticles();
  }

  private initializePool(): void {
    for (let i = 0; i < this.maxBubbles; i++) {
      const baseRadius = 0.04 + Math.random() * 0.12;
      const geometry = new THREE.SphereGeometry(baseRadius, 8, 8);
      const material = new THREE.MeshPhysicalMaterial({
        color: this.currentColor,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.9,
        thickness: 0.5,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        ior: 1.3
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      
      this.group.add(mesh);
      
      this.pool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 3,
        baseScale: 1,
        active: false,
        wobbleOffset: Math.random() * Math.PI * 2,
        baseOpacity: 0.5 + Math.random() * 0.4
      });
    }
  }

  private initializeBurstParticles(): void {
    const burstCount = 500;
    this.burstPositions = new Float32Array(burstCount * 3);
    this.burstColors = new Float32Array(burstCount * 3);
    this.burstAlphas = new Array(burstCount).fill(0);
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.burstPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.burstColors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.burstParticles = new THREE.Points(geometry, material);
    this.group.add(this.burstParticles);
  }

  setColor(color: THREE.Color): void {
    this.targetColor.copy(color);
  }

  setSpawnRate(rate: number): void {
    this.targetSpawnRate = rate;
  }

  setIntensity(intensity: number): void {
    this.targetIntensity = intensity;
    this.targetSpawnRate = this.baseSpawnRate * intensity;
    this.targetSpeedMultiplier = 0.7 + intensity * 0.8;
    this.targetSizeMultiplier = 0.6 + intensity * 1.0;
    this.targetOpacityMultiplier = 0.7 + intensity * 0.5;
    this.burstCountMultiplier = 0.5 + intensity * 1.5;
    this.burstSizeMultiplier = 0.8 + intensity * 0.8;
    this.targetBigBubbleChance = Math.min(0.25, intensity * 0.06);
  }

  setLiquidSurfaceY(y: number): void {
    this.liquidSurfaceY = y;
  }

  private spawnBubble(): void {
    const bubble = this.pool.find(b => !b.active);
    if (!bubble) return;
    
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (this.cauldronRadius - 0.2);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    
    bubble.mesh.position.set(x, -1.5, z);
    bubble.mesh.visible = true;
    
    const isBigBubble = Math.random() < this.bigBubbleChance;
    const sizeMultiplier = isBigBubble ? 
      this.bubbleSizeMultiplier * (2 + Math.random() * 1.5) : 
      this.bubbleSizeMultiplier * (0.7 + Math.random() * 0.7);
    
    const baseSpeed = isBigBubble ? 
      (0.6 + Math.random() * 0.6) : 
      (0.9 + Math.random() * 1.1);
    
    bubble.velocity.set(
      (Math.random() - 0.5) * 0.5 * this.intensity,
      baseSpeed * this.bubbleSpeedMultiplier,
      (Math.random() - 0.5) * 0.5 * this.intensity
    );
    
    bubble.life = 0;
    bubble.maxLife = isBigBubble ? 
      (2.5 + Math.random() * 1.5) / this.bubbleSpeedMultiplier : 
      (1.5 + Math.random() * 1.2) / this.bubbleSpeedMultiplier;
    bubble.active = true;
    bubble.wobbleOffset = Math.random() * Math.PI * 2;
    bubble.baseScale = sizeMultiplier;
    
    bubble.mesh.scale.setScalar(sizeMultiplier);
    
    const mat = bubble.mesh.material as THREE.MeshPhysicalMaterial;
    mat.color.copy(this.currentColor);
    mat.opacity = bubble.baseOpacity * this.bubbleOpacityMultiplier;
    
    this.bubbles.push(bubble);
  }

  private createBurst(x: number, y: number, z: number, scale: number): void {
    if (!this.burstPositions || !this.burstColors || !this.burstParticles) return;
    
    const baseCount = Math.floor(10 + scale * 25);
    const count = Math.floor(baseCount * this.burstCountMultiplier);
    
    for (let i = 0; i < count; i++) {
      const idx = this.burstAlphas.findIndex(a => a <= 0);
      if (idx === -1) break;
      
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 0.7;
      const speed = (1.0 + Math.random() * 1.5) * this.burstSizeMultiplier;
      
      this.burstPositions[idx * 3] = x + (Math.random() - 0.5) * scale * 0.8;
      this.burstPositions[idx * 3 + 1] = y + (Math.random() - 0.5) * scale * 0.4;
      this.burstPositions[idx * 3 + 2] = z + (Math.random() - 0.5) * scale * 0.8;
      
      const colorVariation = 0.2 + Math.random() * 0.4;
      this.burstColors[idx * 3] = Math.min(1, this.currentColor.r + colorVariation);
      this.burstColors[idx * 3 + 1] = Math.min(1, this.currentColor.g + colorVariation);
      this.burstColors[idx * 3 + 2] = Math.min(1, this.currentColor.b + colorVariation);
      
      this.burstAlphas[idx] = 0.9 + Math.random() * 0.1;
      
      (this.burstParticles.userData.velocities = this.burstParticles.userData.velocities || []);
      this.burstParticles.userData.velocities[idx] = { 
        x: Math.cos(angle1) * Math.sin(angle2) * speed, 
        y: Math.cos(angle2) * speed * 0.7, 
        z: Math.sin(angle1) * Math.sin(angle2) * speed 
      };
    }
    
    (this.burstParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.burstParticles.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  update(time: number, delta: number): void {
    this.intensity += (this.targetIntensity - this.intensity) * delta * 4;
    this.spawnRate += (this.targetSpawnRate - this.spawnRate) * delta * 4;
    this.bubbleSpeedMultiplier += (this.targetSpeedMultiplier - this.bubbleSpeedMultiplier) * delta * 3;
    this.bubbleSizeMultiplier += (this.targetSizeMultiplier - this.bubbleSizeMultiplier) * delta * 3;
    this.bubbleOpacityMultiplier += (this.targetOpacityMultiplier - this.bubbleOpacityMultiplier) * delta * 3;
    this.bigBubbleChance += (this.targetBigBubbleChance - this.bigBubbleChance) * delta * 3;
    this.currentColor.lerp(this.targetColor, delta * 4);
    
    if (this.burstParticles) {
      const mat = this.burstParticles.material as THREE.PointsMaterial;
      mat.size = 0.08 * this.burstSizeMultiplier;
    }
    
    this.spawnTimer += delta;
    const spawnInterval = 1 / this.spawnRate;
    
    while (this.spawnTimer >= spawnInterval && this.bubbles.filter(b => b.active).length < this.maxBubbles) {
      this.spawnBubble();
      this.spawnTimer -= spawnInterval;
    }
    
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      if (!bubble.active) continue;
      
      bubble.life += delta;
      
      const mat = bubble.mesh.material as THREE.MeshPhysicalMaterial;
      mat.color.lerp(this.currentColor, delta * 3);
      
      const noiseScale = 1.5 + this.intensity * 1.5;
      const noise = this.noise3D(
        bubble.mesh.position.x * noiseScale,
        bubble.mesh.position.y * 0.4,
        time * (0.6 + this.intensity * 0.4) + bubble.wobbleOffset
      );
      
      const wobbleStrength = 1 + this.intensity * 1.5;
      bubble.velocity.x += noise * delta * wobbleStrength;
      bubble.velocity.z += noise * delta * wobbleStrength;
      
      const acceleration = 0.4 + this.intensity * 0.4;
      bubble.velocity.y += delta * acceleration;
      
      bubble.mesh.position.x += bubble.velocity.x * delta;
      bubble.mesh.position.y += bubble.velocity.y * delta;
      bubble.mesh.position.z += bubble.velocity.z * delta;
      
      const distFromCenter = Math.sqrt(
        bubble.mesh.position.x ** 2 + bubble.mesh.position.z ** 2
      );
      if (distFromCenter > this.cauldronRadius - 0.15) {
        const pushFactor = (distFromCenter - (this.cauldronRadius - 0.15)) * 3;
        bubble.mesh.position.x -= (bubble.mesh.position.x / distFromCenter) * pushFactor;
        bubble.mesh.position.z -= (bubble.mesh.position.z / distFromCenter) * pushFactor;
        bubble.velocity.x *= -0.4;
        bubble.velocity.z *= -0.4;
      }
      
      if (bubble.mesh.position.y > this.liquidSurfaceY - 0.1) {
        const fadeStart = this.liquidSurfaceY - 0.1;
        const fadeEnd = this.liquidSurfaceY + 0.08;
        const fadeProgress = (bubble.mesh.position.y - fadeStart) / (fadeEnd - fadeStart);
        mat.opacity = Math.max(0, bubble.baseOpacity * this.bubbleOpacityMultiplier * (1 - fadeProgress * fadeProgress));
        
        if (bubble.mesh.position.y > this.liquidSurfaceY + 0.03) {
          this.createBurst(
            bubble.mesh.position.x,
            bubble.mesh.position.y,
            bubble.mesh.position.z,
            bubble.baseScale
          );
          bubble.active = false;
          bubble.mesh.visible = false;
          this.bubbles.splice(i, 1);
          continue;
        }
      } else {
        mat.opacity = bubble.baseOpacity * this.bubbleOpacityMultiplier;
      }
      
      if (bubble.life > bubble.maxLife) {
        bubble.active = false;
        bubble.mesh.visible = false;
        this.bubbles.splice(i, 1);
      }
      
      const pulseFreq = 3 + this.intensity * 2;
      const pulseAmp = 0.08 + this.intensity * 0.08;
      const pulse = 1 + Math.sin(time * pulseFreq + bubble.wobbleOffset) * pulseAmp;
      bubble.mesh.scale.setScalar(bubble.baseScale * pulse);
    }
    
    this.updateBurstParticles(delta);
    
    this.pool.forEach(bubble => {
      if (!bubble.active) {
        (bubble.mesh.material as THREE.MeshPhysicalMaterial).color.copy(this.currentColor);
      }
    });
  }

  private updateBurstParticles(delta: number): void {
    if (!this.burstParticles || !this.burstPositions || !this.burstAlphas) return;
    
    const velocities = this.burstParticles.userData.velocities || [];
    
    for (let i = 0; i < this.burstAlphas.length; i++) {
      if (this.burstAlphas[i] <= 0) continue;
      
      this.burstAlphas[i] -= delta * (2 + this.intensity * 1.5);
      
      if (velocities[i]) {
        this.burstPositions[i * 3] += velocities[i].x * delta;
        this.burstPositions[i * 3 + 1] += velocities[i].y * delta;
        this.burstPositions[i * 3 + 2] += velocities[i].z * delta;
        
        velocities[i].y -= delta * (2 + this.intensity * 0.8);
        velocities[i].x *= 0.985;
        velocities[i].z *= 0.985;
      }
    }
    
    (this.burstParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    const maxAlpha = Math.max(...this.burstAlphas);
    (this.burstParticles.material as THREE.PointsMaterial).opacity = Math.min(1, maxAlpha * 1.5);
  }

  dispose(): void {
    this.pool.forEach(bubble => {
      bubble.mesh.geometry.dispose();
      (bubble.mesh.material as THREE.Material).dispose();
    });
    
    if (this.burstParticles) {
      this.burstParticles.geometry.dispose();
      (this.burstParticles.material as THREE.Material).dispose();
    }
  }
}
