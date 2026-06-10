import * as THREE from 'three';

export interface DoorwayConfig {
  leftPost: THREE.Vector3;
  rightPost: THREE.Vector3;
  height: number;
  name: string;
}

export interface WidthVerificationResult {
  passed: boolean;
  clearWidth: number;
  minimumRequired: number;
  unit: string;
  recommendation: string;
  isPassageClear: boolean;
  obstacleInPassage?: string;
}

export class ClearWidthVerifier {
  static readonly MINIMUM_CLEAR_WIDTH = 0.80;
  static readonly RECOMMENDED_WIDTH = 0.90;
  static readonly UNIT = 'm';

  private doorways: DoorwayConfig[] = [];
  private visualizationGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.visualizationGroup = new THREE.Group();
    this.visualizationGroup.name = 'WidthVerificationVisuals';
    scene.add(this.visualizationGroup);
  }

  addDoorway(config: DoorwayConfig): void {
    this.doorways.push(config);
  }

  removeAllDoorways(): void {
    this.doorways = [];
  }

  verifyDoorway(doorway: DoorwayConfig): WidthVerificationResult {
    const clearWidth = this.calculateClearWidth(doorway);
    const passed = clearWidth >= ClearWidthVerifier.MINIMUM_CLEAR_WIDTH;

    let recommendation = '';
    if (passed) {
      if (clearWidth >= ClearWidthVerifier.RECOMMENDED_WIDTH) {
        recommendation = `门洞净宽 ${clearWidth.toFixed(2)}${ClearWidthVerifier.UNIT}，超过推荐标准 ${ClearWidthVerifier.RECOMMENDED_WIDTH}${ClearWidthVerifier.UNIT}，轮椅通行非常舒适。`;
      } else {
        recommendation = `门洞净宽 ${clearWidth.toFixed(2)}${ClearWidthVerifier.UNIT}，刚好满足最低标准 ${ClearWidthVerifier.MINIMUM_CLEAR_WIDTH}${ClearWidthVerifier.UNIT}。建议扩展至 ${ClearWidthVerifier.RECOMMENDED_WIDTH}${ClearWidthVerifier.UNIT} 以提升舒适度。`;
      }
    } else {
      const deficit = ClearWidthVerifier.MINIMUM_CLEAR_WIDTH - clearWidth;
      recommendation = `门洞净宽不足！当前 ${clearWidth.toFixed(2)}${ClearWidthVerifier.UNIT}，低于最低标准 ${ClearWidthVerifier.MINIMUM_CLEAR_WIDTH}${ClearWidthVerifier.UNIT}，缺少 ${deficit.toFixed(2)}${ClearWidthVerifier.UNIT}。必须拓宽门洞或更换为无障碍门。`;
    }

    return {
      passed,
      clearWidth,
      minimumRequired: ClearWidthVerifier.MINIMUM_CLEAR_WIDTH,
      unit: ClearWidthVerifier.UNIT,
      recommendation,
      isPassageClear: passed
    };
  }

  verifyAll(): { doorway: DoorwayConfig; result: WidthVerificationResult }[] {
    return this.doorways.map(d => ({
      doorway: d,
      result: this.verifyDoorway(d)
    }));
  }

  private calculateClearWidth(doorway: DoorwayConfig): number {
    const dx = doorway.rightPost.x - doorway.leftPost.x;
    const dz = doorway.rightPost.z - doorway.leftPost.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  visualizeVerification(
    doorway: DoorwayConfig,
    result: WidthVerificationResult
  ): void {
    this.clearVisualization();

    const color = result.passed ? 0x27ae60 : 0xe74c3c;

    const center = new THREE.Vector3(
      (doorway.leftPost.x + doorway.rightPost.x) / 2,
      doorway.height / 2,
      (doorway.leftPost.z + doorway.rightPost.z) / 2
    );

    const direction = new THREE.Vector3(
      doorway.rightPost.x - doorway.leftPost.x,
      0,
      doorway.rightPost.z - doorway.leftPost.z
    );
    const length = direction.length();
    direction.normalize();

    const measureLine = this.createMeasureLine(doorway.leftPost, doorway.rightPost, color, length);
    this.visualizationGroup.add(measureLine);

    const minWidthMarker = this.createMinimumWidthMarker(doorway, center, direction);
    this.visualizationGroup.add(minWidthMarker);

    const heightBar = this.createHeightBar(doorway, color);
    this.visualizationGroup.add(heightBar);

    const label = this.createResultLabel(center, result);
    this.visualizationGroup.add(label);

    if (!result.passed) {
      const deficitMarker = this.createDeficitMarker(doorway, result);
      this.visualizationGroup.add(deficitMarker);
    }
  }

  private createMeasureLine(
    left: THREE.Vector3,
    right: THREE.Vector3,
    color: number,
    length: number
  ): THREE.Object3D {
    const group = new THREE.Group();

    const linePoints = [
      new THREE.Vector3(left.x, 1.0, left.z),
      new THREE.Vector3(right.x, 1.0, right.z)
    ];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 3 });
    const line = new THREE.Line(lineGeom, lineMat);
    group.add(line);

    const leftCap = this.createEndCap(new THREE.Vector3(left.x, 1.0, left.z), color);
    const rightCap = this.createEndCap(new THREE.Vector3(right.x, 1.0, right.z), color);
    group.add(leftCap, rightCap);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = color === 0x27ae60 ? '#27ae60' : '#e74c3c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${length.toFixed(2)}m`, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set((left.x + right.x) / 2, 1.15, (left.z + right.z) / 2);
    sprite.scale.set(0.6, 0.15, 1);
    group.add(sprite);

    return group;
  }

  private createEndCap(position: THREE.Vector3, color: number): THREE.Object3D {
    const geom = new THREE.SphereGeometry(0.03, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(geom, mat);
    sphere.position.copy(position);
    return sphere;
  }

  private createMinimumWidthMarker(
    _doorway: DoorwayConfig,
    center: THREE.Vector3,
    direction: THREE.Vector3
  ): THREE.Object3D {
    const group = new THREE.Group();

    const halfWidth = ClearWidthVerifier.MINIMUM_CLEAR_WIDTH / 2;
    const leftPoint = new THREE.Vector3(
      center.x - direction.x * halfWidth,
      0.8,
      center.z - direction.z * halfWidth
    );
    const rightPoint = new THREE.Vector3(
      center.x + direction.x * halfWidth,
      0.8,
      center.z + direction.z * halfWidth
    );

    const linePoints = [leftPoint, rightPoint];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xf39c12,
      dashSize: 0.08,
      gapSize: 0.05
    });
    const line = new THREE.Line(lineGeom, lineMat);
    line.computeLineDistances();
    group.add(line);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 48;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#f39c12';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`最低标准: ${ClearWidthVerifier.MINIMUM_CLEAR_WIDTH}m`, 128, 24);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(center.x, 0.95, center.z);
    sprite.scale.set(0.7, 0.12, 1);
    group.add(sprite);

    return group;
  }

  private createHeightBar(doorway: DoorwayConfig, color: number): THREE.Object3D {
    const group = new THREE.Group();

    const points = [
      new THREE.Vector3(doorway.leftPost.x, 0, doorway.leftPost.z),
      new THREE.Vector3(doorway.leftPost.x, doorway.height, doorway.leftPost.z)
    ];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const line = new THREE.Line(lineGeom, lineMat);
    group.add(line);

    const points2 = [
      new THREE.Vector3(doorway.rightPost.x, 0, doorway.rightPost.z),
      new THREE.Vector3(doorway.rightPost.x, doorway.height, doorway.rightPost.z)
    ];
    const lineGeom2 = new THREE.BufferGeometry().setFromPoints(points2);
    const line2 = new THREE.Line(lineGeom2, lineMat);
    group.add(line2);

    return group;
  }

  private createResultLabel(center: THREE.Vector3, result: WidthVerificationResult): THREE.Object3D {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 96;

    const bgColor = result.passed ? 'rgba(39, 174, 96, 0.95)' : 'rgba(231, 76, 60, 0.95)';
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(0, 0, 512, 96, 16) : ctx.rect(0, 0, 512, 96);
    ctx.fill();

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const status = result.passed ? '✓ 通过验证' : '✗ 验证失败';
    ctx.fillText(status, 256, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(center.x, 1.6, center.z);
    sprite.scale.set(1.0, 0.18, 1);
    return sprite;
  }

  private createDeficitMarker(doorway: DoorwayConfig, result: WidthVerificationResult): THREE.Object3D {
    const deficit = result.minimumRequired - result.clearWidth;
    const center = new THREE.Vector3(
      (doorway.leftPost.x + doorway.rightPost.x) / 2,
      0.5,
      (doorway.leftPost.z + doorway.rightPost.z) / 2
    );

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 384;
    canvas.height = 64;
    ctx.fillStyle = 'rgba(231, 76, 60, 0.9)';
    ctx.fillRect(0, 0, 384, 64);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`缺口: ${deficit.toFixed(2)}${ClearWidthVerifier.UNIT}`, 192, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(center);
    sprite.scale.set(0.8, 0.12, 1);
    return sprite;
  }

  clearVisualization(): void {
    while (this.visualizationGroup.children.length > 0) {
      const child = this.visualizationGroup.children[0];
      this.visualizationGroup.remove(child);
      this.disposeObject(child);
    }
  }

  private disposeObject(obj: THREE.Object3D): void {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    } else if (obj instanceof THREE.Sprite) {
      if (obj.material instanceof THREE.SpriteMaterial && obj.material.map) {
        obj.material.map.dispose();
      }
      obj.material.dispose();
    } else if (obj instanceof THREE.Line) {
      obj.geometry.dispose();
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
    }
    obj.children.forEach(c => this.disposeObject(c));
  }
}
