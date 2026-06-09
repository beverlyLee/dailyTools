import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CeilingGenerator } from './CeilingGenerator';
import { LightEditor } from './LightEditor';
import { IndirectLightSimulator } from './IndirectLightSimulator';
import { WallWashRenderer } from './WallWashRenderer';
import { GlareAnalyzer } from './GlareAnalyzer';
import {
  RoomConfig,
  CeilingConfig,
  LightConfig,
  IndirectLightConfig,
  WallWashConfig,
  kelvinToRGB,
} from './types';

class CeilingLightPreviewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private ceilingGenerator: CeilingGenerator;
  private lightEditor: LightEditor;
  private indirectLightSimulator: IndirectLightSimulator;
  private wallWashRenderer: WallWashRenderer;
  private glareAnalyzer: GlareAnalyzer;

  private roomConfig: RoomConfig = {
    width: 8,
    depth: 6,
    height: 2.8,
  };

  private ceilingConfig: CeilingConfig = {
    drop: 0.15,
    trenchWidth: 0.12,
    trenchDepth: 0.08,
    trenchOffset: 0.02,
  };

  private lightConfig: LightConfig = {
    type: 'area',
    intensity: 500,
    colorTemp: 4000,
    color: kelvinToRGB(4000),
    beamAngle: 45,
  };

  private indirectLightConfig: IndirectLightConfig = {
    bounceCount: 2,
    wallAlbedo: 0.7,
    ceilingAlbedo: 0.85,
  };

  private wallWashConfig: WallWashConfig = {
    intensity: 1.0,
    beamAngle: 45,
    haloSpread: 0.5,
  };

  private clock: THREE.Clock;
  private isDragging: boolean = false;

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 3, 7);

    this.container = document.body;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 1.2, 0);

    this.ceilingGenerator = new CeilingGenerator(
      this.scene,
      this.roomConfig,
      this.ceilingConfig
    );

    this.lightEditor = new LightEditor(
      this.scene,
      this.ceilingGenerator,
      this.lightConfig
    );

    this.indirectLightSimulator = new IndirectLightSimulator(
      this.scene,
      this.ceilingGenerator,
      this.indirectLightConfig
    );

    this.wallWashRenderer = new WallWashRenderer(
      this.scene,
      this.ceilingGenerator,
      this.wallWashConfig
    );

    this.glareAnalyzer = new GlareAnalyzer(this.scene, this.ceilingGenerator);

    this.addAmbientLight();
    this.setupEventListeners();
    this.updateIndirectLighting();
    this.updateWallWash();
    this.animate();
  }

  private addAmbientLight(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.1);
    this.scene.add(ambient);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    this.setupUIControls();
  }

  private setupUIControls(): void {
    const roomWidthSlider = document.getElementById('roomWidth') as HTMLInputElement;
    const roomDepthSlider = document.getElementById('roomDepth') as HTMLInputElement;
    const roomHeightSlider = document.getElementById('roomHeight') as HTMLInputElement;
    const ceilingDropSlider = document.getElementById('ceilingDrop') as HTMLInputElement;
    const trenchWidthSlider = document.getElementById('trenchWidth') as HTMLInputElement;
    const trenchDepthSlider = document.getElementById('trenchDepth') as HTMLInputElement;

    const intensitySlider = document.getElementById('intensity') as HTMLInputElement;
    const colorTempSlider = document.getElementById('colorTemp') as HTMLInputElement;
    const areaLightBtn = document.getElementById('areaLightBtn') as HTMLButtonElement;
    const tubeLightBtn = document.getElementById('tubeLightBtn') as HTMLButtonElement;

    const bounceCountSlider = document.getElementById('bounceCount') as HTMLInputElement;
    const wallAlbedoSlider = document.getElementById('wallAlbedo') as HTMLInputElement;
    const ceilingAlbedoSlider = document.getElementById('ceilingAlbedo') as HTMLInputElement;

    const wallWashIntensitySlider = document.getElementById('wallWashIntensity') as HTMLInputElement;
    const beamAngleSlider = document.getElementById('beamAngle') as HTMLInputElement;
    const haloSpreadSlider = document.getElementById('haloSpread') as HTMLInputElement;

    const viewFrontBtn = document.getElementById('viewFrontBtn') as HTMLButtonElement;
    const viewSideBtn = document.getElementById('viewSideBtn') as HTMLButtonElement;
    const viewIsoBtn = document.getElementById('viewIsoBtn') as HTMLButtonElement;

    roomWidthSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.roomConfig.width = value;
      document.getElementById('roomWidthValue')!.textContent = value.toFixed(1) + 'm';
      this.rebuildCeiling();
    });

    roomDepthSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.roomConfig.depth = value;
      document.getElementById('roomDepthValue')!.textContent = value.toFixed(1) + 'm';
      this.rebuildCeiling();
    });

    roomHeightSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.roomConfig.height = value;
      document.getElementById('roomHeightValue')!.textContent = value.toFixed(1) + 'm';
      this.rebuildCeiling();
    });

    ceilingDropSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.ceilingConfig.drop = value;
      document.getElementById('ceilingDropValue')!.textContent = value.toFixed(2) + 'm';
      this.rebuildCeiling();
    });

    trenchWidthSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.ceilingConfig.trenchWidth = value;
      document.getElementById('trenchWidthValue')!.textContent = value.toFixed(2) + 'm';
      this.rebuildCeiling();
    });

    trenchDepthSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.ceilingConfig.trenchDepth = value;
      document.getElementById('trenchDepthValue')!.textContent = value.toFixed(2) + 'm';
      this.rebuildCeiling();
    });

    intensitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.lightConfig.intensity = value;
      document.getElementById('intensityValue')!.textContent = value.toFixed(0) + ' cd/m²';
      this.updateLight();
    });

    colorTempSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.lightConfig.colorTemp = value;
      this.lightConfig.color = kelvinToRGB(value);
      document.getElementById('colorTempValue')!.textContent = value.toFixed(0) + 'K';
      const colorPreview = document.getElementById('colorPreview')!;
      colorPreview.style.background = `#${this.lightConfig.color.getHexString()}`;
      this.updateLight();
    });

    areaLightBtn.addEventListener('click', () => {
      this.lightConfig.type = 'area';
      areaLightBtn.classList.add('active');
      tubeLightBtn.classList.remove('active');
      document.getElementById('lightTypeBadge')!.textContent = 'AreaLight';
      this.updateLight();
    });

    tubeLightBtn.addEventListener('click', () => {
      this.lightConfig.type = 'tube';
      tubeLightBtn.classList.add('active');
      areaLightBtn.classList.remove('active');
      document.getElementById('lightTypeBadge')!.textContent = 'TubeLight';
      this.updateLight();
    });

    bounceCountSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.indirectLightConfig.bounceCount = value;
      document.getElementById('bounceCountValue')!.textContent = value.toString();
      this.updateIndirectLighting();
    });

    wallAlbedoSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.indirectLightConfig.wallAlbedo = value;
      document.getElementById('wallAlbedoValue')!.textContent = value.toFixed(2);
      this.updateIndirectLighting();
    });

    ceilingAlbedoSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.indirectLightConfig.ceilingAlbedo = value;
      document.getElementById('ceilingAlbedoValue')!.textContent = value.toFixed(2);
      this.updateIndirectLighting();
    });

    wallWashIntensitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.wallWashConfig.intensity = value;
      document.getElementById('wallWashIntensityValue')!.textContent = value.toFixed(2);
      this.wallWashRenderer.updateConfig({ intensity: value });
      this.wallWashRenderer.updateLightIntensity(this.lightConfig.intensity);
    });

    beamAngleSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.wallWashConfig.beamAngle = value;
      this.lightConfig.beamAngle = value;
      document.getElementById('beamAngleValue')!.textContent = value.toFixed(0) + '°';
      this.wallWashRenderer.updateConfig({ beamAngle: value });
    });

    haloSpreadSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.wallWashConfig.haloSpread = value;
      document.getElementById('haloSpreadValue')!.textContent = value.toFixed(2);
      this.wallWashRenderer.updateConfig({ haloSpread: value });
    });

    viewFrontBtn.addEventListener('click', () => {
      this.setView('front');
    });

    viewSideBtn.addEventListener('click', () => {
      this.setView('side');
    });

    viewIsoBtn.addEventListener('click', () => {
      this.setView('iso');
    });
  }

  private rebuildCeiling(): void {
    this.ceilingGenerator.updateRoomConfig(this.roomConfig);
    this.ceilingGenerator.updateCeilingConfig(this.ceilingConfig);
    this.lightEditor.rebuild();
    this.indirectLightSimulator.rebuild();
    this.wallWashRenderer.rebuild();
    this.updateIndirectLighting();
    this.updateWallWash();
  }

  private updateLight(): void {
    this.lightEditor.updateConfig(this.lightConfig);
    this.updateIndirectLighting();
    this.updateWallWash();
  }

  private updateIndirectLighting(): void {
    this.indirectLightSimulator.updateConfig(this.indirectLightConfig);
    const sources = this.lightEditor.getLightSources();
    this.indirectLightSimulator.updateLightSources(sources);
    this.updateStats();
  }

  private updateWallWash(): void {
    this.wallWashRenderer.updateLightColor(this.lightConfig.color);
    this.wallWashRenderer.updateLightIntensity(this.lightConfig.intensity);
  }

  private updateStats(): void {
    const sources = this.lightEditor.getLightSources();

    const indirectRatio = this.indirectLightSimulator.getIndirectContributionRatio(sources);
    document.getElementById('indirectContribution')!.textContent =
      Math.round(indirectRatio * 100) + '%';

    const avgBrightness = this.indirectLightSimulator.calculateAverageWallBrightness(sources);
    document.getElementById('wallBrightness')!.textContent =
      Math.round(avgBrightness * 10) + ' lux';

    const eyePos = new THREE.Vector3(0, this.roomConfig.height * 0.6, this.roomConfig.depth * 0.3);
    this.glareAnalyzer.updateEyePosition(eyePos);

    const viewDir = new THREE.Vector3(0, -0.2, -1).normalize();
    this.glareAnalyzer.updateViewDirection(viewDir);

    const glareResult = this.glareAnalyzer.analyze(sources);
    document.getElementById('ugrValue')!.textContent = glareResult.ugr.toString();

    const glareWarning = document.getElementById('glareWarning')!;
    if (glareResult.hasGlare) {
      glareWarning.classList.remove('hidden');
    } else {
      glareWarning.classList.add('hidden');
    }
  }

  private setView(view: 'front' | 'side' | 'iso'): void {
    const { width, depth, height } = this.roomConfig;
    const distance = Math.max(width, depth) * 1.5;

    switch (view) {
      case 'front':
        this.camera.position.set(0, height * 0.5, distance * 0.8);
        this.controls.target.set(0, height * 0.4, 0);
        break;
      case 'side':
        this.camera.position.set(distance * 0.8, height * 0.5, 0);
        this.controls.target.set(0, height * 0.4, 0);
        break;
      case 'iso':
        this.camera.position.set(distance * 0.6, height * 1.2, distance * 0.6);
        this.controls.target.set(0, height * 0.4, 0);
        break;
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    this.controls.update(delta);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.ceilingGenerator.dispose();
    this.lightEditor.dispose();
    this.indirectLightSimulator.dispose();
    this.wallWashRenderer.dispose();
    this.glareAnalyzer.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CeilingLightPreviewer();
});
