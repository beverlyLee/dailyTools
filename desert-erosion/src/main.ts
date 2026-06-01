import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RockFormation } from './terrain/RockFormation';
import { WindErosion, WindDirection } from './systems/WindErosion';

class DesertErosionApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private rock: RockFormation;
  private windErosion: WindErosion;
  private sandParticles: THREE.Points;

  private autoRotate: boolean = true;

  private btnErode: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private windSpeedSlider: HTMLInputElement;
  private erosionStrengthSlider: HTMLInputElement;
  private autoRotateCheckbox: HTMLInputElement;

  private statusEl: HTMLElement;
  private windDirEl: HTMLElement;
  private timeEl: HTMLElement;
  private displacementEl: HTMLElement;
  private windwardEl: HTMLElement;

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = this.createSkyGradient();
    this.scene.fog = new THREE.FogExp2(0xe8d4a8, 0.02);

    const container = document.getElementById('canvas-container')!;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 3, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2;
    this.controls.target.set(0, 1, 0);

    this.setupLighting();
    this.createGround();

    this.rock = new RockFormation();
    this.rock.mesh.position.y = 0.8;
    this.scene.add(this.rock.mesh);

    this.windErosion = new WindErosion(this.rock);

    this.sandParticles = this.createSandParticles();
    this.scene.add(this.sandParticles);

    this.btnErode = document.getElementById('btn-erode') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.windSpeedSlider = document.getElementById('wind-speed') as HTMLInputElement;
    this.erosionStrengthSlider = document.getElementById('erosion-strength') as HTMLInputElement;
    this.autoRotateCheckbox = document.getElementById('auto-rotate') as HTMLInputElement;

    this.statusEl = document.getElementById('erosion-status')!;
    this.windDirEl = document.getElementById('wind-direction')!;
    this.timeEl = document.getElementById('erosion-time')!;
    this.displacementEl = document.getElementById('total-displacement')!;
    this.windwardEl = document.getElementById('windward-count')!;

    this.setupEventListeners();
    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private createSkyGradient(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#F0E68C');
    gradient.addColorStop(0.7, '#F4A460');
    gradient.addColorStop(1, '#DEB887');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.4);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xc4a35a, 0.6);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
    sunLight.position.set(8, 10, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.bias = -0.0001;
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xffe4b5, 0.3);
    fillLight.position.set(-6, 4, -4);
    this.scene.add(fillLight);
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    const positions = groundGeometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const dist = Math.sqrt(x * x + z * z);
      positions[i + 1] = Math.sin(dist * 0.1) * 0.2 + Math.random() * 0.05;
    }

    groundGeometry.computeVertexNormals();

    const sandColors = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const variation = (Math.random() - 0.5) * 0.1;
      sandColors[i] = 0.91 + variation;
      sandColors[i + 1] = 0.83 + variation;
      sandColors[i + 2] = 0.66 + variation;
    }
    groundGeometry.setAttribute('color', new THREE.BufferAttribute(sandColors, 3));

    const groundMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.0,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private createSandParticles(): THREE.Points {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 10;
      positions[i3 + 1] = Math.random() * 3;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;

      const colorVar = Math.random() * 0.2;
      colors[i3] = 0.92 - colorVar;
      colors[i3 + 1] = 0.84 - colorVar;
      colors[i3 + 2] = 0.68 - colorVar;

      sizes[i] = 0.02 + Math.random() * 0.04;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    particles.visible = false;
    return particles;
  }

  private setupEventListeners(): void {
    this.windErosion.setOnErosionStop(() => {
      this.btnErode.textContent = '🌬️ 开始风蚀';
      this.btnErode.classList.remove('active');
      this.sandParticles.visible = false;
    });

    this.btnErode.addEventListener('click', () => {
      const isEroding = this.windErosion.toggle();
      if (isEroding) {
        this.btnErode.textContent = '⏸️ 暂停风蚀';
        this.btnErode.classList.add('active');
        this.sandParticles.visible = true;
      } else {
        this.btnErode.textContent = '🌬️ 开始风蚀';
        this.btnErode.classList.remove('active');
        this.sandParticles.visible = false;
      }
    });

    this.btnReset.addEventListener('click', () => {
      this.windErosion.reset();
      this.btnErode.textContent = '🌬️ 开始风蚀';
      this.btnErode.classList.remove('active');
      this.sandParticles.visible = false;
    });

    this.windSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.windErosion.windSpeed = value;
      document.getElementById('wind-speed-value')!.textContent = value.toFixed(1);
    });

    this.erosionStrengthSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.windErosion.erosionStrength = value;
      document.getElementById('erosion-strength-value')!.textContent = value.toFixed(1);
    });

    this.autoRotateCheckbox.addEventListener('change', (e) => {
      this.autoRotate = (e.target as HTMLInputElement).checked;
    });

    document.querySelectorAll('.toggle-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const direction = target.dataset.direction as WindDirection;

        document.querySelectorAll('.toggle-btn').forEach((b) => {
          b.classList.remove('active');
        });
        target.classList.add('active');

        this.windErosion.setDirection(direction);
      });
    });
  }

  private updateSandParticles(deltaTime: number): void {
    if (!this.sandParticles.visible) return;

    const positions = this.sandParticles.geometry.attributes.position.array as Float32Array;
    const windDir = this.windErosion.getWindDirection();
    const speed = this.windErosion.windSpeed * 2 * deltaTime;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += windDir.x * speed * (0.5 + Math.random() * 1.5);
      positions[i + 1] += (Math.random() - 0.3) * 0.02;
      positions[i + 2] += windDir.z * speed * (0.5 + Math.random() * 1.5);

      if (positions[i] > 6) positions[i] = -6;
      if (positions[i] < -6) positions[i] = 6;
      if (positions[i + 1] > 4) positions[i + 1] = 0.1;
      if (positions[i + 1] < 0) positions[i + 1] = 3.5;
      if (positions[i + 2] > 6) positions[i + 2] = -6;
      if (positions[i + 2] < -6) positions[i + 2] = 6;
    }

    this.sandParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateUI(): void {
    const stats = this.windErosion.getStats();

    this.statusEl.textContent = stats.isEroding ? '🌬️ 风蚀中...' : '⏸️ 已停止';
    this.windDirEl.textContent = this.windErosion.getDirectionLabel();
    this.timeEl.textContent = stats.erosionTime.toFixed(1) + ' s';
    this.displacementEl.textContent = stats.totalDisplacement.toFixed(3);
    this.windwardEl.textContent = stats.windwardVertexCount.toString();
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (this.autoRotate && !this.controls.enabled) {
      this.controls.update();
    } else if (this.autoRotate) {
      this.controls.update();
    } else {
      this.controls.update();
    }

    this.windErosion.update(deltaTime);
    this.updateSandParticles(deltaTime);

    if (this.autoRotate) {
      this.rock.mesh.rotation.y += deltaTime * 0.05;
    }

    this.updateUI();
    this.renderer.render(this.scene, this.camera);
  }
}

new DesertErosionApp();
