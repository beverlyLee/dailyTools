import * as THREE from 'three';
import { PlacedFurniture, AlertItem, CatPerchPoint } from '../types';
import { SceneManager } from '../core/SceneManager';
import { PathDrawingUtils, PATH_COLORS, PATH_STYLES } from '../utils/PathDrawingUtils';

const DISPLAY_NAME_MAP: Record<string, string> = {
  '沙发': '沙发',
  '书架': '书架',
  '储物柜': '柜子',
  '餐桌': '餐桌',
  '电视柜': '电视柜',
  '大型猫爬架': '大猫架',
  '小型猫爬架': '小猫架',
  '猫抓柱': '猫抓柱',
  '剑麻柱': '剑麻柱',
  '自动猫砂盆': '猫砂盆',
  '狗窝': '狗窝',
  '狗碗': '狗碗',
};

function getDisplayName(source: string): string {
  const baseMatch = source.match(/^(.+?)\(/);
  const layerMatch = source.match(/第(\d+)层/);
  const rawBase = baseMatch ? baseMatch[1] : source;
  const shortBase = DISPLAY_NAME_MAP[rawBase] || rawBase.substring(0, 3);
  const layer = layerMatch ? `(${layerMatch[1]}层)` : '';
  return shortBase + layer;
}

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
        message: `仅检测到 1 个登高落脚点（${getDisplayName(perches[0].source)}），猫咪无法形成连续的活动路径。建议在相邻位置增设登高设施。`,
      });
      this.drawPerchPoint(perches[0], PATH_COLORS.CAT_PATH);
      return alerts;
    }

    const groups = this.findDisconnectedGroups(perches);
    const sortedGroups = groups.sort((a, b) => b.length - a.length);

    const groupColors = this.generateGroupColors(sortedGroups.length);

    sortedGroups.forEach((group, groupIdx) => {
      alerts.push(this.generateGroupAlert(group, groupIdx));
    });

    if (sortedGroups.length > 1) {
      alerts.push(...this.generateGapAlerts(sortedGroups));
    }

    alerts.push(this.generateSummaryAlert(sortedGroups));

    sortedGroups.forEach((group, groupIdx) => {
      this.drawGroupPath(group, groupColors[groupIdx], groupIdx + 1);
    });

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

  private generateGroupColors(count: number): number[] {
    const colors: number[] = [];
    const hueStep = 0.27;
    for (let i = 0; i < count; i++) {
      const hue = (i * hueStep + 0.95) % 1;
      colors.push(new THREE.Color().setHSL(hue, 0.82, 0.58).getHex());
    }
    return colors;
  }

  private generateGroupAlert(group: CatPerchPoint[], groupIdx: number): AlertItem {
    const uniqueDisplayNames = this.getUniqueDisplayNames(group);
    const fullNames = this.getUniqueFullNames(group);
    const heights = group.map(p => p.height);
    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    const avgH = heights.reduce((s, h) => s + h, 0) / heights.length;

    return {
      level: group.length >= 3 ? 'success' : 'info',
      title: `🐱 Group ${groupIdx + 1}｜${group.length}个落脚点｜${uniqueDisplayNames.join('+')}`,
      message: `共 ${group.length} 个落脚点，涉及 ${fullNames.length} 件家具（${fullNames.join('、')}）。高度范围 ${minH.toFixed(1)}m ~ ${maxH.toFixed(1)}m，平均高度 ${avgH.toFixed(1)}m。${group.length >= 3 ? '组内路径连续，猫咪可自由穿梭。' : '组内落脚点较少，建议增加同高度级别的设施。'}`,
    };
  }

  private generateGapAlerts(groups: CatPerchPoint[][]): AlertItem[] {
    const alerts: AlertItem[] = [];

    for (let i = 0; i < groups.length - 1; i++) {
      const minGap = this.minDistanceBetweenGroups(groups[i], groups[i + 1]);
      const nearestA = minGap.pointA;
      const nearestB = minGap.pointB;

      alerts.push({
        level: 'warning',
        title: `🔗 断裂点 G${i + 1}↔G${i + 2}｜${getDisplayName(nearestA.source)} → ${getDisplayName(nearestB.source)}`,
        message: `两最近落脚点间距 ${minGap.distance.toFixed(1)}m，远超猫咪舒适跳跃范围 1.2m（超出 ${(minGap.distance - 1.2).toFixed(1)}m）。高度差 ${Math.abs(nearestA.height - nearestB.height).toFixed(1)}m。建议在两者之间增设衔接猫爬架或跳板（间距 ≤ 1.2m）。`,
      });
    }

    return alerts;
  }

  private minDistanceBetweenGroups(groupA: CatPerchPoint[], groupB: CatPerchPoint[]): {
    distance: number;
    pointA: CatPerchPoint;
    pointB: CatPerchPoint;
  } {
    let minDist = Infinity;
    let bestA = groupA[0];
    let bestB = groupB[0];

    for (const a of groupA) {
      for (const b of groupB) {
        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) {
          minDist = dist;
          bestA = a;
          bestB = b;
        }
      }
    }

    return { distance: minDist, pointA: bestA, pointB: bestB };
  }

  private generateSummaryAlert(groups: CatPerchPoint[][]): AlertItem {
    const allPerches = groups.flat();
    const totalPerches = allPerches.length;
    const numGroups = groups.length;
    const heights = allPerches.map(p => p.height);
    const maxH = Math.max(...heights);
    const avgH = heights.reduce((s, h) => s + h, 0) / heights.length;

    const largestGroup = groups.reduce((a, b) => a.length >= b.length ? a : b);
    const largestDisplayNames = this.getUniqueDisplayNames(largestGroup);

    if (numGroups === 1) {
      return {
        level: 'success',
        title: '📊 猫咪动线总览｜路径完全连续',
        message: `全场共 ${totalPerches} 个落脚点，${this.getUniqueFullNames(largestGroup).length} 件家具全部连通。最高 ${maxH.toFixed(1)}m，平均 ${avgH.toFixed(1)}m。猫咪可在所有高处自由穿梭，空间利用充分。`,
      };
    }

    return {
      level: 'warning',
      title: `📊 猫咪动线总览｜${numGroups}组路径·${totalPerches}个落脚点`,
      message: `检测到 ${numGroups} 组独立登高路径（共 ${totalPerches} 个落脚点）。最大组含 ${largestGroup.length} 个落脚点（${largestDisplayNames.join('+')}）。全场最高 ${maxH.toFixed(1)}m，平均高度 ${avgH.toFixed(1)}m。各组间存在跳跃断裂，建议通过跳板/矮柜连接。`,
    };
  }

  private getUniqueDisplayNames(group: CatPerchPoint[]): string[] {
    const names = new Set<string>();
    group.forEach(p => {
      const baseMatch = p.source.match(/^(.+?)\(/);
      const rawBase = baseMatch ? baseMatch[1] : p.source;
      names.add(DISPLAY_NAME_MAP[rawBase] || rawBase.substring(0, 3));
    });
    return Array.from(names);
  }

  private getUniqueFullNames(group: CatPerchPoint[]): string[] {
    const names = new Set<string>();
    group.forEach(p => {
      const baseMatch = p.source.match(/^(.+?)\(/);
      const rawBase = baseMatch ? baseMatch[1] : p.source;
      names.add(rawBase);
    });
    return Array.from(names);
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

  private drawGroupPath(group: CatPerchPoint[], color: number, groupNumber: number): void {
    const style = PATH_STYLES.CAT_PATH;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (this.canReach(group[i], group[j])) {
          const pts = [group[i].position.clone(), group[j].position.clone()];
          const tube = PathDrawingUtils.createTubePath(pts, color, style.tubeRadius * 0.8, true);
          this.sceneManager.addVisualization(tube);
          this.visualObjects.push(tube);

          const line = PathDrawingUtils.createDashedLine(pts, color, style.dashSize * 0.8, style.gapSize * 0.8, 0.7);
          this.sceneManager.addVisualization(line);
          this.visualObjects.push(line);

          const arrows = PathDrawingUtils.createPathArrows(pts, color, style.arrowSpacing, style.arrowSize * 0.8);
          this.sceneManager.addVisualization(arrows);
          this.visualObjects.push(arrows);
        }
      }
    }

    const highestPoint = group.reduce((max, p) => p.height > max.height ? p : max, group[0]);
    const groupLabel = PathDrawingUtils.createPathLabel(
      new THREE.Vector3(highestPoint.position.x, highestPoint.position.y + 0.7, highestPoint.position.z),
      `🐱 G${groupNumber} ${group.length}点`,
      color
    );
    groupLabel.scale.set(2.4, 0.85, 1);
    this.sceneManager.addVisualization(groupLabel);
    this.visualObjects.push(groupLabel);

    group.forEach((p) => this.drawPerchPoint(p, color));
  }

  private drawPerchPoint(p: CatPerchPoint, color: number): void {
    const marker = PathDrawingUtils.createNodeMarker(p.position, color, 0.1);
    this.sceneManager.addVisualization(marker);
    this.visualObjects.push(marker);

    const heightLabel = PathDrawingUtils.createPathLabel(
      new THREE.Vector3(p.position.x, p.position.y + 0.25, p.position.z),
      `${getDisplayName(p.source)} ${p.height.toFixed(1)}m`,
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
