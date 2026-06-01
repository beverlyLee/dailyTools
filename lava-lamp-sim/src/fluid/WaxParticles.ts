import * as THREE from 'three';
import { NeighborInfo } from '../physics/HeatBuoyancy';

export interface WaxParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  temperature: number;
  density: number;
  mass: number;
  radius: number;
  mesh: THREE.Mesh;
  deformation: THREE.Vector3;
}

export class WaxParticles {
  private particles: WaxParticle[] = [];
  private scene: THREE.Scene;
  private containerBounds: { min: THREE.Vector3; max: THREE.Vector3 };
  private particleGeometry: THREE.SphereGeometry;
  private particleMaterial: THREE.MeshPhongMaterial;
  private neighborMap: Map<number, NeighborInfo[]> = new Map();

  constructor(
    scene: THREE.Scene,
    containerBounds: { min: THREE.Vector3; max: THREE.Vector3 },
    particleCount: number = 80
  ) {
    this.scene = scene;
    this.containerBounds = containerBounds;
    this.particleGeometry = new THREE.SphereGeometry(1, 16, 16);
    this.particleMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6600,
      emissive: 0xff3300,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
      shininess: 100,
    });

    this.initializeParticles(particleCount);
  }

  private initializeParticles(count: number): void {
    const { min, max } = this.containerBounds;
    const bottomThird = (max.y - min.y) * 0.3;

    for (let i = 0; i < count; i++) {
      const baseRadius = 0.25 + Math.random() * 0.15;
      
      const position = new THREE.Vector3(
        min.x + 0.5 + Math.random() * (max.x - min.x - 1),
        min.y + 0.5 + Math.random() * bottomThird,
        min.z + 0.5 + Math.random() * (max.z - min.z - 1)
      );

      const mesh = new THREE.Mesh(this.particleGeometry, this.particleMaterial.clone());
      mesh.position.copy(position);
      mesh.scale.setScalar(baseRadius);
      mesh.castShadow = true;

      const particle: WaxParticle = {
        id: i,
        position,
        velocity: new THREE.Vector3(0, 0, 0),
        temperature: 0.3 + Math.random() * 0.2,
        density: 1.0,
        mass: 1.0,
        radius: baseRadius,
        mesh,
        deformation: new THREE.Vector3(1, 1, 1),
      };

      this.particles.push(particle);
      this.scene.add(mesh);
    }
  }

  public getParticles(): WaxParticle[] {
    return this.particles;
  }

  public setNeighborMap(neighborMap: Map<number, NeighborInfo[]>): void {
    this.neighborMap = neighborMap;
  }

  private calculateDeformation(particle: WaxParticle): THREE.Vector3 {
    const velocity = particle.velocity;
    const speed = velocity.length();
    const neighbors = this.neighborMap.get(particle.id) || [];

    const baseScale = new THREE.Vector3(1, 1, 1);
    const tempExpansion = 1.0 + particle.temperature * 0.25;

    if (speed > 0.1) {
      const stretchFactor = Math.min(speed * 0.5, 1.2);
      const velocityDir = velocity.clone().normalize();

      const up = new THREE.Vector3(0, 1, 0);
      const dot = velocityDir.dot(up);
      const verticalStretch = Math.abs(dot) * stretchFactor;
      
      baseScale.y = 1 + verticalStretch;
      baseScale.x = 1 - verticalStretch * 0.5;
      baseScale.z = 1 - verticalStretch * 0.5;

      if (Math.abs(dot) < 0.9) {
        const horizontalDir = velocityDir.clone();
        horizontalDir.y = 0;
        if (horizontalDir.length() > 0.001) {
          horizontalDir.normalize();
          const horizontalStretch = (1 - Math.abs(dot)) * stretchFactor * 0.6;
          baseScale.x += horizontalDir.x * horizontalStretch;
          baseScale.z += horizontalDir.z * horizontalStretch;
        }
      }
    }

    let totalSqueeze = new THREE.Vector3(0, 0, 0);
    let totalShear = new THREE.Vector3(0, 0, 0);

    neighbors.forEach(neighbor => {
      const { distance, direction, relativeVelocity } = neighbor;
      
      if (distance < 0.5) {
        const squeezeFactor = (0.5 - distance) / 0.5;
        const squeeze = squeezeFactor * 0.4;
        totalSqueeze.x -= direction.x * squeeze;
        totalSqueeze.y -= direction.y * squeeze;
        totalSqueeze.z -= direction.z * squeeze;
      }

      if (distance < 1.2 && distance > 0.5) {
        const relSpeed = relativeVelocity.length();
        if (relSpeed > 0.3) {
          const stretchDir = relativeVelocity.clone().normalize();
          const shearFactor = Math.min(relSpeed * 0.25, 0.5);
          totalShear.x += stretchDir.x * shearFactor;
          totalShear.y += stretchDir.y * shearFactor;
          totalShear.z += stretchDir.z * shearFactor;
        }
      }
    });

    if (neighbors.length > 0) {
      const avgSqueeze = totalSqueeze.divideScalar(Math.min(neighbors.length, 6));
      const avgShear = totalShear.divideScalar(Math.min(neighbors.length, 6));
      baseScale.add(avgSqueeze);
      baseScale.add(avgShear);
    }

    baseScale.x = Math.max(0.3, baseScale.x);
    baseScale.y = Math.max(0.3, baseScale.y);
    baseScale.z = Math.max(0.3, baseScale.z);

    const smoothing = 0.2;
    particle.deformation.lerp(baseScale, smoothing);

    return particle.deformation.clone().multiplyScalar(particle.radius * tempExpansion);
  }

  public updateParticleVisuals(particle: WaxParticle): void {
    const scale = this.calculateDeformation(particle);
    particle.mesh.scale.copy(scale);

    const material = particle.mesh.material as THREE.MeshPhongMaterial;
    const tempFactor = Math.min(particle.temperature, 1.0);
    
    const color = new THREE.Color();
    color.setHSL(0.05 + tempFactor * 0.03, 1.0, 0.5 + tempFactor * 0.1);
    material.color.copy(color);
    material.emissiveIntensity = 0.2 + tempFactor * 0.4;

    const avgScale = (scale.x + scale.y + scale.z) / 3;
    const stretchAmount = Math.max(Math.abs(scale.y - avgScale), Math.abs(scale.x - avgScale), Math.abs(scale.z - avgScale));
    material.emissiveIntensity += stretchAmount * 0.3;
  }

  public updateAllVisuals(particles: WaxParticle[]): void {
    particles.forEach(p => this.updateParticleVisuals(p));
  }

  public getContainerBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
    return this.containerBounds;
  }

  public dispose(): void {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
