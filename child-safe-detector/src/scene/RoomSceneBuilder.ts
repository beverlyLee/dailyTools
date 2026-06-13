import * as THREE from 'three';

export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}

export class RoomSceneBuilder {
  public group: THREE.Group;
  public furnitureObjects: THREE.Object3D[] = [];
  public windowObjects: THREE.Object3D[] = [];
  public roomBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  private dimensions: RoomDimensions;

  private static readonly DEFAULT_DIMENSIONS: RoomDimensions = {
    width: 6,
    depth: 5,
    height: 2.8,
  };

  constructor(dimensions: Partial<RoomDimensions> = {}) {
    this.dimensions = { ...RoomSceneBuilder.DEFAULT_DIMENSIONS, ...dimensions };
    this.group = new THREE.Group();
    this.group.name = 'RoomScene';

    const { width, depth } = this.dimensions;
    this.roomBounds = {
      minX: -width / 2,
      maxX: width / 2,
      minZ: -depth / 2,
      maxZ: depth / 2,
    };
  }

  public build(): void {
    this.createFloor();
    this.createWalls();
    this.createCeiling();
    this.createWindow();
    this.createBayWindow();
    this.createCoffeeTable();
    this.createBed();
    this.createWardrobe();
    this.createBookshelf();
    this.createToyChest();
    this.createSmallStool();
    this.createPlayMat();
  }

  private createFloor(): void {
    const { width, depth } = this.dimensions;
    const geometry = new THREE.PlaneGeometry(width, depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf5deb3,
      roughness: 0.85,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.name = 'Floor';
    floor.receiveShadow = true;
    this.group.add(floor);

    const gridHelper = new THREE.GridHelper(Math.max(width, depth), 20, 0xdddddd, 0xeeeeee);
    gridHelper.position.y = 0.001;
    this.group.add(gridHelper);
  }

  private createWalls(): void {
    const { width, depth, height } = this.dimensions;
    const solidWallMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdf6e3,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const transparentWallMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdf6e3,
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      solidWallMaterial
    );
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.name = 'BackWall';
    this.group.add(backWall);

    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      transparentWallMaterial
    );
    frontWall.position.set(0, height / 2, depth / 2);
    frontWall.name = 'FrontWall';
    this.group.add(frontWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, height),
      solidWallMaterial
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.name = 'LeftWall';
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, height),
      transparentWallMaterial
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.name = 'RightWall';
    this.group.add(rightWall);

    const skirtingMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
    });
    const skirtingHeight = 0.08;
    const skirtingThickness = 0.015;

    const skirtingPositions = [
      { x: 0, z: -depth / 2 + skirtingThickness / 2, w: width, d: skirtingThickness, rotY: 0 },
      { x: 0, z: depth / 2 - skirtingThickness / 2, w: width, d: skirtingThickness, rotY: 0 },
      { x: -width / 2 + skirtingThickness / 2, z: 0, w: skirtingThickness, d: depth, rotY: Math.PI / 2 },
      { x: width / 2 - skirtingThickness / 2, z: 0, w: skirtingThickness, d: depth, rotY: Math.PI / 2 },
    ];

    for (const pos of skirtingPositions) {
      const skirting = new THREE.Mesh(
        new THREE.BoxGeometry(pos.w, skirtingHeight, pos.d),
        skirtingMaterial
      );
      skirting.position.set(pos.x, skirtingHeight / 2, pos.z);
      this.group.add(skirting);
    }
  }

  private createCeiling(): void {
    const { width, depth, height } = this.dimensions;
    const geometry = new THREE.PlaneGeometry(width, depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const ceiling = new THREE.Mesh(geometry, material);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.name = 'Ceiling';
    this.group.add(ceiling);
  }

  private createWindow(): void {
    const { height } = this.dimensions;
    const windowGroup = new THREE.Group();
    windowGroup.name = 'Window';

    const winWidth = 1.4;
    const winHeight = 1.2;
    const winY = 1.2;
    const winX = 1.5;
    const winZ = -this.dimensions.depth / 2 + 0.01;

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.4,
      metalness: 0.3,
    });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      metalness: 0.1,
    });

    const frameThickness = 0.06;
    const frameDepth = 0.08;

    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(winWidth + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    topFrame.position.set(0, winHeight / 2, 0);

    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(winWidth + frameThickness * 2, frameThickness, frameDepth),
      frameMaterial
    );
    bottomFrame.position.set(0, -winHeight / 2, 0);

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, winHeight, frameDepth),
      frameMaterial
    );
    leftFrame.position.set(-winWidth / 2 - frameThickness / 2, 0, 0);

    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, winHeight, frameDepth),
      frameMaterial
    );
    rightFrame.position.set(winWidth / 2 + frameThickness / 2, 0, 0);

    const centerVFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness * 0.7, winHeight, frameDepth),
      frameMaterial
    );

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(winWidth, winHeight, 0.01),
      glassMaterial
    );

    windowGroup.add(topFrame, bottomFrame, leftFrame, rightFrame, centerVFrame, glass);
    windowGroup.position.set(winX, winY, winZ);
    windowGroup.userData = { isWindow: true };

    this.group.add(windowGroup);
    this.windowObjects.push(windowGroup);
  }

  private createBayWindow(): void {
    const bayGroup = new THREE.Group();
    bayGroup.name = 'BayWindow';

    const winWidth = 1.8;
    const winHeight = 1.1;
    const winY = 0.75;

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.4,
      metalness: 0.3,
    });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.25,
    });

    const seatHeight = 0.45;
    const seatWidth = 2.0;
    const seatDepth = 0.7;

    const seatGroup = new THREE.Group();
    seatGroup.name = 'BayWindowSeat';

    const seatTop = new THREE.Mesh(
      new THREE.BoxGeometry(seatWidth, 0.05, seatDepth),
      new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.7 })
    );
    seatTop.name = 'BayWindowTabletop';
    seatTop.position.y = seatHeight;
    seatTop.userData = { isFurniture: true };
    this.furnitureObjects.push(seatTop);

    const seatBody = new THREE.Mesh(
      new THREE.BoxGeometry(seatWidth, seatHeight - 0.05, seatDepth),
      new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.8 })
    );
    seatBody.name = 'BayWindowBase';
    seatBody.position.y = (seatHeight - 0.05) / 2;

    seatGroup.add(seatTop, seatBody);

    const cushionMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd1dc,
      roughness: 0.95,
    });
    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(seatWidth - 0.1, 0.06, seatDepth - 0.05),
      cushionMaterial
    );
    cushion.position.y = seatHeight + 0.03;

    const frameThickness = 0.06;
    const frameDepth = 0.08;
    const winZOffset = seatDepth / 2 - 0.01;

    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(winWidth, frameThickness, frameDepth),
      frameMaterial
    );
    topFrame.position.set(0, winY + winHeight / 2, -winZOffset);

    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(winWidth, frameThickness, frameDepth),
      frameMaterial
    );
    bottomFrame.position.set(0, winY - winHeight / 2, -winZOffset);

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, winHeight, frameDepth),
      frameMaterial
    );
    leftFrame.position.set(-winWidth / 2, winY, -winZOffset);

    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, winHeight, frameDepth),
      frameMaterial
    );
    rightFrame.position.set(winWidth / 2, winY, -winZOffset);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(winWidth - frameThickness, winHeight - frameThickness, 0.01),
      glassMaterial
    );
    glass.position.set(0, winY, -winZOffset);

    bayGroup.add(seatGroup, cushion, topFrame, bottomFrame, leftFrame, rightFrame, glass);
    const margin = 0.15;
    const bayX = -this.dimensions.width / 2 + seatWidth / 2 + margin;
    bayGroup.position.set(bayX, 0, 0);
    bayGroup.userData = { isWindow: true, isBayWindow: true };

    this.group.add(bayGroup);
    this.windowObjects.push(bayGroup);
  }

  private createCoffeeTable(): void {
    const tableGroup = new THREE.Group();
    tableGroup.name = 'CoffeeTable';

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6,
      metalness: 0.05,
    });
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.5,
      metalness: 0.1,
    });

    const topWidth = 0.9;
    const topDepth = 0.5;
    const topHeight = 0.05;
    const tableHeight = 0.45;

    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(topWidth, topHeight, topDepth),
      woodMaterial
    );
    tableTop.name = 'CoffeeTable';
    tableTop.position.y = tableHeight;
    tableTop.userData = { isFurniture: true };
    this.furnitureObjects.push(tableTop);

    const legWidth = 0.05;
    const legPositions = [
      { x: -topWidth / 2 + legWidth, z: -topDepth / 2 + legWidth },
      { x: topWidth / 2 - legWidth, z: -topDepth / 2 + legWidth },
      { x: -topWidth / 2 + legWidth, z: topDepth / 2 - legWidth },
      { x: topWidth / 2 - legWidth, z: topDepth / 2 - legWidth },
    ];

    for (const pos of legPositions) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(legWidth, tableHeight - topHeight, legWidth),
        legMaterial
      );
      leg.position.set(pos.x, (tableHeight - topHeight) / 2, pos.z);
      tableGroup.add(leg);
    }

    tableGroup.add(tableTop);
    tableGroup.position.set(0.3, 0, 0.8);
    tableGroup.userData = { isFurniture: true };

    this.group.add(tableGroup);
  }

  private createBed(): void {
    const bedGroup = new THREE.Group();
    bedGroup.name = 'ChildBed';

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5e6d3,
      roughness: 0.7,
    });
    const mattressMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
    });
    const beddingMaterial = new THREE.MeshStandardMaterial({
      color: 0x87cefa,
      roughness: 0.9,
    });

    const bedWidth = 1.0;
    const bedLength = 1.8;
    const frameHeight = 0.25;
    const mattressHeight = 0.12;
    const headboardHeight = 0.6;

    const bedFrame = new THREE.Mesh(
      new THREE.BoxGeometry(bedWidth, frameHeight, bedLength),
      frameMaterial
    );
    bedFrame.name = 'ChildBed';
    bedFrame.position.y = frameHeight / 2;
    bedFrame.userData = { isFurniture: true };
    this.furnitureObjects.push(bedFrame);

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(bedWidth - 0.04, mattressHeight, bedLength - 0.04),
      mattressMaterial
    );
    mattress.position.y = frameHeight + mattressHeight / 2;

    const bedding = new THREE.Mesh(
      new THREE.BoxGeometry(bedWidth - 0.05, 0.04, bedLength * 0.7),
      beddingMaterial
    );
    bedding.position.set(0, frameHeight + mattressHeight + 0.02, -bedLength * 0.1);

    const pillowMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff8dc,
      roughness: 0.95,
    });
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(bedWidth * 0.7, 0.08, 0.35),
      pillowMaterial
    );
    pillow.position.set(0, frameHeight + mattressHeight + 0.04, -bedLength * 0.4);

    const headboard = new THREE.Mesh(
      new THREE.BoxGeometry(bedWidth, headboardHeight, 0.06),
      frameMaterial
    );
    headboard.position.set(0, headboardHeight / 2, -bedLength / 2);

    bedGroup.add(bedFrame, mattress, bedding, pillow, headboard);
    bedGroup.position.set(-this.dimensions.width / 2 + bedWidth / 2 + 0.5, 0, -this.dimensions.depth / 2 + bedLength / 2 + 0.4);
    bedGroup.userData = { isFurniture: true };

    this.group.add(bedGroup);
  }

  private createWardrobe(): void {
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.name = 'Wardrobe';

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xdeb887,
      roughness: 0.65,
    });
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      roughness: 0.3,
      metalness: 0.7,
    });

    const width = 1.4;
    const height = 1.9;
    const depth = 0.55;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      woodMaterial
    );
    body.name = 'Wardrobe';
    body.position.y = height / 2;
    body.userData = { isFurniture: true };
    this.furnitureObjects.push(body);

    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, height - 0.04, depth - 0.02),
      woodMaterial.clone()
    );
    divider.position.set(0, height / 2, 0);

    for (let i = -1; i <= 1; i += 2) {
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12),
        handleMaterial
      );
      handle.rotation.z = Math.PI / 2;
      handle.position.set(i * 0.2, 0.9, depth / 2 + 0.01);
      wardrobeGroup.add(handle);
    }

    wardrobeGroup.add(body, divider);
    wardrobeGroup.position.set(this.dimensions.width / 2 - width / 2 - 0.3, 0, -this.dimensions.depth / 2 + depth / 2 + 0.3);
    wardrobeGroup.userData = { isFurniture: true };

    this.group.add(wardrobeGroup);
  }

  private createBookshelf(): void {
    const shelfGroup = new THREE.Group();
    shelfGroup.name = 'Bookshelf';

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8a982,
      roughness: 0.7,
    });

    const width = 0.9;
    const height = 1.3;
    const depth = 0.28;
    const shelfCount = 4;

    const verticalMaterial = woodMaterial.clone();
    const leftPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, height, depth),
      verticalMaterial
    );
    leftPanel.position.set(-width / 2, height / 2, 0);

    const rightPanel = leftPanel.clone();
    rightPanel.position.x = width / 2;

    const backPanel = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.06, height, 0.015),
      woodMaterial.clone()
    );
    backPanel.position.set(0, height / 2, -depth / 2 + 0.007);

    const shelfThickness = 0.025;
    const shelfSpacing = (height - shelfThickness) / shelfCount;

    for (let i = 0; i < shelfCount; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(width - 0.06, shelfThickness, depth - 0.02),
        woodMaterial.clone()
      );
      shelf.name = 'Bookshelf';
      const y = shelfSpacing * i + shelfThickness / 2;
      shelf.position.set(0, y, 0);
      shelf.userData = { isFurniture: true };
      this.furnitureObjects.push(shelf);
      shelfGroup.add(shelf);
    }

    const bookColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da];
    for (let i = 0; i < shelfCount - 1; i++) {
      const bookCount = 5 + Math.floor(Math.random() * 4);
      const y = shelfSpacing * (i + 1) * 0.55 + shelfThickness * (i + 1);
      for (let j = 0; j < bookCount; j++) {
        const bookWidth = 0.03 + Math.random() * 0.04;
        const bookHeight = 0.18 + Math.random() * 0.1;
        const bookDepth = depth * 0.8;
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth),
          new THREE.MeshStandardMaterial({
            color: bookColors[Math.floor(Math.random() * bookColors.length)],
            roughness: 0.85,
          })
        );
        const totalWidth = bookCount * 0.05;
        const x = -width / 2 + 0.05 + j * 0.05 - totalWidth / 2;
        book.position.set(x, y, -0.02);
        shelfGroup.add(book);
      }
    }

    shelfGroup.add(leftPanel, rightPanel, backPanel);
    shelfGroup.position.set(this.dimensions.width / 2 - width / 2 - 0.3, 0, 0.2);
    shelfGroup.userData = { isFurniture: true };

    this.group.add(shelfGroup);
  }

  private createToyChest(): void {
    const chestGroup = new THREE.Group();
    chestGroup.name = 'ToyChest';

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffa07a,
      roughness: 0.75,
    });
    const lidMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8c69,
      roughness: 0.7,
    });

    const width = 0.7;
    const height = 0.4;
    const depth = 0.45;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, height * 0.85, depth),
      bodyMaterial
    );
    body.name = 'ToyChest';
    body.position.y = height * 0.85 / 2;
    body.userData = { isFurniture: true };
    this.furnitureObjects.push(body);

    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(width, height * 0.18, depth),
      lidMaterial
    );
    lid.name = 'ToyChestLid';
    lid.position.y = height * 0.85 + height * 0.09;
    lid.userData = { isFurniture: true };
    this.furnitureObjects.push(lid);

    chestGroup.add(body, lid);
    chestGroup.position.set(-1.2, 0, 1.3);
    chestGroup.userData = { isFurniture: true };

    this.group.add(chestGroup);
  }

  private createSmallStool(): void {
    const stoolGroup = new THREE.Group();
    stoolGroup.name = 'SmallStool';

    const material = new THREE.MeshStandardMaterial({
      color: 0xdaa520,
      roughness: 0.65,
    });

    const seatSize = 0.28;
    const seatHeight = 0.04;
    const totalHeight = 0.28;

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(seatSize, seatHeight, seatSize),
      material
    );
    seat.name = 'SmallStool';
    seat.position.y = totalHeight;
    seat.userData = { isFurniture: true };
    this.furnitureObjects.push(seat);

    const legSize = 0.035;
    const offset = seatSize / 2 - legSize;
    const legPositions = [
      { x: -offset, z: -offset },
      { x: offset, z: -offset },
      { x: -offset, z: offset },
      { x: offset, z: offset },
    ];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(legSize, totalHeight - seatHeight, legSize),
        material.clone()
      );
      leg.position.set(pos.x, (totalHeight - seatHeight) / 2, pos.z);
      stoolGroup.add(leg);
    }

    stoolGroup.add(seat);
    stoolGroup.position.set(-0.5, 0, 0.5);
    stoolGroup.userData = { isFurniture: true };

    this.group.add(stoolGroup);
  }

  private createPlayMat(): void {
    const matWidth = 1.8;
    const matDepth = 1.4;
    const geometry = new THREE.BoxGeometry(matWidth, 0.015, matDepth);
    const material = new THREE.MeshStandardMaterial({
      color: 0x98fb98,
      roughness: 0.9,
    });
    const mat = new THREE.Mesh(geometry, material);
    mat.position.set(-1.3, 0.008, 1.3);
    mat.name = 'PlayMat';
    this.group.add(mat);

    const tileSize = 0.3;
    const tileMaterial = new THREE.MeshStandardMaterial({
      color: 0x90ee90,
      roughness: 0.92,
      transparent: true,
      opacity: 0.7,
    });
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(tileSize * 0.9, 0.01, tileSize * 0.9),
          tileMaterial
        );
        tile.position.set(-1.3 + x * tileSize, 0.016, 1.3 + z * tileSize);
        this.group.add(tile);
      }
    }
  }

  public addLights(scene: THREE.Scene): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
    mainLight.position.set(4, 6, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    mainLight.shadow.camera.left = -4;
    mainLight.shadow.camera.right = 4;
    mainLight.shadow.camera.top = 4;
    mainLight.shadow.camera.bottom = -4;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4ff, 0.3);
    fillLight.position.set(-3, 4, -2);
    scene.add(fillLight);

    const ceilingLight = new THREE.PointLight(0xfffacd, 0.6, 8, 1.5);
    ceilingLight.position.set(0, this.dimensions.height - 0.2, 0);
    scene.add(ceilingLight);

    const nightLight = new THREE.PointLight(0xffd700, 0.3, 4);
    nightLight.position.set(-this.dimensions.width / 2 + 0.8, 0.7, -this.dimensions.depth / 2 + 0.5);
    scene.add(nightLight);
  }
}
