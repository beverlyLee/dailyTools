import * as THREE from 'three';
import { RoomConfig, CeilingConfig, MATERIAL_COLORS } from './types';

export class CeilingGenerator {
  private scene: THREE.Scene;
  private roomConfig: RoomConfig;
  private ceilingConfig: CeilingConfig;

  private roomGroup: THREE.Group;
  private ceilingGroup: THREE.Group;
  private trenchGroup: THREE.Group;

  private walls: THREE.Mesh[] = [];
  private ceilingMain: THREE.Mesh | null = null;
  private floorMesh: THREE.Mesh | null = null;

  private wallMaterial: THREE.MeshStandardMaterial;
  private ceilingMaterial: THREE.MeshStandardMaterial;
  private floorMaterial: THREE.MeshStandardMaterial;
  private trenchMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, roomConfig: RoomConfig, ceilingConfig: CeilingConfig) {
    this.scene = scene;
    this.roomConfig = { ...roomConfig };
    this.ceilingConfig = { ...ceilingConfig };

    this.roomGroup = new THREE.Group();
    this.ceilingGroup = new THREE.Group();
    this.trenchGroup = new THREE.Group();

    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: MATERIAL_COLORS.wall,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    this.ceilingMaterial = new THREE.MeshStandardMaterial({
      color: MATERIAL_COLORS.ceiling,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: MATERIAL_COLORS.floor,
      roughness: 0.9,
      metalness: 0.0,
    });

    this.trenchMaterial = new THREE.MeshStandardMaterial({
      color: MATERIAL_COLORS.ceilingTrim,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    this.build();
  }

  private build(): void {
    this.scene.add(this.roomGroup);

    this.buildFloor();
    this.buildWalls();
    this.buildCeiling();
    this.buildTrenches();
  }

  private buildFloor(): void {
    const geometry = new THREE.PlaneGeometry(
      this.roomConfig.width,
      this.roomConfig.depth
    );
    this.floorMesh = new THREE.Mesh(geometry, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = 0;
    this.floorMesh.receiveShadow = true;
    this.roomGroup.add(this.floorMesh);
  }

  private buildWalls(): void {
    const { width, depth, height } = this.roomConfig;

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      this.wallMaterial
    );
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    this.walls.push(backWall);

    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      this.wallMaterial
    );
    frontWall.position.set(0, height / 2, depth / 2);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    this.walls.push(frontWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, height),
      this.wallMaterial
    );
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.walls.push(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, height),
      this.wallMaterial
    );
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.walls.push(rightWall);

    this.walls.forEach((wall) => this.roomGroup.add(wall));
  }

  private buildCeiling(): void {
    const { width, depth, height } = this.roomConfig;
    const { drop } = this.ceilingConfig;

    const ceilingY = height - drop;
    const margin = 0.4;

    this.ceilingGroup.position.y = ceilingY;
    this.roomGroup.add(this.ceilingGroup);

    const topCeilingGeo = new THREE.PlaneGeometry(width, depth);
    const topCeiling = new THREE.Mesh(topCeilingGeo, this.ceilingMaterial);
    topCeiling.rotation.x = Math.PI / 2;
    topCeiling.position.y = drop;
    topCeiling.receiveShadow = true;
    this.ceilingGroup.add(topCeiling);

    const innerWidth = width - margin * 2;
    const innerDepth = depth - margin * 2;

    const mainCeilingGeo = new THREE.PlaneGeometry(innerWidth, innerDepth);
    this.ceilingMain = new THREE.Mesh(mainCeilingGeo, this.ceilingMaterial);
    this.ceilingMain.rotation.x = -Math.PI / 2;
    this.ceilingMain.position.y = 0;
    this.ceilingMain.receiveShadow = true;
    this.ceilingGroup.add(this.ceilingMain);
  }

  private buildTrenches(): void {
    const { width, depth } = this.roomConfig;
    const { trenchWidth, trenchDepth, drop } = this.ceilingConfig;

    const margin = 0.4;
    const innerWidth = width - margin * 2;
    const innerDepth = depth - margin * 2;

    const trenchY = -trenchDepth / 2;

    const frontTrench = this.createTrenchSegment(
      innerWidth - trenchWidth * 2,
      trenchWidth,
      trenchDepth,
      'horizontal'
    );
    frontTrench.position.set(0, trenchY, -innerDepth / 2 + trenchWidth / 2);
    this.trenchGroup.add(frontTrench);

    const backTrench = this.createTrenchSegment(
      innerWidth - trenchWidth * 2,
      trenchWidth,
      trenchDepth,
      'horizontal'
    );
    backTrench.position.set(0, trenchY, innerDepth / 2 - trenchWidth / 2);
    this.trenchGroup.add(backTrench);

    const leftTrench = this.createTrenchSegment(
      innerDepth - trenchWidth * 2,
      trenchWidth,
      trenchDepth,
      'vertical'
    );
    leftTrench.position.set(-innerWidth / 2 + trenchWidth / 2, trenchY, 0);
    this.trenchGroup.add(leftTrench);

    const rightTrench = this.createTrenchSegment(
      innerDepth - trenchWidth * 2,
      trenchWidth,
      trenchDepth,
      'vertical'
    );
    rightTrench.position.set(innerWidth / 2 - trenchWidth / 2, trenchY, 0);
    this.trenchGroup.add(rightTrench);

    this.ceilingGroup.add(this.trenchGroup);
  }

  private createTrenchSegment(
    length: number,
    width: number,
    depth: number,
    orientation: 'horizontal' | 'vertical'
  ): THREE.Group {
    const group = new THREE.Group();

    const bottomGeo =
      orientation === 'horizontal'
        ? new THREE.BoxGeometry(length, 0.01, width)
        : new THREE.BoxGeometry(width, 0.01, length);

    const bottom = new THREE.Mesh(bottomGeo, this.trenchMaterial);
    bottom.position.y = -depth / 2 + 0.005;
    bottom.receiveShadow = true;
    group.add(bottom);

    const wallThickness = 0.01;
    const wallHeight = depth;

    if (orientation === 'horizontal') {
      const innerWall = new THREE.Mesh(
        new THREE.BoxGeometry(length, wallHeight, wallThickness),
        this.trenchMaterial
      );
      innerWall.position.set(0, 0, width / 2 - wallThickness / 2);
      innerWall.receiveShadow = true;
      group.add(innerWall);

      const outerWall = new THREE.Mesh(
        new THREE.BoxGeometry(length, wallHeight, wallThickness),
        this.trenchMaterial
      );
      outerWall.position.set(0, 0, -width / 2 + wallThickness / 2);
      outerWall.receiveShadow = true;
      group.add(outerWall);
    } else {
      const innerWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, length),
        this.trenchMaterial
      );
      innerWall.position.set(width / 2 - wallThickness / 2, 0, 0);
      innerWall.receiveShadow = true;
      group.add(innerWall);

      const outerWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, length),
        this.trenchMaterial
      );
      outerWall.position.set(-width / 2 + wallThickness / 2, 0, 0);
      outerWall.receiveShadow = true;
      group.add(outerWall);
    }

    return group;
  }

  public getTrenchPositions(): {
    front: THREE.Vector3;
    back: THREE.Vector3;
    left: THREE.Vector3;
    right: THREE.Vector3;
  } {
    const { width, depth, height } = this.roomConfig;
    const { drop, trenchWidth, trenchDepth, trenchOffset } = this.ceilingConfig;

    const margin = 0.4;
    const innerWidth = width - margin * 2;
    const innerDepth = depth - margin * 2;
    const ceilingY = height - drop;
    const lightY = ceilingY - trenchDepth + 0.02;

    return {
      front: new THREE.Vector3(0, lightY, -innerDepth / 2 + trenchWidth / 2 + trenchOffset),
      back: new THREE.Vector3(0, lightY, innerDepth / 2 - trenchWidth / 2 - trenchOffset),
      left: new THREE.Vector3(-innerWidth / 2 + trenchWidth / 2 + trenchOffset, lightY, 0),
      right: new THREE.Vector3(innerWidth / 2 - trenchWidth / 2 - trenchOffset, lightY, 0),
    };
  }

  public getTrenchLengths(): { front: number; back: number; left: number; right: number } {
    const { width, depth } = this.roomConfig;
    const { trenchWidth } = this.ceilingConfig;
    const margin = 0.4;

    return {
      front: width - margin * 2 - trenchWidth * 2,
      back: width - margin * 2 - trenchWidth * 2,
      left: depth - margin * 2 - trenchWidth * 2,
      right: depth - margin * 2 - trenchWidth * 2,
    };
  }

  public getCeilingGroup(): THREE.Group {
    return this.ceilingGroup;
  }

  public getTrenchGroup(): THREE.Group {
    return this.trenchGroup;
  }

  public getWalls(): THREE.Mesh[] {
    return this.walls;
  }

  public getRoomGroup(): THREE.Group {
    return this.roomGroup;
  }

  public getRoomConfig(): RoomConfig {
    return { ...this.roomConfig };
  }

  public getCeilingConfig(): CeilingConfig {
    return { ...this.ceilingConfig };
  }

  public updateRoomConfig(config: Partial<RoomConfig>): void {
    this.roomConfig = { ...this.roomConfig, ...config };
    this.rebuild();
  }

  public updateCeilingConfig(config: Partial<CeilingConfig>): void {
    this.ceilingConfig = { ...this.ceilingConfig, ...config };
    this.rebuild();
  }

  private rebuild(): void {
    while (this.roomGroup.children.length > 0) {
      const child = this.roomGroup.children[0];
      this.roomGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }

    this.walls = [];
    this.ceilingMain = null;
    this.floorMesh = null;

    while (this.ceilingGroup.children.length > 0) {
      const child = this.ceilingGroup.children[0];
      this.ceilingGroup.remove(child);
    }

    while (this.trenchGroup.children.length > 0) {
      const child = this.trenchGroup.children[0];
      this.trenchGroup.remove(child);
    }

    this.buildFloor();
    this.buildWalls();
    this.buildCeiling();
    this.buildTrenches();
  }

  public dispose(): void {
    this.wallMaterial.dispose();
    this.ceilingMaterial.dispose();
    this.floorMaterial.dispose();
    this.trenchMaterial.dispose();
  }
}
