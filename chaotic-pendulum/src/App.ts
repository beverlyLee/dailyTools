import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DoublePendulum } from './pendulum/DoublePendulum';
import { TrailSystem } from './utils/TrailSystem';
import { LogChart } from './utils/LogChart';
import type { PendulumState, PhysicsParams } from './physics/Integrator';

const COLOR_CYAN = 0x00ffff;
const COLOR_MAGENTA = 0xff0066;

const DEFAULT_PARAMS: PhysicsParams = {
  l1: 1.4,
  l2: 1.4,
  m1: 1.5,
  m2: 1.5,
  g: 18.0,
  damping: 0.00001
};

const INITIAL_THETA1 = 120 * Math.PI / 180;
const INITIAL_THETA2 = 125 * Math.PI / 180;
const ANGLE_DELTA = 0.08 * Math.PI / 180;

export class App {
  private canvas: HTMLCanvasElement;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private pendulum1: DoublePendulum;
  private pendulum2: DoublePendulum;
  private trail1: TrailSystem;
  private trail2: TrailSystem;

  private isPaused: boolean = false;
  private elapsedTime: number = 0;
  private lastTime: number = 0;
  private trailCounter: number = 0;
  private readonly TRAIL_INTERVAL: number = 1;

  private theta1BlueEl: HTMLElement | null;
  private theta2BlueEl: HTMLElement | null;
  private theta1MagentaEl: HTMLElement | null;
  private theta2MagentaEl: HTMLElement | null;
  private divergenceEl: HTMLElement | null;
  private timeEl: HTMLElement | null;

  private log0sEl: HTMLElement | null;
  private log5sEl: HTMLElement | null;
  private log15sEl: HTMLElement | null;
  private log30sEl: HTMLElement | null;

  private divergenceHistory: Map<number, number> = new Map();
  private recordedMilestones: Set<number> = new Set();
  private readonly MILESTONES: number[] = [0, 5, 15, 30];

  private logChart: LogChart;
  private chartUpdateCounter: number = 0;
  private readonly CHART_UPDATE_INTERVAL: number = 10;

  private guideTipTimer: number | null = null;
  private maxDivergence: number = 0;
  private currentDivergence: number = 0;

  private animationId: number | null = null;

  constructor() {
    (window as any).elapsedTime = 0;
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

    this.theta1BlueEl = document.getElementById('theta1-blue');
    this.theta2BlueEl = document.getElementById('theta2-blue');
    this.theta1MagentaEl = document.getElementById('theta1-magenta');
    this.theta2MagentaEl = document.getElementById('theta2-magenta');
    this.divergenceEl = document.getElementById('divergence');
    this.timeEl = document.getElementById('time');

    this.log0sEl = document.getElementById('log-0s');
    this.log5sEl = document.getElementById('log-5s');
    this.log15sEl = document.getElementById('log-15s');
    this.log30sEl = document.getElementById('log-30s');

    this.logChart = new LogChart('chart-canvas');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1, 6);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.target.set(0, -1, 0);

    this.setupLighting();
    this.setupReferenceFrame();

    const state1: PendulumState = {
      theta1: INITIAL_THETA1,
      theta2: INITIAL_THETA2,
      omega1: 0,
      omega2: 0
    };

    const state2: PendulumState = {
      theta1: INITIAL_THETA1 + ANGLE_DELTA,
      theta2: INITIAL_THETA2 + ANGLE_DELTA,
      omega1: 0,
      omega2: 0
    };

    this.pendulum1 = new DoublePendulum(this.scene, state1, DEFAULT_PARAMS, COLOR_CYAN);
    this.pendulum2 = new DoublePendulum(this.scene, state2, DEFAULT_PARAMS, COLOR_MAGENTA);

    this.trail1 = new TrailSystem(this.scene, COLOR_CYAN, 5000);
    this.trail2 = new TrailSystem(this.scene, COLOR_MAGENTA, 5000);

    this.setupEventListeners();
    this.lastTime = performance.now();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff4488, 0.2);
    rimLight.position.set(0, -5, 5);
    this.scene.add(rimLight);
  }

  private setupReferenceFrame(): void {
    const gridHelper = new THREE.GridHelper(10, 20, 0x333344, 0x222233);
    gridHelper.position.y = -3.5;
    this.scene.add(gridHelper);

    const pivotMarkerGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const pivotMarkerMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.9,
      roughness: 0.2
    });
    const pivotMarker = new THREE.Mesh(pivotMarkerGeo, pivotMarkerMat);
    this.scene.add(pivotMarker);

    const supportGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 16);
    const supportMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.8,
      roughness: 0.3
    });
    const support = new THREE.Mesh(supportGeo, supportMat);
    support.position.y = 0.2;
    this.scene.add(support);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    const btnReset = document.getElementById('btn-reset');
    const btnPause = document.getElementById('btn-pause');
    const btnClear = document.getElementById('btn-clear');

    btnReset?.addEventListener('click', () => this.reset());
    btnPause?.addEventListener('click', () => this.togglePause());
    btnClear?.addEventListener('click', () => this.clearTrails());

    const btnFastForward = document.getElementById('btn-fastforward');
    btnFastForward?.addEventListener('click', () => this.fastForward(5));

    const tipClose = document.getElementById('tip-close');
    tipClose?.addEventListener('click', () => this.hideGuideTip());

    this.showGuideTip();
  }

  private showGuideTip(): void {
    const guideTip = document.getElementById('guide-tip');
    if (guideTip) {
      guideTip.classList.remove('hidden');
    }
    
    if (this.guideTipTimer !== null) {
      window.clearTimeout(this.guideTipTimer);
    }
    
    this.guideTipTimer = window.setTimeout(() => {
      this.hideGuideTip();
    }, 15000);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private reset(): void {
    this.pendulum1.reset();
    this.pendulum2.reset();
    this.trail1.clear();
    this.trail2.clear();
    this.elapsedTime = 0;
    this.trailCounter = 0;
    this.chartUpdateCounter = 0;
    this.maxDivergence = 0;
    this.currentDivergence = 0;
    this.divergenceHistory.clear();
    this.recordedMilestones.clear();
    this.clearLogDisplay();
    this.logChart.clear();
    (window as any).elapsedTime = 0;
    this.showGuideTip();
    this.updateUI();
  }

  private clearLogDisplay(): void {
    if (this.log0sEl) this.log0sEl.textContent = '---';
    if (this.log5sEl) this.log5sEl.textContent = '---';
    if (this.log15sEl) this.log15sEl.textContent = '---';
    if (this.log30sEl) this.log30sEl.textContent = '---';
  }

  private checkMilestone(): void {
    for (const milestone of this.MILESTONES) {
      if (this.elapsedTime >= milestone && !this.recordedMilestones.has(milestone)) {
        const divergence = this.maxDivergence;
        this.divergenceHistory.set(milestone, divergence);
        this.recordedMilestones.add(milestone);
        this.updateLogDisplay(milestone, divergence);
        console.log(`[Milestone] ${milestone}s: Max Divergence = ${divergence.toExponential(4)}`);
      }
    }
  }

  private updateLogDisplay(milestone: number, value: number): void {
    const formatted = value.toExponential(4);
    switch (milestone) {
      case 0:
        if (this.log0sEl) this.log0sEl.textContent = formatted;
        break;
      case 5:
        if (this.log5sEl) this.log5sEl.textContent = formatted;
        break;
      case 15:
        if (this.log15sEl) this.log15sEl.textContent = formatted;
        break;
      case 30:
        if (this.log30sEl) this.log30sEl.textContent = formatted;
        break;
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('btn-pause');
    if (btn) {
      btn.textContent = this.isPaused ? '继续' : '暂停';
    }
  }

  private clearTrails(): void {
    this.trail1.clear();
    this.trail2.clear();
  }

  private fastForward(seconds: number): void {
    const startTime = this.elapsedTime;
    const targetTime = startTime + seconds;
    const physicsStep = 1 / 240;
    const displayStep = 1 / 60;
    
    let simulationTime = this.elapsedTime;
    
    while (simulationTime < targetTime) {
      const dt = Math.min(displayStep, targetTime - simulationTime);
      simulationTime += dt;
      
      const subSteps = Math.max(1, Math.round(dt / physicsStep));
      const subDt = dt / subSteps;
      
      for (let i = 0; i < subSteps; i++) {
        this.pendulum1.update(subDt, 1);
        this.pendulum2.update(subDt, 1);
      }
      
      this.currentDivergence = this.calculateDivergence();
      if (this.currentDivergence > this.maxDivergence) {
        this.maxDivergence = this.currentDivergence;
      }
      
      this.trailCounter++;
      if (this.trailCounter >= this.TRAIL_INTERVAL) {
        this.trailCounter = 0;
        this.trail1.addPoint(this.pendulum1.getBob2Position());
        this.trail2.addPoint(this.pendulum2.getBob2Position());
      }
      
      this.chartUpdateCounter++;
      if (this.chartUpdateCounter >= this.CHART_UPDATE_INTERVAL) {
        this.chartUpdateCounter = 0;
        this.logChart.addPoint(simulationTime, this.maxDivergence);
      }
      
      this.checkMilestone();
    }
    
    this.elapsedTime = targetTime;
    (window as any).elapsedTime = this.elapsedTime;
    
    this.logChart.draw();
    this.trail1.forceUpdate();
    this.trail2.forceUpdate();
    this.updateUI();
  }

  private hideGuideTip(): void {
    const guideTip = document.getElementById('guide-tip');
    if (guideTip) {
      guideTip.classList.add('hidden');
    }
    if (this.guideTipTimer !== null) {
      window.clearTimeout(this.guideTipTimer);
      this.guideTipTimer = null;
    }
  }

  private calculateDivergence(): number {
    const pos1 = this.pendulum1.getBob2Position();
    const pos2 = this.pendulum2.getBob2Position();
    return pos1.distanceTo(pos2);
  }

  private updateUI(): void {
    const state1 = this.pendulum1.getState();
    const state2 = this.pendulum2.getState();

    const toDeg = (rad: number) => (rad * 180 / Math.PI).toFixed(2);

    if (this.theta1BlueEl) this.theta1BlueEl.textContent = `θ₁: ${toDeg(state1.theta1)}°`;
    if (this.theta2BlueEl) this.theta2BlueEl.textContent = `θ₂: ${toDeg(state1.theta2)}°`;
    if (this.theta1MagentaEl) this.theta1MagentaEl.textContent = `θ₁: ${toDeg(state2.theta1)}°`;
    if (this.theta2MagentaEl) this.theta2MagentaEl.textContent = `θ₂: ${toDeg(state2.theta2)}°`;
    if (this.divergenceEl) this.divergenceEl.textContent = this.maxDivergence.toFixed(3);
    if (this.timeEl) this.timeEl.textContent = `${this.elapsedTime.toFixed(2)}s`;
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.elapsedTime += deltaTime;
      (window as any).elapsedTime = this.elapsedTime;

      const steps = 8;
      const stepDt = deltaTime / steps;
      for (let i = 0; i < steps; i++) {
        this.pendulum1.update(stepDt, 1);
        this.pendulum2.update(stepDt, 1);
      }

      this.currentDivergence = this.calculateDivergence();
      if (this.currentDivergence > this.maxDivergence) {
        this.maxDivergence = this.currentDivergence;
      }

      this.trailCounter++;
      if (this.trailCounter >= this.TRAIL_INTERVAL) {
        this.trailCounter = 0;
        this.trail1.addPoint(this.pendulum1.getBob2Position());
        this.trail2.addPoint(this.pendulum2.getBob2Position());
      }

      this.checkMilestone();

      this.chartUpdateCounter++;
      if (this.chartUpdateCounter >= this.CHART_UPDATE_INTERVAL) {
        this.chartUpdateCounter = 0;
        this.logChart.addPoint(this.elapsedTime, this.maxDivergence);
        this.logChart.draw();
      }

      this.updateUI();
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onResize.bind(this));

    this.pendulum1.dispose();
    this.pendulum2.dispose();
    this.trail1.dispose();
    this.trail2.dispose();

    this.renderer.dispose();
    this.controls.dispose();
  }
}
