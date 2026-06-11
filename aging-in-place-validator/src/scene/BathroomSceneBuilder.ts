import * as THREE from 'three';
import { CollisionDetector, Obstacle } from '../collision/CollisionDetector';
import { DoorwayConfig } from '../verification/ClearWidthVerifier';
import { GrabPoint } from '../interaction/GrabInteractionSystem';

export interface BathroomConfig {
  width: number;
  depth: number;
  height: number;
  doorPosition: { x: number; z: number; width: number };
  toiletPosition: { x: number; z: number };
  sinkPosition: { x: number; z: number };
}

export interface SceneElements {
  floor: THREE.Mesh;
  walls: THREE.Mesh[];
  doorFrame: THREE.Group;
  toilet: THREE.Group;
  sink: THREE.Group;
  grabBars: THREE.Group[];
  obstacles: Omit<Obstacle, 'boundingBox'>[];
  doorways: DoorwayConfig[];
  grabPoints: { position: THREE.Vector3; name: string; type: GrabPoint['type'] }[];
}

export class BathroomSceneBuilder {
  private scene: THREE.Scene;
  private collisionDetector: CollisionDetector;

  constructor(scene: THREE.Scene, collisionDetector: CollisionDetector) {
    this.scene = scene;
    this.collisionDetector = collisionDetector;
  }

  build(config: BathroomConfig): SceneElements {
    const floor = this.createFloor(config);
    const walls = this.createWalls(config);
    const doorFrame = this.createDoorFrame(config);
    const toilet = this.createToilet(config);
    const sink = this.createSink(config);
    const grabBars = this.createGrabBars(config);
    const corners = this.createCorners(config);

    this.scene.add(floor);
    walls.forEach(w => this.scene.add(w));
    this.scene.add(doorFrame);
    this.scene.add(toilet);
    this.scene.add(sink);
    grabBars.forEach(g => this.scene.add(g));
    corners.forEach(c => this.scene.add(c));

    const obstacles = this.collectObstacles(config, doorFrame, toilet, sink, walls, corners);
    const doorways = this.collectDoorways(config);
    const grabPoints = this.collectGrabPoints(config);

    obstacles.forEach(o => this.collisionDetector.addObstacle(o.mesh, o.name, o.type));

    return {
      floor,
      walls,
      doorFrame,
      toilet,
      sink,
      grabBars,
      obstacles,
      doorways,
      grabPoints
    };
  }

  private createFloor(config: BathroomConfig): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(config.width, config.depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xecf0f1,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(config.width / 2, 0, config.depth / 2);
    floor.receiveShadow = true;
    floor.name = 'Floor';
    return floor;
  }

  private createWalls(config: BathroomConfig): THREE.Mesh[] {
    const walls: THREE.Mesh[] = [];
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xbdc3c7,
      roughness: 0.9,
      metalness: 0.05
    });

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(config.width, config.height, 0.1),
      wallMaterial
    );
    backWall.position.set(config.width / 2, config.height / 2, -0.05);
    backWall.name = 'BackWall';
    walls.push(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, config.height, config.depth),
      wallMaterial
    );
    leftWall.position.set(-0.05, config.height / 2, config.depth / 2);
    leftWall.name = 'LeftWall';
    walls.push(leftWall);

    const rightWallFull = config.depth - config.doorPosition.z;
    const rightWall1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, config.height, config.doorPosition.z),
      wallMaterial
    );
    rightWall1.position.set(config.width + 0.05, config.height / 2, config.doorPosition.z / 2);
    rightWall1.name = 'RightWallFront';
    walls.push(rightWall1);

    if (rightWallFull > 0) {
      const rightWall2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, config.height, config.depth - config.doorPosition.z - config.doorPosition.width),
        wallMaterial
      );
      rightWall2.position.set(
        config.width + 0.05,
        config.height / 2,
        config.doorPosition.z + config.doorPosition.width + (config.depth - config.doorPosition.z - config.doorPosition.width) / 2
      );
      rightWall2.name = 'RightWallBack';
      walls.push(rightWall2);
    }

    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(config.width, config.height, 0.1),
      wallMaterial
    );
    frontWall.position.set(config.width / 2, config.height / 2, config.depth + 0.05);
    frontWall.name = 'FrontWall';
    walls.push(frontWall);

    return walls;
  }

  private createDoorFrame(config: BathroomConfig): THREE.Group {
    const group = new THREE.Group();
    group.name = 'DoorFrame';

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.1
    });

    const postGeom = new THREE.BoxGeometry(0.08, 2.1, 0.12);

    const leftPost = new THREE.Mesh(postGeom, frameMaterial);
    leftPost.position.set(
      config.width,
      1.05,
      config.doorPosition.z
    );
    leftPost.name = 'LeftDoorPost';
    group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeom, frameMaterial);
    rightPost.position.set(
      config.width,
      1.05,
      config.doorPosition.z + config.doorPosition.width
    );
    rightPost.name = 'RightDoorPost';
    group.add(rightPost);

    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, config.doorPosition.width + 0.08),
      frameMaterial
    );
    lintel.position.set(
      config.width,
      2.16,
      config.doorPosition.z + config.doorPosition.width / 2
    );
    lintel.name = 'DoorLintel';
    group.add(lintel);

    return group;
  }

  private createToilet(config: BathroomConfig): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Toilet';

    const toiletMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.25, 0.65),
      toiletMaterial
    );
    base.position.set(config.toiletPosition.x, 0.125, config.toiletPosition.z);
    base.name = 'ToiletBase';
    group.add(base);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.08, 0.50),
      toiletMaterial
    );
    seat.position.set(config.toiletPosition.x, 0.25 + 0.04, config.toiletPosition.z + 0.05);
    seat.name = 'ToiletSeat';
    group.add(seat);

    const tank = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.55, 0.20),
      toiletMaterial
    );
    tank.position.set(config.toiletPosition.x, 0.25 + 0.275, config.toiletPosition.z - 0.22);
    tank.name = 'ToiletTank';
    group.add(tank);

    return group;
  }

  private createSink(config: BathroomConfig): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Sink';

    const ceramicMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1
    });

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      roughness: 0.3,
      metalness: 0.8
    });

    const basin = new THREE.Mesh(
      new THREE.BoxGeometry(0.60, 0.15, 0.45),
      ceramicMaterial
    );
    basin.position.set(config.sinkPosition.x, 0.80, config.sinkPosition.z);
    basin.name = 'SinkBasin';
    group.add(basin);

    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.70, 0.40),
      new THREE.MeshStandardMaterial({
        color: 0x7f8c8d,
        roughness: 0.7,
        metalness: 0.1
      })
    );
    cabinet.position.set(config.sinkPosition.x, 0.35, config.sinkPosition.z);
    cabinet.name = 'SinkCabinet';
    group.add(cabinet);

    const faucet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.20, 16),
      metalMaterial
    );
    faucet.position.set(config.sinkPosition.x, 0.95, config.sinkPosition.z - 0.10);
    faucet.name = 'Faucet';
    group.add(faucet);

    const faucetHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.15),
      metalMaterial
    );
    faucetHead.position.set(config.sinkPosition.x, 0.95, config.sinkPosition.z - 0.02);
    group.add(faucetHead);

    return group;
  }

  private createGrabBars(config: BathroomConfig): THREE.Group[] {
    const bars: THREE.Group[] = [];
    const barMaterial = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      roughness: 0.3,
      metalness: 0.9
    });

    const toiletBar1 = this.createHorizontalBar(
      new THREE.Vector3(config.toiletPosition.x + 0.35, 0.75, config.toiletPosition.z - 0.10),
      0.60,
      'ToiletSideGrabBar',
      barMaterial
    );
    bars.push(toiletBar1);

    const toiletBar2 = this.createVerticalBar(
      new THREE.Vector3(config.toiletPosition.x + 0.35, 0.60, config.toiletPosition.z + 0.20),
      0.80,
      'ToiletFrontGrabBar',
      barMaterial
    );
    bars.push(toiletBar2);

    const sinkBar = this.createHorizontalBar(
      new THREE.Vector3(config.sinkPosition.x, 0.85, config.sinkPosition.z + 0.30),
      0.70,
      'SinkGrabBar',
      barMaterial
    );
    bars.push(sinkBar);

    const seatBar = this.createHorizontalBar(
      new THREE.Vector3(config.width * 0.55, 0.80, config.depth * 0.70),
      0.55,
      'SeatGrabBar',
      barMaterial
    );
    bars.push(seatBar);

    return bars;
  }

  private createHorizontalBar(
    position: THREE.Vector3,
    length: number,
    name: string,
    material: THREE.MeshStandardMaterial
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = name;

    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, length, 16),
      material
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.copy(position);
    group.add(bar);

    const supportGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 12);
    const support1 = new THREE.Mesh(supportGeom, material);
    support1.position.set(position.x - length / 2 + 0.05, position.y, position.z + 0.04);
    group.add(support1);

    const support2 = new THREE.Mesh(supportGeom, material);
    support2.position.set(position.x + length / 2 - 0.05, position.y, position.z + 0.04);
    group.add(support2);

    return group;
  }

  private createVerticalBar(
    position: THREE.Vector3,
    height: number,
    name: string,
    material: THREE.MeshStandardMaterial
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = name;

    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, height, 16),
      material
    );
    bar.position.copy(position);
    group.add(bar);

    const supportGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 12);
    const support1 = new THREE.Mesh(supportGeom, material);
    support1.rotation.x = Math.PI / 2;
    support1.position.set(position.x, position.y - height / 2 + 0.05, position.z + 0.04);
    group.add(support1);

    const support2 = new THREE.Mesh(supportGeom, material);
    support2.rotation.x = Math.PI / 2;
    support2.position.set(position.x, position.y + height / 2 - 0.05, position.z + 0.04);
    group.add(support2);

    return group;
  }

  private createCorners(config: BathroomConfig): THREE.Group[] {
    const corners: THREE.Group[] = [];
    const cornerMaterial = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      transparent: true,
      opacity: 0.6
    });

    const cornerPositions = [
      { x: 0.1, z: 0.1, name: 'CornerBottomLeft' },
      { x: config.width - 0.1, z: 0.1, name: 'CornerBottomRight' },
      { x: 0.1, z: config.depth - 0.1, name: 'CornerTopLeft' },
      { x: config.width - 0.1, z: config.depth - 0.1, name: 'CornerTopRight' }
    ];

    for (const pos of cornerPositions) {
      const group = new THREE.Group();
      group.name = pos.name;

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        cornerMaterial
      );
      marker.position.set(pos.x, 0.05, pos.z);
      group.add(marker);

      corners.push(group);
    }

    return corners;
  }

  private collectObstacles(
    _config: BathroomConfig,
    doorFrame: THREE.Group,
    toilet: THREE.Group,
    sink: THREE.Group,
    walls: THREE.Mesh[],
    corners: THREE.Group[]
  ): Omit<Obstacle, 'boundingBox'>[] {
    const obstacles: Omit<Obstacle, 'boundingBox'>[] = [];

    doorFrame.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        obstacles.push({
          name: child.name || 'DoorFramePart',
          type: 'door_frame',
          mesh: child
        });
      }
    });

    toilet.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        obstacles.push({
          name: child.name || 'ToiletPart',
          type: 'toilet',
          mesh: child
        });
      }
    });

    sink.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.name !== 'Faucet') {
        obstacles.push({
          name: child.name || 'SinkPart',
          type: 'sink',
          mesh: child
        });
      }
    });

    walls.forEach(wall => {
      obstacles.push({
        name: wall.name,
        type: 'wall',
        mesh: wall
      });
    });

    corners.forEach(corner => {
      obstacles.push({
        name: corner.name,
        type: 'corner',
        mesh: corner
      });
    });

    return obstacles;
  }

  private collectDoorways(config: BathroomConfig): DoorwayConfig[] {
    return [{
      leftPost: new THREE.Vector3(config.width, 0, config.doorPosition.z),
      rightPost: new THREE.Vector3(config.width, 0, config.doorPosition.z + config.doorPosition.width),
      height: 2.1,
      name: 'MainDoorway'
    }];
  }

  private collectGrabPoints(config: BathroomConfig): { position: THREE.Vector3; name: string; type: GrabPoint['type'] }[] {
    return [
      {
        position: new THREE.Vector3(config.toiletPosition.x + 0.35, 0.75, config.toiletPosition.z - 0.10),
        name: '马桶侧扶手',
        type: 'toilet'
      },
      {
        position: new THREE.Vector3(config.toiletPosition.x + 0.35, 0.60, config.toiletPosition.z + 0.20),
        name: '马桶前扶手',
        type: 'toilet'
      },
      {
        position: new THREE.Vector3(config.sinkPosition.x, 0.85, config.sinkPosition.z + 0.30),
        name: '洗手台扶手',
        type: 'wall'
      },
      {
        position: new THREE.Vector3(config.width * 0.55, 0.80, config.depth * 0.70),
        name: '独立坐席扶手',
        type: 'seat'
      }
    ];
  }
}

export const DEFAULT_BATHROOM_CONFIG: BathroomConfig = {
  width: 2.5,
  depth: 2.8,
  height: 2.5,
  doorPosition: { x: 2.5, z: 0.8, width: 0.75 },
  toiletPosition: { x: 0.45, z: 1.0 },
  sinkPosition: { x: 1.25, z: 0.3 }
};

export const SPACIOUS_BATHROOM_CONFIG: BathroomConfig = {
  width: 3.5,
  depth: 3.5,
  height: 2.5,
  doorPosition: { x: 3.5, z: 1.0, width: 0.95 },
  toiletPosition: { x: 0.5, z: 1.2 },
  sinkPosition: { x: 1.8, z: 0.3 }
};
