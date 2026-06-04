import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { camera } from '../main';

const CATEGORY_COLORS: Record<string, number> = {
  east: 0xff4444,
  south: 0x44ff44,
  north: 0x4488ff,
  west: 0xffaa00,
  northeast: 0xff44ff,
  southwest: 0x44ffff,
  central: 0xffff44,
};

const DEFAULT_COLOR = 0xffffff;

export function getCategoryColor(category: string): number {
  return CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
}

type PatternType = 'disc' | 'cone' | 'beam' | 'sphere';

const PATTERN_MAP: Record<string, PatternType> = {
  east: 'disc',
  west: 'disc',
  north: 'cone',
  south: 'cone',
  northeast: 'beam',
  southwest: 'beam',
  central: 'sphere',
};

const PATTERN_LABELS: Record<PatternType, string> = {
  disc: '水平圆盘',
  cone: '细长锥形',
  beam: '定向喷射',
  sphere: '完美球形',
};

const ARROW_ROTATIONS: Record<string, number> = {
  east: -90,
  west: 90,
  north: 0,
  south: 180,
  northeast: -45,
  southwest: 135,
  central: 0,
};

interface CategoryConfig {
  particleSize: number;
  lifeRange: [number, number];
  saturationBoost: number;
  pattern: PatternType;
  constantSpeed: number;
  coneHalfAngle: number;
  beamAcceleration: number;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  east: { particleSize: 0.18, lifeRange: [2.0, 3.5], saturationBoost: 0.2, pattern: 'disc', constantSpeed: 9, coneHalfAngle: 0, beamAcceleration: 0 },
  west: { particleSize: 0.18, lifeRange: [2.0, 3.5], saturationBoost: 0.2, pattern: 'disc', constantSpeed: 9, coneHalfAngle: 0, beamAcceleration: 0 },
  north: { particleSize: 0.11, lifeRange: [2.5, 4.0], saturationBoost: 0.1, pattern: 'cone', constantSpeed: 7, coneHalfAngle: 0.22, beamAcceleration: 0 },
  south: { particleSize: 0.11, lifeRange: [2.5, 4.0], saturationBoost: 0.1, pattern: 'cone', constantSpeed: 7, coneHalfAngle: 0.22, beamAcceleration: 0 },
  northeast: { particleSize: 0.16, lifeRange: [1.8, 3.2], saturationBoost: 0.3, pattern: 'beam', constantSpeed: 12, coneHalfAngle: 0, beamAcceleration: 4 },
  southwest: { particleSize: 0.16, lifeRange: [1.8, 3.2], saturationBoost: 0.3, pattern: 'beam', constantSpeed: 12, coneHalfAngle: 0, beamAcceleration: 4 },
  central: { particleSize: 0.20, lifeRange: [2.8, 4.5], saturationBoost: 0.0, pattern: 'sphere', constantSpeed: 8, coneHalfAngle: 0, beamAcceleration: 0 },
};

const categoryBiases: Record<string, THREE.Vector3> = {
  east: new THREE.Vector3(1, 0, 0).normalize(),
  south: new THREE.Vector3(0, -0.12, 0.99).normalize(),
  north: new THREE.Vector3(0, 0.22, -0.97).normalize(),
  west: new THREE.Vector3(-1, 0, 0).normalize(),
  northeast: new THREE.Vector3(0.76, 0.54, -0.36).normalize(),
  southwest: new THREE.Vector3(-0.76, -0.54, 0.36).normalize(),
  central: new THREE.Vector3(0, 1, 0).normalize(),
};

const directionOverlay = document.getElementById('direction-overlay')!;

export class Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  private sceneRef: THREE.Scene;
  private baseColor: number;
  private pattern: PatternType;
  private biasDir: THREE.Vector3;
  private birthPos: THREE.Vector3;
  private coneAxis: THREE.Vector3;
  private coneHalfAngle: number;
  private constantSpeed: number;
  private beamAcceleration: number;
  private perp1: THREE.Vector3;
  private perp2: THREE.Vector3;
  private initialRadialDir: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    origin: THREE.Vector3,
    color: number,
    velocity: THREE.Vector3,
    life: number,
    size: number,
    pattern: PatternType,
    biasDir: THREE.Vector3,
    coneHalfAngle: number,
    constantSpeed: number,
    beamAcceleration: number
  ) {
    this.sceneRef = scene;
    this.baseColor = color;
    this.pattern = pattern;
    this.biasDir = biasDir.clone();
    this.birthPos = origin.clone();
    this.coneAxis = biasDir.clone();
    this.coneHalfAngle = coneHalfAngle;
    this.constantSpeed = constantSpeed;
    this.beamAcceleration = beamAcceleration;

    this.perp1 = new THREE.Vector3().crossVectors(biasDir, new THREE.Vector3(0, 1, 0)).normalize();
    if (this.perp1.lengthSq() < 0.01) this.perp1.set(1, 0, 0);
    this.perp2 = new THREE.Vector3().crossVectors(biasDir, this.perp1).normalize();

    this.initialRadialDir = velocity.clone().normalize();

    const geo = new THREE.SphereGeometry(size, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(origin);
    this.mesh.renderOrder = 500;
    scene.add(this.mesh);

    this.velocity = velocity.clone();
    this.life = life;
    this.maxLife = life;
  }

  update(dt: number) {
    this.life -= dt;
    if (this.life <= 0) return false;

    this.applyPatternMotion(dt);
    this.mesh.position.addScaledVector(this.velocity, dt);

    const ratio = this.life / this.maxLife;
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
    this.mesh.scale.setScalar(0.4 + ratio * 0.6);

    return true;
  }

  private applyPatternMotion(dt: number) {
    if (this.pattern === 'disc') {
      this.velocity.y = 0;
      const xzSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      if (xzSpeed > 0) {
        const scale = this.constantSpeed / xzSpeed;
        this.velocity.x *= scale;
        this.velocity.z *= scale;
      }
      this.mesh.position.y = this.birthPos.y;
    } else if (this.pattern === 'cone') {
      const fromApex = this.mesh.position.clone().sub(this.birthPos);
      const dist = fromApex.length();
      if (dist > 0.01) {
        const currentDir = fromApex.clone().normalize();
        const currentAngle = Math.acos(Math.max(-1, Math.min(1, currentDir.dot(this.coneAxis))));
        const angleDiff = currentAngle - this.coneHalfAngle;

        if (Math.abs(angleDiff) > 0.005) {
          const perpAxis = new THREE.Vector3().crossVectors(currentDir, this.coneAxis).normalize();
          if (perpAxis.lengthSq() > 0.001) {
            const quat = new THREE.Quaternion().setFromAxisAngle(perpAxis, -angleDiff);
            const posDir = currentDir.clone().applyQuaternion(quat);
            this.mesh.position.copy(this.birthPos).addScaledVector(posDir, dist);
            this.velocity.copy(posDir).multiplyScalar(this.constantSpeed);
          }
        } else {
          this.velocity.copy(currentDir).multiplyScalar(this.constantSpeed);
        }
      }
    } else if (this.pattern === 'beam') {
      const currentSpeed = this.velocity.dot(this.biasDir);
      const newSpeed = currentSpeed + this.beamAcceleration * dt;
      const clampedSpeed = Math.min(Math.max(newSpeed, 2), 25);
      this.velocity.copy(this.biasDir).multiplyScalar(clampedSpeed);
      const perp1Comp = this.velocity.dot(this.perp1);
      const perp2Comp = this.velocity.dot(this.perp2);
      this.velocity.addScaledVector(this.perp1, -perp1Comp);
      this.velocity.addScaledVector(this.perp2, -perp2Comp);
    } else if (this.pattern === 'sphere') {
      const fromCenter = this.mesh.position.clone().sub(this.birthPos);
      if (fromCenter.lengthSq() > 0.01) {
        fromCenter.normalize();
        this.velocity.copy(fromCenter).multiplyScalar(this.constantSpeed);
      } else {
        this.velocity.copy(this.initialRadialDir).multiplyScalar(this.constantSpeed);
      }
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.MeshBasicMaterial).dispose();
  }
}

export class Firework {
  rocket: THREE.Mesh;
  targetY: number;
  color: number;
  particleCount: number;
  category: string;
  region: string;
  population: number;
  gdp: number;
  particles: Particle[] = [];
  exploded = false;
  private scene: THREE.Scene;
  private rocketVelocity: THREE.Vector3;
  private trailParticles: Particle[] = [];
  private trailTimer = 0;
  private patternEffects: THREE.Object3D[] = [];
  private bias: THREE.Vector3;
  private pattern: PatternType;
  private preExplodeTimer = 0;
  private preExplodeTriggered = false;
  private dirDomElement?: HTMLDivElement;
  private dirIndicatorShown = false;
  private explosionOrigin?: THREE.Vector3;
  private totalParticleLife = 0;
  private explosionTime = 0;

  constructor(
    scene: THREE.Scene,
    x: number,
    data: { region: string; population: number; gdp: number; category: string }
  ) {
    this.scene = scene;
    this.region = data.region;
    this.population = data.population;
    this.gdp = data.gdp;
    this.category = data.category;
    this.color = getCategoryColor(data.category);
    this.pattern = PATTERN_MAP[data.category] ?? 'sphere';
    this.bias = categoryBiases[data.category] ?? new THREE.Vector3(0, 1, 0);

    const gdpNorm = data.gdp / 160000;
    this.targetY = 8 + gdpNorm * 22;

    const popNorm = data.population / 32000;
    this.particleCount = Math.floor(60 + popNorm * 320);

    const geo = new THREE.SphereGeometry(0.26, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: this.color, depthTest: false });
    this.rocket = new THREE.Mesh(geo, mat);
    this.rocket.renderOrder = 600;
    this.rocket.position.set(x, -1.8, 0);
    scene.add(this.rocket);

    this.rocketVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      15 + gdpNorm * 18,
      0
    );
  }

  update(dt: number): boolean {
    if (!this.exploded) {
      this.rocketVelocity.y -= 9.8 * dt * 0.55;
      this.rocket.position.addScaledVector(this.rocketVelocity, dt);

      this.trailTimer += dt;
      if (this.trailTimer > 0.02) {
        this.trailTimer = 0;
        const trailVel = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          -1.8 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.2
        );
        const trail = new Particle(
          this.scene,
          this.rocket.position.clone(),
          this.color,
          trailVel,
          0.6,
          0.11,
          'sphere',
          this.bias,
          0,
          6,
          0
        );
        trail.mesh.renderOrder = 599;
        this.trailParticles.push(trail);
      }

      if (!this.preExplodeTriggered) {
        const distToTarget = this.targetY - this.rocket.position.y;
        const timeToExplode = distToTarget / this.rocketVelocity.y;
        if (timeToExplode > 0 && timeToExplode <= 0.1) {
          this.showDirectionIndicator();
          this.preExplodeTriggered = true;
        }
      }

      if (this.rocket.position.y >= this.targetY || this.rocketVelocity.y <= 0) {
        this.explode();
      }

      this.trailParticles = this.trailParticles.filter((p) => p.update(dt));
    } else {
      this.explosionTime += dt;
      this.updateDirectionIndicatorPosition();
    }

    this.particles = this.particles.filter((p) => p.update(dt));
    this.patternEffects.forEach((obj) => {
      if (obj.userData.update) obj.userData.update(dt);
    });

    if (this.exploded && this.particles.length === 0 && this.trailParticles.length === 0) {
      this.hideDirectionIndicator();
      return false;
    }

    return true;
  }

  private showDirectionIndicator() {
    if (this.dirIndicatorShown) return;
    this.dirIndicatorShown = true;

    const indicator = document.createElement('div');
    indicator.className = 'dir-indicator';
    const hex = '#' + new THREE.Color(this.color).getHexString();
    const rotation = ARROW_ROTATIONS[this.category] ?? 0;
    const patternLabel = PATTERN_LABELS[this.pattern];

    indicator.innerHTML = `
      <div class="dir-arrow" style="color: ${hex}; transform: rotate(${rotation}deg);">➤</div>
      <div class="dir-label" style="color: ${hex}; border-color: ${hex};">${patternLabel} · ${this.region}</div>
    `;

    directionOverlay.appendChild(indicator);
    this.dirDomElement = indicator;

    requestAnimationFrame(() => {
      indicator.classList.add('visible');
    });
  }

  private updateDirectionIndicatorPosition() {
    if (!this.dirDomElement || !this.explosionOrigin) return;

    const projected = this.explosionOrigin.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    this.dirDomElement.style.left = x + 'px';
    this.dirDomElement.style.top = y + 'px';
  }

  private hideDirectionIndicator() {
    if (this.dirDomElement) {
      this.dirDomElement.classList.remove('visible');
      this.dirDomElement.classList.add('hiding');
      const el = this.dirDomElement;
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 700);
      this.dirDomElement = undefined;
    }
    this.dirIndicatorShown = false;
  }

  private explode() {
    this.exploded = true;
    this.explosionOrigin = this.rocket.position.clone();
    this.explosionTime = 0;
    this.scene.remove(this.rocket);
    this.rocket.geometry.dispose();
    (this.rocket.material as THREE.MeshBasicMaterial).dispose();

    const origin = this.rocket.position.clone();
    const count = this.particleCount;

    this.createPatternEffect(origin, this.bias);

    const cfg = CATEGORY_CONFIGS[this.category] ?? CATEGORY_CONFIGS.central;
    const baseColorObj = new THREE.Color(this.color);
    const hsl = { h: 0, s: 0, l: 0 };
    baseColorObj.getHSL(hsl);
    const baseSaturation = Math.min(1, hsl.s + cfg.saturationBoost);

    let maxLife = 0;

    for (let i = 0; i < count; i++) {
      let dir: THREE.Vector3;

      if (this.pattern === 'disc') {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.pow(Math.random(), 0.5);
        dir = new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        );
        if (this.category === 'east') {
          dir.x = Math.abs(dir.x) * 0.5 + 0.5;
        } else if (this.category === 'west') {
          dir.x = -Math.abs(dir.x) * 0.5 - 0.5;
        }
        dir.normalize();
      } else if (this.pattern === 'cone') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - Math.random() * (1 - Math.cos(cfg.coneHalfAngle)));
        const r = 1;
        dir = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );
        dir.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.bias));
      } else if (this.pattern === 'beam') {
        dir = this.bias.clone();
      } else {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        dir = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi)
        );
      }

      dir.normalize();

      const vel = dir.multiplyScalar(cfg.constantSpeed);

      const hueShift = (Math.random() - 0.5) * 0.06;
      const finalColor = new THREE.Color().setHSL(
        (hsl.h + hueShift + 1) % 1,
        Math.min(1, baseSaturation + (Math.random() - 0.5) * 0.08),
        Math.min(1, Math.max(0.4, hsl.l + (Math.random() - 0.5) * 0.15))
      );

      const life = cfg.lifeRange[0] + Math.random() * (cfg.lifeRange[1] - cfg.lifeRange[0]);
      maxLife = Math.max(maxLife, life);

      const particle = new Particle(
        this.scene,
        origin,
        finalColor.getHex(),
        vel,
        life,
        cfg.particleSize,
        this.pattern,
        this.bias,
        cfg.coneHalfAngle,
        cfg.constantSpeed,
        cfg.beamAcceleration
      );
      this.particles.push(particle);
    }

    this.totalParticleLife = maxLife;

    const flashGeo = new THREE.SphereGeometry(3.2, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(origin);
    flash.renderOrder = 900;
    this.scene.add(flash);

    new TWEEN.Tween(flashMat)
      .to({ opacity: 0 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => {
        this.scene.remove(flash);
        flashGeo.dispose();
        flashMat.dispose();
      })
      .start();
  }

  private createPatternEffect(origin: THREE.Vector3, bias: THREE.Vector3) {
    if (this.pattern === 'disc') {
      const ringGeo = new THREE.RingGeometry(0.5, 1.5, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: false,
        opacity: 1,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(origin);
      ring.lookAt(origin.clone().add(new THREE.Vector3(0, 1, 0)));
      ring.renderOrder = 950;
      this.scene.add(ring);

      const animState = { t: 0, scale: 1 };
      ring.userData.update = (dt: number) => {
        animState.t += dt;
        animState.scale = 1 + animState.t * 12;
        ring.scale.setScalar(animState.scale);
        const maxT = this.totalParticleLife;
        ringMat.opacity = Math.max(0, 0.9 * (1 - animState.t / maxT));
      };
      ring.userData.cleanup = () => {
        this.scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();
      };
      this.patternEffects.push(ring);

      setTimeout(ring.userData.cleanup, this.totalParticleLife * 1000 + 100);
    } else if (this.pattern === 'cone') {
      const coneHeight = 18;
      const coneRadius = Math.tan(CATEGORY_CONFIGS[this.category].coneHalfAngle) * coneHeight;
      const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 48, 1, false);
      const coneMat = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.6,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(origin);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bias);
      cone.position.addScaledVector(bias, coneHeight / 2);
      cone.renderOrder = 800;
      this.scene.add(cone);

      const wireGeo = new THREE.ConeGeometry(coneRadius * 1.02, coneHeight, 24, 4, true);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        wireframe: true,
        depthTest: false,
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.copy(cone.position);
      wire.quaternion.copy(cone.quaternion);
      wire.renderOrder = 801;
      this.scene.add(wire);

      const animState = { t: 0 };
      cone.userData.update = (dt: number) => {
        animState.t += dt;
        const maxT = this.totalParticleLife;
        coneMat.opacity = Math.max(0, 0.55 * (1 - animState.t / maxT));
        wireMat.opacity = Math.max(0, 0.7 * (1 - animState.t / maxT));
        const pulse = 1 + Math.sin(animState.t * 8) * 0.05;
        cone.scale.setScalar(pulse);
        wire.scale.setScalar(pulse * 1.02);
      };
      cone.userData.cleanup = () => {
        this.scene.remove(cone);
        this.scene.remove(wire);
        coneGeo.dispose();
        coneMat.dispose();
        wireGeo.dispose();
        wireMat.dispose();
      };
      this.patternEffects.push(cone);

      setTimeout(cone.userData.cleanup, this.totalParticleLife * 1000 + 100);
    } else if (this.pattern === 'beam') {
      const beamLength = 28;
      const tubeGeo = new THREE.CylinderGeometry(0.25, 0.5, beamLength, 24, 1, true);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: false,
        opacity: 1,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.copy(origin);
      tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bias);
      tube.position.addScaledVector(bias, beamLength / 2);
      tube.renderOrder = 850;
      this.scene.add(tube);

      const coreGeo = new THREE.CylinderGeometry(0.08, 0.15, beamLength * 1.1, 12);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.copy(tube.position);
      core.quaternion.copy(tube.quaternion);
      core.renderOrder = 851;
      this.scene.add(core);

      const animState = { t: 0 };
      tube.userData.update = (dt: number) => {
        animState.t += dt;
        const maxT = this.totalParticleLife;
        tubeMat.opacity = Math.max(0, 1 * (1 - animState.t / maxT));
        coreMat.opacity = Math.max(0, 0.85 * (1 - animState.t / maxT));
        const pulse = 1 + Math.sin(animState.t * 15) * 0.15;
        tube.scale.y = pulse;
        core.scale.y = pulse * 1.05;
        tube.scale.x = 1 + Math.sin(animState.t * 10) * 0.1;
        tube.scale.z = 1 + Math.sin(animState.t * 10) * 0.1;
      };
      tube.userData.cleanup = () => {
        this.scene.remove(tube);
        this.scene.remove(core);
        tubeGeo.dispose();
        tubeMat.dispose();
        coreGeo.dispose();
        coreMat.dispose();
      };
      this.patternEffects.push(tube);

      setTimeout(tube.userData.cleanup, this.totalParticleLife * 1000 + 100);
    } else if (this.pattern === 'sphere') {
      const shellGeo = new THREE.SphereGeometry(1, 32, 32);
      const shellMat = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      shell.position.copy(origin);
      shell.renderOrder = 820;
      this.scene.add(shell);

      const wireGeo = new THREE.SphereGeometry(1.02, 16, 16);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        wireframe: true,
        depthTest: false,
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.copy(origin);
      wire.renderOrder = 821;
      this.scene.add(wire);

      const animState = { t: 0 };
      shell.userData.update = (dt: number) => {
        animState.t += dt;
        const maxT = this.totalParticleLife;
        const scale = 1 + animState.t * (this.particleCount > 200 ? 10 : 7);
        shell.scale.setScalar(scale);
        wire.scale.setScalar(scale * 1.02);
        shellMat.opacity = Math.max(0, 0.45 * (1 - animState.t / maxT));
        wireMat.opacity = Math.max(0, 0.65 * (1 - animState.t / maxT));
      };
      shell.userData.cleanup = () => {
        this.scene.remove(shell);
        this.scene.remove(wire);
        shellGeo.dispose();
        shellMat.dispose();
        wireGeo.dispose();
        wireMat.dispose();
      };
      this.patternEffects.push(shell);

      setTimeout(shell.userData.cleanup, this.totalParticleLife * 1000 + 100);
    }
  }

  dispose() {
    if (!this.exploded) {
      this.scene.remove(this.rocket);
      this.rocket.geometry.dispose();
      (this.rocket.material as THREE.MeshBasicMaterial).dispose();
    }
    this.hideDirectionIndicator();
    this.patternEffects.forEach((obj) => {
      if (obj.userData.cleanup) obj.userData.cleanup();
    });
    this.patternEffects = [];
    this.particles.forEach((p) => p.dispose(this.scene));
    this.trailParticles.forEach((p) => p.dispose(this.scene));
    this.particles = [];
    this.trailParticles = [];
  }
}
