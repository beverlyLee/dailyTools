import * as THREE from 'three';
import { WaxParticle } from '../fluid/WaxParticles';

export interface SimulationConfig {
  gravity: number;
  heatingRate: number;
  coolingRate: number;
  buoyancyStrength: number;
  viscosity: number;
  repulsionStrength: number;
  cohesionStrength: number;
  repulsionRadius: number;
  cohesionRadius: number;
  minDensity: number;
  maxDensity: number;
}

export interface NeighborInfo {
  particle: WaxParticle;
  distance: number;
  direction: THREE.Vector3;
  relativeVelocity: THREE.Vector3;
}

const DEFAULT_CONFIG: SimulationConfig = {
  gravity: -0.06,
  heatingRate: 3.0,
  coolingRate: 1.8,
  buoyancyStrength: 1.2,
  viscosity: 0.97,
  repulsionStrength: 0.35,
  cohesionStrength: 0.18,
  repulsionRadius: 0.5,
  cohesionRadius: 1.2,
  minDensity: 0.65,
  maxDensity: 1.35,
};

export class HeatBuoyancy {
  private particles: WaxParticle[];
  private containerBounds: { min: THREE.Vector3; max: THREE.Vector3 };
  private config: SimulationConfig;
  private fluidDensity: number = 1.0;
  private neighborMap: Map<number, NeighborInfo[]> = new Map();

  constructor(
    particles: WaxParticle[],
    containerBounds: { min: THREE.Vector3; max: THREE.Vector3 },
    config?: Partial<SimulationConfig>
  ) {
    this.particles = particles;
    this.containerBounds = containerBounds;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public update(dt: number): void {
    const deltaTime = Math.min(dt, 0.05);

    this.updateTemperature(deltaTime);
    this.updateDensity();
    this.findNeighbors();
    this.calculateSPHForces();
    this.calculateBuoyancy();
    this.integrate(deltaTime);
    this.enforceBoundary();
    this.findNeighbors();
  }

  private updateTemperature(dt: number): void {
    const { min, max } = this.containerBounds;
    const containerHeight = max.y - min.y;
    const heatingZone = min.y + containerHeight * 0.2;
    const coolingZone = min.y + containerHeight * 0.4;

    this.particles.forEach(particle => {
      const y = particle.position.y;

      if (y < heatingZone) {
        const heatFactor = 1 - (y - min.y) / (containerHeight * 0.2);
        particle.temperature += this.config.heatingRate * heatFactor * dt;
      } else if (y > coolingZone) {
        const coolFactor = Math.min((y - coolingZone) / (containerHeight * 0.6), 1.0);
        particle.temperature -= this.config.coolingRate * coolFactor * dt;
      } else {
        particle.temperature *= 0.998;
      }

      particle.temperature = Math.max(0, Math.min(1, particle.temperature));
    });
  }

  private updateDensity(): void {
    this.particles.forEach(particle => {
      const tempFactor = 1 - particle.temperature * 0.6;
      particle.density = this.config.minDensity + 
        (this.config.maxDensity - this.config.minDensity) * tempFactor;
    });
  }

  private findNeighbors(): void {
    this.neighborMap.clear();

    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      const neighbors: NeighborInfo[] = [];

      for (let j = 0; j < this.particles.length; j++) {
        if (i === j) continue;
        
        const p2 = this.particles[j];
        const diff = new THREE.Vector3().subVectors(p1.position, p2.position);
        const distance = diff.length();

        if (distance < this.config.cohesionRadius && distance > 0.001) {
          const direction = diff.clone().normalize();
          const relativeVelocity = new THREE.Vector3().subVectors(p1.velocity, p2.velocity);
          
          neighbors.push({
            particle: p2,
            distance,
            direction,
            relativeVelocity,
          });
        }
      }

      this.neighborMap.set(p1.id, neighbors);
    }
  }

  private calculateSPHForces(): void {
    const force = new THREE.Vector3();
    const neutralMin = 0.5;
    const neutralMax = 0.8;

    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      const neighbors = this.neighborMap.get(p1.id) || [];

      force.set(0, 0, 0);

      neighbors.forEach(neighbor => {
        const { distance, direction } = neighbor;

        if (distance < neutralMin) {
          const overlap = neutralMin - distance;
          const repulsion = this.config.repulsionStrength * overlap * overlap / Math.max(distance, 0.01);
          force.add(direction.clone().multiplyScalar(repulsion));
        } else if (distance > neutralMax && distance < this.config.cohesionRadius) {
          const cohesionFactor = 1 - (distance - neutralMax) / 
            (this.config.cohesionRadius - neutralMax);
          const cohesion = this.config.cohesionStrength * cohesionFactor * cohesionFactor;
          force.sub(direction.clone().multiplyScalar(cohesion));
        }

        const viscDrag = neighbor.relativeVelocity.clone().multiplyScalar(0.015);
        force.sub(viscDrag);
      });

      p1.velocity.add(force);
    }
  }

  private calculateBuoyancy(): void {
    this.particles.forEach(particle => {
      const densityDiff = this.fluidDensity - particle.density;
      const buoyancy = densityDiff * this.config.buoyancyStrength;

      particle.velocity.y += buoyancy;
      particle.velocity.y += this.config.gravity;
    });
  }

  private integrate(dt: number): void {
    this.particles.forEach(particle => {
      particle.velocity.multiplyScalar(this.config.viscosity);

      const maxSpeed = 4.0;
      const speed = particle.velocity.length();
      if (speed > maxSpeed) {
        particle.velocity.normalize().multiplyScalar(maxSpeed);
      }

      particle.position.add(particle.velocity.clone().multiplyScalar(dt * 60));
      particle.mesh.position.copy(particle.position);
    });
  }

  private enforceBoundary(): void {
    const { min, max } = this.containerBounds;
    const bounce = 0.4;
    const margin = 0.3;

    this.particles.forEach(particle => {
      if (particle.position.x < min.x + margin) {
        particle.position.x = min.x + margin;
        particle.velocity.x *= -bounce;
      }
      if (particle.position.x > max.x - margin) {
        particle.position.x = max.x - margin;
        particle.velocity.x *= -bounce;
      }

      if (particle.position.y < min.y + margin) {
        particle.position.y = min.y + margin;
        particle.velocity.y *= -bounce;
      }
      if (particle.position.y > max.y - margin) {
        particle.position.y = max.y - margin;
        particle.velocity.y *= -bounce;
      }

      if (particle.position.z < min.z + margin) {
        particle.position.z = min.z + margin;
        particle.velocity.z *= -bounce;
      }
      if (particle.position.z > max.z - margin) {
        particle.position.z = max.z - margin;
        particle.velocity.z *= -bounce;
      }

      particle.mesh.position.copy(particle.position);
    });
  }

  public getNeighbors(particleId: number): NeighborInfo[] {
    return this.neighborMap.get(particleId) || [];
  }

  public getNeighborMap(): Map<number, NeighborInfo[]> {
    return this.neighborMap;
  }

  public getParticles(): WaxParticle[] {
    return this.particles;
  }

  public setConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): SimulationConfig {
    return { ...this.config };
  }
}
