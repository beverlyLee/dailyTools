import * as THREE from 'three';

interface RubbleLike {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  size: THREE.Vector3;
  held: boolean;
  active: boolean;
}

interface CraneOptions {
  getRubbles: () => RubbleLike[];
  onClear: (r: RubbleLike) => void;
}

interface PendingRemoval {
  rubble: RubbleLike;
  startTime: number;
}

export class Crane {
  private static readonly REACH_SCREEN = 0.22;
  private static readonly SCREEN_MARGIN_XY = 1.3;
  private static readonly SCREEN_MARGIN_Z = 1.1;
  private static readonly REMOVAL_TIMEOUT_MS = 5000;

  private dom: HTMLElement;
  private camera: THREE.PerspectiveCamera;

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private dynamicPlane = new THREE.Plane();
  private tmpVec3 = new THREE.Vector3();
  private camForward = new THREE.Vector3();

  private mouseWorld = new THREE.Vector3();
  private lastMouseWorld = new THREE.Vector3();

  private hoveredRubble: RubbleLike | null = null;
  private heldRubble: RubbleLike | null = null;

  private grabOffset = new THREE.Vector3();
  private originalEmissive: THREE.Color | null = null;
  private originalEmissiveIntensity = 0;

  private options: CraneOptions;

  private clearedCount = 0;
  private counterEl: HTMLDivElement | null = null;

  private pendingRemovals: PendingRemoval[] = [];

  constructor(dom: HTMLElement, camera: THREE.PerspectiveCamera, options: CraneOptions) {
    this.dom = dom;
    this.camera = camera;
    this.options = options;

    this.counterEl = document.createElement('div');
    this.counterEl.style.position = 'absolute';
    this.counterEl.style.top = '16px';
    this.counterEl.style.right = '16px';
    this.counterEl.style.padding = '10px 14px';
    this.counterEl.style.background = 'rgba(0,0,0,0.45)';
    this.counterEl.style.border = '1px solid rgba(255,255,255,0.15)';
    this.counterEl.style.borderRadius = '8px';
    this.counterEl.style.fontSize = '13px';
    this.counterEl.style.color = '#ffcc66';
    this.counterEl.style.pointerEvents = 'none';
    this.counterEl.style.userSelect = 'none';
    this.counterEl.style.zIndex = '10';
    this.counterEl.textContent = '已清理: 0';
    document.getElementById('game-container')?.appendChild(this.counterEl);

    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('pointerleave', this.onPointerUp);
  }

  private onPointerMove = (e: PointerEvent): void => {
    this.updateNDC(e);
    this.updateDynamicPlaneAndMouseWorld();
    this.updateHover();
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.updateNDC(e);

    const target = this.hoveredRubble || this.findNearestByScreenSpace();
    if (target) {
      this.updateDynamicPlaneAndMouseWorld(target);
      this.grab(target);
    }
  };

  private onPointerUp = (): void => {
    if (this.heldRubble) {
      this.release();
    }
  };

  private updateNDC(e: PointerEvent): void {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private findNearestByScreenSpace(): RubbleLike | null {
    const rubbles = this.options.getRubbles();
    let closest: RubbleLike | null = null;
    let closestDist = Infinity;

    for (const r of rubbles) {
      if (r.held || !r.active) continue;
      this.tmpVec3.setFromMatrixPosition(r.mesh.matrixWorld);
      this.tmpVec3.project(this.camera);

      const dx = this.tmpVec3.x - this.ndc.x;
      const dy = this.tmpVec3.y - this.ndc.y;
      const screenDist = Math.sqrt(dx * dx + dy * dy);

      if (screenDist < Crane.REACH_SCREEN && screenDist < closestDist) {
        closestDist = screenDist;
        closest = r;
      }
    }

    return closest;
  }

  private updateDynamicPlaneAndMouseWorld(explicitAnchor?: RubbleLike | null): void {
    const anchor = explicitAnchor || this.heldRubble || this.hoveredRubble;

    if (anchor) {
      this.tmpVec3.setFromMatrixPosition(anchor.mesh.matrixWorld);
      this.camera.getWorldDirection(this.camForward);
      this.dynamicPlane.setFromNormalAndCoplanarPoint(this.camForward, this.tmpVec3);
    } else {
      this.camera.getWorldDirection(this.camForward);
      const defaultPoint = new THREE.Vector3(0, 0, 0);
      this.dynamicPlane.setFromNormalAndCoplanarPoint(this.camForward, defaultPoint);
    }

    this.raycaster.setFromCamera(this.ndc, this.camera);
    const intersect = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dynamicPlane, intersect)) {
      this.lastMouseWorld.copy(this.mouseWorld);
      this.mouseWorld.copy(intersect);
    }
  }

  private updateHover(): void {
    const near = this.findNearestByScreenSpace();
    if (near !== this.hoveredRubble) {
      if (this.hoveredRubble && this.hoveredRubble !== this.heldRubble) {
        this.setHoverEmissive(this.hoveredRubble, false);
      }
      this.hoveredRubble = near;
      if (this.hoveredRubble && this.hoveredRubble !== this.heldRubble) {
        this.setHoverEmissive(this.hoveredRubble, true);
      }
    }
  }

  private setHoverEmissive(r: RubbleLike, on: boolean): void {
    const mat = r.mesh.material as THREE.MeshStandardMaterial;
    if (!mat) return;
    if (on) {
      if (!this.originalEmissive) {
        this.originalEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
        this.originalEmissiveIntensity = mat.emissiveIntensity ?? 1;
      }
      if (!mat.emissive) mat.emissive = new THREE.Color(0x000000);
      mat.emissive.set(0xffaa44);
      mat.emissiveIntensity = 0.6;
    } else if (this.originalEmissive && mat.emissive) {
      mat.emissive.copy(this.originalEmissive);
      mat.emissiveIntensity = this.originalEmissiveIntensity;
    }
  }

  private grab(r: RubbleLike): void {
    if (r.held) return;
    r.held = true;
    this.heldRubble = r;

    this.grabOffset.copy(r.mesh.position).sub(this.mouseWorld);

    r.velocity.set(0, 0, 0);
    r.angularVelocity.set(0, 0, 0);

    const mat = r.mesh.material as THREE.MeshStandardMaterial;
    if (mat.emissive) {
      mat.emissive.set(0x66ddff);
      mat.emissiveIntensity = 0.8;
    }

    if (this.hoveredRubble === r) {
      this.hoveredRubble = null;
      this.originalEmissive = null;
    }
  }

  private release(): void {
    if (!this.heldRubble) return;
    const r = this.heldRubble;
    r.held = false;

    const throwVec = new THREE.Vector3().copy(this.mouseWorld).sub(this.lastMouseWorld);
    const throwSpeed = throwVec.length();

    if (throwSpeed > 0.05) {
      r.velocity.copy(throwVec).multiplyScalar(8).clampLength(18, 40);
    } else {
      this.camera.getWorldDirection(this.camForward);
      this.camForward.y = 0.2;
      this.camForward.normalize();
      r.velocity.copy(this.camForward).multiplyScalar(22);
    }
    r.velocity.y += 6;
    r.angularVelocity.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
    );

    this.pendingRemovals.push({
      rubble: r,
      startTime: performance.now(),
    });

    this.heldRubble = null;
    this.hoveredRubble = null;
    this.originalEmissive = null;
  }

  private isOutsidePlayArea(pos: THREE.Vector3): boolean {
    this.tmpVec3.copy(pos).project(this.camera);
    const outsideScreen =
      this.tmpVec3.x < -Crane.SCREEN_MARGIN_XY ||
      this.tmpVec3.x > Crane.SCREEN_MARGIN_XY ||
      this.tmpVec3.y < -Crane.SCREEN_MARGIN_XY ||
      this.tmpVec3.y > Crane.SCREEN_MARGIN_XY;
    const farBehind = this.tmpVec3.z > Crane.SCREEN_MARGIN_Z;
    return outsideScreen || farBehind;
  }

  private processPendingRemovals(now: number): void {
    const remaining: PendingRemoval[] = [];
    for (const pr of this.pendingRemovals) {
      const r = pr.rubble;
      if (!r.active) continue;

      const elapsed = now - pr.startTime;
      if (elapsed > Crane.REMOVAL_TIMEOUT_MS || this.isOutsidePlayArea(r.mesh.position)) {
        this.options.onClear(r);
        this.clearedCount++;
        if (this.counterEl) this.counterEl.textContent = `已清理: ${this.clearedCount}`;
      } else {
        remaining.push(pr);
      }
    }
    this.pendingRemovals = remaining;
  }

  update(dt: number, now: number): void {
    if (this.heldRubble) {
      const r = this.heldRubble;
      const target = new THREE.Vector3(
        this.mouseWorld.x + this.grabOffset.x,
        this.mouseWorld.y + this.grabOffset.y + 1.2,
        this.mouseWorld.z + this.grabOffset.z,
      );
      r.mesh.position.lerp(target, Math.min(1, dt * 20));
      r.mesh.rotation.x += dt * 0.8;
      r.mesh.rotation.y += dt * 1.2;
      r.velocity.set(0, 0, 0);
    }

    this.processPendingRemovals(now);
  }
}
