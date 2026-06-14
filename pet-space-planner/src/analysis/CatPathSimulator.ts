import * as THREE from 'three';
import { PlacedFurniture, AlertItem, CatPerchPoint, CatPath } from '../types';
import { SceneManager } from '../core/SceneManager';
import { PathDrawingUtils } from '../utils/PathDrawingUtils';

export class CatPathSimulator {
  private sceneManager: SceneManager;
  private visualObjects: THREE.Object3D[] = [];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  analyze(furniture: PlacedFurniture[]): AlertItem[] {
    this.clearVisualizations();

    const alerts: AlertItem[] = [];
    const perches = this.collectPerchPoints(furniture);

    if (perches.length === 0) {
      alerts.push({
        level: 'info',
        title: '🐱 无登高设施',
        message: '场景中暂无猫咪可登高的家具或猫爬架。猫咪天性喜爱高处，建议添加书架或猫爬架。',
      });
      return alerts;
    }

    if (perches.length === 1) {
      alerts.push({
        level: 'warning',
        title: '🐱 落脚点单一',
        message: `仅检测到 1 个登高落脚点（${perches[0].source}），猫咪无法形成连续的活动路径。建议在相邻位置增设登高设施。`,
      });
      this.drawPerchPoint(perches[0], 0xff9800);
      return alerts;
    }

    const path = this.computePath(perches);

    if (path.continuous) {
      alerts.push({
        level: 'success',
        title: '🐱 行动线连续',
        message: `检测到 ${path.points.length} 个连续落脚点！从 ${path.points[0].source} → ... → ${path.points[path.points.length - 1].source}，最大跳跃间距 ${path.maxJumpGap.toFixed(1)}m，符合猫咪跳跃能力（≤ 1.2m）。`,
      });
      this.drawPath(path, 0x66bb6a);
    } else {
      const disconnected = this.findDisconnectedGroups(perches);
      alerts.push({
        level: 'warning',
        title: '🐱 行动线不连续',
        message: `检测到 ${disconnected.length} 组独立的登高路径（共 ${perches.length} 个落脚点），其中最大跳跃间距 ${path.maxJumpGap.toFixed(1)}m 超过猫咪舒适跳跃范围（≤ 1.2m）。建议在高处设施之间增加衔接平台。`,
      });
      disconnected.forEach((group, i) => {
        const hue = (i * 0.3) % 1;
        const color = new THREE.Color().setHSL(hue, 0.7, 0.5).getHex();
        this.drawGroupPath(group, color);
      });
    }

    const totalHeight = perches.reduce((s, p) => s + p.height, 0) / perches.length;
    if (totalHeight < 1.0) {
      alerts.push({
        level: 'info',
        title: '🐱 登高高度不足',
        message: `平均落脚点高度仅 ${totalHeight.toFixed(2)}m。猫咪偏好 1.5m 以上的高处以获得安全感，建议增设更高的猫爬架或利用柜顶/书架顶。`,
      });
    }

    return alerts;
  }

  private collectPerchPoints(furniture: PlacedFurniture[]): CatPerchPoint[] {
    const perches: CatPerchPoint[] = [];

    furniture.forEach((f) => {
      if (!f.definition.isCatAccessible) return;
      const topH = f.definition.topHeight ?? f.definition.height;
      if (topH < 0.3) return;

      const pos = f.position;
      const w = f.definition.width;
      const d = f.definition.depth;
      const rotCos = Math.cos(f.rotation);
      const rotSin = Math.sin(f.rotation);

      const rotW = Math.abs(w * rotCos) + Math.abs(d * rotSin);
      const rotD = Math.abs(w * rotSin) + Math.abs(d * rotCos);

      perches.push({
        position: new THREE.Vector3(pos.x, topH, pos.z),
        width: rotW,
        depth: rotD,
        height: topH,
        source: f.definition.name,
      });

      if (f.type === 'bookshelf' || f.type === 'cabinet') {
        const shelves = Math.floor(topH / 0.45);
        for (let i = 1; i < shelves; i++) {
          const sh = i * 0.45;
          if (sh < topH - 0.1) {
            perches.push({
              position: new THREE.Vector3(pos.x, sh, pos.z),
              width: rotW,
              depth: rotD,
              height: sh,
              source: `${f.definition.name}(第${i}层)`,
            });
          }
        }
      }

      if (f.type === 'cat-tree-large') {
        [0.7, 1.2, 1.7].forEach((h, i) => {
          if (h < topH - 0.1) {
            perches.push({
              position: new THREE.Vector3(
                pos.x + (i % 2 === 0 ? -0.25 : 0.25),
                h,
                pos.z + (i < 1 ? -0.25 : 0.25)
              ),
              width: 0.5,
              depth: 0.5,
              height: h,
              source: `大型猫爬架(第${i + 1}层平台)`,
            });
          }
        });
      }
    });

    perches.push({
      position: new THREE.Vector3(0, 0.05, 0),
      width: 20,
      depth: 12,
      height: 0.05,
      source: '地面',
    });

    perches.sort((a, b) => a.height - b.height);
    return perches;
  }

  private canReach(a: CatPerchPoint, b: CatPerchPoint): boolean {
    const dx = a.position.x - b.position.x;
    const dz = a.position.z - b.position.z;
    const horizontal = Math.sqrt(dx * dx + dz * dz);
    const vertical = Math.abs(a.height - b.height);

    const maxHorizontal = 1.4;
    const maxVertical = 1.3;

    if (horizontal > maxHorizontal) return false;
    if (vertical > maxVertical) return false;

    if (vertical > 1.0 && horizontal > 1.0) return false;
    return true;
  }

  private computePath(perches: CatPerchPoint[]): CatPath {
    const n = perches.length;
    const groundIdx = perches.findIndex((p) => p.source === '地面');

    const visited = new Set<number>([groundIdx]);
    const points: CatPerchPoint[] = [perches[groundIdx]];
    let maxGap = 0;

    while (visited.size < n) {
      let bestIdx = -1;
      let bestDist = Infinity;
      let bestGap = 0;

      for (const vi of visited) {
        for (let j = 0; j < n; j++) {
          if (visited.has(j)) continue;
          if (!this.canReach(perches[vi], perches[j])) continue;
          const dx = perches[vi].position.x - perches[j].position.x;
          const dz = perches[vi].position.z - perches[j].position.z;
          const dh = perches[vi].height - perches[j].height;
          const dist = Math.sqrt(dx * dx + dz * dz + dh * dh);
          const gap = Math.sqrt(dx * dx + dz * dz);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = j;
            bestGap = gap;
          }
        }
      }

      if (bestIdx < 0) break;
      visited.add(bestIdx);
      points.push(perches[bestIdx]);
      if (bestGap > maxGap) maxGap = bestGap;
    }

    return { points, continuous: visited.size === n, maxJumpGap: maxGap };
  }

  private findDisconnectedGroups(perches: CatPerchPoint[]): CatPerchPoint[][] {
    const n = perches.length;
    const parent = new Array(n).fill(0).map((_, i) => i);

    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };

    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.canReach(perches[i], perches[j])) {
          union(i, j);
        }
      }
    }

    const groups = new Map<number, CatPerchPoint[]>();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r)!.push(perches[i]);
    }

    return Array.from(groups.values());
  }

  private drawPath(path: CatPath, color: number): void {
    const pts = path.points.map((p) => p.position.clone());

    const tube = PathDrawingUtils.createTubePath(pts, color, 0.04, true);
    this.sceneManager.addVisualization(tube);
    this.visualObjects.push(tube);

    const line = PathDrawingUtils.createDashedLine(pts, color, 0.2, 0.12, 0.9);
    this.sceneManager.addVisualization(line);
    this.visualObjects.push(line);

    const arrows = PathDrawingUtils.createPathArrows(pts, color, 1.2);
    this.sceneManager.addVisualization(arrows);
    this.visualObjects.push(arrows);

    const label = PathDrawingUtils.createPathLabel(
      new THREE.Vector3(pts[0].x, Math.max(...pts.map(p => p.y)) + 0.6, pts[0].z),
      '🐱 猫行动线',
      color
    );
    this.sceneManager.addVisualization(label);
    this.visualObjects.push(label);

    path.points.forEach((p) => this.drawPerchPoint(p, color));
  }

  private drawGroupPath(group: CatPerchPoint[], color: number): void {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (this.canReach(group[i], group[j])) {
          const pts = [group[i].position.clone(), group[j].position.clone()];
          const tube = PathDrawingUtils.createTubePath(pts, color, 0.03, true);
          this.sceneManager.addVisualization(tube);
          this.visualObjects.push(tube);

          const line = PathDrawingUtils.createDashedLine(pts, color, 0.15, 0.1, 0.6);
          this.sceneManager.addVisualization(line);
          this.visualObjects.push(line);

          const arrows = PathDrawingUtils.createPathArrows(pts, color, 1.0);
          this.sceneManager.addVisualization(arrows);
          this.visualObjects.push(arrows);
        }
      }
    }
    group.forEach((p) => this.drawPerchPoint(p, color));
  }

  private drawPerchPoint(p: CatPerchPoint, color: number): void {
    const marker = PathDrawingUtils.createNodeMarker(p.position, color, 0.1);
    this.sceneManager.addVisualization(marker);
    this.visualObjects.push(marker);

    const heightLabel = PathDrawingUtils.createPathLabel(
      new THREE.Vector3(p.position.x, p.position.y + 0.25, p.position.z),
      `${p.source} ${p.height.toFixed(1)}m`,
      color
    );
    heightLabel.scale.set(1.2, 0.45, 1);
    this.sceneManager.addVisualization(heightLabel);
    this.visualObjects.push(heightLabel);
  }

  clearVisualizations(): void {
    this.visualObjects.forEach((o) => this.sceneManager.removeVisualization(o));
    this.visualObjects = [];
  }
}
