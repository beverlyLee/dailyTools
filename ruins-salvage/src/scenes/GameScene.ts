import * as THREE from 'three';
import { Crane } from '../ui/Crane';

interface Rubble {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  size: THREE.Vector3;
  held: boolean;
  active: boolean;
}

export class GameScene {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  private rubbles: Rubble[] = [];
  private crane!: Crane;

  private lastSpawn = 0;
  private spawnInterval = 900;

  private groundY = -6;
  private worldBounds = { minX: -18, maxX: 18, minZ: -10, maxZ: 10 };

  private collisionFrameStep = 0;
  private collisionFrameCount = 4;

  private running = false;
  private lastTime = 0;
  private rafId: number | null = null;

  private _width = 0;
  private _height = 0;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  start(): void {
    this._width = window.innerWidth;
    this._height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 25, 60);

    this.camera = new THREE.PerspectiveCamera(55, this._width / this._height, 0.1, 200);
    this.camera.position.set(0, 4, 22);
    this.camera.lookAt(0, -2, 0);

    const hemi = new THREE.HemisphereLight(0x88aacc, 0x221100, 0.7);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffe6b0, 0.9);
    dir.position.set(8, 14, 6);
    this.scene.add(dir);

    const rim = new THREE.DirectionalLight(0x5577ff, 0.3);
    rim.position.set(-6, 4, -8);
    this.scene.add(rim);

    this.buildGround();
    this.buildBackdrop();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this._width, this._height);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.crane = new Crane(this.renderer.domElement, this.camera, {
      getRubbles: () => this.rubbles.filter((r) => r.active),
      onClear: (r) => this.onRubbleCleared(r),
    });

    window.addEventListener('resize', this.handleResize);

    this.lastTime = performance.now();
    this.running = true;
    this.loop(this.lastTime);
  }

  private handleResize = (): void => {
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this.camera.aspect = this._width / this._height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this._width, this._height, false);
  };

  private buildGround(): void {
    const g = new THREE.Group();

    const floorGeo = new THREE.PlaneGeometry(60, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d24,
      roughness: 0.95,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = this.groundY;
    g.add(floor);

    const grid = new THREE.GridHelper(60, 40, 0x333a48, 0x1e2228);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = this.groundY + 0.01;
    g.add(grid);

    this.scene.add(g);
  }

  private buildBackdrop(): void {
    const group = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x2a2f38,
      roughness: 0.9,
    });

    for (let i = 0; i < 8; i++) {
      const h = 4 + Math.random() * 6;
      const w = 1.2 + Math.random() * 0.8;
      const geo = new THREE.BoxGeometry(w, h, w);
      const m = new THREE.Mesh(geo, pillarMat);
      const x = -22 + i * 6 + (Math.random() - 0.5) * 1.5;
      m.position.set(x, this.groundY + h / 2, -14 - Math.random() * 4);
      m.rotation.y = (Math.random() - 0.5) * 0.4;
      group.add(m);
    }

    this.scene.add(group);
  }

  private spawnRubble(): void {
    const size = new THREE.Vector3(
      0.8 + Math.random() * 1.1,
      0.7 + Math.random() * 0.9,
      0.8 + Math.random() * 1.1,
    );
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const hue = 0.05 + Math.random() * 0.08;
    const color = new THREE.Color().setHSL(hue, 0.2, 0.35 + Math.random() * 0.2);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const x = this.worldBounds.minX + Math.random() * (this.worldBounds.maxX - this.worldBounds.minX);
    const z = this.worldBounds.minZ + Math.random() * (this.worldBounds.maxZ - this.worldBounds.minZ);
    mesh.position.set(x, 14, z);
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );

    this.scene.add(mesh);

    this.rubbles.push({
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, -0.5, (Math.random() - 0.5) * 1.5),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
      ),
      size,
      held: false,
      active: true,
    });
  }

  private onRubbleCleared(r: Rubble): void {
    r.held = false;
    r.active = false;
    this.scene.remove(r.mesh);
    r.mesh.geometry.dispose();
    (r.mesh.material as THREE.Material).dispose();
  }

  private resolveRubbleCollisions(): void {
    const active = this.rubbles.filter((r) => r.active && !r.held);
    const count = active.length;
    if (count < 2) return;

    const total = this.collisionFrameCount;
    const step = this.collisionFrameStep;

    for (let i = step; i < count - 1; i += total) {
      const a = active[i];
      if (!a) continue;
      for (let j = i + 1; j < count; j++) {
        const b = active[j];
        if (!b) continue;

        const dx = b.mesh.position.x - a.mesh.position.x;
        const dy = b.mesh.position.y - a.mesh.position.y;
        const dz = b.mesh.position.z - a.mesh.position.z;

        const minDist = (Math.max(a.size.x, a.size.y, a.size.z) + Math.max(b.size.x, b.size.y, b.size.z)) * 0.5;
        const distSq = dx * dx + dy * dy + dz * dz;
        const minDistSq = minDist * minDist;

        if (distSq < minDistSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;

          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          a.mesh.position.x -= nx * overlap;
          a.mesh.position.y -= ny * overlap;
          a.mesh.position.z -= nz * overlap;
          b.mesh.position.x += nx * overlap;
          b.mesh.position.y += ny * overlap;
          b.mesh.position.z += nz * overlap;

          const relVx = b.velocity.x - a.velocity.x;
          const relVy = b.velocity.y - a.velocity.y;
          const relVz = b.velocity.z - a.velocity.z;
          const relDotN = relVx * nx + relVy * ny + relVz * nz;

          if (relDotN < 0) {
            const restitution = 0.35;
            const impulse = relDotN * restitution;

            a.velocity.x += nx * impulse;
            a.velocity.y += ny * impulse;
            a.velocity.z += nz * impulse;
            b.velocity.x -= nx * impulse;
            b.velocity.y -= ny * impulse;
            b.velocity.z -= nz * impulse;

            a.angularVelocity.x += (Math.random() - 0.5) * 0.5;
            a.angularVelocity.z += (Math.random() - 0.5) * 0.5;
            b.angularVelocity.x += (Math.random() - 0.5) * 0.5;
            b.angularVelocity.z += (Math.random() - 0.5) * 0.5;
          }
        }
      }
    }
  }

  private loop = (time: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const delta = time - this.lastTime;
    this.lastTime = time;

    this.lastSpawn += delta;
    if (this.lastSpawn > this.spawnInterval) {
      this.lastSpawn = 0;
      this.spawnRubble();
    }

    const dt = Math.min(delta / 1000, 1 / 30);
    const gravity = -18;
    const groundY = this.groundY;

    for (const r of this.rubbles) {
      if (!r.active) continue;
      if (r.held) continue;

      r.velocity.y += gravity * dt;
      r.mesh.position.addScaledVector(r.velocity, dt);
      r.mesh.rotation.x += r.angularVelocity.x * dt;
      r.mesh.rotation.y += r.angularVelocity.y * dt;
      r.mesh.rotation.z += r.angularVelocity.z * dt;

      const half = r.size.y / 2;
      if (r.mesh.position.y - half < groundY) {
        r.mesh.position.y = groundY + half;
        r.velocity.y = Math.abs(r.velocity.y) * 0.25;
        r.velocity.x *= 0.6;
        r.velocity.z *= 0.6;
        r.angularVelocity.multiplyScalar(0.5);
        if (Math.abs(r.velocity.y) < 1.2) {
          r.velocity.y = 0;
          r.angularVelocity.multiplyScalar(0.3);
        }
      }

      if (r.mesh.position.x < this.worldBounds.minX) {
        r.mesh.position.x = this.worldBounds.minX;
        r.velocity.x = Math.abs(r.velocity.x) * 0.5;
      } else if (r.mesh.position.x > this.worldBounds.maxX) {
        r.mesh.position.x = this.worldBounds.maxX;
        r.velocity.x = -Math.abs(r.velocity.x) * 0.5;
      }
      if (r.mesh.position.z < this.worldBounds.minZ) {
        r.mesh.position.z = this.worldBounds.minZ;
        r.velocity.z = Math.abs(r.velocity.z) * 0.5;
      } else if (r.mesh.position.z > this.worldBounds.maxZ) {
        r.mesh.position.z = this.worldBounds.maxZ;
        r.velocity.z = -Math.abs(r.velocity.z) * 0.5;
      }
    }

    this.resolveRubbleCollisions();
    this.collisionFrameStep = (this.collisionFrameStep + 1) % this.collisionFrameCount;

    this.crane.update(dt, time);

    const maxRubbles = 45;
    if (this.rubbles.length > maxRubbles) {
      const toRemove = this.rubbles.filter((r) => r.active && !r.held);
      for (let i = 0; i < toRemove.length - maxRubbles; i++) {
        const r = toRemove[i];
        if (r) this.onRubbleCleared(r);
      }
      this.rubbles = this.rubbles.filter((r) => r.active);
    } else {
      this.rubbles = this.rubbles.filter((r) => r.active);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
