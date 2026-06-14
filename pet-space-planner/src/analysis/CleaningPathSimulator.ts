import * as THREE from 'three';
import { PlacedFurniture, AlertItem, RoomZone } from '../types';
import { SceneManager } from '../core/SceneManager';

type PathPoint = { x: number; z: number };

export class CleaningPathSimulator {
  private sceneManager: SceneManager;
  private visualObjects: THREE.Object3D[] = [];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  analyze(furniture: PlacedFurniture[]): AlertItem[] {
    this.clearVisualizations();

    const alerts: AlertItem[] = [];
    const litterBoxes = furniture.filter((f) => f.type === 'litter-box');

    if (litterBoxes.length === 0) {
      alerts.push({
        level: 'info',
        title: '🧹 未放置猫砂盆',
        message: '自动猫砂盆位置建议：远离餐厅和厨房，靠近玄关或走廊处。清洁路线应避开用餐区域与食物制备区。',
      });
      return alerts;
    }

    const cleaningSource = this.findCleaningSource(furniture);

    litterBoxes.forEach((litter) => {
      const litterZone = this.sceneManager.getZoneAt(litter.position.x, litter.position.z);

      if (litterZone && (litterZone.type === 'dining' || litterZone.type === 'kitchen')) {
        alerts.push({
          level: 'error',
          title: `⚠️ 猫砂盆位于${litterZone.name}！`,
          message: `猫砂盆（${litter.position.x.toFixed(1)}, ${litter.position.z.toFixed(1)}）位于${litterZone.name}区域，严重违反卫生原则！必须立即移走，建议放置于玄关或走廊等通风区域。`,
        });
        this.drawBadZoneHighlight(litter, 0xef5350);
      }

      const tableNearby = furniture
        .filter((f) => f.type === 'table')
        .map((t) => ({
          table: t,
          distance: this.horizontalDistance(litter, t),
        }))
        .filter((r) => r.distance < 4.0);

      if (tableNearby.length > 0) {
        const t = tableNearby[0];
        if (t.distance < 2.0) {
          alerts.push({
            level: 'error',
            title: `⚠️ 猫砂盆距餐桌仅 ${t.distance.toFixed(2)}m`,
            message: `距${t.table.definition.name}过近，气味与细菌会直接飘散到用餐区。安全距离 ≥ 4m，当前距离严重不足。`,
          });
          this.drawBadZoneHighlight(litter, 0xef5350);
          this.drawConnection(litter, t.table, 0xef5350);
        } else {
          alerts.push({
            level: 'warning',
            title: `🟡 猫砂盆距餐桌 ${t.distance.toFixed(2)}m，接近临界`,
            message: `建议距离 ≥ 4m，当前仍有气味扩散风险。请考虑移至玄关或走廊。`,
          });
          this.drawConnection(litter, t.table, 0xff9800);
        }
      }

      const path = this.computeCleaningPath(litter, cleaningSource, furniture);
      const crossedZones = this.analyzePathZones(path);

      const diningCrossed = crossedZones.filter((z) => z.type === 'dining');
      const kitchenCrossed = crossedZones.filter((z) => z.type === 'kitchen');
      const livingCrossed = crossedZones.filter((z) => z.type === 'living');

      this.drawPath(path, diningCrossed.length > 0 || kitchenCrossed.length > 0 ? 0xef5350 : 0x66bb6a);

      if (diningCrossed.length > 0) {
        alerts.push({
          level: 'error',
          title: `🚫 清洁动线穿过餐厅！`,
          message: `从猫砂盆倾倒/更换猫砂的路径（${path.length} 个节点）将经过餐厅区域（${diningCrossed.map((z) => z.name).join('、')}），食物与排泄物交叉污染风险极高！请重新放置猫砂盆，尽量靠近玄关/走廊等非饮食区域。`,
        });
      }

      if (kitchenCrossed.length > 0) {
        alerts.push({
          level: 'error',
          title: `🚫 清洁动线穿过厨房！`,
          message: `清洁路径将经过厨房（${kitchenCrossed.map((z) => z.name).join('、')}），严重违反食品卫生规范。猫砂盆与清洁收纳点应避免清洁路径经过食物制备区。`,
        });
      }

      if (livingCrossed.length > 0 && diningCrossed.length === 0 && kitchenCrossed.length === 0) {
        alerts.push({
          level: 'warning',
          title: `🟡 清洁动线经过客厅`,
          message: `路径经过客厅区域，可能携带猫砂颗粒到沙发/地毯上。如果可能，建议将猫砂盆靠玄关侧放置，减少穿越起居空间的距离。`,
        });
      }

      if (diningCrossed.length === 0 && kitchenCrossed.length === 0) {
        const totalDist = this.pathLength(path);
        alerts.push({
          level: 'success',
          title: `✅ 清洁动线合理`,
          message: `猫砂盆位于${litterZone?.name ?? '未知区域'}，清洁路径长约 ${totalDist.toFixed(1)}m，不经过餐厅/厨房区域。建议配合脚踏式垃圾桶、一次性猫砂袋提升清洁效率。`,
        });
      }

      if (litter.definition.needsVentilation) {
        const ventilationScore = this.computeVentilation(litter.position.x, litter.position.z);
        if (ventilationScore < 0.4) {
          alerts.push({
            level: 'warning',
            title: '🟡 猫砂盆通风条件差',
            message: `当前位置通风评分 ${(ventilationScore * 100).toFixed(0)}/100，异味易积聚。建议靠近窗户或使用带除臭功能的自动猫砂盆。`,
          });
        } else if (ventilationScore >= 0.7) {
          alerts.push({
            level: 'success',
            title: '✅ 猫砂盆通风良好',
            message: `通风评分 ${(ventilationScore * 100).toFixed(0)}/100，位置合理。`,
          });
        }
      }

      const walkwayDist = this.minWalkwayDistance(litter.position.x, litter.position.z);
      if (walkwayDist < 0.5) {
        alerts.push({
          level: 'warning',
          title: '🟡 猫砂盆过于靠近通道',
          message: `距主通道仅 ${walkwayDist.toFixed(2)}m，频繁踩踏易导致猫砂被带出到全屋。建议远离通道 ≥ 0.8m。`,
        });
      }

      this.drawLitterMarker(litter);
    });

    if (litterBoxes.length > 0) {
      alerts.push({
        level: 'info',
        title: '💡 清洁动线最佳实践',
        message: '①猫砂盆远离餐厅/厨房 ≥ 4m；②放置在玄关或走廊靠近垃圾桶处；③清理路线避免经过用餐区、食物制备区；④多猫家庭 N+1 原则（猫数+1 个砂盆）；⑤自动猫砂盆上方预留 50cm 取出内桶空间。',
      });
    }

    return alerts;
  }

  private findCleaningSource(_furniture: PlacedFurniture[]): PathPoint {
    const room = this.sceneManager.getRoom();
    const kitchen = room.zones.find((z: { type: string }) => z.type === 'kitchen');
    if (kitchen) {
      return { x: (kitchen.minX + kitchen.maxX) / 2, z: (kitchen.minZ + kitchen.maxZ) / 2 };
    }
    return { x: room.width / 2 - 1, z: room.depth / 2 - 1 };
  }

  private computeCleaningPath(
    litter: PlacedFurniture,
    sink: PathPoint,
    furniture: PlacedFurniture[]
  ): PathPoint[] {
    const room = this.sceneManager.getRoom();
    const start: PathPoint = { x: litter.position.x, z: litter.position.z };
    const end = sink;

    const obstacles = furniture
      .filter((f) => f.id !== litter.id)
      .map((f) => ({
        cx: f.position.x,
        cz: f.position.z,
        hw: f.definition.width / 2 + 0.2,
        hd: f.definition.depth / 2 + 0.2,
        rot: f.rotation,
      }));

    const collides = (x: number, z: number): boolean => {
      for (const o of obstacles) {
        const cos = Math.cos(-o.rot);
        const sin = Math.sin(-o.rot);
        const lx = (x - o.cx) * cos - (z - o.cz) * sin;
        const lz = (x - o.cx) * sin + (z - o.cz) * cos;
        if (Math.abs(lx) < o.hw && Math.abs(lz) < o.hd) return true;
      }
      const hx = room.width / 2 - 0.3;
      const hz = room.depth / 2 - 0.3;
      if (Math.abs(x) > hx || Math.abs(z) > hz) return true;
      return false;
    };

    const dirs: [number, number][] = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [-1, 1], [1, -1], [-1, -1],
    ];

    const step = 0.3;
    const startK = `${(start.x / step).toFixed(0)},${(start.z / step).toFixed(0)}`;
    const endK = `${(end.x / step).toFixed(0)},${(end.z / step).toFixed(0)}`;

    const open: { k: string; x: number; z: number; f: number; g: number; parent: string | null }[] = [];
    const closed = new Map<string, { x: number; z: number; parent: string | null }>();

    open.push({ k: startK, x: start.x, z: start.z, f: this.heuristic(start, end), g: 0, parent: null });

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift()!;
      if (cur.k === endK) {
        closed.set(cur.k, { x: cur.x, z: cur.z, parent: cur.parent });
        break;
      }
      if (closed.has(cur.k)) continue;
      closed.set(cur.k, { x: cur.x, z: cur.z, parent: cur.parent });

      for (const [dx, dz] of dirs) {
        const nx = cur.x + dx * step;
        const nz = cur.z + dz * step;
        const nk = `${(nx / step).toFixed(0)},${(nz / step).toFixed(0)}`;
        if (closed.has(nk)) continue;
        if (collides(nx, nz)) continue;

        const g = cur.g + step * Math.sqrt(dx * dx + dz * dz);
        const h = this.heuristic({ x: nx, z: nz }, end);
        open.push({ k: nk, x: nx, z: nz, f: g + h, g, parent: cur.k });
      }

      if (closed.size > 3000) break;
    }

    const path: PathPoint[] = [];
    let k: string | null = endK;
    if (!closed.has(k)) {
      path.push(start, end);
      return path;
    }

    while (k) {
      const node = closed.get(k);
      if (!node) break;
      path.unshift({ x: node.x, z: node.z });
      k = node.parent;
    }

    return this.smoothPath(path, collides);
  }

  private heuristic(a: PathPoint, b: PathPoint): number {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  private smoothPath(
    path: PathPoint[],
    collides: (x: number, z: number) => boolean
  ): PathPoint[] {
    if (path.length < 3) return path;
    const result: PathPoint[] = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
      let j = path.length - 1;
      while (j > i + 1) {
        if (this.lineClear(path[i], path[j], collides)) break;
        j--;
      }
      result.push(path[j]);
      i = j;
    }
    return result;
  }

  private lineClear(a: PathPoint, b: PathPoint, collides: (x: number, z: number) => boolean): boolean {
    const dist = this.heuristic(a, b);
    const steps = Math.ceil(dist / 0.15);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      if (collides(x, z)) return false;
    }
    return true;
  }

  private pathLength(path: PathPoint[]): number {
    let s = 0;
    for (let i = 1; i < path.length; i++) {
      s += this.heuristic(path[i - 1], path[i]);
    }
    return s;
  }

  private analyzePathZones(path: PathPoint[]): RoomZone[] {
    const seen = new Set<string>();
    const zones: RoomZone[] = [];
    path.forEach((p) => {
      const z = this.sceneManager.getZoneAt(p.x, p.z);
      if (z && !seen.has(z.type)) {
        seen.add(z.type);
        zones.push(z);
      }
    });
    return zones;
  }

  private horizontalDistance(a: PlacedFurniture, b: PlacedFurniture): number {
    return Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
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
      const d = P.distanceTo(proj) - w.width / 2;
      if (d < minDist) minDist = d;
    });
    return Math.max(0, minDist);
  }

  private computeVentilation(x: number, z: number): number {
    const room = this.sceneManager.getRoom();
    const hx = room.width / 2;
    const hz = room.depth / 2;
    const edge = Math.min(hx - Math.abs(x), hz - Math.abs(z));
    const cornerScore =
      1 -
      Math.min(
        1,
        Math.min(
          Math.hypot(x + hx, z + hz),
          Math.hypot(x - hx, z + hz),
          Math.hypot(x + hx, z - hz),
          Math.hypot(x - hx, z - hz)
        ) / Math.max(hx, hz)
      );
    return Math.min(1, edge * 0.12 + cornerScore * 0.6 + 0.2);
  }

  private drawPath(path: PathPoint[], color: number): void {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < path.length; i++) {
      pts.push(new THREE.Vector3(path[i].x, 0.05, path[i].z));
    }

    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const steps = 20;
      const segPts: THREE.Vector3[] = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        segPts.push(
          new THREE.Vector3(
            a.x + (b.x - a.x) * t,
            0.08 + Math.sin(t * Math.PI) * 0.02,
            a.z + (b.z - a.z) * t
          )
        );
      }
      const geom = new THREE.BufferGeometry().setFromPoints(segPts);
      const mat = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.2,
        gapSize: 0.12,
        transparent: true,
        opacity: 0.85,
        linewidth: 2,
      });
      const line = new THREE.Line(geom, mat);
      line.computeLineDistances();
      this.sceneManager.addVisualization(line);
      this.visualObjects.push(line);
    }

    path.forEach((p, i) => {
      if (i === 0 || i === path.length - 1) {
        const marker = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
        );
        marker.position.set(p.x, 0.03, p.z);
        this.sceneManager.addVisualization(marker);
        this.visualObjects.push(marker);
      }
    });
  }

  private drawConnection(a: PlacedFurniture, b: PlacedFurniture, color: number): void {
    const pts = [
      new THREE.Vector3(a.position.x, 0.12, a.position.z),
      new THREE.Vector3(b.position.x, 0.12, b.position.z),
    ];
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color,
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.6,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    this.sceneManager.addVisualization(line);
    this.visualObjects.push(line);
  }

  private drawBadZoneHighlight(f: PlacedFurniture, color: number): void {
    const size = Math.max(f.definition.width, f.definition.depth) * 1.2;
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.5, size * 0.6, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(f.position.x, 0.03, f.position.z);
    this.sceneManager.addVisualization(marker);
    this.visualObjects.push(marker);
  }

  private drawLitterMarker(f: PlacedFurniture): void {
    const w = f.definition.width;
    const d = f.definition.depth;

    const label = this.createLabelSprite('🚮');
    label.position.set(f.position.x, f.definition.height + 0.4, f.position.z);
    label.scale.set(0.6, 0.6, 1);
    this.sceneManager.addVisualization(label);
    this.visualObjects.push(label);

    void w; void d;
  }

  private createLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    return new THREE.Sprite(mat);
  }

  clearVisualizations(): void {
    this.visualObjects.forEach((o) => this.sceneManager.removeVisualization(o));
    this.visualObjects = [];
  }
}
