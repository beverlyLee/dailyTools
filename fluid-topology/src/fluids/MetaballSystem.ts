import * as THREE from 'three';
import { Metaball, MarchingCubes } from './MarchingCubes';

interface Stream {
  metaballs: Metaball[];
  velocity: THREE.Vector3;
  direction: THREE.Vector3;
  spawnPoint: THREE.Vector3;
  spawnInterval: number;
  timeSinceSpawn: number;
  active: boolean;
}

export interface FluidParams {
  flowSpeed: number;
  splashCount: number;
  gravity: number;
}

interface ExpandState {
  targetRadius: number;
  currentRadius: number;
  duration: number;
  elapsed: number;
}

export class MetaballSystem {
  private mc: MarchingCubes;
  private splashMetaballs: Metaball[] = [];
  private streams: Stream[] = [];
  private collisionCount: number = 0;
  private lastCollisionTime: number = 0;
  private elapsedTime: number = 0;
  private bounds: { min: THREE.Vector3; max: THREE.Vector3 };
  private onCollision: (() => void) | null = null;
  private ballIdCounter: number = 0;
  private pairCooldowns: Map<string, number> = new Map();
  private expandStates: Map<number, ExpandState> = new Map();
  private readonly COOLDOWN_DURATION: number = 0.35;
  private readonly MAX_PARTICLES: number = 280;
  params: FluidParams;
  collisionFlash: number = 0;

  constructor(gridSize: number = 28) {
    this.mc = new MarchingCubes(gridSize, 1.0);
    this.bounds = {
      min: new THREE.Vector3(-6, -3, -6),
      max: new THREE.Vector3(6, 5, 6),
    };
    this.params = {
      flowSpeed: 3.5,
      splashCount: 40,
      gravity: -1.8,
    };
    this.initStreams();
  }

  private initStreams(): void {
    const speed = this.params.flowSpeed;

    const leftStream: Stream = {
      metaballs: [],
      velocity: new THREE.Vector3(speed, 1.2, 0),
      direction: new THREE.Vector3(1, 0, 0),
      spawnPoint: new THREE.Vector3(-4.5, 2.0, 0),
      spawnInterval: 0.07,
      timeSinceSpawn: 0,
      active: true,
    };

    const rightStream: Stream = {
      metaballs: [],
      velocity: new THREE.Vector3(-speed, 1.2, 0),
      direction: new THREE.Vector3(-1, 0, 0),
      spawnPoint: new THREE.Vector3(4.5, 2.0, 0),
      spawnInterval: 0.07,
      timeSinceSpawn: 0,
      active: true,
    };

    this.streams = [leftStream, rightStream];
  }

  setCollisionCallback(cb: () => void): void {
    this.onCollision = cb;
  }

  private spawnStreamBall(stream: Stream): void {
    const m: Metaball = {
      id: this.ballIdCounter++,
      position: stream.spawnPoint.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.25
        )
      ),
      radius: 0.65 + Math.random() * 0.3,
      velocity: stream.velocity.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.6
        )
      ),
      life: 10.0,
      maxLife: 10.0,
      isMain: true,
    };
    stream.metaballs.push(m);
  }

  private spawnSplash(point: THREE.Vector3, normal: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      let dir: THREE.Vector3;

      if (i < count * 0.35) {
        const angle = Math.random() * Math.PI * 2;
        const spread = 0.8 + Math.random() * 0.6;
        dir = new THREE.Vector3(
          normal.x * spread + Math.cos(angle) * 0.6,
          Math.random() * 1.8 + 1.0,
          normal.z * spread + Math.sin(angle) * 0.6
        );
      } else if (i < count * 0.65) {
        const angle = Math.random() * Math.PI * 2;
        const lateralStrength = 1.2 + Math.random() * 1.5;
        dir = new THREE.Vector3(
          Math.cos(angle) * lateralStrength,
          Math.random() * 1.2 + 0.5,
          Math.sin(angle) * lateralStrength
        );
      } else {
        dir = new THREE.Vector3(
          (Math.random() - 0.5) * 3.0,
          Math.random() * 2.5 + 1.5,
          (Math.random() - 0.5) * 3.0
        ).add(normal.clone().multiplyScalar(0.3 + Math.random() * 0.5));
      }

      dir.normalize().multiplyScalar(2.5 + Math.random() * 4.0);

      const m: Metaball = {
        id: this.ballIdCounter++,
        position: point.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
          )
        ),
        radius: 0.08 + Math.random() * 0.25,
        velocity: dir,
        life: 1.8 + Math.random() * 2.5,
        maxLife: 2.5 + Math.random() * 1.8,
        isMain: false,
      };
      this.splashMetaballs.push(m);
    }
  }

  private getPairKey(aId: number, bId: number): string {
    return aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
  }

  private triggerCollision(a: Metaball, b: Metaball): void {
    const dist = a.position.distanceTo(b.position);

    const collisionPoint = new THREE.Vector3()
      .addVectors(a.position, b.position)
      .multiplyScalar(0.5);

    const relDir = new THREE.Vector3().subVectors(a.position, b.position);
    if (relDir.lengthSq() < 0.001) {
      relDir.set(1, 0, 0);
    } else {
      relDir.normalize();
    }

    this.spawnSplash(collisionPoint, relDir, this.params.splashCount);

    const velAAlongNormal = a.velocity.dot(relDir);
    const velBAlongNormal = b.velocity.dot(relDir);

    const horizontalKillFactor = 0.8;
    const upBoost = 2.0;
    const lateralSpread = 1.5;

    const normalKillA = relDir.clone().multiplyScalar(velAAlongNormal * horizontalKillFactor);
    const normalKillB = relDir.clone().multiplyScalar(velBAlongNormal * horizontalKillFactor);

    a.velocity.sub(normalKillA);
    a.velocity.y += upBoost;
    a.velocity.z += (Math.random() - 0.5) * lateralSpread;

    b.velocity.sub(normalKillB);
    b.velocity.y += upBoost;
    b.velocity.z += (Math.random() - 0.5) * lateralSpread;

    const r1Sq = a.radius * a.radius;
    const r2Sq = b.radius * b.radius;
    const mergeDist = Math.sqrt(r1Sq + r2Sq) * 1.1;
    const overlap = mergeDist - dist;
    const mergeForce = overlap > 0 ? overlap * 0.3 : 0.05;

    a.position.add(relDir.clone().multiplyScalar(mergeForce));
    b.position.sub(relDir.clone().multiplyScalar(mergeForce));

    const expandFactor = 1.4;
    const expandDuration = 0.5;

    for (const stream of this.streams) {
      for (const m of stream.metaballs) {
        const d = m.position.distanceTo(collisionPoint);
        if (d < 2.5) {
          const influence = 1.0 - d / 2.5;
          const oldRadius = m.radius;
          m.radius *= 1.0 + (expandFactor - 1.0) * influence;

          this.expandStates.set(m.id, {
            targetRadius: oldRadius,
            currentRadius: m.radius,
            duration: expandDuration * influence + 0.1,
            elapsed: 0,
          });
        }
      }
    }

    this.collisionCount++;
    this.lastCollisionTime = this.elapsedTime;
    this.collisionFlash = 1.0;

    if (this.onCollision) this.onCollision();
  }

  private checkCollision(): void {
    if (this.streams.length < 2) return;

    const left = this.streams[0];
    const right = this.streams[1];

    for (const a of left.metaballs) {
      for (const b of right.metaballs) {
        const dist = a.position.distanceTo(b.position);
        const r1Sq = a.radius * a.radius;
        const r2Sq = b.radius * b.radius;
        const mergeDist = Math.sqrt(r1Sq + r2Sq) * 1.1;

        if (dist < mergeDist) {
          const pairKey = this.getPairKey(a.id, b.id);
          const cooldown = this.pairCooldowns.get(pairKey);

          if (!cooldown || this.elapsedTime - cooldown > this.COOLDOWN_DURATION) {
            this.triggerCollision(a, b);
            this.pairCooldowns.set(pairKey, this.elapsedTime);
          }
        }
      }
    }

    const expiredKeys: string[] = [];
    for (const [key, time] of this.pairCooldowns) {
      if (this.elapsedTime - time > this.COOLDOWN_DURATION * 3) {
        expiredKeys.push(key);
      }
    }
    for (const key of expiredKeys) {
      this.pairCooldowns.delete(key);
    }
  }

  private continueSplashing(): void {
    if (this.collisionCount === 0) return;

    const timeSinceCollision = this.elapsedTime - this.lastCollisionTime;

    if (timeSinceCollision < 2.0 && Math.random() < 0.3) {
      const center = new THREE.Vector3(
        (Math.random() - 0.5) * 1.0,
        1.5 + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 1.0
      );
      const normal = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5 + 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();

      this.spawnSplash(center, normal, 2);
    }
  }

  private enforceParticleLimit(): void {
    const totalMainBalls = this.streams.reduce((sum, s) => sum + s.metaballs.length, 0);
    const maxSplash = this.MAX_PARTICLES - totalMainBalls;

    if (maxSplash <= 0 || this.splashMetaballs.length <= maxSplash) {
      return;
    }

    this.splashMetaballs.sort((a, b) => a.life - b.life);

    const removeCount = this.splashMetaballs.length - maxSplash;
    this.splashMetaballs.splice(0, removeCount);
  }

  update(dt: number): void {
    this.elapsedTime += dt;

    for (const stream of this.streams) {
      if (!stream.active) continue;

      stream.timeSinceSpawn += dt;
      if (stream.timeSinceSpawn >= stream.spawnInterval) {
        this.spawnStreamBall(stream);
        stream.timeSinceSpawn = 0;
      }
    }

    const gravity = new THREE.Vector3(0, this.params.gravity, 0);
    const allBalls = [...this.streams.flatMap(s => s.metaballs), ...this.splashMetaballs];

    for (const m of allBalls) {
      m.velocity.add(gravity.clone().multiplyScalar(dt));
      const damping = Math.pow(0.82, dt);
      m.velocity.multiplyScalar(damping);
      m.position.add(m.velocity.clone().multiplyScalar(dt));
      m.life -= dt;

      if (!m.isMain) {
        const lifeRatio = Math.max(0, m.life / m.maxLife);
        m.radius = Math.max(0.02, m.radius * (1.0 - dt * 0.4 * (1.0 - lifeRatio)));
      }
    }

    for (const stream of this.streams) {
      stream.metaballs = stream.metaballs.filter(m => {
        if (m.life <= 0) return false;
        if (m.position.y < this.bounds.min.y - 2) return false;
        if (Math.abs(m.position.x) > 8) return false;
        return true;
      });
    }

    this.splashMetaballs = this.splashMetaballs.filter(m => {
      if (m.life <= 0) return false;
      if (m.radius < 0.015) return false;
      if (m.position.y < this.bounds.min.y - 2) return false;
      return true;
    });

    this.checkCollision();
    this.continueSplashing();

    this.enforceParticleLimit();

    const expiredExpands: number[] = [];
    for (const [id, state] of this.expandStates) {
      state.elapsed += dt;
      const t = Math.min(1.0, state.elapsed / state.duration);
      const eased = 1.0 - (1.0 - t) * (1.0 - t);

      let ball: Metaball | undefined;
      for (const stream of this.streams) {
        ball = stream.metaballs.find(m => m.id === id);
        if (ball) break;
      }

      if (ball) {
        ball.radius = state.currentRadius + (state.targetRadius - state.currentRadius) * eased;
      }

      if (t >= 1.0) {
        expiredExpands.push(id);
      }
    }
    for (const id of expiredExpands) {
      this.expandStates.delete(id);
    }

    if (this.collisionFlash > 0) {
      this.collisionFlash = Math.max(0, this.collisionFlash - dt * 3.0);
    }
  }

  getAllMetaballs(): Metaball[] {
    return [
      ...this.streams.flatMap(s => s.metaballs),
      ...this.splashMetaballs,
    ];
  }

  generateMesh(): THREE.BufferGeometry {
    const allBalls = this.getAllMetaballs();
    return this.mc.generate(allBalls, this.bounds);
  }

  getCollisionState(): { hasCollided: boolean; timeSinceCollision: number; collisionCount: number } {
    return {
      hasCollided: this.collisionCount > 0,
      timeSinceCollision: this.collisionCount > 0 ? this.elapsedTime - this.lastCollisionTime : 0,
      collisionCount: this.collisionCount,
    };
  }

  getStats(): { totalBalls: number; mainBalls: number; splashBalls: number; activePairs: number } {
    const mainBalls = this.streams.reduce((sum, s) => sum + s.metaballs.length, 0);
    const splashBalls = this.splashMetaballs.length;
    return {
      totalBalls: mainBalls + splashBalls,
      mainBalls,
      splashBalls,
      activePairs: this.pairCooldowns.size,
    };
  }

  reset(): void {
    this.streams = [];
    this.splashMetaballs = [];
    this.collisionCount = 0;
    this.lastCollisionTime = 0;
    this.elapsedTime = 0;
    this.ballIdCounter = 0;
    this.pairCooldowns.clear();
    this.expandStates.clear();
    this.collisionFlash = 0;
    this.initStreams();
  }
}
