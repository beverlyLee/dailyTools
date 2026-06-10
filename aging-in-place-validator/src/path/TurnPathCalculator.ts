import * as THREE from 'three';

export interface PathPoint {
  position: THREE.Vector3;
  rotation: number;
}

export interface RotationPathConfig {
  center: THREE.Vector3;
  radius: number;
  startAngle: number;
  endAngle: number;
  points: PathPoint[];
}

export class TurnPathCalculator {
  static readonly MIN_TURN_RADIUS = 1.5;

  static calculateRotationPath(
    center: THREE.Vector3,
    startAngle: number = 0,
    totalRotation: number = Math.PI * 2,
    segments: number = 72
  ): RotationPathConfig {
    const points: PathPoint[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (totalRotation * i) / segments;
      const x = center.x + TurnPathCalculator.MIN_TURN_RADIUS * Math.cos(angle);
      const z = center.z + TurnPathCalculator.MIN_TURN_RADIUS * Math.sin(angle);

      points.push({
        position: new THREE.Vector3(x, 0, z),
        rotation: angle + Math.PI / 2
      });
    }

    return {
      center,
      radius: TurnPathCalculator.MIN_TURN_RADIUS,
      startAngle,
      endAngle: startAngle + totalRotation,
      points
    };
  }

  static createPathVisualization(pathConfig: RotationPathConfig): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'RotationPath';

    const curve = new THREE.EllipseCurve(
      pathConfig.center.x,
      pathConfig.center.z,
      pathConfig.radius,
      pathConfig.radius,
      pathConfig.startAngle,
      pathConfig.endAngle,
      false,
      0
    );

    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map(p => new THREE.Vector3(p.x, 0.02, p.y))
    );

    const material = new THREE.LineDashedMaterial({
      color: 0x3498db,
      dashSize: 0.1,
      gapSize: 0.05
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    group.add(line);

    const centerMarker = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 32),
      new THREE.MeshBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.8 })
    );
    centerMarker.rotation.x = -Math.PI / 2;
    centerMarker.position.copy(pathConfig.center);
    centerMarker.position.y = 0.03;
    group.add(centerMarker);

    return group;
  }

  static getPositionAtProgress(
    pathConfig: RotationPathConfig,
    progress: number
  ): PathPoint {
    const idx = Math.min(
      Math.floor(progress * (pathConfig.points.length - 1)),
      pathConfig.points.length - 1
    );
    return pathConfig.points[idx];
  }

  static generateBoundaryPoints(
    center: THREE.Vector3
  ): THREE.Vector3[] {
    const boundary: THREE.Vector3[] = [];
    const segments = 36;

    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      const x = center.x + TurnPathCalculator.MIN_TURN_RADIUS * Math.cos(angle);
      const z = center.z + TurnPathCalculator.MIN_TURN_RADIUS * Math.sin(angle);
      boundary.push(new THREE.Vector3(x, 0, z));
    }

    return boundary;
  }

  static checkPathInBounds(
    pathConfig: RotationPathConfig,
    bounds: THREE.Box3
  ): { inBounds: boolean; outOfBoundsPoints: THREE.Vector3[] } {
    const outOfBoundsPoints: THREE.Vector3[] = [];

    for (const point of pathConfig.points) {
      if (!bounds.containsPoint(point.position)) {
        outOfBoundsPoints.push(point.position);
      }
    }

    return {
      inBounds: outOfBoundsPoints.length === 0,
      outOfBoundsPoints
    };
  }
}
