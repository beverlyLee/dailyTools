import * as THREE from 'three';

export interface GrabPoint {
  position: THREE.Vector3;
  name: string;
  type: 'toilet' | 'seat' | 'wall';
  reachable: boolean;
  distance: number;
}

export interface GrabAnalysisResult {
  reachablePoints: GrabPoint[];
  unreachablePoints: GrabPoint[];
  optimalTransferPoint: GrabPoint | null;
  suggestion: string;
}

export class GrabInteractionSystem {
  private grabPoints: GrabPoint[] = [];
  private markersGroup: THREE.Group;
  private wheelchairPosition: THREE.Vector3 = new THREE.Vector3();
  private wheelchairRotation: number = 0;

  static readonly MAX_REACH_DISTANCE = 0.9;
  static readonly OPTIMAL_REACH_DISTANCE = 0.4;
  static readonly MIN_HEIGHT = 0.55;
  static readonly MAX_HEIGHT = 0.95;
  static readonly OPTIMAL_HEIGHT = 0.75;

  constructor(scene: THREE.Scene) {
    this.markersGroup = new THREE.Group();
    this.markersGroup.name = 'GrabMarkers';
    scene.add(this.markersGroup);
  }

  addGrabPoint(
    position: THREE.Vector3,
    name: string,
    type: GrabPoint['type']
  ): void {
    this.grabPoints.push({
      position,
      name,
      type,
      reachable: false,
      distance: Infinity
    });
  }

  removeAllGrabPoints(): void {
    this.grabPoints = [];
    this.clearMarkers();
  }

  setWheelchairPose(position: THREE.Vector3, rotation: number): void {
    this.wheelchairPosition.copy(position);
    this.wheelchairRotation = rotation;
  }

  analyzeReachability(): GrabAnalysisResult {
    const reachable: GrabPoint[] = [];
    const unreachable: GrabPoint[] = [];

    for (const point of this.grabPoints) {
      const distance = this.calculateReachDistance(point);
      const heightOk = this.checkHeight(point);
      const angleOk = this.checkReachAngle(point);

      point.distance = distance;
      point.reachable = distance <= GrabInteractionSystem.MAX_REACH_DISTANCE && heightOk && angleOk;

      if (point.reachable) {
        reachable.push(point);
      } else {
        unreachable.push(point);
      }
    }

    const optimal = this.findOptimalTransferPoint(reachable);
    const suggestion = this.generateSuggestion(reachable, unreachable, optimal);

    return {
      reachablePoints: reachable,
      unreachablePoints: unreachable,
      optimalTransferPoint: optimal,
      suggestion
    };
  }

  private calculateReachDistance(point: GrabPoint): number {
    const dx = point.position.x - this.wheelchairPosition.x;
    const dz = point.position.z - this.wheelchairPosition.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private checkHeight(point: GrabPoint): boolean {
    return point.position.y >= GrabInteractionSystem.MIN_HEIGHT &&
           point.position.y <= GrabInteractionSystem.MAX_HEIGHT;
  }

  private checkReachAngle(point: GrabPoint): boolean {
    const dx = point.position.x - this.wheelchairPosition.x;
    const dz = point.position.z - this.wheelchairPosition.z;
    const angleToPoint = Math.atan2(dx, dz);

    const forwardDir = this.wheelchairRotation;
    let angleDiff = Math.abs(angleToPoint - forwardDir);
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }

    return angleDiff <= Math.PI * 0.75;
  }

  private findOptimalTransferPoint(reachable: GrabPoint[]): GrabPoint | null {
    if (reachable.length === 0) return null;

    let optimal: GrabPoint | null = null;
    let bestScore = -Infinity;

    for (const point of reachable) {
      const distanceScore = 1 - Math.abs(point.distance - GrabInteractionSystem.OPTIMAL_REACH_DISTANCE) / GrabInteractionSystem.OPTIMAL_REACH_DISTANCE;
      const heightScore = 1 - Math.abs(point.position.y - GrabInteractionSystem.OPTIMAL_HEIGHT) / (GrabInteractionSystem.MAX_HEIGHT - GrabInteractionSystem.MIN_HEIGHT);

      const score = distanceScore * 0.6 + heightScore * 0.4;

      if (score > bestScore) {
        bestScore = score;
        optimal = point;
      }
    }

    return optimal;
  }

  private generateSuggestion(
    reachable: GrabPoint[],
    unreachable: GrabPoint[],
    optimal: GrabPoint | null
  ): string {
    if (reachable.length === 0) {
      return `无法到达任何扶手。请调整轮椅位置或增设扶手。不可达点：${unreachable.map(p => p.name).join('、')}`;
    }

    if (optimal) {
      const heightStatus = Math.abs(optimal.position.y - GrabInteractionSystem.OPTIMAL_HEIGHT) < 0.1 ? '高度适中' :
                           optimal.position.y < GrabInteractionSystem.OPTIMAL_HEIGHT ? '扶手偏低' : '扶手偏高';
      return `最佳转移点：${optimal.name}（距离 ${optimal.distance.toFixed(2)}m，${heightStatus}）。建议朝向该方向进行转移。`;
    }

    return `可到达 ${reachable.length} 个扶手，但未找到最优转移点。建议检查扶手布局。`;
  }

  visualizeGrabPoints(analysis: GrabAnalysisResult): void {
    this.clearMarkers();

    for (const point of analysis.reachablePoints) {
      const marker = this.createGrabPointMarker(point, true);
      this.markersGroup.add(marker);
    }

    for (const point of analysis.unreachablePoints) {
      const marker = this.createGrabPointMarker(point, false);
      this.markersGroup.add(marker);
    }

    if (analysis.optimalTransferPoint) {
      const optimalMarker = this.createOptimalMarker(analysis.optimalTransferPoint);
      this.markersGroup.add(optimalMarker);
    }

    this.visualizeReachRange();
  }

  private createGrabPointMarker(point: GrabPoint, reachable: boolean): THREE.Object3D {
    const group = new THREE.Group();

    const color = reachable ? 0x27ae60 : 0xe74c3c;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.9
      })
    );
    sphere.position.copy(point.position);
    group.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.1, 24),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      })
    );
    ring.position.copy(point.position);
    ring.lookAt(this.wheelchairPosition);
    group.add(ring);

    const label = this.createTextLabel(point.name, reachable);
    label.position.copy(point.position);
    label.position.y += 0.15;
    group.add(label);

    if (reachable) {
      const line = this.createReachLine(point);
      if (line) group.add(line);
    }

    return group;
  }

  private createOptimalMarker(point: GrabPoint): THREE.Object3D {
    const group = new THREE.Group();

    const starGeom = new THREE.ConeGeometry(0.1, 0.2, 5);
    const star = new THREE.Mesh(
      starGeom,
      new THREE.MeshStandardMaterial({
        color: 0xf1c40f,
        emissive: 0xf1c40f,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
      })
    );
    star.position.copy(point.position);
    star.position.y += 0.25;
    star.rotation.y = Math.PI / 5;
    group.add(star);

    return group;
  }

  private visualizeReachRange(): void {
    const reachCircle = new THREE.Mesh(
      new THREE.RingGeometry(
        GrabInteractionSystem.OPTIMAL_REACH_DISTANCE - 0.02,
        GrabInteractionSystem.OPTIMAL_REACH_DISTANCE + 0.02,
        64
      ),
      new THREE.MeshBasicMaterial({
        color: 0x3498db,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      })
    );
    reachCircle.rotation.x = -Math.PI / 2;
    reachCircle.position.copy(this.wheelchairPosition);
    reachCircle.position.y = 0.05;
    this.markersGroup.add(reachCircle);

    const maxReachCircle = new THREE.Mesh(
      new THREE.RingGeometry(
        GrabInteractionSystem.MAX_REACH_DISTANCE - 0.01,
        GrabInteractionSystem.MAX_REACH_DISTANCE + 0.01,
        64
      ),
      new THREE.MeshBasicMaterial({
        color: 0xe74c3c,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
      })
    );
    maxReachCircle.rotation.x = -Math.PI / 2;
    maxReachCircle.position.copy(this.wheelchairPosition);
    maxReachCircle.position.y = 0.04;
    this.markersGroup.add(maxReachCircle);
  }

  private createReachLine(point: GrabPoint): THREE.Object3D | null {
    const start = new THREE.Vector3(
      this.wheelchairPosition.x,
      GrabInteractionSystem.OPTIMAL_HEIGHT,
      this.wheelchairPosition.z
    );
    const end = point.position.clone();

    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineDashedMaterial({
      color: 0x27ae60,
      dashSize: 0.05,
      gapSize: 0.03
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }

  private createTextLabel(text: string, isGood: boolean): THREE.Object3D {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, 256, 64);

    context.font = 'bold 24px sans-serif';
    context.fillStyle = isGood ? '#27ae60' : '#e74c3c';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.4, 0.1, 1);

    return sprite;
  }

  clearMarkers(): void {
    while (this.markersGroup.children.length > 0) {
      const child = this.markersGroup.children[0];
      this.markersGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Sprite) {
        if (child.material instanceof THREE.SpriteMaterial && child.material.map) {
          child.material.map.dispose();
        }
        child.material.dispose();
      } else if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
  }
}
