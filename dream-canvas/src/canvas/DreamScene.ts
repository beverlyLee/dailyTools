import * as THREE from 'three';
import vert from '../shaders/particle.vert?raw';
import frag from '../shaders/particle.frag?raw';

const PARTICLE_COUNT = 100000;
const SPREAD = 400;
const RESTORE_COLOR = new THREE.Color(0.30, 0.60, 1.00);
const MAX_SPEED = 8.0;

function colorGradient(t: number): [number, number, number] {
  const s = Math.max(0, Math.min(1, t));
  const c0 = new THREE.Color(0.30, 0.60, 1.00);
  const c1 = new THREE.Color(0.45, 0.85, 1.00);
  const c2 = new THREE.Color(0.90, 0.35, 0.95);
  const c3 = new THREE.Color(1.00, 0.15, 0.20);
  if (s < 0.34) {
    const k = s / 0.34;
    return [c0.r + (c1.r - c0.r) * k, c0.g + (c1.g - c0.g) * k, c0.b + (c1.b - c0.b) * k];
  }
  if (s < 0.67) {
    const k = (s - 0.34) / 0.33;
    return [c1.r + (c2.r - c1.r) * k, c1.g + (c2.g - c1.g) * k, c1.b + (c2.b - c1.b) * k];
  }
  const k = (s - 0.67) / 0.33;
  return [c2.r + (c3.r - c2.r) * k, c2.g + (c3.g - c2.g) * k, c2.b + (c3.b - c2.b) * k];
}

export class DreamScene {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;

  private positions!: Float32Array;
  private restPositions!: Float32Array;
  private velocities!: Float32Array;
  private colors!: Float32Array;

  private mouseNDC = new THREE.Vector2(-2, -2);
  private mouseWorld = new THREE.Vector3(0, 0, 0);
  private targetMouseWorld = new THREE.Vector3(0, 0, 0);

  private width = 0;
  private height = 0;
  private rafId = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070d, 0.002);

    this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.1, 2000);
    this.camera.position.z = 300;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x05070d, 1);
    this.container.appendChild(this.renderer.domElement);

    this.createParticles();
  }

  private createParticles() {
    this.geometry = new THREE.BufferGeometry();

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.restPositions = new Float32Array(PARTICLE_COUNT * 3);
    this.velocities = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      this.positions[i3 + 0] = (Math.random() - 0.5) * SPREAD * 2;
      this.positions[i3 + 1] = (Math.random() - 0.5) * SPREAD * 2;
      this.positions[i3 + 2] = (Math.random() - 0.5) * SPREAD;

      this.restPositions[i3 + 0] = this.positions[i3 + 0];
      this.restPositions[i3 + 1] = this.positions[i3 + 1];
      this.restPositions[i3 + 2] = this.positions[i3 + 2];

      this.velocities[i3 + 0] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      this.colors[i3 + 0] = RESTORE_COLOR.r;
      this.colors[i3 + 1] = RESTORE_COLOR.g;
      this.colors[i3 + 2] = RESTORE_COLOR.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 2.2 },
      },
    });

    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);
  }

  onMouseMove(e: MouseEvent) {
    this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const ndc = new THREE.Vector3(this.mouseNDC.x, this.mouseNDC.y, 0.5);
    ndc.unproject(this.camera);
    const dir = ndc.sub(this.camera.position).normalize();
    const dist = -this.camera.position.z / dir.z;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(dist));
    this.targetMouseWorld.copy(pos);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  start() {
    this.animate();
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);

    this.mouseWorld.lerp(this.targetMouseWorld, 0.2);

    const attractionStrength = 2.2;
    const attractionRadius = 180.0;
    const damping = 0.88;
    const returnK = 0.04;
    const returnNonlinear = 0.00015;
    const colorLerp = 0.12;

    const mx = this.mouseWorld.x;
    const my = this.mouseWorld.y;
    const mz = this.mouseWorld.z;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      let vx = this.velocities[i3 + 0];
      let vy = this.velocities[i3 + 1];
      let vz = this.velocities[i3 + 2];

      const px = this.positions[i3 + 0];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      const dx = mx - px;
      const dy = my - py;
      const dz = mz - pz;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq + 0.01);

      if (dist < attractionRadius) {
        const falloff = 1.0 - dist / attractionRadius;
        const force = falloff * falloff * attractionStrength / dist;
        vx += dx * force;
        vy += dy * force;
        vz += dz * force;
      }

      const rx = this.restPositions[i3 + 0] - px;
      const ry = this.restPositions[i3 + 1] - py;
      const rz = this.restPositions[i3 + 2] - pz;
      const restDist = Math.sqrt(rx * rx + ry * ry + rz * rz) + 0.0001;
      const restBoost = 1.0 + restDist * returnNonlinear;

      vx += rx * returnK * restBoost;
      vy += ry * returnK * restBoost;
      vz += rz * returnK * restBoost;

      vx *= damping;
      vy *= damping;
      vz *= damping;

      let speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed;
        vx *= scale;
        vy *= scale;
        vz *= scale;
        speed = MAX_SPEED;
      }

      this.velocities[i3 + 0] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;

      this.positions[i3 + 0] = px + vx;
      this.positions[i3 + 1] = py + vy;
      this.positions[i3 + 2] = pz + vz;

      const t = Math.min(1, speed / MAX_SPEED);
      const [targetR, targetG, targetB] = colorGradient(t * t);

      const dynamicLerp = colorLerp * (0.5 + (1.0 - t) * 2.5);

      this.colors[i3 + 0] += (targetR - this.colors[i3 + 0]) * dynamicLerp;
      this.colors[i3 + 1] += (targetG - this.colors[i3 + 1]) * dynamicLerp;
      this.colors[i3 + 2] += (targetB - this.colors[i3 + 2]) * dynamicLerp;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aVelocity as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.rafId);
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
