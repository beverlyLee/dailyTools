import * as THREE from 'three';

export interface ChildModelConfig {
  height: number;
  radius: number;
  color: number;
}

export class ChildModel {
  public group: THREE.Group;
  public capsule: THREE.Mesh;
  public headSphere: THREE.Mesh;
  public bodyBox: THREE.Box3;
  public headBox: THREE.Box3;
  public config: ChildModelConfig;

  private static readonly DEFAULT_CONFIG: ChildModelConfig = {
    height: 0.9,
    radius: 0.18,
    color: 0x3b82f6,
  };

  constructor(config: Partial<ChildModelConfig> = {}) {
    this.config = { ...ChildModel.DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = 'ChildModel';

    this.capsule = this.createCapsule();
    this.headSphere = this.createHeadSphere();
    this.bodyBox = new THREE.Box3();
    this.headBox = new THREE.Box3();

    this.group.add(this.capsule);
    this.group.add(this.headSphere);
    this.addHeadHeightIndicator();
    this.updateBoundingBoxes();
  }

  private createCapsule(): THREE.Mesh {
    const { height, radius, color } = this.config;
    const cylinderHeight = height - radius * 2;
    const geometry = new THREE.CapsuleGeometry(radius, Math.max(cylinderHeight, 0.1), 8, 16);
    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      roughness: 0.4,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height / 2;
    mesh.name = 'ChildCapsule';
    return mesh;
  }

  private createHeadSphere(): THREE.Mesh {
    const { height, radius } = this.config;
    const headRadius = radius * 0.9;
    const geometry = new THREE.SphereGeometry(headRadius, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.5,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height - headRadius * 0.3;
    mesh.name = 'ChildHead';
    return mesh;
  }

  private addHeadHeightIndicator(): void {
    const { height } = this.config;
    const minY = 0.7;
    const maxY = height;

    const planeGeometry = new THREE.PlaneGeometry(0.6, maxY - minY);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set(0, (minY + maxY) / 2, 0);
    plane.name = 'HeadHeightZone';
    this.group.add(plane);

    const topEdge = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.3, maxY, 0),
        new THREE.Vector3(0.3, maxY, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 })
    );
    topEdge.name = 'HeadTopLine';
    this.group.add(topEdge);

    const bottomEdge = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.3, minY, 0),
        new THREE.Vector3(0.3, minY, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 })
    );
    bottomEdge.name = 'HeadBottomLine';
    this.group.add(bottomEdge);
  }

  public updateBoundingBoxes(): void {
    this.capsule.updateMatrixWorld(true);
    this.headSphere.updateMatrixWorld(true);
    this.bodyBox.setFromObject(this.capsule);
    this.headBox.setFromObject(this.headSphere);
  }

  public getHeadHeightRange(): { min: number; max: number } {
    return {
      min: 0.7,
      max: this.config.height,
    };
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
    this.updateBoundingBoxes();
  }

  public checkCollisionWithBox(box: THREE.Box3): boolean {
    this.updateBoundingBoxes();
    return this.bodyBox.intersectsBox(box) || this.headBox.intersectsBox(box);
  }

  public checkHeadCollisionWithBox(box: THREE.Box3): boolean {
    this.updateBoundingBoxes();
    const headRange = this.getHeadHeightRange();
    const childPos = this.getPosition();

    if (box.max.y < childPos.y + headRange.min || box.min.y > childPos.y + headRange.max) {
      return false;
    }

    return this.headBox.intersectsBox(box);
  }

  public getWorldHeadCenter(): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    this.headSphere.getWorldPosition(worldPos);
    return worldPos;
  }
}
