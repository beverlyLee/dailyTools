import * as THREE from 'three';
import { ChildModel } from './ChildModel';

export interface TrajectoryPoint {
  position: THREE.Vector3;
  timestamp: number;
}

export interface TrajectorySimulatorConfig {
  roomBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  speed: number;
  changeDirectionInterval: number;
  trailMaxPoints: number;
  obstacles: THREE.Object3D[];
}

export class TrajectorySimulator {
  public group: THREE.Group;
  public trailLine: THREE.Line;
  public trailPoints: THREE.Vector3[] = [];
  public trajectoryHistory: TrajectoryPoint[] = [];

  private child: ChildModel;
  private config: TrajectorySimulatorConfig;
  private currentDirection: THREE.Vector3;
  private nextDirectionChange: number = 0;
  private running: boolean = true;
  private trailGeometry: THREE.BufferGeometry;
  private currentSpeed: number;
  private isRunning: boolean = true;

  private static readonly DEFAULT_CONFIG: Partial<TrajectorySimulatorConfig> = {
    speed: 0.8,
    changeDirectionInterval: 2000,
    trailMaxPoints: 200,
    obstacles: [],
  };

  constructor(child: ChildModel, config: Partial<TrajectorySimulatorConfig>) {
    this.child = child;
    this.config = {
      ...(TrajectorySimulator.DEFAULT_CONFIG as TrajectorySimulatorConfig),
      ...config,
    };
    this.currentSpeed = this.config.speed;

    this.group = new THREE.Group();
    this.group.name = 'TrajectorySimulator';

    this.currentDirection = this.randomDirection();
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPoints = [];

    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xa855f7,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    this.trailLine = new THREE.Line(this.trailGeometry, trailMaterial);
    this.trailLine.name = 'TrajectoryTrail';
    this.group.add(this.trailLine);

    const startPos = this.child.getPosition();
    this.trailPoints.push(startPos.clone());
    this.updateTrailGeometry();
  }

  private randomDirection(): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
  }

  private clampToRoomBounds(pos: THREE.Vector3): THREE.Vector3 {
    const { roomBounds } = this.config;
    const margin = 0.3;
    pos.x = Math.max(roomBounds.minX + margin, Math.min(roomBounds.maxX - margin, pos.x));
    pos.z = Math.max(roomBounds.minZ + margin, Math.min(roomBounds.maxZ - margin, pos.z));
    return pos;
  }

  private checkObstacleCollision(newPos: THREE.Vector3): boolean {
    const childBox = new THREE.Box3(
      new THREE.Vector3(
        newPos.x - this.child.config.radius,
        newPos.y,
        newPos.z - this.child.config.radius
      ),
      new THREE.Vector3(
        newPos.x + this.child.config.radius,
        newPos.y + this.child.config.height,
        newPos.z + this.child.config.radius
      )
    );

    for (const obstacle of this.config.obstacles) {
      const obstacleBox = new THREE.Box3().setFromObject(obstacle);
      if (childBox.intersectsBox(obstacleBox)) {
        return true;
      }
    }
    return false;
  }

  private bounceOffWalls(pos: THREE.Vector3): void {
    const { roomBounds } = this.config;
    const margin = 0.3;

    if (pos.x <= roomBounds.minX + margin || pos.x >= roomBounds.maxX - margin) {
      this.currentDirection.x *= -1;
      this.currentDirection.x += (Math.random() - 0.5) * 0.3;
    }
    if (pos.z <= roomBounds.minZ + margin || pos.z >= roomBounds.maxZ - margin) {
      this.currentDirection.z *= -1;
      this.currentDirection.z += (Math.random() - 0.5) * 0.3;
    }
    this.currentDirection.normalize();
  }

  public update(deltaTime: number, currentTime: number): boolean {
    if (!this.running || !this.isRunning) return false;

    if (currentTime >= this.nextDirectionChange) {
      this.nextDirectionChange = currentTime + this.config.changeDirectionInterval * (0.5 + Math.random());
      this.currentDirection.lerp(this.randomDirection(), 0.6);
      this.currentDirection.normalize();
      this.currentSpeed = this.config.speed * (0.6 + Math.random() * 0.8);
    }

    const currentPos = this.child.getPosition();
    let newPos = currentPos
      .clone()
      .addScaledVector(this.currentDirection, this.currentSpeed * deltaTime);

    this.bounceOffWalls(newPos);
    newPos = this.clampToRoomBounds(newPos);

    if (this.checkObstacleCollision(newPos)) {
      this.currentDirection.multiplyScalar(-1);
      this.currentDirection.x += (Math.random() - 0.5);
      this.currentDirection.z += (Math.random() - 0.5);
      this.currentDirection.normalize();
      return true;
    }

    this.child.setPosition(newPos.x, 0, newPos.z);

    const lastPoint = this.trailPoints[this.trailPoints.length - 1];
    if (lastPoint && newPos.distanceTo(lastPoint) > 0.05) {
      this.trailPoints.push(newPos.clone());
      this.trajectoryHistory.push({
        position: newPos.clone(),
        timestamp: currentTime,
      });

      if (this.trailPoints.length > this.config.trailMaxPoints) {
        this.trailPoints.shift();
      }
      if (this.trajectoryHistory.length > 500) {
        this.trajectoryHistory.shift();
      }
      this.updateTrailGeometry();
    }

    return this.checkNearbyCorners();
  }

  private checkNearbyCorners(): boolean {
    const childPos = this.child.getPosition();
    const headRange = this.child.getHeadHeightRange();
    let nearCorner = false;

    for (const obstacle of this.config.obstacles) {
      const box = new THREE.Box3().setFromObject(obstacle);
      const corners = this.getBoxCorners(box);

      for (const corner of corners) {
        if (corner.y >= headRange.min - 0.1 && corner.y <= headRange.max + 0.1) {
          const dist = new THREE.Vector3(corner.x, 0, corner.z).distanceTo(
            new THREE.Vector3(childPos.x, 0, childPos.z)
          );
          if (dist < 0.5) {
            nearCorner = true;
            break;
          }
        }
      }
      if (nearCorner) break;
    }
    return nearCorner;
  }

  private getBoxCorners(box: THREE.Box3): THREE.Vector3[] {
    return [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];
  }

  private updateTrailGeometry(): void {
    const positions = new Float32Array(this.trailPoints.length * 3);
    this.trailPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y + 0.02;
      positions[i * 3 + 2] = p.z;
    });
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.computeBoundingSphere();
  }

  public setRunning(running: boolean): void {
    this.running = running;
    this.isRunning = running;
  }

  public toggleRunning(): boolean {
    this.isRunning = !this.isRunning;
    return this.isRunning;
  }

  public setTrailVisible(visible: boolean): void {
    this.trailLine.visible = visible;
  }

  public toggleTrailVisible(): boolean {
    this.trailLine.visible = !this.trailLine.visible;
    return this.trailLine.visible;
  }

  public reset(): void {
    this.trailPoints = [];
    this.trajectoryHistory = [];
    const startPos = this.child.getPosition();
    this.trailPoints.push(startPos.clone());
    this.updateTrailGeometry();
    this.currentDirection = this.randomDirection();
    this.nextDirectionChange = 0;
  }

  public getCoveredArea(): number {
    if (this.trailPoints.length < 3) return 0;

    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const p of this.trailPoints) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    return (maxX - minX) * (maxZ - minZ);
  }
}
