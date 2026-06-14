import * as THREE from 'three';
import { PlacedFurniture, AlertItem } from '../types';
import { SceneManager } from '../core/SceneManager';

export class FurnitureDamageDetector {
  private sceneManager: SceneManager;
  private visualObjects: THREE.Object3D[] = [];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  analyze(furniture: PlacedFurniture[]): AlertItem[] {
    this.clearVisualizations();

    const alerts: AlertItem[] = [];

    const valuableFurniture = furniture.filter((f) => f.definition.isValuable);
    const scratchTargets = furniture.filter(
      (f) => f.type === 'cat-scratcher' || f.type === 'sisal-post'
    );
    const catFacilities = furniture.filter((f) => f.definition.category === 'cat-facility');
    const leatherItems = furniture.filter((f) => f.definition.isLeather);

    if (valuableFurniture.length === 0) {
      if (scratchTargets.length > 0) {
        alerts.push({
          level: 'success',
          title: '✅ 无贵重家具风险',
          message: `场景中未检测到贵重家具（如真皮沙发），现有 ${scratchTargets.length} 个猫抓设施放置自由。`,
        });
      } else if (catFacilities.length > 0) {
        alerts.push({
          level: 'info',
          title: '💡 建议增加猫抓设施',
          message: '检测到猫咪设施但没有专门的猫抓柱/剑麻柱。即使无贵重家具，仍建议提供专用磨爪用品以引导行为。',
        });
      }
      return alerts;
    }

    if (scratchTargets.length === 0 && leatherItems.length > 0) {
      alerts.push({
        level: 'error',
        title: '⚠️ 严重：缺少猫抓设施',
        message: `检测到 ${leatherItems.length} 件真皮家具（${leatherItems.map((l) => l.definition.name).join('、')}），但没有任何猫抓柱或剑麻柱！猫咪磨爪需求无法满足时，90% 概率会抓挠真皮表面。请立即添加剑麻柱。`,
      });
      leatherItems.forEach((l) => this.drawDangerZone(l, 1.5, 0xef5350));
      return alerts;
    }

    valuableFurniture.forEach((vf) => {
      this.analyzeValuableItem(vf, furniture, scratchTargets, alerts);
    });

    const sisalCount = furniture.filter((f) => f.type === 'sisal-post').length;
    const scratcherCount = furniture.filter((f) => f.type === 'cat-scratcher').length;
    const totalScratch = sisalCount + scratcherCount;
    const valuableCount = valuableFurniture.length;

    if (sisalCount === 0 && scratcherCount > 0 && valuableCount > 0) {
      alerts.push({
        level: 'warning',
        title: '💡 建议升级至剑麻柱',
        message: `当前仅有普通猫抓柱 ${scratcherCount} 个，无剑麻柱。剑麻材质更耐磨（约为普通瓦楞纸的 5 倍），对真皮家具的防护更好。建议在贵重家具 1~2m 范围内各放置 1 个剑麻柱。`,
      });
    }

    if (totalScratch > 0 && valuableCount > 0) {
      const ratio = totalScratch / valuableCount;
      if (ratio < 1) {
        alerts.push({
          level: 'warning',
          title: '⚠️ 猫抓设施数量不足',
          message: `贵重家具 ${valuableCount} 件 vs 猫抓设施 ${totalScratch} 件，比例仅 ${ratio.toFixed(2)}。建议比例 ≥ 1.5，即每件贵重家具旁配 1~2 个猫抓设施。`,
        });
      } else if (ratio >= 1.5) {
        alerts.push({
          level: 'success',
          title: '✅ 猫抓设施数量充足',
          message: `贵重家具 ${valuableCount} 件 vs 猫抓设施 ${totalScratch} 件，比例 ${ratio.toFixed(2)}，符合最佳实践。`,
        });
      }
    }

    this.checkScratcherHeightAlignment(scratchTargets, valuableFurniture, alerts);
    return alerts;
  }

  private analyzeValuableItem(
    vf: PlacedFurniture,
    all: PlacedFurniture[],
    scratchTargets: PlacedFurniture[],
    alerts: AlertItem[]
  ): void {
    const leatherMsg = vf.definition.isLeather ? '（真皮材质，极高风险）' : '';
    const dangerZoneRadius = vf.definition.isLeather ? 2.0 : 1.5;

    const nearestScratcher = this.nearestDistance(vf, scratchTargets);
    const nearestSisal = this.nearestDistance(
      vf,
      all.filter((f) => f.type === 'sisal-post')
    );

    const nearestOtherCat = this.nearestDistance(
      vf,
      all.filter((f) => f.definition.category === 'cat-facility' && !['cat-scratcher', 'sisal-post'].includes(f.type))
    );

    let issues: string[] = [];
    let warnings: string[] = [];
    let goods: string[] = [];

    if (nearestScratcher.distance !== null) {
      if (vf.definition.isLeather) {
        if (nearestScratcher.distance > dangerZoneRadius) {
          issues.push(`最近的猫抓设施（${nearestScratcher.target!.definition.name}）距离 ${nearestScratcher.distance.toFixed(2)}m，超过 ${dangerZoneRadius}m 防护半径`);
        } else if (nearestScratcher.distance > 1.2) {
          warnings.push(`最近猫抓设施距离 ${nearestScratcher.distance.toFixed(2)}m，接近防护边界`);
        } else {
          goods.push(`猫抓设施距离 ${nearestScratcher.distance.toFixed(2)}m，在有效防护范围内`);
        }
      }

      if (nearestSisal.distance === null && vf.definition.isLeather) {
        issues.push(`附近 ${dangerZoneRadius}m 内没有剑麻柱，需引导至剑麻柱`);
      } else if (nearestSisal.distance !== null && nearestSisal.distance <= dangerZoneRadius) {
        goods.push(`剑麻柱距离 ${nearestSisal.distance.toFixed(2)}m，材质耐磨防护更佳`);
      }
    }

    if (nearestOtherCat.distance !== null && nearestOtherCat.distance < 0.5) {
      warnings.push(`${nearestOtherCat.target!.definition.name} 紧贴 ${vf.definition.name}，猫咪活动时易蹭挠表面`);
    }

    if (vf.type === 'sofa' && vf.definition.isLeather) {
      this.drawLeatherDamageRisk(vf);
    }

    if (issues.length > 0) {
      alerts.push({
        level: 'error',
        title: `⚠️ ${vf.definition.name}${leatherMsg}存在破坏风险`,
        message: issues.join('；') + (warnings.length > 0 ? '。⚠️ ' + warnings.join('；') : '') + (goods.length > 0 ? '。✅ ' + goods.join('；') : '') + this.getSisalPlacementSuggestion(vf, nearestSisal.distance),
      });
      this.drawDangerZone(vf, dangerZoneRadius, 0xef5350);
    } else if (warnings.length > 0) {
      alerts.push({
        level: 'warning',
        title: `🟡 ${vf.definition.name}${leatherMsg}需注意`,
        message: warnings.join('；') + (goods.length > 0 ? '。✅ ' + goods.join('；') : ''),
      });
      this.drawDangerZone(vf, dangerZoneRadius, 0xff9800);
    } else if (goods.length > 0) {
      alerts.push({
        level: 'success',
        title: `✅ ${vf.definition.name}防护良好`,
        message: goods.join('；'),
      });
      this.drawDangerZone(vf, dangerZoneRadius, 0x66bb6a);
    } else {
      alerts.push({
        level: 'info',
        title: `ℹ️ ${vf.definition.name}`,
        message: `贵重家具${leatherMsg}，建议在 ${dangerZoneRadius}m 内设置剑麻柱以提前引导磨爪行为。`,
      });
    }

    if (nearestScratcher.target) {
      this.drawConnection(vf, nearestScratcher.target, issues.length > 0 ? 0xef5350 : goods.length > 0 ? 0x66bb6a : 0xff9800);
    }
  }

  private getSisalPlacementSuggestion(vf: PlacedFurniture, nearestSisalDist: number | null): string {
    if (nearestSisalDist === null || nearestSisalDist > 1.5) {
      const side = vf.definition.depth < vf.definition.width ? '侧面' : '正面两侧';
      const dist = vf.definition.isLeather ? '0.8~1.2' : '1.0~1.5';
      return `。💡 建议：在 ${vf.definition.name} ${side} ${dist}m 处各放置 1 个剑麻柱`;
    }
    return '';
  }

  private drawLeatherDamageRisk(vf: PlacedFurniture): void {
    const w = vf.definition.width;
    const d = vf.definition.depth;
    const h = vf.definition.height;

    const edgePositions: [number, number, number][] = [
      [0, h * 0.4, d / 2],
      [-w / 2, h * 0.5, 0],
      [w / 2, h * 0.5, 0],
    ];

    const cos = Math.cos(vf.rotation);
    const sin = Math.sin(vf.rotation);

    edgePositions.forEach(([ex, ey, ez]) => {
      const wx = vf.position.x + ex * cos - ez * sin;
      const wz = vf.position.z + ex * sin + ez * cos;
      const pulse = this.createPulseRing();
      pulse.position.set(wx, ey, wz);
      this.sceneManager.addVisualization(pulse);
      this.visualObjects.push(pulse);
    });
  }

  private createPulseRing(): THREE.Group {
    const group = new THREE.Group();
    const rings = [0.08, 0.1, 0.12];
    rings.forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.01, 6, 24),
        new THREE.MeshBasicMaterial({
          color: 0xef5350,
          transparent: true,
          opacity: 0.6 - i * 0.15,
        })
      );
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    });
    return group;
  }

  private nearestDistance(
    source: PlacedFurniture,
    targets: PlacedFurniture[]
  ): { distance: number | null; target: PlacedFurniture | null } {
    let minDist: number | null = null;
    let minTarget: PlacedFurniture | null = null;

    targets.forEach((t) => {
      if (t.id === source.id) return;
      const corners1 = this.getCorners(source);
      const corners2 = this.getCorners(t);

      let d = Infinity;
      corners1.forEach((c1) => {
        corners2.forEach((c2) => {
          const dist = Math.hypot(c1.x - c2.x, c1.z - c2.z);
          if (dist < d) d = dist;
        });
      });

      if (minDist === null || d < minDist) {
        minDist = d;
        minTarget = t;
      }
    });

    return { distance: minDist, target: minTarget };
  }

  private getCorners(f: PlacedFurniture): { x: number; z: number }[] {
    const hw = f.definition.width / 2;
    const hd = f.definition.depth / 2;
    const cos = Math.cos(f.rotation);
    const sin = Math.sin(f.rotation);

    return [
      [-hw, -hd],
      [hw, -hd],
      [-hw, hd],
      [hw, hd],
      [0, 0],
    ].map(([lx, lz]) => ({
      x: f.position.x + lx * cos - lz * sin,
      z: f.position.z + lx * sin + lz * cos,
    }));
  }

  private drawDangerZone(f: PlacedFurniture, radius: number, color: number): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        Math.max(f.definition.width, f.definition.depth) * 0.5,
        radius,
        64
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(f.position.x, 0.01, f.position.z);
    this.sceneManager.addVisualization(ring);
    this.visualObjects.push(ring);

    const border = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.02, radius, 64),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      })
    );
    border.rotation.x = -Math.PI / 2;
    border.position.set(f.position.x, 0.012, f.position.z);
    this.sceneManager.addVisualization(border);
    this.visualObjects.push(border);
  }

  private drawConnection(a: PlacedFurniture, b: PlacedFurniture, color: number): void {
    const pts = [
      new THREE.Vector3(a.position.x, 0.1, a.position.z),
      new THREE.Vector3(b.position.x, 0.1, b.position.z),
    ];
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color,
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.5,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    this.sceneManager.addVisualization(line);
    this.visualObjects.push(line);
  }

  private checkScratcherHeightAlignment(
    scratchers: PlacedFurniture[],
    valuables: PlacedFurniture[],
    alerts: AlertItem[]
  ): void {
    valuables.forEach((v) => {
      const targetH = v.definition.height;
      scratchers.forEach((s) => {
        const dx = s.position.x - v.position.x;
        const dz = s.position.z - v.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 2.0) {
          const ratio = s.definition.height / targetH;
          if (ratio < 0.5) {
            alerts.push({
              level: 'warning',
              title: `💡 ${s.definition.name}高度不足`,
              message: `${s.definition.name}高 ${s.definition.height.toFixed(1)}m，仅为旁边${v.definition.name}（${targetH.toFixed(1)}m）的 ${(ratio * 100).toFixed(0)}%。猫抓柱高度应 ≥ 目标家具高度的 70%，才能在视觉上引导猫咪优先抓挠。`,
            });
          }
        }
      });
    });
  }

  clearVisualizations(): void {
    this.visualObjects.forEach((o) => this.sceneManager.removeVisualization(o));
    this.visualObjects = [];
  }
}
