import * as THREE from 'three';
import { FurnitureDefinition, FurnitureType } from '../types';

export const FURNITURE_DEFINITIONS: Record<FurnitureType, FurnitureDefinition> = {
  sofa: {
    type: 'sofa',
    name: '真皮沙发',
    category: 'furniture',
    width: 3.2,
    depth: 1.1,
    height: 0.9,
    color: 0x3d2b1f,
    isValuable: true,
    isLeather: true,
    isCatAccessible: true,
    topHeight: 0.9,
  },
  bookshelf: {
    type: 'bookshelf',
    name: '书架',
    category: 'furniture',
    width: 2.0,
    depth: 0.4,
    height: 2.4,
    color: 0x8b5a2b,
    isCatAccessible: true,
    topHeight: 2.4,
  },
  cabinet: {
    type: 'cabinet',
    name: '储物柜',
    category: 'furniture',
    width: 1.6,
    depth: 0.5,
    height: 2.0,
    color: 0xf5f5dc,
    isCatAccessible: true,
    topHeight: 2.0,
  },
  table: {
    type: 'table',
    name: '餐桌',
    category: 'furniture',
    width: 1.8,
    depth: 1.0,
    height: 0.75,
    color: 0xe8d5b0,
    isCatAccessible: true,
    topHeight: 0.75,
    isFoodZone: true,
  },
  'tv-stand': {
    type: 'tv-stand',
    name: '电视柜',
    category: 'furniture',
    width: 2.4,
    depth: 0.5,
    height: 0.55,
    color: 0x2c2c2c,
    isCatAccessible: true,
    topHeight: 0.55,
  },
  'cat-tree-large': {
    type: 'cat-tree-large',
    name: '大型猫爬架',
    category: 'cat-facility',
    width: 1.2,
    depth: 1.2,
    height: 2.2,
    color: 0xa0522d,
    isCatAccessible: true,
    topHeight: 2.2,
  },
  'cat-tree-small': {
    type: 'cat-tree-small',
    name: '小型猫爬架',
    category: 'cat-facility',
    width: 0.7,
    depth: 0.7,
    height: 1.4,
    color: 0xb5651d,
    isCatAccessible: true,
    topHeight: 1.4,
  },
  'cat-scratcher': {
    type: 'cat-scratcher',
    name: '猫抓柱',
    category: 'cat-facility',
    width: 0.35,
    depth: 0.35,
    height: 0.9,
    color: 0xc9a46c,
    isCatAccessible: true,
    topHeight: 0.9,
  },
  'sisal-post': {
    type: 'sisal-post',
    name: '剑麻柱',
    category: 'cat-facility',
    width: 0.3,
    depth: 0.3,
    height: 1.0,
    color: 0xd2b48c,
    isCatAccessible: true,
    topHeight: 1.0,
  },
  'litter-box': {
    type: 'litter-box',
    name: '自动猫砂盆',
    category: 'cat-facility',
    width: 0.8,
    depth: 1.0,
    height: 0.7,
    color: 0xe0e0e0,
    needsVentilation: true,
  },
  'dog-bed': {
    type: 'dog-bed',
    name: '狗窝',
    category: 'dog-facility',
    width: 1.2,
    depth: 0.9,
    height: 0.35,
    color: 0x8b7355,
    needsVentilation: true,
  },
  'dog-bowl': {
    type: 'dog-bowl',
    name: '狗食盆组合',
    category: 'dog-facility',
    width: 0.6,
    depth: 0.35,
    height: 0.3,
    color: 0x4a90a4,
  },
};

export class PetFacilityLibrary {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  getDefinition(type: FurnitureType): FurnitureDefinition {
    return FURNITURE_DEFINITIONS[type];
  }

  private getMaterial(color: number, roughness = 0.7, metalness = 0.1): THREE.MeshStandardMaterial {
    const key = `${color}-${roughness}-${metalness}`;
    if (!this.materialCache.has(key)) {
      this.materialCache.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness, metalness })
      );
    }
    return this.materialCache.get(key)!;
  }

  createMesh(type: FurnitureType): THREE.Group {
    const def = FURNITURE_DEFINITIONS[type];
    const group = new THREE.Group();
    group.userData.type = type;

    switch (type) {
      case 'sofa':
        this.buildSofa(group, def);
        break;
      case 'bookshelf':
        this.buildBookshelf(group, def);
        break;
      case 'cabinet':
        this.buildCabinet(group, def);
        break;
      case 'table':
        this.buildTable(group, def);
        break;
      case 'tv-stand':
        this.buildTVStand(group, def);
        break;
      case 'cat-tree-large':
        this.buildLargeCatTree(group, def);
        break;
      case 'cat-tree-small':
        this.buildSmallCatTree(group, def);
        break;
      case 'cat-scratcher':
        this.buildCatScratcher(group, def);
        break;
      case 'sisal-post':
        this.buildSisalPost(group, def);
        break;
      case 'litter-box':
        this.buildLitterBox(group, def);
        break;
      case 'dog-bed':
        this.buildDogBed(group, def);
        break;
      case 'dog-bowl':
        this.buildDogBowl(group, def);
        break;
    }

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });

    return group;
  }

  private buildSofa(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const d = def.depth;
    const h = def.height;
    const leatherMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.45,
      metalness: 0.08,
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.4, d),
      leatherMat
    );
    base.position.y = h * 0.2;
    group.add(base);

    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, h * 0.15, d * 0.85),
      leatherMat
    );
    cushion.position.y = h * 0.4 + h * 0.075;
    group.add(cushion);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.5, d * 0.2),
      leatherMat
    );
    back.position.set(0, h * 0.4 + h * 0.25, -d * 0.4);
    group.add(back);

    const armL = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.1, h * 0.5, d),
      leatherMat
    );
    armL.position.set(-w * 0.45, h * 0.35, 0);
    group.add(armL);

    const armR = armL.clone();
    armR.position.x = w * 0.45;
    group.add(armR);

    const legMat = this.getMaterial(0x1a1a1a, 0.6, 0.3);
    const legPositions = [
      [-w * 0.42, 0.08, d * 0.35],
      [w * 0.42, 0.08, d * 0.35],
      [-w * 0.42, 0.08, -d * 0.35],
      [w * 0.42, 0.08, -d * 0.35],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8),
        legMat
      );
      leg.position.set(x, y, z);
      group.add(leg);
    });
  }

  private buildBookshelf(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const d = def.depth;
    const h = def.height;
    const woodMat = this.getMaterial(def.color, 0.75, 0.05);
    const shelfCount = 5;
    const shelfSpace = h / shelfCount;

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.03),
      woodMat
    );
    back.position.set(0, h / 2, -d / 2 + 0.015);
    group.add(back);

    const sideL = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, h, d),
      woodMat
    );
    sideL.position.set(-w / 2 + 0.02, h / 2, 0);
    group.add(sideL);

    const sideR = sideL.clone();
    sideR.position.x = w / 2 - 0.02;
    group.add(sideR);

    for (let i = 0; i <= shelfCount; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.08, 0.03, d),
        woodMat
      );
      shelf.position.y = i * shelfSpace + 0.015;
      group.add(shelf);
    }

    const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0x8e44ad, 0xf39c12, 0x16a085];
    for (let s = 0; s < shelfCount; s++) {
      const baseY = s * shelfSpace + 0.03;
      let xPos = -w / 2 + 0.08;
      while (xPos < w / 2 - 0.12) {
        const bw = 0.08 + Math.random() * 0.08;
        const bh = shelfSpace * 0.5 + Math.random() * shelfSpace * 0.35;
        const bd = d * 0.7;
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(bw, bh, bd),
          this.getMaterial(bookColors[Math.floor(Math.random() * bookColors.length)], 0.9)
        );
        book.position.set(xPos + bw / 2, baseY + bh / 2, 0);
        group.add(book);
        xPos += bw + 0.01;
      }
    }
  }

  private buildCabinet(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const d = def.depth;
    const h = def.height;
    const mat = this.getMaterial(def.color, 0.8, 0.1);
    const trimMat = this.getMaterial(0x8b8878, 0.6, 0.2);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat
    );
    body.position.y = h / 2;
    group.add(body);

    for (let i = 0; i < 2; i++) {
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(w / 2 - 0.04, h * 0.85, 0.02),
        mat
      );
      door.position.set(
        i === 0 ? -w / 4 : w / 4,
        h / 2,
        d / 2 + 0.01
      );
      group.add(door);

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.18, 0.015),
        trimMat
      );
      handle.position.set(
        i === 0 ? -w / 4 + w / 4 - 0.08 : w / 4 - w / 4 + 0.08,
        h / 2,
        d / 2 + 0.025
      );
      group.add(handle);
    }

    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.04, 0.04, d + 0.04),
      trimMat
    );
    topTrim.position.y = h + 0.02;
    group.add(topTrim);
  }

  private buildTable(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const d = def.depth;
    const h = def.height;
    const mat = this.getMaterial(def.color, 0.6, 0.1);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, d),
      mat
    );
    top.position.y = h - 0.04;
    group.add(top);

    const legPositions = [
      [-w / 2 + 0.08, h / 2 - 0.04, -d / 2 + 0.08],
      [w / 2 - 0.08, h / 2 - 0.04, -d / 2 + 0.08],
      [-w / 2 + 0.08, h / 2 - 0.04, d / 2 - 0.08],
      [w / 2 - 0.08, h / 2 - 0.04, d / 2 - 0.08],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, h - 0.08, 0.08),
        mat
      );
      leg.position.set(x, y, z);
      group.add(leg);
    });
  }

  private buildTVStand(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const d = def.depth;
    const h = def.height;
    const mat = this.getMaterial(def.color, 0.3, 0.4);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.05, d),
      mat
    );
    top.position.y = h;
    group.add(top);

    for (let i = 0; i < 3; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.1, 0.03, d - 0.08),
        mat
      );
      shelf.position.y = i * (h / 3) + 0.05;
      group.add(shelf);
    }

    const sideL = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, h, d),
      mat
    );
    sideL.position.set(-w / 2 + 0.02, h / 2, 0);
    group.add(sideL);

    const sideR = sideL.clone();
    sideR.position.x = w / 2 - 0.02;
    group.add(sideR);
  }

  private buildLargeCatTree(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const h = def.height;
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.95,
    });
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x6b8e23,
      roughness: 0.9,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(w / 2, w / 2, 0.15, 16),
      carpetMat
    );
    base.position.y = 0.075;
    group.add(base);

    const postHeights = [h * 0.35, h * 0.55, h * 0.8, h];
    const postPositions = [
      [-w * 0.25, -w * 0.25],
      [w * 0.25, -w * 0.15],
      [-w * 0.15, w * 0.25],
      [w * 0.15, w * 0.15],
    ];

    postHeights.forEach((ph, i) => {
      const [px, pz] = postPositions[i];
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, ph - 0.15, 12),
        carpetMat
      );
      post.position.set(px, 0.15 + (ph - 0.15) / 2, pz);
      group.add(post);

      if (i < 3) {
        const platform = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16),
          platformMat
        );
        platform.position.set(px, ph + 0.02, pz);
        group.add(platform);
      }
    });

    const topBed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.35, 0.18, 16),
      platformMat
    );
    topBed.position.set(0, h, 0);
    group.add(topBed);

    const toy = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      this.getMaterial(0xff6b6b, 0.6, 0.2)
    );
    toy.position.set(w * 0.3, h * 0.1, -w * 0.3);
    group.add(toy);
  }

  private buildSmallCatTree(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const h = def.height;
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0xa0826d,
      roughness: 0.95,
    });
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x789e49,
      roughness: 0.9,
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.12, w),
      carpetMat
    );
    base.position.y = 0.06;
    group.add(base);

    const post1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, h * 0.5, 12),
      carpetMat
    );
    post1.position.set(-w * 0.15, 0.12 + h * 0.25, -w * 0.15);
    group.add(post1);

    const platform1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.035, 16),
      platformMat
    );
    platform1.position.set(-w * 0.15, h * 0.5 + 0.12 + 0.0175, -w * 0.15);
    group.add(platform1);

    const post2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, h * 0.9, 12),
      carpetMat
    );
    post2.position.set(w * 0.2, 0.12 + h * 0.45, w * 0.15);
    group.add(post2);

    const platform2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.035, 16),
      platformMat
    );
    platform2.position.set(w * 0.2, 0.12 + h * 0.9 + 0.0175, w * 0.15);
    group.add(platform2);
  }

  private buildCatScratcher(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const h = def.height;
    const baseMat = this.getMaterial(0x654321, 0.8, 0.1);
    const ropeMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.98,
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.4, 0.06, w * 1.4),
      baseMat
    );
    base.position.y = 0.03;
    group.add(base);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(w / 2 - 0.02, w / 2 - 0.02, h, 16),
      ropeMat
    );
    post.position.y = 0.06 + h / 2;
    group.add(post);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      this.getMaterial(0xff6347, 0.6)
    );
    ball.position.set(w * 0.4, 0.2, w * 0.4);
    group.add(ball);
  }

  private buildSisalPost(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const h = def.height;
    const baseMat = this.getMaterial(0x8b4513, 0.8, 0.05);
    const sisalMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.99,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(w * 1.1, w * 1.2, 0.08, 16),
      baseMat
    );
    base.position.y = 0.04;
    group.add(base);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(w / 2, w / 2, h, 20),
      sisalMat
    );
    post.position.y = 0.08 + h / 2;
    group.add(post);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(w / 2 + 0.02, w / 2 + 0.02, 0.06, 16),
      baseMat
    );
    top.position.y = 0.08 + h + 0.03;
    group.add(top);
  }

  private buildLitterBox(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const d = def.depth;
    const h = def.height;
    const shellMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.4,
      metalness: 0.15,
    });
    const sensorMat = this.getMaterial(0x2196f3, 0.3, 0.5);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.3, d),
      shellMat
    );
    base.position.y = h * 0.15;
    group.add(base);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.95, h * 0.6, d * 0.95),
      shellMat
    );
    body.position.y = h * 0.3 + h * 0.3;
    group.add(body);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(w * 0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      shellMat
    );
    dome.position.y = h * 0.3 + h * 0.6;
    group.add(dome);

    const entry = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.015, 8, 24),
      this.getMaterial(0x333333, 0.5)
    );
    entry.rotation.y = Math.PI / 2;
    entry.position.set(0, h * 0.45, d * 0.48);
    group.add(entry);

    const display = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.2, 0.06, 0.01),
      sensorMat
    );
    display.position.set(0, h * 0.82, d * 0.44);
    group.add(display);
  }

  private buildDogBed(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const d = def.depth;
    const h = def.height;
    const fabricMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.92,
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0xd2b48c,
      roughness: 0.95,
    });

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.5, d),
      fabricMat
    );
    base.position.y = h * 0.25;
    group.add(base);

    const rimShape = new THREE.Shape();
    rimShape.moveTo(-w / 2, -d / 2);
    rimShape.lineTo(w / 2, -d / 2);
    rimShape.lineTo(w / 2, d / 2);
    rimShape.lineTo(-w / 2, d / 2);
    rimShape.lineTo(-w / 2, -d / 2);

    const hole = new THREE.Path();
    const inset = 0.15;
    hole.moveTo(-w / 2 + inset, -d / 2 + inset);
    hole.lineTo(w / 2 - inset, -d / 2 + inset);
    hole.lineTo(w / 2 - inset, d / 2 - inset);
    hole.lineTo(-w / 2 + inset, d / 2 - inset);
    hole.lineTo(-w / 2 + inset, -d / 2 + inset);
    rimShape.holes.push(hole);

    const rimExtrude = { depth: h * 0.5, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    const rim = new THREE.Mesh(
      new THREE.ExtrudeGeometry(rimShape, rimExtrude),
      fabricMat
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = h * 0.5;
    group.add(rim);

    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(w - inset * 2 - 0.02, h * 0.15, d - inset * 2 - 0.02),
      cushionMat
    );
    cushion.position.y = h * 0.5 + h * 0.075;
    group.add(cushion);
  }

  private buildDogBowl(group: THREE.Group, def: FurnitureDefinition): void {
    const w = def.width;
    const d = def.depth;
    const h = def.height;
    const standMat = this.getMaterial(0x5c4033, 0.75, 0.1);
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      roughness: 0.25,
      metalness: 0.85,
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x5dade2,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.75,
    });
    const foodMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
    });

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.05, d),
      standMat
    );
    stand.position.y = 0.025;
    group.add(stand);

    const legY = 0.025 + (h - 0.05) / 2;
    for (const lx of [-w / 2 + 0.08, w / 2 - 0.08]) {
      for (const lz of [-d / 2 + 0.06, d / 2 - 0.06]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, h - 0.05, 0.03),
          standMat
        );
        leg.position.set(lx, legY, lz);
        group.add(leg);
      }
    }

    const positions = [
      { x: -w / 4, mat: foodMat, filled: true },
      { x: w / 4, mat: waterMat, filled: true },
    ];

    positions.forEach(({ x, mat, filled }) => {
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.11, 0.12, 24),
        metalMat
      );
      bowl.position.set(x, h - 0.01, 0);
      group.add(bowl);

      if (filled) {
        const content = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.1, 0.08, 24),
          mat
        );
        content.position.set(x, h - 0.03, 0);
        group.add(content);
      }
    });
  }
}
