import * as THREE from 'three';

export interface CollisionInfo {
  collided: boolean;
  obstacleName: string;
  collisionPoint: THREE.Vector3;
  collisionNormal: THREE.Vector3;
  penetrationDepth: number;
}

export interface Obstacle {
  name: string;
  type: 'wall' | 'door_frame' | 'sink' | 'toilet' | 'corner' | 'furniture';
  mesh: THREE.Object3D;
  boundingBox: THREE.Box3;
}

export class CollisionDetector {
  private obstacles: Obstacle[] = [];
  private collisionMarkers: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.collisionMarkers = new THREE.Group();
    this.collisionMarkers.name = 'CollisionMarkers';
    scene.add(this.collisionMarkers);
  }

  addObstacle(
    mesh: THREE.Object3D,
    name: string,
    type: Obstacle['type']
  ): void {
    const box = new THREE.Box3().setFromObject(mesh);
    this.obstacles.push({ name, type, mesh, boundingBox: box });
  }

  addObstacles(obstacles: Omit<Obstacle, 'boundingBox'>[]): void {
    obstacles.forEach(o => this.addObstacle(o.mesh, o.name, o.type));
  }

  removeAllObstacles(): void {
    this.obstacles = [];
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  checkCollisions(wheelchairBoxes: THREE.Box3[]): CollisionInfo[] {
    const collisions: CollisionInfo[] = [];

    for (const wheelchairBox of wheelchairBoxes) {
      for (const obstacle of this.obstacles) {
        if (wheelchairBox.intersectsBox(obstacle.boundingBox)) {
          const collisionPoint = this.calculateCollisionPoint(
            wheelchairBox,
            obstacle.boundingBox
          );
          const collisionNormal = this.calculateCollisionNormal(
            wheelchairBox,
            obstacle.boundingBox,
            collisionPoint
          );
          const penetrationDepth = this.calculatePenetrationDepth(
            wheelchairBox,
            obstacle.boundingBox,
            collisionNormal
          );

          collisions.push({
            collided: true,
            obstacleName: obstacle.name,
            collisionPoint,
            collisionNormal,
            penetrationDepth
          });
        }
      }
    }

    return this.deduplicateCollisions(collisions);
  }

  private calculateCollisionPoint(
    boxA: THREE.Box3,
    boxB: THREE.Box3
  ): THREE.Vector3 {
    const intersection = boxA.clone().intersect(boxB);
    const center = new THREE.Vector3();
    intersection.getCenter(center);
    return center;
  }

  private calculateCollisionNormal(
    wheelchairBox: THREE.Box3,
    obstacleBox: THREE.Box3,
    _collisionPoint: THREE.Vector3
  ): THREE.Vector3 {
    const normal = new THREE.Vector3();
    const wheelchairCenter = new THREE.Vector3();
    wheelchairBox.getCenter(wheelchairCenter);

    const obstacleCenter = new THREE.Vector3();
    obstacleBox.getCenter(obstacleCenter);

    normal.subVectors(wheelchairCenter, obstacleCenter).normalize();

    if (Math.abs(normal.x) > Math.abs(normal.z)) {
      normal.z = 0;
    } else {
      normal.x = 0;
    }
    normal.y = 0;

    return normal.normalize();
  }

  private calculatePenetrationDepth(
    boxA: THREE.Box3,
    boxB: THREE.Box3,
    normal: THREE.Vector3
  ): number {
    const overlapX = Math.min(boxA.max.x, boxB.max.x) - Math.max(boxA.min.x, boxB.min.x);
    const overlapZ = Math.min(boxA.max.z, boxB.max.z) - Math.max(boxA.min.z, boxB.min.z);

    if (Math.abs(normal.x) > Math.abs(normal.z)) {
      return overlapX;
    }
    return overlapZ;
  }

  private deduplicateCollisions(collisions: CollisionInfo[]): CollisionInfo[] {
    const unique = new Map<string, CollisionInfo>();

    for (const collision of collisions) {
      const key = `${collision.obstacleName}-${Math.round(collision.collisionPoint.x * 100)}-${Math.round(collision.collisionPoint.z * 100)}`;
      if (!unique.has(key)) {
        unique.set(key, collision);
      }
    }

    return Array.from(unique.values());
  }

  showCollisionMarkers(collisions: CollisionInfo[]): void {
    this.clearCollisionMarkers();

    for (const collision of collisions) {
      const marker = this.createCollisionMarker(collision);
      this.collisionMarkers.add(marker);
    }
  }

  private createCollisionMarker(collision: CollisionInfo): THREE.Object3D {
    const group = new THREE.Group();

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.9
      })
    );
    sphere.position.copy(collision.collisionPoint);
    group.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.15, 24),
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
    );
    ring.position.copy(collision.collisionPoint);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y += 0.01;
    group.add(ring);

    const arrowHelper = new THREE.ArrowHelper(
      collision.collisionNormal,
      collision.collisionPoint,
      0.3,
      0xff0000,
      0.1,
      0.05
    );
    group.add(arrowHelper);

    return group;
  }

  clearCollisionMarkers(): void {
    while (this.collisionMarkers.children.length > 0) {
      const child = this.collisionMarkers.children[0];
      this.collisionMarkers.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
  }

  checkCollisionAlongPath(
    pathPoints: { position: THREE.Vector3; rotation: number }[],
    wheelchairBaseBoxes: THREE.Box3[]
  ): {
    hasCollision: boolean;
    collisionPoints: CollisionInfo[];
    maxProgress: number;
  } {
    let hasCollision = false;
    const allCollisions: CollisionInfo[] = [];
    let maxProgress = 1.0;

    for (let i = 0; i < pathPoints.length; i++) {
      const point = pathPoints[i];
      const rotatedBoxes = wheelchairBaseBoxes.map(box => {
        const rotatedBox = box.clone();
        const center = new THREE.Vector3();
        rotatedBox.getCenter(center);

        const angle = point.rotation;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const corners = [
          new THREE.Vector3(rotatedBox.min.x, rotatedBox.min.y, rotatedBox.min.z),
          new THREE.Vector3(rotatedBox.max.x, rotatedBox.min.y, rotatedBox.min.z),
          new THREE.Vector3(rotatedBox.max.x, rotatedBox.max.y, rotatedBox.min.z),
          new THREE.Vector3(rotatedBox.min.x, rotatedBox.max.y, rotatedBox.min.z),
          new THREE.Vector3(rotatedBox.min.x, rotatedBox.min.y, rotatedBox.max.z),
          new THREE.Vector3(rotatedBox.max.x, rotatedBox.min.y, rotatedBox.max.z),
          new THREE.Vector3(rotatedBox.max.x, rotatedBox.max.y, rotatedBox.max.z),
          new THREE.Vector3(rotatedBox.min.x, rotatedBox.max.y, rotatedBox.max.z)
        ];

        const transformedCorners = corners.map(corner => {
          const dx = corner.x - center.x;
          const dz = corner.z - center.z;
          return new THREE.Vector3(
            point.position.x + center.x + dx * cos - dz * sin,
            center.y + corner.y,
            point.position.z + center.z + dx * sin + dz * cos
          );
        });

        const newBox = new THREE.Box3();
        transformedCorners.forEach(c => newBox.expandByPoint(c));
        return newBox;
      });

      const collisions = this.checkCollisions(rotatedBoxes);
      if (collisions.length > 0) {
        hasCollision = true;
        allCollisions.push(...collisions);
        if (maxProgress === 1.0) {
          maxProgress = i / pathPoints.length;
        }
      }
    }

    const uniqueCollisions = this.deduplicateCollisions(allCollisions);

    return {
      hasCollision,
      collisionPoints: uniqueCollisions,
      maxProgress
    };
  }
}
