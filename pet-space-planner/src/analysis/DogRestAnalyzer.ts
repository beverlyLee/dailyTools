import * as THREE from 'three';
import { PlacedFurniture, AlertItem, DogSize } from '../types';
import { SceneManager } from '../core/SceneManager';

export class DogRestAnalyzer {
  private sceneManager: SceneManager;
  private visualObjects: THREE.Object3D[] = [];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  analyze(furniture: PlacedFurniture[], dogSize: DogSize): AlertItem[] {
    this.clearVisualizations();

    const alerts: AlertItem[] = [];
    const dogBeds = furniture.filter((f) => f.type === 'dog-bed');
    const dogBowls = furniture.filter((f) => f.type === 'dog-bowl');
    const room = this.sceneManager.getRoom();

    if (dogBeds.length === 0 && dogBowls.length === 0) {
      alerts.push({
        level: 'info',
        title: '🐕 未放置狗狗设施',
        message: `当前体型：${this.getDogSizeLabel(dogSize)}。建议在客厅或走廊的安静角落放置狗窝，避开主要通道和厨房入口。`,
      });
      this.drawRecommendationHeatmap(furniture, dogSize);
      return alerts;
    }

    const dogSizeDim = this.getDogDimensions(dogSize);

    dogBeds.forEach((bed) => {
      const pos = bed.position;
      const zone = this.sceneManager.getZoneAt(pos.x, pos.z);
      const walkwayDist = this.minWalkwayDistance(pos.x, pos.z);
      const wallDist = this.minWallDistance(pos.x, pos.z);
      const ventilationScore = this.ventilationScore(pos.x, pos.z, room);
      const nearFood = this.nearestFurnitureDistance(bed, dogBowls);

      let issues: string[] = [];
      let warnings: string[] = [];
      let goodPoints: string[] = [];

      if (zone) {
        if (zone.type === 'living') {
          goodPoints.push(`位于${zone.name}，家庭活动中心，利于狗狗融入`);
        } else if (zone.type === 'hallway' || zone.type === 'entry') {
          warnings.push(`位于${zone.name}，通行较多可能打扰休息`);
        } else if (zone.type === 'dining') {
          issues.push(`位于${zone.name}（餐厅），食物刺激会影响狗狗睡眠`);
        } else if (zone.type === 'kitchen') {
          issues.push(`位于${zone.name}（厨房），温度高、噪音大、不安全`);
        }
      }

      if (walkwayDist < 0.8) {
        issues.push(`距离最近通道仅 ${walkwayDist.toFixed(2)}m，低于 ${dogSizeDim.walkwaySafe.toFixed(1)}m 安全距离，会被频繁踩踏`);
      } else if (walkwayDist < 1.5) {
        warnings.push(`距离通道 ${walkwayDist.toFixed(2)}m，略近，建议 ≥ ${dogSizeDim.walkwaySafe.toFixed(1)}m`);
      } else {
        goodPoints.push(`远离通道（${walkwayDist.toFixed(1)}m），环境安静`);
      }

      if (wallDist < 0.5) {
        goodPoints.push(`靠墙放置（${wallDist.toFixed(1)}m），有边界安全感`);
      } else if (wallDist > 3.0) {
        warnings.push(`距墙 ${wallDist.toFixed(1)}m，狗狗更偏好靠墙或角落位置以获得安全感`);
      }

      if (ventilationScore >= 0.6) {
        goodPoints.push(`通风条件良好`);
      } else if (ventilationScore < 0.3) {
        issues.push(`通风条件差，长期潮湿易引发皮肤病`);
      }

      if (nearFood !== null) {
        if (nearFood < 0.8) {
          issues.push(`距食盆仅 ${nearFood.toFixed(2)}m，进食区与休息区太近（建议 ≥ 1.5m）`);
        } else if (nearFood >= 1.5 && nearFood <= 4.0) {
          goodPoints.push(`距食盆 ${nearFood.toFixed(1)}m，距离合理`);
        }
      }

      const requiredSpace = dogSizeDim.bedSpace + dogSizeDim.surroundingSpace;
      const actualSpace = this.availableSpaceAround(bed, furniture);
      if (actualSpace < requiredSpace) {
        issues.push(`周围活动空间不足（实际 ${actualSpace.toFixed(1)}m²，建议 ≥ ${requiredSpace.toFixed(1)}m²），${dogSize}型犬需要充足转身空间`);
      } else {
        goodPoints.push(`活动空间充足（${actualSpace.toFixed(1)}m²）`);
      }

      if (issues.length > 0) {
        alerts.push({
          level: 'error',
          title: `🐕 狗窝位置不佳（${zone?.name ?? '未知区域'}）`,
          message: issues.join('；') + (warnings.length > 0 ? '。⚠️ ' + warnings.join('；') : '') + (goodPoints.length > 0 ? '。✅ ' + goodPoints.join('；') : ''),
        });
      } else if (warnings.length > 0) {
        alerts.push({
          level: 'warning',
          title: `🐕 狗窝位置需优化（${zone?.name ?? '未知区域'}）`,
          message: warnings.join('；') + (goodPoints.length > 0 ? '。✅ ' + goodPoints.join('；') : ''),
        });
      } else {
        alerts.push({
          level: 'success',
          title: `🐕 狗窝位置理想（${zone?.name ?? '未知区域'}）`,
          message: goodPoints.join('；'),
        });
      }

      this.drawDogBedMarker(bed, issues.length > 0 ? 0xef5350 : warnings.length > 0 ? 0xff9800 : 0x66bb6a);
    });

    dogBowls.forEach((bowl) => {
      const pos = bowl.position;
      const zone = this.sceneManager.getZoneAt(pos.x, pos.z);
      if (zone) {
        if (zone.type === 'kitchen' || zone.type === 'dining') {
          alerts.push({
            level: 'success',
            title: `🐕 食盆位置合理（${zone.name}）`,
            message: `食盆位于${zone.name}，靠近水源便于清洗。建议下方铺设防滑垫。`,
          });
        } else if (zone.type === 'living') {
          alerts.push({
            level: 'warning',
            title: `🐕 食盆位置建议（${zone.name}）`,
            message: `食盆位于${zone.name}（客厅），饮水易溅落。建议移至厨房或餐厅区域。`,
          });
        } else {
          alerts.push({
            level: 'info',
            title: `🐕 食盆位置（${zone.name}）`,
            message: `食盆位于${zone.name}，请确保周围地面易清洁。`,
          });
        }
      }
      this.drawDogBedMarker(bowl, 0x5dade2);
    });

    if (dogBeds.length > 0) {
      alerts.push({
        level: 'info',
        title: '💡 狗窝优化建议',
        message: `体型：${this.getDogSizeLabel(dogSize)}，建议窝尺寸 ≥ ${dogSizeDim.bedW.toFixed(1)}×${dogSizeDim.bedD.toFixed(1)}m，通道安全距 ≥ ${dogSizeDim.walkwaySafe.toFixed(1)}m。最佳位置：客厅靠墙角落，远离厨房噪音与餐厅食物刺激。`,
      });
    }

    return alerts;
  }

  private drawRecommendationHeatmap(furniture: PlacedFurniture[], dogSize: DogSize): void {
    const room = this.sceneManager.getRoom();
    const step = 0.5;
    const dims = this.getDogDimensions(dogSize);

    const candidates: { x: number; z: number; score: number }[] = [];

    for (let x = -room.width / 2 + 1; x < room.width / 2 - 1; x += step) {
      for (let z = -room.depth / 2 + 1; z < room.depth / 2 - 1; z += step) {
        const zone = this.sceneManager.getZoneAt(x, z);
        if (!zone) continue;
        if (zone.type === 'kitchen') continue;

        const collides = furniture.some((f) => this.pointNearFurniture(x, z, f, 0.3));
        if (collides) continue;

        const walkwayDist = this.minWalkwayDistance(x, z);
        if (walkwayDist < dims.walkwaySafe) continue;

        const wallDist = this.minWallDistance(x, z);
        const ventilationScore = this.ventilationScore(x, z, room);

        let score = 0;
        if (zone.type === 'living') score += 40;
        else if (zone.type === 'hallway') score += 20;
        else if (zone.type === 'dining') score -= 20;
        else if (zone.type === 'entry') score += 10;

        if (wallDist < 1.0) score += 25;
        else if (wallDist < 2.0) score += 15;

        score += ventilationScore * 20;
        score += Math.min(walkwayDist, 3) * 8;

        if (x < -room.width / 3 || x > room.width / 3) score += 10;
        if (z < -room.depth / 3 || z > room.depth / 3) score += 10;

        if (score > 30) {
          candidates.push({ x, z, score });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const topN = Math.min(5, candidates.length);

    for (let i = 0; i < topN; i++) {
      const c = candidates[i];
      const alpha = 0.8 - i * 0.12;
      const size = 0.5 - i * 0.05;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(size * 0.6, size, 32),
        new THREE.MeshBasicMaterial({
          color: 0x66bb6a,
          transparent: true,
          opacity: alpha,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(c.x, 0.02, c.z);
      this.sceneManager.addVisualization(ring);
      this.visualObjects.push(ring);

      const num = this.createTextSprite(`#${i + 1}`);
      num.position.set(c.x, 0.3, c.z);
      this.sceneManager.addVisualization(num);
      this.visualObjects.push(num);
    }
  }

  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(102,187,106,0.9)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 112, 48, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 34);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.6, 0.3, 1);
    return sprite;
  }

  private getDogDimensions(size: DogSize): {
    bedW: number;
    bedD: number;
    bedSpace: number;
    surroundingSpace: number;
    walkwaySafe: number;
  } {
    switch (size) {
      case 'small':
        return { bedW: 0.6, bedD: 0.5, bedSpace: 0.3, surroundingSpace: 0.5, walkwaySafe: 0.8 };
      case 'medium':
        return { bedW: 1.0, bedD: 0.8, bedSpace: 0.8, surroundingSpace: 1.2, walkwaySafe: 1.2 };
      case 'large':
        return { bedW: 1.4, bedD: 1.1, bedSpace: 1.5, surroundingSpace: 2.5, walkwaySafe: 1.5 };
    }
  }

  private getDogSizeLabel(size: DogSize): string {
    return { small: '小型犬（如柯基、泰迪）', medium: '中型犬（如柴犬、边牧）', large: '大型犬（如金毛、阿拉斯加）' }[size];
  }

  private minWalkwayDistance(x: number, z: number): number {
    const room = this.sceneManager.getRoom();
    let minDist = Infinity;

    room.walkways.forEach((w: { start: { x: number; y: number }; end: { x: number; y: number }; width: number }) => {
      const A = new THREE.Vector2(w.start.x, w.start.y);
      const B = new THREE.Vector2(w.end.x, w.end.y);
      const P = new THREE.Vector2(x, z);

      const AB = B.clone().sub(A);
      const lenSq = AB.lengthSq();
      let t = lenSq > 0 ? P.clone().sub(A).dot(AB) / lenSq : 0;
      t = Math.max(0, Math.min(1, t));
      const proj = A.clone().add(AB.multiplyScalar(t));
      const dist = P.distanceTo(proj) - w.width / 2;
      if (dist < minDist) minDist = dist;
    });

    return Math.max(0, minDist);
  }

  private minWallDistance(x: number, z: number): number {
    const room = this.sceneManager.getRoom();
    const hx = room.width / 2;
    const hz = room.depth / 2;
    return Math.min(hx - Math.abs(x), hz - Math.abs(z));
  }

  private ventilationScore(x: number, z: number, room: { width: number; depth: number }): number {
    const hx = room.width / 2;
    const hz = room.depth / 2;
    const cornerDist = Math.min(
      Math.hypot(x + hx, z + hz),
      Math.hypot(x - hx, z + hz),
      Math.hypot(x + hx, z - hz),
      Math.hypot(x - hx, z - hz)
    );
    const centerDist = Math.hypot(x, z);
    return Math.min(1, (centerDist * 0.08 + (1 - Math.min(cornerDist, 5) / 5) * 0.5));
  }

  private nearestFurnitureDistance(target: PlacedFurniture, others: PlacedFurniture[]): number | null {
    let minDist: number | null = null;
    others.forEach((o) => {
      if (o.id === target.id) return;
      const dx = o.position.x - target.position.x;
      const dz = o.position.z - target.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (minDist === null || d < minDist) minDist = d;
    });
    return minDist;
  }

  private availableSpaceAround(target: PlacedFurniture, all: PlacedFurniture[]): number {
    let occupied = 0;
    const r = 1.8;
    all.forEach((f) => {
      if (f.id === target.id) return;
      const dx = f.position.x - target.position.x;
      const dz = f.position.z - target.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < r) {
        occupied += Math.PI * Math.min(f.definition.width, f.definition.depth) / 2;
      }
    });
    return Math.max(0.5, Math.PI * r * r - occupied);
  }

  private pointNearFurniture(x: number, z: number, f: PlacedFurniture, margin: number): boolean {
    const w = f.definition.width / 2 + margin;
    const d = f.definition.depth / 2 + margin;
    const cos = Math.cos(f.rotation);
    const sin = Math.sin(f.rotation);
    const lx = (x - f.position.x) * cos + (z - f.position.z) * sin;
    const lz = -(x - f.position.x) * sin + (z - f.position.z) * cos;
    return Math.abs(lx) < w && Math.abs(lz) < d;
  }

  private drawDogBedMarker(f: PlacedFurniture, color: number): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        Math.max(f.definition.width, f.definition.depth) * 0.55,
        Math.max(f.definition.width, f.definition.depth) * 0.7,
        32
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(f.position.x, 0.015, f.position.z);
    this.sceneManager.addVisualization(ring);
    this.visualObjects.push(ring);
  }

  clearVisualizations(): void {
    this.visualObjects.forEach((o) => this.sceneManager.removeVisualization(o));
    this.visualObjects = [];
  }
}
