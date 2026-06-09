import * as THREE from 'three';
import { SmokeParticle, DepositionPoint, SurfaceType, SimulationConfig } from '../types/Particle';

export class GreaseDeposition {
  private scene: THREE.Scene;
  private config: SimulationConfig;
  private depositionPoints: DepositionPoint[] = [];
  private kitchenBounds: { min: THREE.Vector3; max: THREE.Vector3 };
  private depositionMeshes: THREE.Group;
  private maxDeposits = 200;
  private visible: boolean = true;
  private depositCount = 0;

  constructor(
    scene: THREE.Scene,
    config: SimulationConfig,
    bounds: { min: THREE.Vector3; max: THREE.Vector3 }
  ) {
    this.scene = scene;
    this.config = config;
    this.kitchenBounds = bounds;
    this.depositionMeshes = new THREE.Group();
    this.scene.add(this.depositionMeshes);
  }

  public checkDeposition(particles: SmokeParticle[]): number {
    let newlyDeposited = 0;

    for (const particle of particles) {
      if (particle.deposited || particle.captured || particle.escaped) continue;

      const result = this.checkSurfaceCollision(particle);
      if (result.hit) {
        this.addDepositionPoint(result.point!, result.normal!, result.surfaceType!);
        particle.deposited = true;
        newlyDeposited++;
      }
    }

    return newlyDeposited;
  }

  private checkSurfaceCollision(particle: SmokeParticle): {
    hit: boolean;
    point?: THREE.Vector3;
    normal?: THREE.Vector3;
    surfaceType?: SurfaceType;
  } {
    const pos = particle.position;
    const margin = particle.size * 0.5;
    const threshold = 0.02;

    if (pos.y <= this.kitchenBounds.min.y + margin + threshold && pos.y >= this.kitchenBounds.min.y - margin) {
      return {
        hit: true,
        point: new THREE.Vector3(pos.x, this.kitchenBounds.min.y, pos.z),
        normal: new THREE.Vector3(0, 1, 0),
        surfaceType: 'floor',
      };
    }

    if (pos.y >= this.kitchenBounds.max.y - margin - threshold && pos.y <= this.kitchenBounds.max.y + margin) {
      return {
        hit: true,
        point: new THREE.Vector3(pos.x, this.kitchenBounds.max.y, pos.z),
        normal: new THREE.Vector3(0, -1, 0),
        surfaceType: 'ceiling',
      };
    }

    if (pos.x <= this.kitchenBounds.min.x + margin + threshold && pos.x >= this.kitchenBounds.min.x - margin) {
      return {
        hit: true,
        point: new THREE.Vector3(this.kitchenBounds.min.x, pos.y, pos.z),
        normal: new THREE.Vector3(1, 0, 0),
        surfaceType: 'wall',
      };
    }

    if (pos.x >= this.kitchenBounds.max.x - margin - threshold && pos.x <= this.kitchenBounds.max.x + margin) {
      return {
        hit: true,
        point: new THREE.Vector3(this.kitchenBounds.max.x, pos.y, pos.z),
        normal: new THREE.Vector3(-1, 0, 0),
        surfaceType: 'wall',
      };
    }

    if (pos.z <= this.kitchenBounds.min.z + margin + threshold && pos.z >= this.kitchenBounds.min.z - margin) {
      return {
        hit: true,
        point: new THREE.Vector3(pos.x, pos.y, this.kitchenBounds.min.z),
        normal: new THREE.Vector3(0, 0, 1),
        surfaceType: 'wall',
      };
    }

    if (pos.z >= this.kitchenBounds.max.z - margin - threshold && pos.z <= this.kitchenBounds.max.z + margin) {
      return {
        hit: true,
        point: new THREE.Vector3(pos.x, pos.y, this.kitchenBounds.max.z),
        normal: new THREE.Vector3(0, 0, -1),
        surfaceType: 'wall',
      };
    }

    return { hit: false };
  }

  private addDepositionPoint(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    surfaceType: SurfaceType
  ): void {
    if (this.depositionPoints.length >= this.maxDeposits) {
      this.depositionPoints.shift();
      const firstChild = this.depositionMeshes.children[0];
      if (firstChild) {
        this.depositionMeshes.remove(firstChild);
      }
    }

    const intensity = 0.6 + Math.random() * 0.4;
    const point: DepositionPoint = {
      position: position.clone(),
      normal: normal.clone(),
      intensity,
      age: 0,
      surfaceType,
    };

    this.depositionPoints.push(point);
    this.depositCount++;

    this.createDepositionMesh(point);
  }

  private createDepositionMesh(point: DepositionPoint): void {
    const size = 0.05 + Math.random() * 0.08;
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, `rgba(80, 60, 40, ${point.intensity * 0.8})`);
    gradient.addColorStop(0.5, `rgba(100, 75, 50, ${point.intensity * 0.5})`);
    gradient.addColorStop(1, 'rgba(60, 45, 30, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const geometry = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(point.position);
    mesh.position.add(point.normal.clone().multiplyScalar(0.001));

    if (point.normal.x !== 0) {
      mesh.rotation.y = point.normal.x > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else if (point.normal.y !== 0) {
      mesh.rotation.x = point.normal.y > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      mesh.rotation.y = point.normal.z > 0 ? 0 : Math.PI;
    }

    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.visible = this.visible;

    this.depositionMeshes.add(mesh);
  }

  public update(deltaTime: number): void {
    for (const point of this.depositionPoints) {
      point.age += deltaTime;
    }
  }

  public getDepositCount(): number {
    return this.depositCount;
  }

  public getDepositionPoints(): DepositionPoint[] {
    return this.depositionPoints;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.depositionMeshes.visible = visible;
  }

  public getVisible(): boolean {
    return this.visible;
  }

  public reset(): void {
    this.depositionPoints = [];
    this.depositCount = 0;
    
    while (this.depositionMeshes.children.length > 0) {
      const child = this.depositionMeshes.children[0];
      this.depositionMeshes.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
  }

  public dispose(): void {
    this.scene.remove(this.depositionMeshes);
    this.reset();
  }
}
