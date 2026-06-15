import * as THREE from 'three';
import { PlacedFurniture, AlertItem } from '../types';
import { SceneManager } from '../core/SceneManager';
import { PathDrawingUtils, PATH_COLORS, PATH_STYLES } from '../utils/PathDrawingUtils';

export class WalkwayAnalyzer {
  private sceneManager: SceneManager;
  private visualObjects: THREE.Object3D[] = [];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  analyze(furniture: PlacedFurniture[]): AlertItem[] {
    this.clearVisualizations();

    const alerts: AlertItem[] = [];
    const room = this.sceneManager.getRoom();

    if (furniture.length === 0) {
      alerts.push({
        level: 'info',
        title: '🚶 场景为空',
        message: `户型主通道 2 条（东西向/南北向，各宽 ${room.walkways[0].width}m/${room.walkways[1].width}m）。开始放置家具后系统将自动检测是否阻碍通行。`,
      });
      return alerts;
    }

    let mainWalkwayObstructed = 0;
    let minorObstructed = 0;

    room.walkways.forEach((walkway: { start: THREE.Vector2; end: THREE.Vector2; width: number; isMain: boolean; name: string }) => {
      const obstructingItems: { furniture: PlacedFurniture; overlapRatio: number; overlapArea: number }[] = [];

      furniture.forEach((f) => {
        const overlap = this.computeWalkwayOverlap(f, walkway);
        if (overlap.ratio > 0.05) {
          obstructingItems.push({ furniture: f, overlapRatio: overlap.ratio, overlapArea: overlap.area });
          if (overlap.ratio > 0.3) {
            if (walkway.isMain) mainWalkwayObstructed++;
            else minorObstructed++;
          }
        }
      });

      obstructingItems
        .sort((a, b) => b.overlapRatio - a.overlapRatio)
        .forEach(({ furniture: f, overlapRatio }) => {
          this.drawObstructionHighlight(f, walkway, overlapRatio);

          const zone = this.sceneManager.getZoneAt(f.position.x, f.position.z);
          const severity =
            overlapRatio > 0.7 ? 'error' : overlapRatio > 0.4 ? 'error' : overlapRatio > 0.2 ? 'warning' : 'warning';
          const suggest = this.getPlacementSuggestion(f, walkway, overlapRatio);

          const isCatTreeInCenter =
            f.type === 'cat-tree-large' &&
            walkway.isMain &&
            overlapRatio > 0.3 &&
            Math.abs(f.position.x) < 3 &&
            Math.abs(f.position.z) < 3;

          if (severity === 'error' || (severity === 'warning' && walkway.isMain)) {
            alerts.push({
              level: severity === 'error' ? 'error' : 'warning',
              title: isCatTreeInCenter
                ? '🚫 阻碍了主要通行路径，建议靠墙放置'
                : walkway.isMain
                ? `🚫 ${f.definition.name}阻挡主通道「${walkway.name}」`
                : `⚠️ ${f.definition.name}侵入通道「${walkway.name}」`,
              message: isCatTreeInCenter
                ? `大型猫爬架放置在客厅中央，覆盖通道 ${(overlapRatio * 100).toFixed(0)}% 宽度（${walkway.width}m），严重阻碍人与宠物双向通行。建议移至墙边（靠墙距离 ≤ 0.5m），靠窗或沙发旁更利于猫咪观察环境。`
                : `位置${zone ? '（' + zone.name + '）' : ''}侵入通道 ${(overlapRatio * 100).toFixed(0)}%，通道净宽从 ${walkway.width.toFixed(1)}m 缩减至 ${(walkway.width * (1 - overlapRatio)).toFixed(2)}m。${suggest}`,
            });
          }
        });
    });

    const totalBlockageCount = alerts.filter((a) => a.level === 'error').length;
    if (totalBlockageCount === 0 && furniture.length >= 2) {
      alerts.push({
        level: 'success',
        title: '✅ 通行顺畅',
        message: `${furniture.length} 件家具均未侵入 ${room.walkways.length} 条主/次通道。主通道保持净宽 ≥ ${room.walkways[0].width.toFixed(1)}m，满足人体工程学与轮椅/婴儿车通行标准。`,
      });
    }

    this.checkFireExit(furniture, alerts);
    this.checkFurnitureDensity(furniture, alerts);
    this.checkSofaClearance(furniture, alerts);

    if (mainWalkwayObstructed > 0) {
      alerts.push({
        level: 'warning',
        title: '💡 通行优化建议',
        message: `当前有 ${mainWalkwayObstructed} 处主通道障碍。通行原则：① 主通道净宽 ≥ 1.2m；② 大件家具（猫爬架/沙发/餐桌）长边平行于通道靠墙放置；③ 转角预留 ≥ 1.5m 回转空间；④ 消防疏散方向（玄关→厨房→出口）保持畅通。`,
      });
    }

    this.drawWalkwayPaths();

    return alerts;
  }

  private getPlacementSuggestion(
    f: PlacedFurniture,
    walkway: { start: THREE.Vector2; end: THREE.Vector2; width: number; isMain: boolean; name: string },
    overlap: number
  ): string {
    const room = this.sceneManager.getRoom();
    const hx = room.width / 2;
    const hz = room.depth / 2;

    const wallDist = Math.min(hx - Math.abs(f.position.x), hz - Math.abs(f.position.z));
    const needWall = 0.5 - Math.min(0.5, wallDist);

    if (f.type === 'cat-tree-large' || f.type === 'cat-tree-small') {
      const nearWall =
        Math.abs(f.position.x) > hx - 1.5 || Math.abs(f.position.z) > hz - 1.5;
      if (!nearWall) {
        return '建议：将猫爬架移至距墙 ≤ 0.5m 处，既不挡路又方便猫咪上下眺望（柜顶/书架顶连线更佳）。';
      }
      return `建议：向最近墙壁方向平移 ${needWall.toFixed(1)}m，使通道完全释放。`;
    }

    if (f.type === 'sofa') {
      return '建议：沙发靠墙或落地窗放置，背面留出 0.8m 通行空间即可，无需占用主通道。';
    }

    if (f.type === 'table') {
      return '建议：餐桌向餐厅区域内侧平移，四周各留 ≥ 0.75m 拉出餐椅的空间。';
    }

    if (f.type === 'dog-bed') {
      return '建议：狗窝移至客厅/走廊边角非通行区，利用墙角形成三面防护的安全感。';
    }

    void overlap; void walkway;
    return '建议：平移至通道外 0.3m 以上区域，或旋转方向减少侵入宽度。';
  }

  private computeWalkwayOverlap(
    f: PlacedFurniture,
    walkway: { start: THREE.Vector2; end: THREE.Vector2; width: number }
  ): { ratio: number; area: number } {
    const A = walkway.start;
    const B = walkway.end;
    const C = new THREE.Vector2(f.position.x, f.position.z);

    const AB = B.clone().sub(A);
    const len = AB.length();
    if (len < 1e-6) return { ratio: 0, area: 0 };
    const dir = AB.clone().normalize();
    const perp = new THREE.Vector2(-dir.y, dir.x);

    const AC = C.clone().sub(A);
    const tProj = AC.dot(dir);
    const t = Math.max(0, Math.min(len, tProj));
    const proj = A.clone().add(dir.multiplyScalar(t));

    const perpDist = Math.abs(AC.dot(perp));
    const halfW = walkway.width / 2;

    const hw = f.definition.width / 2;
    const hd = f.definition.depth / 2;
    const cos = Math.cos(f.rotation);
    const sin = Math.sin(f.rotation);

    const corners = [
      [-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd],
    ].map(([lx, lz]) => ({
      x: f.position.x + lx * cos - lz * sin,
      z: f.position.z + lx * sin + lz * cos,
    }));

    let minDist = Infinity;
    let insideCorners = 0;
    corners.forEach((c) => {
      const cv = new THREE.Vector2(c.x, c.z);
      const cvA = cv.clone().sub(A);
      const t2 = Math.max(0, Math.min(len, cvA.dot(dir.clone().normalize())));
      const cp = A.clone().add(dir.clone().normalize().multiplyScalar(t2));
      const d = cv.distanceTo(cp);
      if (d < minDist) minDist = d;
      if (d <= halfW) insideCorners++;
    });

    const centerInside = perpDist <= halfW && tProj >= -Math.max(hw, hd) && tProj <= len + Math.max(hw, hd);

    if (insideCorners === 0 && !centerInside) {
      return { ratio: 0, area: 0 };
    }

    const effectiveW =
      Math.max(f.definition.width, f.definition.depth) * 0.7 +
      Math.min(f.definition.width, f.definition.depth) * 0.3;
    const overlapHalf = Math.max(0, halfW + effectiveW / 2 - perpDist - 0.1);
    const ratio = Math.max(0, Math.min(1, (overlapHalf * 2) / walkway.width));
    const area = ratio * walkway.width * effectiveW * 0.5;

    void proj;
    return { ratio, area };
  }

  private drawObstructionHighlight(
    f: PlacedFurniture,
    _walkway: { start: THREE.Vector2; end: THREE.Vector2; width: number; isMain: boolean; name: string },
    ratio: number
  ): void {
    const color = ratio > 0.5 ? 0xef5350 : ratio > 0.25 ? 0xff9800 : 0xffc107;
    const size = Math.max(f.definition.width, f.definition.depth) * 0.55;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.9, size * 1.05, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(f.position.x, 0.03, f.position.z);
    this.sceneManager.addVisualization(ring);
    this.visualObjects.push(ring);

    const bars = 6;
    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2;
      const ex = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.18, 0.04),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
      );
      ex.position.set(
        f.position.x + Math.cos(angle) * size * 0.97,
        0.1,
        f.position.z + Math.sin(angle) * size * 0.97
      );
      this.sceneManager.addVisualization(ex);
      this.visualObjects.push(ex);
    }
  }

  private checkFireExit(furniture: PlacedFurniture[], alerts: AlertItem[]): void {
    const room = this.sceneManager.getRoom();
    const entry = room.zones.find((z: { type: string }) => z.type === 'entry');
    if (!entry) return;

    const entryCx = (entry.minX + entry.maxX) / 2;
    const entryCz = (entry.minZ + entry.maxZ) / 2;

    furniture.forEach((f) => {
      const dx = f.position.x - entryCx;
      const dz = f.position.z - entryCz;
      const d = Math.hypot(dx, dz);
      if (d < 2.5 && f.definition.width > 0.8) {
        alerts.push({
          level: 'warning',
          title: `🚪 ${f.definition.name}接近玄关疏散口`,
          message: `距玄关中心仅 ${d.toFixed(1)}m，疏散半径内有体积较大物体。紧急情况下可能阻碍逃生，建议向内平移 ≥ 1.0m。`,
        });
      }
    });
  }

  private checkFurnitureDensity(furniture: PlacedFurniture[], alerts: AlertItem[]): void {
    const room = this.sceneManager.getRoom();
    const totalArea = room.width * room.depth;
    const furnArea = furniture.reduce(
      (s, f) => s + f.definition.width * f.definition.depth,
      0
    );
    const density = furnArea / totalArea;

    if (density > 0.4) {
      alerts.push({
        level: 'warning',
        title: `📦 家具密度较高（${(density * 100).toFixed(0)}%）`,
        message: `户型可用面积 ${totalArea.toFixed(0)}m²，家具占地 ${furnArea.toFixed(1)}m²，密度 ${(density * 100).toFixed(0)}%（建议 ≤ 35%）。人与宠物的活动空间紧张，请考虑精简或向外扩容。`,
      });
    }
  }

  private checkSofaClearance(furniture: PlacedFurniture[], alerts: AlertItem[]): void {
    const sofas = furniture.filter((f) => f.type === 'sofa');
    const tables = furniture.filter((f) => f.type === 'table');

    sofas.forEach((sofa) => {
      tables.forEach((t) => {
        const d = Math.hypot(sofa.position.x - t.position.x, sofa.position.z - t.position.z);
        if (d < 1.2 && d > 0.1) {
          alerts.push({
            level: 'warning',
            title: '🪑 沙发-餐桌间距偏窄',
            message: `间距 ${d.toFixed(2)}m，推拉椅子+人通过需要 ≥ 1.3m。宠物在两物之间穿梭易被夹伤，建议再拉开 0.2~0.3m。`,
          });
        }
      });
    });
  }

  private drawWalkwayPaths(): void {
    const room = this.sceneManager.getRoom();
    const style = PATH_STYLES.WALKWAY;
    const color = PATH_COLORS.WALKWAY;
    room.walkways.forEach((walkway: { start: THREE.Vector2; end: THREE.Vector2; width: number; isMain: boolean; name: string }) => {
      const startPt = new THREE.Vector3(walkway.start.x, 0.08, walkway.start.y);
      const endPt = new THREE.Vector3(walkway.end.x, 0.08, walkway.end.y);
      const pts = [startPt, endPt];

      const tube = PathDrawingUtils.createTubePath(pts, color, walkway.isMain ? style.tubeRadius * 1.2 : style.tubeRadius, false);
      this.sceneManager.addVisualization(tube);
      this.visualObjects.push(tube);

      const arrows = PathDrawingUtils.createPathArrows(pts, color, style.arrowSpacing, style.arrowSize);
      this.sceneManager.addVisualization(arrows);
      this.visualObjects.push(arrows);

      const midX = (walkway.start.x + walkway.end.x) / 2;
      const midZ = (walkway.start.y + walkway.end.y) / 2;
      const label = PathDrawingUtils.createPathLabel(
        new THREE.Vector3(midX, 0.8, midZ),
        `🚶 ${walkway.name}`,
        color
      );
      this.sceneManager.addVisualization(label);
      this.visualObjects.push(label);

      const startMarker = PathDrawingUtils.createNodeMarker(startPt, color, 0.12);
      this.sceneManager.addVisualization(startMarker);
      this.visualObjects.push(startMarker);

      const endMarker = PathDrawingUtils.createNodeMarker(endPt, color, 0.12);
      this.sceneManager.addVisualization(endMarker);
      this.visualObjects.push(endMarker);
    });
  }

  clearVisualizations(): void {
    this.visualObjects.forEach((o) => this.sceneManager.removeVisualization(o));
    this.visualObjects = [];
  }
}
