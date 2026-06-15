import * as THREE from 'three';
import { SceneManager } from './core/SceneManager';
import { PetFacilityLibrary, FURNITURE_DEFINITIONS } from './core/PetFacilityLibrary';
import { CatPathSimulator } from './analysis/CatPathSimulator';
import { DogRestAnalyzer } from './analysis/DogRestAnalyzer';
import { FurnitureDamageDetector } from './analysis/FurnitureDamageDetector';
import { CleaningPathSimulator } from './analysis/CleaningPathSimulator';
import { WalkwayAnalyzer } from './analysis/WalkwayAnalyzer';
import { FurnitureType, PlacedFurniture, DogSize, AlertItem, AnalysisResult } from './types';

type InteractionState =
  | { mode: 'idle' }
  | { mode: 'placing'; type: FurnitureType; ghost: THREE.Group }
  | { mode: 'dragging'; furnitureId: string; offset: THREE.Vector3 };

class PetSpacePlannerApp {
  private sceneManager: SceneManager;
  private facilityLibrary: PetFacilityLibrary;

  private catPathSimulator: CatPathSimulator;
  private dogRestAnalyzer: DogRestAnalyzer;
  private furnitureDamageDetector: FurnitureDamageDetector;
  private cleaningPathSimulator: CleaningPathSimulator;
  private walkwayAnalyzer: WalkwayAnalyzer;

  private furniture: Map<string, PlacedFurniture> = new Map();
  private selectedId: string | null = null;
  private interaction: InteractionState = { mode: 'idle' };
  private dogSize: DogSize = 'medium';
  private nextId = 1;

  private dom!: {
    walkwayBox: HTMLElement;
    catPathBox: HTMLElement;
    dogRestBox: HTMLElement;
    furnitureDamageBox: HTMLElement;
    cleaningPathBox: HTMLElement;
    scoreEl: HTMLElement;
    actionToolbar: HTMLElement;
    rotateLeftBtn: HTMLElement;
    rotateRightBtn: HTMLElement;
    deleteBtn: HTMLElement;
    rotate90Btn: HTMLElement;
  };

  constructor() {
    const container = document.body;

    this.sceneManager = new SceneManager(container);
    this.facilityLibrary = new PetFacilityLibrary();

    this.catPathSimulator = new CatPathSimulator(this.sceneManager);
    this.dogRestAnalyzer = new DogRestAnalyzer(this.sceneManager);
    this.furnitureDamageDetector = new FurnitureDamageDetector(this.sceneManager);
    this.cleaningPathSimulator = new CleaningPathSimulator(this.sceneManager);
    this.walkwayAnalyzer = new WalkwayAnalyzer(this.sceneManager);

    this.initDOM();
    this.initEvents();
    this.updateItemButtons();
    this.animate();
  }

  private initDOM(): void {
    this.dom = {
      walkwayBox: document.getElementById('walkwayAnalysis')!,
      catPathBox: document.getElementById('catPathAnalysis')!,
      dogRestBox: document.getElementById('dogRestAnalysis')!,
      furnitureDamageBox: document.getElementById('furnitureDamageAnalysis')!,
      cleaningPathBox: document.getElementById('cleaningPathAnalysis')!,
      scoreEl: document.getElementById('overallScore')!,
      actionToolbar: document.getElementById('actionToolbar')!,
      rotateLeftBtn: document.getElementById('rotateLeftBtn')!,
      rotateRightBtn: document.getElementById('rotateRightBtn')!,
      deleteBtn: document.getElementById('deleteBtn')!,
      rotate90Btn: document.getElementById('rotate90Btn')!,
    };
  }

  private initEvents(): void {
    document.querySelectorAll('.item-btn[data-type]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const type = (e.currentTarget as HTMLElement).dataset.type as FurnitureType;
        if (this.isTypePlaced(type)) return;
        this.startPlacing(type);
      });
    });

    document.querySelectorAll('.dog-size-btn[data-size]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.dog-size-btn').forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.dogSize = (e.currentTarget as HTMLElement).dataset.size as DogSize;
        this.markAnalysisStale();
      });
    });

    document.getElementById('clearBtn')?.addEventListener('click', () => this.clearAll());
    document.getElementById('resetViewBtn')?.addEventListener('click', () => this.sceneManager.resetView());
    document.getElementById('analyzeBtn')?.addEventListener('click', () => this.runAnalysis());

    this.dom.rotateLeftBtn.addEventListener('click', () => {
      if (this.selectedId) this.rotateSelected(-Math.PI / 12);
    });
    this.dom.rotateRightBtn.addEventListener('click', () => {
      if (this.selectedId) this.rotateSelected(Math.PI / 12);
    });
    this.dom.rotate90Btn.addEventListener('click', () => {
      if (this.selectedId) this.rotateSelected(Math.PI / 2);
    });
    this.dom.deleteBtn.addEventListener('click', () => {
      if (this.selectedId) this.removeFurniture(this.selectedId);
    });

    const canvas = this.sceneManager.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointerleave', () => this.onPointerLeave());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cancelPlacing();
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedId) {
        this.removeFurniture(this.selectedId);
      }
      if (this.selectedId && this.interaction.mode === 'idle') {
        const rotMap: Record<string, number> = { q: -Math.PI / 12, e: Math.PI / 12, r: Math.PI / 2 };
        if (rotMap[e.key] !== undefined) this.rotateSelected(rotMap[e.key]);
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private isTypePlaced(type: FurnitureType): boolean {
    for (const f of this.furniture.values()) {
      if (f.type === type) return true;
    }
    return false;
  }

  private updateItemButtons(): void {
    document.querySelectorAll('.item-btn[data-type]').forEach((btn) => {
      const type = (btn as HTMLElement).dataset.type as FurnitureType;
      const placed = this.isTypePlaced(type);
      btn.classList.toggle('placed', placed);
      const label = btn.querySelector('.item-label');
      if (label) {
        const name = label.textContent?.replace(' ✓', '') || '';
        label.textContent = placed ? `${name} ✓` : name.replace(' ✓', '');
      }
    });
  }

  private updateActionToolbar(): void {
    const toolbar = this.dom.actionToolbar;
    if (this.selectedId) {
      toolbar.classList.add('visible');
    } else {
      toolbar.classList.remove('visible');
    }
  }

  private markAnalysisStale(): void {
    this.clearAnalysisVisualizations();
    this.showStaleMessage();
  }

  private clearAnalysisVisualizations(): void {
    this.catPathSimulator.clearVisualizations();
    this.dogRestAnalyzer.clearVisualizations();
    this.furnitureDamageDetector.clearVisualizations();
    this.cleaningPathSimulator.clearVisualizations();
    this.walkwayAnalyzer.clearVisualizations();
  }

  private showStaleMessage(): void {
    const msg = '<div class="stale-state">家具已变更，请点击「🔍 全面分析」查看最新报告</div>';
    this.dom.walkwayBox.innerHTML = msg;
    this.dom.catPathBox.innerHTML = msg;
    this.dom.dogRestBox.innerHTML = msg;
    this.dom.furnitureDamageBox.innerHTML = msg;
    this.dom.cleaningPathBox.innerHTML = msg;
    this.dom.scoreEl.textContent = '--';
    this.dom.scoreEl.classList.remove('good', 'medium', 'poor');
  }

  private startPlacing(type: FurnitureType): void {
    this.cancelPlacing();
    const ghost = this.facilityLibrary.createMesh(type);
    ghost.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const m = (c as THREE.Mesh).material as THREE.Material | THREE.Material[];
        const arr = Array.isArray(m) ? m : [m];
        arr.forEach((mat) => {
          (mat as THREE.MeshStandardMaterial).transparent = true;
          (mat as THREE.MeshStandardMaterial).opacity = 0.55;
        });
      }
    });
    this.sceneManager.add(ghost);
    this.interaction = { mode: 'placing', type, ghost };
    this.deselect();
  }

  private cancelPlacing(): void {
    if (this.interaction.mode === 'placing') {
      this.sceneManager.remove(this.interaction.ghost);
      this.interaction.ghost.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const mesh = c as THREE.Mesh;
          mesh.geometry?.dispose?.();
        }
      });
    }
    this.interaction = { mode: 'idle' };
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button === 2) return;

    if (this.interaction.mode === 'placing') {
      const pt = this.sceneManager.screenToGround(e.clientX, e.clientY);
      if (pt && this.isPlacable(pt.x, pt.z, this.interaction.type)) {
        this.placeFurniture(this.interaction.type, pt);
        this.cancelPlacing();
        this.markAnalysisStale();
      }
      return;
    }

    const objs = Array.from(this.furniture.values()).map((f) => f.mesh);
    const picked = this.sceneManager.pickObject(e.clientX, e.clientY, objs);
    if (picked && picked.userData.furnitureId) {
      const id = picked.userData.furnitureId as string;
      const f = this.furniture.get(id);
      if (f) {
        this.select(id);
        const groundPt = this.sceneManager.screenToGround(e.clientX, e.clientY);
        if (groundPt) {
          this.interaction = {
            mode: 'dragging',
            furnitureId: id,
            offset: new THREE.Vector3().subVectors(f.position, groundPt),
          };
        }
      }
    } else {
      this.deselect();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.interaction.mode === 'placing') {
      const pt = this.sceneManager.screenToGround(e.clientX, e.clientY);
      if (pt) {
        const clamped = this.clampToGround(pt);
        this.interaction.ghost.position.set(clamped.x, 0, clamped.z);
        const valid = this.isPlacable(clamped.x, clamped.z, this.interaction.type);
        this.interaction.ghost.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
            const arr = Array.isArray(m) ? m : [m];
            arr.forEach((mat) => {
              mat.opacity = valid ? 0.6 : 0.35;
              if (!valid && mat.color) {
                mat.emissive = new THREE.Color(0xff2222);
                mat.emissiveIntensity = 0.25;
              } else {
                mat.emissive = new THREE.Color(0x000000);
                mat.emissiveIntensity = 0;
              }
            });
          }
        });
      }
    } else if (this.interaction.mode === 'dragging') {
      const pt = this.sceneManager.screenToGround(e.clientX, e.clientY);
      if (pt) {
        const f = this.furniture.get(this.interaction.furnitureId);
        if (f) {
          const target = pt.clone().add(this.interaction.offset);
          const clamped = this.clampToGround(target);
          if (this.isPlacable(clamped.x, clamped.z, f.type, f.id)) {
            f.position.set(clamped.x, 0, clamped.z);
            f.mesh.position.copy(f.position);
            this.updateBoundingBox(f);
          }
        }
      }
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    if (this.interaction.mode === 'dragging') {
      this.interaction = { mode: 'idle' };
      this.markAnalysisStale();
    }
  }

  private onPointerLeave(): void {
    if (this.interaction.mode === 'dragging') {
      this.interaction = { mode: 'idle' };
      this.markAnalysisStale();
    }
  }

  private clampToGround(v: THREE.Vector3): THREE.Vector3 {
    const b = this.sceneManager.getGroundBounds();
    return new THREE.Vector3(
      Math.max(b.minX, Math.min(b.maxX, v.x)),
      0,
      Math.max(b.minZ, Math.min(b.maxZ, v.z))
    );
  }

  private isPlacable(x: number, z: number, type: FurnitureType, excludeId?: string): boolean {
    const def = FURNITURE_DEFINITIONS[type];
    const hw = def.width / 2 + 0.05;
    const hd = def.depth / 2 + 0.05;
    const bounds = this.sceneManager.getGroundBounds();

    if (x - hw < bounds.minX || x + hw > bounds.maxX) return false;
    if (z - hd < bounds.minZ || z + hd > bounds.maxZ) return false;

    for (const [id, f] of this.furniture) {
      if (excludeId && id === excludeId) continue;
      if (this.overlap2D(x, z, def.width, def.depth, 0, f)) return false;
    }
    return true;
  }

  private overlap2D(
    ax: number,
    az: number,
    aw: number,
    ad: number,
    arot: number,
    b: PlacedFurniture
  ): boolean {
    const cosA = Math.cos(arot);
    const sinA = Math.sin(arot);
    const cosB = Math.cos(b.rotation);
    const sinB = Math.sin(b.rotation);

    const aHalfW = aw / 2;
    const aHalfD = ad / 2;
    const bHalfW = b.definition.width / 2;
    const bHalfD = b.definition.depth / 2;

    const aLocalToWorld = (lx: number, lz: number) => ({
      x: ax + lx * cosA - lz * sinA,
      z: az + lx * sinA + lz * cosA,
    });
    const bLocalToWorld = (lx: number, lz: number) => ({
      x: b.position.x + lx * cosB - lz * sinB,
      z: b.position.z + lx * sinB + lz * cosB,
    });

    const axes = [
      { x: cosA, z: sinA },
      { x: -sinA, z: cosA },
      { x: cosB, z: sinB },
      { x: -sinB, z: cosB },
    ];

    const aCorners = [
      [-aHalfW, -aHalfD], [aHalfW, -aHalfD], [-aHalfW, aHalfD], [aHalfW, aHalfD],
    ].map(([x, z]) => aLocalToWorld(x, z));
    const bCorners = [
      [-bHalfW, -bHalfD], [bHalfW, -bHalfD], [-bHalfW, bHalfD], [bHalfW, bHalfD],
    ].map(([x, z]) => bLocalToWorld(x, z));

    for (const axis of axes) {
      let aMin = Infinity, aMax = -Infinity;
      let bMin = Infinity, bMax = -Infinity;
      aCorners.forEach((c) => {
        const p = c.x * axis.x + c.z * axis.z;
        if (p < aMin) aMin = p; if (p > aMax) aMax = p;
      });
      bCorners.forEach((c) => {
        const p = c.x * axis.x + c.z * axis.z;
        if (p < bMin) bMin = p; if (p > bMax) bMax = p;
      });
      if (aMax < bMin - 0.02 || bMax < aMin - 0.02) return false;
    }
    return true;
  }

  private placeFurniture(type: FurnitureType, pos: THREE.Vector3): void {
    const mesh = this.facilityLibrary.createMesh(type);
    const definition = FURNITURE_DEFINITIONS[type];
    const id = `furn_${this.nextId++}`;

    mesh.position.set(pos.x, 0, pos.z);
    mesh.userData.furnitureId = id;

    this.sceneManager.add(mesh);

    const furniture: PlacedFurniture = {
      id,
      type,
      position: new THREE.Vector3(pos.x, 0, pos.z),
      rotation: 0,
      mesh,
      definition,
      boundingBox: new THREE.Box3(),
    };
    this.updateBoundingBox(furniture);
    this.furniture.set(id, furniture);
    this.select(id);
    this.updateItemButtons();
  }

  private updateBoundingBox(f: PlacedFurniture): void {
    const def = f.definition;
    const hw = def.width / 2;
    const hd = def.depth / 2;
    const cos = Math.cos(f.rotation);
    const sin = Math.sin(f.rotation);
    const corners = [
      [-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd],
    ].map(([lx, lz]) => new THREE.Vector3(
      f.position.x + lx * cos - lz * sin,
      0,
      f.position.z + lx * sin + lz * cos
    ));
    f.boundingBox.setFromPoints(corners);
    f.boundingBox.max.y = def.height;
  }

  private select(id: string): void {
    this.deselect();
    this.selectedId = id;
    const f = this.furniture.get(id);
    if (f) {
      f.mesh.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
          const arr = Array.isArray(m) ? m : [m];
          arr.forEach((mat) => {
            if (mat.emissive !== undefined) mat.emissive = new THREE.Color(0x335577);
            if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.3;
          });
        }
      });
    }
    this.updateActionToolbar();
  }

  private deselect(): void {
    if (this.selectedId) {
      const f = this.furniture.get(this.selectedId);
      if (f) {
        f.mesh.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
            const arr = Array.isArray(m) ? m : [m];
            arr.forEach((mat) => {
              if (mat.emissive !== undefined) mat.emissive = new THREE.Color(0x000000);
              if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0;
            });
          }
        });
      }
    }
    this.selectedId = null;
    this.updateActionToolbar();
  }

  private rotateSelected(delta: number): void {
    if (!this.selectedId) return;
    const f = this.furniture.get(this.selectedId);
    if (!f) return;
    f.rotation += delta;
    f.mesh.rotation.y = f.rotation;
    this.updateBoundingBox(f);
    this.markAnalysisStale();
  }

  private removeFurniture(id: string): void {
    const f = this.furniture.get(id);
    if (!f) return;
    this.sceneManager.remove(f.mesh);
    f.mesh.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose?.();
    });
    this.furniture.delete(id);
    if (this.selectedId === id) {
      this.selectedId = null;
      this.updateActionToolbar();
    }
    this.updateItemButtons();
    this.markAnalysisStale();
  }

  private clearAll(): void {
    this.clearAnalysisVisualizations();

    for (const [, f] of this.furniture) {
      this.sceneManager.remove(f.mesh);
      f.mesh.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose?.();
      });
    }
    this.furniture.clear();
    this.selectedId = null;
    this.cancelPlacing();
    this.updateItemButtons();
    this.updateActionToolbar();
    this.markAnalysisStale();
  }

  private runAnalysis(): AnalysisResult {
    const furnitureArr = Array.from(this.furniture.values());

    const walkway = this.walkwayAnalyzer.analyze(furnitureArr);
    const catPath = this.catPathSimulator.analyze(furnitureArr);
    const dogRest = this.dogRestAnalyzer.analyze(furnitureArr, this.dogSize);
    const furnitureDamage = this.furnitureDamageDetector.analyze(furnitureArr);
    const cleaningPath = this.cleaningPathSimulator.analyze(furnitureArr);

    const result: AnalysisResult = { walkway, catPath, dogRest, furnitureDamage, cleaningPath };

    this.renderAlerts(this.dom.walkwayBox, walkway);
    this.renderAlerts(this.dom.catPathBox, catPath);
    this.renderAlerts(this.dom.dogRestBox, dogRest);
    this.renderAlerts(this.dom.furnitureDamageBox, furnitureDamage);
    this.renderAlerts(this.dom.cleaningPathBox, cleaningPath);

    this.renderScore(result);
    return result;
  }

  private renderAlerts(container: HTMLElement, alerts: AlertItem[]): void {
    if (alerts.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无相关数据，放置家具后点击全面分析</div>';
      return;
    }
    container.innerHTML = alerts
      .map((a) => {
        const levelClass =
          a.level === 'error'
            ? ''
            : a.level === 'warning'
            ? 'warning'
            : a.level === 'success'
            ? 'success'
            : 'info';
        return `<div class="alert-card ${levelClass}">
          <div class="alert-header">${a.title}</div>
          <div class="alert-body">${a.message}</div>
        </div>`;
      })
      .join('');
  }

  private renderScore(result: AnalysisResult): void {
    const weights = { walkway: 30, catPath: 20, dogRest: 15, furnitureDamage: 20, cleaningPath: 15 } as const;
    type Key = keyof typeof weights;

    const scoreAlerts = (alerts: AlertItem[]): number => {
      if (alerts.length === 0) return 80;
      let base = 100;
      alerts.forEach((a) => {
        if (a.level === 'error') base -= 25;
        else if (a.level === 'warning') base -= 10;
        else if (a.level === 'info') base -= 2;
        else if (a.level === 'success') base += 5;
      });
      return Math.max(0, Math.min(100, base));
    };

    let total = 0;
    let totalW = 0;
    (Object.keys(weights) as Key[]).forEach((k) => {
      total += scoreAlerts(result[k]) * weights[k];
      totalW += weights[k];
    });

    const score = Math.round(total / totalW);
    this.dom.scoreEl.textContent = `${score}`;
    this.dom.scoreEl.classList.remove('good', 'medium', 'poor');
    this.dom.scoreEl.classList.add(score >= 80 ? 'good' : score >= 60 ? 'medium' : 'poor');
  }

  private animate(): void {
    const tick = () => {
      this.sceneManager.render();
      requestAnimationFrame(tick);
    };
    tick();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new PetSpacePlannerApp();
  (window as unknown as { __petPlanner: {
    placeAt: (type: string, x: number, z: number, rot?: number) => boolean;
    clearAll: () => void;
    getAnalysis: () => unknown;
    listFurniture: () => unknown[];
  } }).__petPlanner = {
    placeAt: (typeStr, x, z, rot = 0) => {
      const type = typeStr as FurnitureType;
      if (!FURNITURE_DEFINITIONS[type]) return false;
      const def = FURNITURE_DEFINITIONS[type];
      const mesh = (app as unknown as { facilityLibrary: PetFacilityLibrary }).facilityLibrary.createMesh(type);
      const id = `debug_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      mesh.position.set(x, 0, z);
      mesh.rotation.y = rot;
      mesh.userData.furnitureId = id;
      (app as unknown as { sceneManager: SceneManager }).sceneManager.add(mesh);
      const furniture: PlacedFurniture = {
        id, type, position: new THREE.Vector3(x, 0, z),
        rotation: rot, mesh, definition: def, boundingBox: new THREE.Box3(),
      };
      (app as unknown as { updateBoundingBox: (f: PlacedFurniture) => void }).updateBoundingBox(furniture);
      (app as unknown as { furniture: Map<string, PlacedFurniture> }).furniture.set(id, furniture);
      (app as unknown as { updateItemButtons: () => void }).updateItemButtons();
      (app as unknown as { runAnalysis: () => void }).runAnalysis();
      return true;
    },
    clearAll: () => (app as unknown as { clearAll: () => void }).clearAll(),
    getAnalysis: () => (app as unknown as { runAnalysis: () => AnalysisResult }).runAnalysis(),
    listFurniture: () => Array.from((app as unknown as { furniture: Map<string, PlacedFurniture> }).furniture.values()).map(f => ({
      id: f.id, type: f.type, x: +f.position.x.toFixed(2), z: +f.position.z.toFixed(2), rot: +f.rotation.toFixed(2)
    })),
  };
});
