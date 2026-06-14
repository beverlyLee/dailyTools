import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomDefinition, RoomZone, WalkwayPath } from '../types';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  ground!: THREE.Mesh;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  room: RoomDefinition;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(18, 16, 18);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.room = this.createRoomDefinition();
    this.setupLights();
    this.createRoom();

    window.addEventListener('resize', () => this.onResize());
  }

  createRoomDefinition(): RoomDefinition {
    const zones: RoomZone[] = [
      { type: 'entry', minX: -12, maxX: -7, minZ: -8, maxZ: 8, name: '玄关' },
      { type: 'living', minX: -7, maxX: 7, minZ: -8, maxZ: 0, name: '客厅' },
      { type: 'dining', minX: -7, maxX: 7, minZ: 0, maxZ: 8, name: '餐厅' },
      { type: 'kitchen', minX: 7, maxX: 12, minZ: 0, maxZ: 8, name: '厨房' },
      { type: 'hallway', minX: 7, maxX: 12, minZ: -8, maxZ: 0, name: '走廊' },
    ];

    const walkways: WalkwayPath[] = [
      {
        start: new THREE.Vector2(-9.5, 0),
        end: new THREE.Vector2(9.5, 0),
        width: 1.8,
        isMain: true,
        name: '东西主通道',
      },
      {
        start: new THREE.Vector2(0, -7),
        end: new THREE.Vector2(0, 7),
        width: 1.5,
        isMain: true,
        name: '南北主通道',
      },
      {
        start: new THREE.Vector2(9.5, -4),
        end: new THREE.Vector2(9.5, 4),
        width: 1.2,
        isMain: false,
        name: '厨房连接道',
      },
    ];

    return { width: 24, depth: 16, zones, walkways };
  }

  setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 0.9);
    dirLight.position.set(12, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -18;
    dirLight.shadow.camera.right = 18;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xbcd4ff, 0.35);
    fillLight.position.set(-10, 15, -8);
    this.scene.add(fillLight);

    const hemi = new THREE.HemisphereLight(0xffeedd, 0x444466, 0.3);
    this.scene.add(hemi);
  }

  createRoom(): void {
    const roomW = this.room.width;
    const roomD = this.room.depth;

    const groundGeo = new THREE.PlaneGeometry(roomW, roomD);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd4c4a8,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);

    const gridHelper = new THREE.GridHelper(roomW, 24, 0x555577, 0x333355);
    (gridHelper.material as THREE.Material).opacity = 0.4;
    (gridHelper.material as THREE.Material).transparent = true;
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    this.drawRoomZones();
    this.drawWalkways();

    const wallHeight = 3.5;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf0ebe0,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, wallHeight),
      wallMat
    );
    backWall.position.set(0, wallHeight / 2, -roomD / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomD, wallHeight),
      wallMat
    );
    leftWall.position.set(-roomW / 2, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomD, wallHeight),
      wallMat
    );
    rightWall.position.set(roomW / 2, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const frontWallLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(6, wallHeight),
      wallMat
    );
    frontWallLeft.position.set(-roomW / 2 + 3, wallHeight / 2, roomD / 2);
    frontWallLeft.rotation.y = Math.PI;
    this.scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW - 6, wallHeight),
      wallMat
    );
    frontWallRight.position.set(3 + (roomW - 6) / 2, wallHeight / 2, roomD / 2);
    frontWallRight.rotation.y = Math.PI;
    this.scene.add(frontWallRight);
  }

  drawRoomZones(): void {
    this.room.zones.forEach((zone) => {
      const w = zone.maxX - zone.minX;
      const d = zone.maxZ - zone.minZ;
      const cx = (zone.minX + zone.maxX) / 2;
      const cz = (zone.minZ + zone.maxZ) / 2;

      let color = 0;
      let opacity = 0;
      switch (zone.type) {
        case 'living':
          color = 0xffb347;
          opacity = 0.06;
          break;
        case 'dining':
          color = 0x64b5f6;
          opacity = 0.06;
          break;
        case 'kitchen':
          color = 0xef5350;
          opacity = 0.06;
          break;
        case 'entry':
          color = 0xba68c8;
          opacity = 0.06;
          break;
        case 'hallway':
          color = 0x66bb6a;
          opacity = 0.06;
          break;
      }

      const zoneGeo = new THREE.PlaneGeometry(w, d);
      const zoneMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
      });
      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
      zoneMesh.rotation.x = -Math.PI / 2;
      zoneMesh.position.set(cx, 0.005, cz);
      this.scene.add(zoneMesh);

      const borderGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(w, d)
      );
      const borderMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
      });
      const border = new THREE.LineSegments(borderGeo, borderMat);
      border.rotation.x = -Math.PI / 2;
      border.position.set(cx, 0.015, cz);
      this.scene.add(border);
    });
  }

  drawWalkways(): void {
    this.room.walkways.forEach((walkway) => {
      const dx = walkway.end.x - walkway.start.x;
      const dz = walkway.end.y - walkway.start.y;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const pathGeo = new THREE.PlaneGeometry(length, walkway.width);
      const pathMat = new THREE.MeshBasicMaterial({
        color: walkway.isMain ? 0xff7043 : 0xffa726,
        transparent: true,
        opacity: 0.09,
      });
      const pathMesh = new THREE.Mesh(pathGeo, pathMat);
      pathMesh.rotation.x = -Math.PI / 2;
      pathMesh.rotation.z = -angle;
      pathMesh.position.set(
        (walkway.start.x + walkway.end.x) / 2,
        0.01,
        (walkway.start.y + walkway.end.y) / 2
      );
      this.scene.add(pathMesh);

      const borderGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(length, walkway.width)
      );
      const borderMat = new THREE.LineDashedMaterial({
        color: walkway.isMain ? 0xff7043 : 0xffa726,
        transparent: true,
        opacity: 0.35,
        dashSize: 0.3,
        gapSize: 0.2,
      });
      const border = new THREE.LineSegments(borderGeo, borderMat);
      border.computeLineDistances();
      border.rotation.x = -Math.PI / 2;
      border.rotation.z = -angle;
      border.position.set(
        (walkway.start.x + walkway.end.x) / 2,
        0.02,
        (walkway.start.y + walkway.end.y) / 2
      );
      this.scene.add(border);
    });
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  resetView(): void {
    this.camera.position.set(18, 16, 18);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  screenToGround(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);

    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  pickObject(
    clientX: number,
    clientY: number,
    objects: THREE.Object3D[]
  ): THREE.Object3D | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.furnitureId) {
        obj = obj.parent;
      }
      return obj;
    }
    return null;
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  getRoom(): RoomDefinition {
    return this.room;
  }

  addVisualization(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  removeVisualization(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  add(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  remove(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  getGroundBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    return {
      minX: -this.room.width / 2 + 0.5,
      maxX: this.room.width / 2 - 0.5,
      minZ: -this.room.depth / 2 + 0.5,
      maxZ: this.room.depth / 2 - 0.5,
    };
  }

  getZoneAt(x: number, z: number): RoomZone | null {
    for (const zone of this.room.zones) {
      if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
        return zone;
      }
    }
    return null;
  }
}
