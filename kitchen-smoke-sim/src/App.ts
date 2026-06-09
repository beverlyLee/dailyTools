import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SmokeEmitter } from './smoke/SmokeEmitter';
import { RangeHoodSuction } from './suction/RangeHoodSuction';
import { AirflowDisturbance } from './airflow/AirflowDisturbance';
import { GreaseDeposition } from './deposition/GreaseDeposition';
import { PurificationAdvisor } from './advice/PurificationAdvisor';
import { SimulationConfig, SmokeParticle } from './types/Particle';

export class KitchenSmokeApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private controls: OrbitControls;
  private timer: THREE.Timer;

  private smokeEmitter!: SmokeEmitter;
  private rangeHood!: RangeHoodSuction;
  private airflow!: AirflowDisturbance;
  private greaseDeposition!: GreaseDeposition;
  private advisor!: PurificationAdvisor;

  private config: SimulationConfig;
  private kitchenBounds: { min: THREE.Vector3; max: THREE.Vector3 };
  private totalEmitted = 0;
  private escapedCount = 0;

  private hoodOn: boolean = true;
  private windowOpen: boolean = false;
  private showDeposition: boolean = true;

  private stovePosition: THREE.Vector3;
  private hoodPosition: THREE.Vector3;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.container = canvas;
    this.timer = new THREE.Timer();

    this.kitchenBounds = {
      min: new THREE.Vector3(-3, 0, -2.5),
      max: new THREE.Vector3(3, 2.8, 2.5),
    };

    this.stovePosition = new THREE.Vector3(0, 0.05, 0);
    this.hoodPosition = new THREE.Vector3(0, 2.0, 0);

    this.config = {
      maxParticles: 1500,
      emissionRate: 60,
      firePower: 1,
      suctionPower: 1.5,
      hoodHeight: 0.75,
      windowOpen: false,
      gravity: 1.2,
      buoyancy: 2.5,
      diffusion: 0.12,
      airResistance: 2.0,
    };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f0e8);
    this.scene.fog = new THREE.Fog(0xf5f0e8, 8, 20);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(4, 2.5, 4.5);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 1.2, 0);

    this.createKitchenScene();
    this.initModules();
    this.setupUI();

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.animate();
  }

  private createKitchenScene(): void {
    this.createFloor();
    this.createWalls();
    this.createCeiling();
    this.createCabinets();
    this.createStove();
    this.createWindow();
    this.setupLighting();
  }

  private createFloor(): void {
    const floorGeo = new THREE.PlaneGeometry(6, 5);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe8e0d5,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const tileSize = 0.6;
    const tileGeo = new THREE.PlaneGeometry(tileSize * 0.95, tileSize * 0.95);
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0xf0ebe3,
      roughness: 0.7,
      metalness: 0.05,
    });

    for (let x = -2.7; x <= 2.7; x += tileSize) {
      for (let z = -2.2; z <= 2.2; z += tileSize) {
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, 0.001, z);
        tile.receiveShadow = true;
        this.scene.add(tile);
      }
    }
  }

  private createWalls(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xfaf6f0,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 2.8),
      wallMat
    );
    backWall.position.set(0, 1.4, -2.5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 2.8),
      wallMat
    );
    leftWall.position.set(-3, 1.4, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 2.8),
      wallMat
    );
    rightWall.position.set(3, 1.4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);
  }

  private createCeiling(): void {
    const ceilingGeo = new THREE.PlaneGeometry(6, 5);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 2.8;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);

    const ceilingLightGeo = new THREE.PlaneGeometry(1.2, 0.3);
    const ceilingLightMat = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.9,
    });
    const ceilingLight = new THREE.Mesh(ceilingLightGeo, ceilingLightMat);
    ceilingLight.rotation.x = Math.PI / 2;
    ceilingLight.position.set(0, 2.78, 1.5);
    this.scene.add(ceilingLight);
  }

  private createCabinets(): void {
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.6,
      metalness: 0.1,
    });

    const counterMat = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      roughness: 0.3,
      metalness: 0.2,
    });

    const lowerCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.8, 0.6),
      cabinetMat
    );
    lowerCabinet.position.set(0, 0.4, -0.3);
    lowerCabinet.castShadow = true;
    lowerCabinet.receiveShadow = true;
    this.scene.add(lowerCabinet);

    const countertop = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.05, 0.65),
      counterMat
    );
    countertop.position.set(0, 0.825, -0.3);
    countertop.castShadow = true;
    countertop.receiveShadow = true;
    this.scene.add(countertop);

    const upperCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.7, 0.35),
      cabinetMat
    );
    upperCabinet.position.set(0, 2.35, -1.8);
    upperCabinet.castShadow = true;
    upperCabinet.receiveShadow = true;
    this.scene.add(upperCabinet);

    const leftCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 1.5),
      cabinetMat
    );
    leftCabinet.position.set(-2.6, 2.35, -1.2);
    leftCabinet.castShadow = true;
    leftCabinet.receiveShadow = true;
    this.scene.add(leftCabinet);
  }

  private createStove(): void {
    const stoveBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.08, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.8,
        roughness: 0.3,
      })
    );
    stoveBase.position.set(0, 0.86, -0.3);
    stoveBase.castShadow = true;
    stoveBase.receiveShadow = true;
    this.scene.add(stoveBase);

    const burnerPositions = [
      { x: -0.25, z: -0.15 },
      { x: 0.25, z: -0.15 },
      { x: -0.25, z: -0.45 },
      { x: 0.25, z: -0.45 },
    ];

    burnerPositions.forEach((pos, index) => {
      const burnerGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.03, 32);
      const burnerMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.7,
        roughness: 0.4,
      });
      const burner = new THREE.Mesh(burnerGeo, burnerMat);
      burner.position.set(pos.x, 0.905, pos.z - 0.3);
      burner.castShadow = true;
      this.scene.add(burner);

      if (index === 1) {
        const panGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.08, 32);
        const panMat = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          metalness: 0.6,
          roughness: 0.5,
        });
        const pan = new THREE.Mesh(panGeo, panMat);
        pan.position.set(pos.x, 0.97, pos.z - 0.3);
        pan.castShadow = true;
        this.scene.add(pan);

        const handleGeo = new THREE.BoxGeometry(0.25, 0.03, 0.03);
        const handle = new THREE.Mesh(handleGeo, panMat);
        handle.position.set(pos.x + 0.32, 0.97, pos.z - 0.3);
        this.scene.add(handle);

        this.stovePosition.set(pos.x, 1.05, pos.z - 0.3);

        const flameGeo = new THREE.ConeGeometry(0.15, 0.12, 16, 1, true);
        const flameMat = new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(pos.x, 0.96, pos.z - 0.3);
        flame.rotation.x = Math.PI;
        this.scene.add(flame);

        const innerFlameGeo = new THREE.ConeGeometry(0.08, 0.08, 16, 1, true);
        const innerFlameMat = new THREE.MeshBasicMaterial({
          color: 0xffff00,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });
        const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
        innerFlame.position.set(pos.x, 0.96, pos.z - 0.3);
        innerFlame.rotation.x = Math.PI;
        this.scene.add(innerFlame);
      }
    });
  }

  private createWindow(): void {
    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.1,
    });

    const windowGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.3,
      roughness: 0,
      metalness: 0,
      transmission: 0.9,
      thickness: 0.01,
    });

    const frameWidth = 0.08;
    const winWidth = 1.2;
    const winHeight = 0.8;

    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(winWidth + frameWidth * 2, frameWidth, frameWidth),
      windowFrameMat
    );
    topFrame.position.set(-2.96, 1.8, 0);
    this.scene.add(topFrame);

    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(winWidth + frameWidth * 2, frameWidth, frameWidth),
      windowFrameMat
    );
    bottomFrame.position.set(-2.96, 1, 0);
    this.scene.add(bottomFrame);

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, winHeight, frameWidth),
      windowFrameMat
    );
    leftFrame.position.set(-2.96, 1.4, -winWidth / 2);
    this.scene.add(leftFrame);

    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, winHeight, frameWidth),
      windowFrameMat
    );
    rightFrame.position.set(-2.96, 1.4, winWidth / 2);
    this.scene.add(rightFrame);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(winWidth, winHeight),
      windowGlassMat
    );
    glass.position.set(-2.95, 1.4, 0);
    glass.rotation.y = Math.PI / 2;
    this.scene.add(glass);

    const midFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth * 0.6, winHeight, frameWidth * 0.6),
      windowFrameMat
    );
    midFrame.position.set(-2.96, 1.4, 0);
    this.scene.add(midFrame);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const ceilingLight = new THREE.PointLight(0xffffee, 0.8, 8);
    ceilingLight.position.set(0, 2.7, 1.5);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.width = 1024;
    ceilingLight.shadow.mapSize.height = 1024;
    this.scene.add(ceilingLight);

    const hoodLight = new THREE.PointLight(0xffffcc, 0.6, 3);
    hoodLight.position.set(0, 1.7, -0.3);
    this.scene.add(hoodLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(2, 5, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -4;
    dirLight.shadow.camera.right = 4;
    dirLight.shadow.camera.top = 4;
    dirLight.shadow.camera.bottom = -4;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.2);
    fillLight.position.set(-3, 3, -2);
    this.scene.add(fillLight);
  }

  private initModules(): void {
    const emitterPos = this.stovePosition.clone();
    emitterPos.y += 0.05;

    this.smokeEmitter = new SmokeEmitter(
      this.scene,
      this.config,
      emitterPos,
      this.config.maxParticles
    );

    const hoodPos = this.stovePosition.clone();
    hoodPos.y = 2.0;
    this.hoodPosition.copy(hoodPos);

    this.rangeHood = new RangeHoodSuction(
      this.scene,
      this.config,
      hoodPos
    );

    this.airflow = new AirflowDisturbance(
      this.scene,
      this.config,
      this.kitchenBounds
    );

    this.greaseDeposition = new GreaseDeposition(
      this.scene,
      this.config,
      this.kitchenBounds
    );

    this.advisor = new PurificationAdvisor();
  }

  private setupUI(): void {
    const hoodToggle = document.getElementById('range-hood-toggle') as HTMLInputElement;
    const suctionSlider = document.getElementById('suction-power') as HTMLInputElement;
    const suctionValue = document.getElementById('suction-value')!;
    const hoodHeightSlider = document.getElementById('hood-height') as HTMLInputElement;
    const hoodHeightValue = document.getElementById('hood-height-value')!;
    const windowToggle = document.getElementById('window-toggle') as HTMLInputElement;
    const fireSlider = document.getElementById('fire-power') as HTMLInputElement;
    const fireValue = document.getElementById('fire-value')!;
    const depositionToggle = document.getElementById('deposition-toggle') as HTMLInputElement;
    const resetBtn = document.getElementById('reset-btn')!;

    hoodToggle.addEventListener('change', (e) => {
      this.hoodOn = (e.target as HTMLInputElement).checked;
      this.rangeHood.setActive(this.hoodOn);
      this.advisor.setHoodOn(this.hoodOn);
    });

    suctionSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.suctionPower = value;
      suctionValue.textContent = value.toFixed(1);
      this.rangeHood.setSuctionStrength(value);
      this.advisor.setSuctionPower(value);
    });

    hoodHeightSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.hoodHeight = value;
      hoodHeightValue.textContent = value.toFixed(2);
      const hoodY = 2.0 - (0.75 - value);
      this.rangeHood.setHoodHeight(hoodY);
      this.hoodPosition.y = hoodY;
      this.advisor.setHoodHeight(value);
    });

    windowToggle.addEventListener('change', (e) => {
      this.windowOpen = (e.target as HTMLInputElement).checked;
      this.config.windowOpen = this.windowOpen;
      this.airflow.setWindowOpen(this.windowOpen);
      this.advisor.setWindowOpen(this.windowOpen);
    });

    fireSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.firePower = value;
      fireValue.textContent = value.toFixed(1);
      this.smokeEmitter.setConfig(this.config);
      this.advisor.setFirePower(value);
    });

    depositionToggle.addEventListener('change', (e) => {
      this.showDeposition = (e.target as HTMLInputElement).checked;
      this.greaseDeposition.setVisible(this.showDeposition);
    });

    resetBtn.addEventListener('click', () => {
      this.resetSimulation();
    });
  }

  private resetSimulation(): void {
    this.totalEmitted = 0;
    this.escapedCount = 0;
    this.rangeHood.resetCapturedCount();
    this.greaseDeposition.reset();
    this.advisor.reset();
    this.smokeEmitter.dispose();

    const emitterPos = this.stovePosition.clone();
    emitterPos.y += 0.05;
    this.smokeEmitter = new SmokeEmitter(
      this.scene,
      this.config,
      emitterPos,
      this.config.maxParticles
    );
  }

  private updateStats(): void {
    const particles = this.smokeEmitter.getParticles();
    const captured = this.rangeHood.getCapturedCount();
    const deposited = this.greaseDeposition.getDepositCount();
    const total = captured + this.escapedCount + deposited + particles.length;

    if (total > 0) {
      this.totalEmitted = total;
    }

    const escapeRate = total > 0 ? ((this.escapedCount + deposited) / total) * 100 : 0;

    document.getElementById('escape-rate')!.textContent = escapeRate.toFixed(1) + '%';
    document.getElementById('captured-count')!.textContent = captured.toString();
    document.getElementById('escaped-count')!.textContent = this.escapedCount.toString();
    document.getElementById('deposit-count')!.textContent = deposited.toString();

    this.advisor.updateStats(total, captured, this.escapedCount, deposited);

    const adviceText = document.getElementById('advice-text')!;
    const advicePanel = document.getElementById('advice-panel')!;
    adviceText.textContent = this.advisor.getSummaryText();

    advicePanel.classList.remove('warning', 'good');
    const level = this.advisor.getAdviceLevel();
    if (level === 'good') {
      advicePanel.classList.add('good');
    } else if (level === 'warning') {
      advicePanel.classList.add('warning');
    }
  }

  private checkBoundaries(particles: SmokeParticle[]): void {
    for (const p of particles) {
      if (p.captured || p.escaped || p.deposited) continue;

      if (
        p.position.x < this.kitchenBounds.min.x - 0.5 ||
        p.position.x > this.kitchenBounds.max.x + 0.5 ||
        p.position.z < this.kitchenBounds.min.z - 0.5 ||
        p.position.z > this.kitchenBounds.max.z + 0.5 ||
        p.position.y > this.kitchenBounds.max.y + 0.3
      ) {
        p.escaped = true;
        this.escapedCount++;
      }
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    this.timer.update();
    const deltaTime = Math.min(this.timer.getDelta(), 0.05);

    const particles = this.smokeEmitter.getParticles();

    const suctionForces = this.rangeHood.calculateForces(particles);
    const airflowForces = this.airflow.calculateForces(particles, deltaTime);

    const totalForces: THREE.Vector3[] = [];
    for (let i = 0; i < particles.length; i++) {
      const force = new THREE.Vector3();
      force.add(suctionForces[i] || new THREE.Vector3());
      force.add(airflowForces[i] || new THREE.Vector3());
      totalForces.push(force);
    }

    this.smokeEmitter.update(deltaTime, totalForces);

    this.rangeHood.update(deltaTime);
    this.greaseDeposition.update(deltaTime);

    this.greaseDeposition.checkDeposition(particles);

    this.checkBoundaries(particles);

    this.updateStats();

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.smokeEmitter.dispose();
    this.rangeHood.dispose();
    this.greaseDeposition.dispose();
    this.airflow.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}
