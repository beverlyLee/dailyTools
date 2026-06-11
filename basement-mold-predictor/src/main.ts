import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { EnvironmentParams, WallMaterial, InsulationConfig, VentilationConfig } from './modules/types';
import { WALL_MATERIALS, INSULATION_TYPES } from './modules/types';
import { TemperatureFieldSimulator } from './modules/temperatureField';
import { DewPointCalculator } from './modules/dewPoint';
import { MoldRiskAssessor } from './modules/moldRisk';
import { VentilationSimulator, type VentilationParticle } from './modules/ventilation';
import { InsulationVisualizer } from './modules/insulation';

type WallMaterialsKey = keyof typeof WALL_MATERIALS;

class BasementMoldPredictorApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private temperatureSimulator: TemperatureFieldSimulator;
  private dewPointCalculator: DewPointCalculator;
  private moldRiskAssessor: MoldRiskAssessor;
  private ventilationSimulator: VentilationSimulator;
  private insulationVisualizer: InsulationVisualizer;

  private envParams: EnvironmentParams;
  private wallMaterial: WallMaterial;
  private insulationConfig: InsulationConfig;
  private ventilationConfig: VentilationConfig;
  private wallThicknessMM: number;
  private displayMode: string;

  private wallGroup: THREE.Group;
  private dewDropsGroup: THREE.Group;
  private moldRiskGroup: THREE.Group;
  private temperatureFieldGroup: THREE.Group;
  private ventilationGroup: THREE.Group;
  private insulationGroup: THREE.Group;
  private crossSectionGroup: THREE.Group;

  private ventilationParticles: THREE.Points | null = null;
  private ventilationParticleData: VentilationParticle[] = [];
  private particleGeometry: THREE.BufferGeometry | null = null;

  private WALL_WIDTH = 4.0;
  private WALL_HEIGHT = 3.0;
  private CORNER_WIDTH = 2.5;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 8, 25);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(5.5, 3.2, 6.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2;
    this.controls.target.set(0, 1.2, -0.8);

    this.clock = new THREE.Clock();

    this.envParams = {
      outdoorTemp: 24,
      outdoorHumidity: 90,
      indoorTemp: 22,
      rainyDays: 7,
    };
    this.wallMaterial = WALL_MATERIALS['brick'];
    this.insulationConfig = {
      enabled: false,
      thickness: 30,
      thermalConductivity: INSULATION_TYPES.eps.thermalConductivity,
    };
    this.ventilationConfig = {
      enabled: false,
      intensity: 2,
    };
    this.wallThicknessMM = 240;
    this.displayMode = 'combined';

    this.temperatureSimulator = new TemperatureFieldSimulator(
      this.envParams,
      this.wallMaterial,
      this.insulationConfig,
      this.wallThicknessMM
    );
    this.dewPointCalculator = new DewPointCalculator(this.envParams, this.ventilationConfig);
    this.moldRiskAssessor = new MoldRiskAssessor(
      this.envParams,
      this.wallMaterial,
      this.insulationConfig,
      this.ventilationConfig
    );
    this.ventilationSimulator = new VentilationSimulator(this.ventilationConfig, this.envParams);
    this.insulationVisualizer = new InsulationVisualizer(this.insulationConfig);

    this.wallGroup = new THREE.Group();
    this.dewDropsGroup = new THREE.Group();
    this.moldRiskGroup = new THREE.Group();
    this.temperatureFieldGroup = new THREE.Group();
    this.ventilationGroup = new THREE.Group();
    this.insulationGroup = new THREE.Group();
    this.crossSectionGroup = new THREE.Group();

    this.scene.add(this.wallGroup);
    this.scene.add(this.dewDropsGroup);
    this.scene.add(this.moldRiskGroup);
    this.scene.add(this.temperatureFieldGroup);
    this.scene.add(this.ventilationGroup);
    this.scene.add(this.insulationGroup);
    this.scene.add(this.crossSectionGroup);

    this.setupLighting();
    this.createRoomGeometry();
    this.setupEventListeners();
    this.updateSimulation();
    this.animate();
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x6b7c93, 0.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
    dirLight.position.set(6, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    this.scene.add(dirLight);

    const indoorLight = new THREE.PointLight(0xffeedd, 0.8, 12, 2);
    indoorLight.position.set(0, 2.6, -1);
    this.scene.add(indoorLight);

    const windowLight = new THREE.DirectionalLight(0xb8d4e8, 0.3);
    windowLight.position.set(-3, 3, -2);
    this.scene.add(windowLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.25);
    this.scene.add(hemiLight);
  }

  private createRoomGeometry() {
    this.wallGroup.clear();

    const wallThickness = this.wallThicknessMM / 1000;
    const floorSize = 8;

    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x5a5148,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.position.z = 0;
    floor.receiveShadow = true;
    this.wallGroup.add(floor);

    const floorGrid = new THREE.GridHelper(floorSize, 20, 0x444035, 0x38342d);
    floorGrid.position.y = 0.001;
    this.wallGroup.add(floorGrid);

    const wallMat = new THREE.MeshStandardMaterial({
      color: this.getWallBaseColor(),
      roughness: 0.78,
      metalness: 0.02,
    });

    const mainWallGeo = new THREE.BoxGeometry(this.WALL_WIDTH, this.WALL_HEIGHT, wallThickness);
    const mainWall = new THREE.Mesh(mainWallGeo, wallMat);
    mainWall.position.set(0, this.WALL_HEIGHT / 2, -wallThickness / 2);
    mainWall.castShadow = true;
    mainWall.receiveShadow = true;
    mainWall.name = 'mainWall';
    this.wallGroup.add(mainWall);

    const sideWallGeo = new THREE.BoxGeometry(wallThickness, this.WALL_HEIGHT, this.CORNER_WIDTH);
    const sideWall = new THREE.Mesh(sideWallGeo, wallMat);
    sideWall.position.set(-this.WALL_WIDTH / 2 + wallThickness / 2, this.WALL_HEIGHT / 2, -this.CORNER_WIDTH / 2);
    sideWall.castShadow = true;
    sideWall.receiveShadow = true;
    sideWall.name = 'sideWall';
    this.wallGroup.add(sideWall);

    const edgeGeo = new THREE.BoxGeometry(0.02, this.WALL_HEIGHT, 0.02);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x2d2a26 });
    const cornerEdge = new THREE.Mesh(edgeGeo, edgeMat);
    cornerEdge.position.set(-this.WALL_WIDTH / 2, this.WALL_HEIGHT / 2, 0);
    this.wallGroup.add(cornerEdge);

    this.addRoomDetails();
  }

  private getWallBaseColor(): number {
    const materialColors: Record<string, number> = {
      brick: 0x9a8b7a,
      concrete: 0x888888,
      aerated: 0xa8a090,
      wood: 0x8b6914,
      stone: 0x706860,
    };
    return materialColors[this.wallMaterial.key] || 0x9a8b7a;
  }

  private addRoomDetails() {
    const skirtingGeo = new THREE.BoxGeometry(this.WALL_WIDTH, 0.08, 0.02);
    const skirtingMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.7 });
    const skirting = new THREE.Mesh(skirtingGeo, skirtingMat);
    skirting.position.set(0, 0.04, 0.001);
    this.wallGroup.add(skirting);

    const sideSkirtingGeo = new THREE.BoxGeometry(0.02, 0.08, this.CORNER_WIDTH);
    const sideSkirting = new THREE.Mesh(sideSkirtingGeo, skirtingMat);
    sideSkirting.position.set(-this.WALL_WIDTH / 2 + 0.001, 0.04, -this.CORNER_WIDTH / 2);
    this.wallGroup.add(sideSkirting);

    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0,
      transmission: 0.9,
    });

    const winW = 0.8, winH = 1.0;
    const frameThick = 0.04;

    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 2 * frameThick, frameThick, 0.06), windowFrameMat);
    topFrame.position.set(this.WALL_WIDTH / 4, 2.0, 0.02);
    this.wallGroup.add(topFrame);

    const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 2 * frameThick, frameThick, 0.06), windowFrameMat);
    bottomFrame.position.set(this.WALL_WIDTH / 4, 2.0 - winH, 0.02);
    this.wallGroup.add(bottomFrame);

    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, 0.06), windowFrameMat);
    leftFrame.position.set(this.WALL_WIDTH / 4 - winW / 2, 2.0 - winH / 2, 0.02);
    this.wallGroup.add(leftFrame);

    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, 0.06), windowFrameMat);
    rightFrame.position.set(this.WALL_WIDTH / 4 + winW / 2, 2.0 - winH / 2, 0.02);
    this.wallGroup.add(rightFrame);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.02, winH - 0.02), glassMat);
    glass.position.set(this.WALL_WIDTH / 4, 2.0 - winH / 2, 0.03);
    this.wallGroup.add(glass);
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());

    const outdoorTempSlider = document.getElementById('outdoorTempSlider') as HTMLInputElement;
    const outdoorHumiditySlider = document.getElementById('outdoorHumiditySlider') as HTMLInputElement;
    const indoorTempSlider = document.getElementById('indoorTempSlider') as HTMLInputElement;
    const rainyDaysSlider = document.getElementById('rainyDaysSlider') as HTMLInputElement;
    const wallMaterialSelect = document.getElementById('wallMaterial') as HTMLSelectElement;
    const addInsulationBtn = document.getElementById('addInsulationBtn') as HTMLButtonElement;
    const insulationThicknessSlider = document.getElementById('insulationThicknessSlider') as HTMLInputElement;
    const ventilationBtn = document.getElementById('ventilationBtn') as HTMLButtonElement;
    const ventilationRateSlider = document.getElementById('ventilationRateSlider') as HTMLInputElement;
    const displayModeSelect = document.getElementById('displayMode') as HTMLSelectElement;
    const wallThicknessSlider = document.getElementById('wallThicknessSlider') as HTMLInputElement;

    outdoorTempSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.envParams.outdoorTemp = val;
      document.getElementById('outdoorTempValue')!.textContent = `${val}°C`;
      this.updateSimulation();
    });

    outdoorHumiditySlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.envParams.outdoorHumidity = val;
      document.getElementById('outdoorHumidityValue')!.textContent = `${val}%`;
      this.updateSimulation();
    });

    indoorTempSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.envParams.indoorTemp = val;
      document.getElementById('indoorTempValue')!.textContent = `${val}°C`;
      this.updateSimulation();
    });

    rainyDaysSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.envParams.rainyDays = val;
      document.getElementById('rainyDaysValue')!.textContent = `${val}天`;
      this.updateSimulation();
    });

    wallMaterialSelect.addEventListener('change', (e) => {
      const key = (e.target as HTMLSelectElement).value as WallMaterialsKey;
      this.wallMaterial = WALL_MATERIALS[key];
      this.createRoomGeometry();
      this.updateSimulation();
    });

    addInsulationBtn.addEventListener('click', () => {
      this.insulationConfig.enabled = !this.insulationConfig.enabled;
      addInsulationBtn.classList.toggle('active', this.insulationConfig.enabled);
      (document.getElementById('insulationIcon') as HTMLElement).textContent = this.insulationConfig.enabled ? '✓' : '+';
      (document.getElementById('insulationThicknessGroup') as HTMLElement).style.display =
        this.insulationConfig.enabled ? 'block' : 'none';
      this.updateSimulation();
    });

    insulationThicknessSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.insulationConfig.thickness = val;
      document.getElementById('insulationThicknessValue')!.textContent = `${val}mm`;
      this.updateSimulation();
    });

    ventilationBtn.addEventListener('click', () => {
      this.ventilationConfig.enabled = !this.ventilationConfig.enabled;
      ventilationBtn.classList.toggle('active', this.ventilationConfig.enabled);
      (document.getElementById('ventilationRateGroup') as HTMLElement).style.display =
        this.ventilationConfig.enabled ? 'block' : 'none';
      (document.getElementById('ventilationOverlay') as HTMLElement).classList.toggle('active', this.ventilationConfig.enabled);
      if (this.ventilationConfig.enabled) {
        this.ventilationSimulator.reset();
      }
      this.updateSimulation();
    });

    ventilationRateSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.ventilationConfig.intensity = val;
      const labels = ['低', '中', '高'];
      document.getElementById('ventilationRateValue')!.textContent = labels[val - 1] || '中';
      this.updateSimulation();
    });

    displayModeSelect.addEventListener('change', (e) => {
      this.displayMode = (e.target as HTMLSelectElement).value;
      this.applyDisplayMode();
    });

    wallThicknessSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.wallThicknessMM = val;
      document.getElementById('wallThicknessValue')!.textContent = `${val}mm`;
      this.createRoomGeometry();
      this.updateSimulation();
    });
  }

  private updateSimulation() {
    this.temperatureSimulator.update(
      this.envParams,
      this.wallMaterial,
      this.insulationConfig,
      this.wallThicknessMM
    );
    this.dewPointCalculator.update(this.envParams, this.ventilationConfig);
    this.moldRiskAssessor.update(
      this.envParams,
      this.wallMaterial,
      this.insulationConfig,
      this.ventilationConfig
    );
    this.ventilationSimulator.update(this.ventilationConfig, this.envParams);
    this.insulationVisualizer.update(this.insulationConfig);

    const surfaceTempProfile = this.temperatureSimulator.getSurfaceTemperatureProfile();
    const dewData = this.dewPointCalculator.calculateDewPointData(surfaceTempProfile);
    const indoorHumidity = this.dewPointCalculator.calculateIndoorHumidity();
    const moldRiskData = this.moldRiskAssessor.assessMoldRisk(surfaceTempProfile, dewData, indoorHumidity);

    this.updateInfoPanel(dewData, moldRiskData);
    this.renderTemperatureField();
    this.renderDewDrops(dewData);
    this.renderMoldRisk(moldRiskData);
    this.renderInsulation();
    this.renderCrossSection();
    this.setupVentilationParticles();
    this.applyDisplayMode();
  }

  private updateInfoPanel(dewData: any, moldRiskData: any) {
    (document.getElementById('outdoorTemp') as HTMLElement).textContent = `${this.envParams.outdoorTemp.toFixed(1)}°C`;
    (document.getElementById('outdoorHumidity') as HTMLElement).textContent = `${this.envParams.outdoorHumidity}%`;
    (document.getElementById('indoorTemp') as HTMLElement).textContent = `${this.envParams.indoorTemp.toFixed(1)}°C`;

    const wallTempText = document.getElementById('wallTemp') as HTMLElement;
    const dewPointText = document.getElementById('dewPoint') as HTMLElement;
    const dewDurationText = document.getElementById('dewDuration') as HTMLElement;
    const tempGradientText = document.getElementById('tempGradient') as HTMLElement;
    const riskStatus = document.getElementById('riskStatus') as HTMLElement;

    wallTempText.textContent = `${dewData.surfaceTemp.toFixed(1)}°C`;
    wallTempText.className = 'metric-value';
    if (dewData.surfaceTemp < dewData.dewPointTemp) {
      wallTempText.classList.add('danger');
    } else if (dewData.surfaceTemp - dewData.dewPointTemp < 2) {
      wallTempText.classList.add('warning');
    } else {
      wallTempText.classList.add('safe');
    }

    dewPointText.textContent = `${dewData.dewPointTemp.toFixed(1)}°C`;
    dewPointText.className = 'metric-value';
    if (dewData.hasCondensation) {
      dewPointText.classList.add('danger');
    }

    dewDurationText.textContent = `${dewData.dewDurationHours.toFixed(0)}h`;
    dewDurationText.className = 'metric-value';
    if (dewData.dewDurationHours > 48) dewDurationText.classList.add('danger');
    else if (dewData.dewDurationHours > 12) dewDurationText.classList.add('warning');

    const gradient = this.temperatureSimulator.getTemperatureGradient();
    tempGradientText.textContent = `${gradient.toFixed(1)}°C/m`;

    riskStatus.classList.remove('safe', 'moderate', 'danger');
    if (moldRiskData.overallRisk === 'safe') {
      riskStatus.classList.add('safe');
      riskStatus.innerHTML = '✅ 低风险 - 无霉变威胁';
    } else if (moldRiskData.overallRisk === 'moderate') {
      riskStatus.classList.add('moderate');
      riskStatus.innerHTML = `⚠️ 中风险 - 霉变概率 ${(moldRiskData.riskLevel * 100).toFixed(0)}%`;
    } else {
      riskStatus.classList.add('danger');
      riskStatus.innerHTML = `🚨 高风险 - 霉变概率 ${(moldRiskData.riskLevel * 100).toFixed(0)}%，建议立即处理`;
    }
  }

  private renderTemperatureField() {
    while (this.temperatureFieldGroup.children.length > 0) {
      this.temperatureFieldGroup.remove(this.temperatureFieldGroup.children[0]);
    }

    const wallLayers = this.temperatureSimulator.getWallLayers();
    let totalThickness = 0;
    for (const layer of wallLayers) {
      totalThickness += layer.thickness;
    }

    const gridSizeX = 25;
    const gridSizeY = 20;
    const cellWidth = (this.WALL_WIDTH * 0.8) / gridSizeX;
    const cellHeight = (this.WALL_HEIGHT * 0.85) / gridSizeY;
    const depthScale = Math.max(totalThickness, 0.3);

    for (let i = 0; i < gridSizeX; i++) {
      for (let j = 0; j < gridSizeY; j++) {
        const x = i / (gridSizeX - 1);
        const y = j / (gridSizeY - 1);
        const depth = 0;
        const temp = this.temperatureSimulator.getTemperatureAtDepth(depth, y);

        const tempMin = Math.min(this.envParams.outdoorTemp, this.envParams.indoorTemp) - 5;
        const tempMax = Math.max(this.envParams.outdoorTemp, this.envParams.indoorTemp) + 2;
        const normalizedT = Math.max(0, Math.min(1, (temp - tempMin) / (tempMax - tempMin)));

        const color = new THREE.Color();
        if (normalizedT < 0.33) {
          const t = normalizedT / 0.33;
          color.setRGB(0.1 + t * 0.2, 0.3 + t * 0.4, 0.9 - t * 0.3);
        } else if (normalizedT < 0.66) {
          const t = (normalizedT - 0.33) / 0.33;
          color.setRGB(0.3 + t * 0.5, 0.7 - t * 0.1, 0.6 - t * 0.3);
        } else {
          const t = (normalizedT - 0.66) / 0.34;
          color.setRGB(0.8 + t * 0.2, 0.6 - t * 0.3, 0.3 - t * 0.1);
        }

        const planeGeo = new THREE.PlaneGeometry(cellWidth * 0.92, cellHeight * 0.92);
        const planeMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.0,
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.position.set(
          -this.WALL_WIDTH * 0.4 + x * this.WALL_WIDTH * 0.8,
          y * this.WALL_HEIGHT * 0.85 + 0.1,
          0.015 + (1 - x) * depthScale * 0.1
        );
        plane.userData = { temperature: temp, baseOpacity: 0.85, color: color.getHex() };
        this.temperatureFieldGroup.add(plane);
      }
    }
  }

  private renderDewDrops(dewData: any) {
    while (this.dewDropsGroup.children.length > 0) {
      this.dewDropsGroup.remove(this.dewDropsGroup.children[0]);
    }

    if (!dewData.hasCondensation) return;

    for (const point of dewData.condensationPoints) {
      const worldX = -this.WALL_WIDTH / 2 + point.x * this.WALL_WIDTH;
      const worldY = point.y * (this.WALL_HEIGHT - 0.1);

      const dropCount = 1 + Math.floor(point.intensity * 4);
      for (let d = 0; d < dropCount; d++) {
        const size = 0.008 + Math.random() * 0.018 * point.intensity;
        const dropGeo = new THREE.SphereGeometry(size, 12, 12);
        const dropMat = new THREE.MeshPhysicalMaterial({
          color: 0x60a5fa,
          transparent: true,
          opacity: 0.55 + point.intensity * 0.35,
          roughness: 0.05,
          metalness: 0,
          transmission: 0.5,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          ior: 1.33,
        });
        const drop = new THREE.Mesh(dropGeo, dropMat);
        drop.position.set(
          worldX + (Math.random() - 0.5) * 0.03,
          worldY + (Math.random() - 0.5) * 0.02,
          0.005 + size * 0.5
        );
        drop.scale.y = 0.6 + Math.random() * 0.4;
        this.dewDropsGroup.add(drop);
      }
    }

    const dewGlowMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });

    for (const point of dewData.condensationPoints.filter((p: any) => p.intensity > 0.5)) {
      const glowSize = 0.08 + point.intensity * 0.12;
      const glowGeo = new THREE.CircleGeometry(glowSize, 24);
      const glow = new THREE.Mesh(glowGeo, dewGlowMat.clone());
      glow.position.set(
        -this.WALL_WIDTH / 2 + point.x * this.WALL_WIDTH,
        point.y * (this.WALL_HEIGHT - 0.1),
        0.008
      );
      this.dewDropsGroup.add(glow);
    }
  }

  private renderMoldRisk(moldRiskData: any) {
    while (this.moldRiskGroup.children.length > 0) {
      this.moldRiskGroup.remove(this.moldRiskGroup.children[0]);
    }

    const gridSizeX = 35;
    const gridSizeY = 28;

    const moldCanvas = document.createElement('canvas');
    moldCanvas.width = gridSizeX * 8;
    moldCanvas.height = gridSizeY * 8;
    const moldCtx = moldCanvas.getContext('2d')!;
    moldCtx.clearRect(0, 0, moldCanvas.width, moldCanvas.height);

    const riskTextureGrid: number[][] = [];

    for (let i = 0; i < gridSizeX; i++) {
      riskTextureGrid[i] = [];
      for (let j = 0; j < gridSizeY; j++) {
        const x = i / (gridSizeX - 1);
        const y = j / (gridSizeY - 1);

        let risk = 0;
        for (const point of moldRiskData.riskMap) {
          const dx = point.x - x;
          const dy = point.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.1) {
            const influence = 1 - dist / 0.1;
            risk = Math.max(risk, point.risk * influence);
          }
        }

        const cornerX = Math.min(x, 1 - x);
        const cornerFactor = Math.exp(-cornerX * 8) * 0.15;
        const floorFactor = Math.exp(-y * 3.5) * 0.2;
        risk = Math.min(1, risk + cornerFactor + floorFactor);
        riskTextureGrid[i][j] = risk;

        const color = this.moldRiskAssessor.getRiskColorInterpolated(risk);
        const px = i * 8;
        const py = (gridSizeY - 1 - j) * 8;

        if (risk > 0.15) {
          moldCtx.fillStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${(risk - 0.1) * 0.9})`;
          moldCtx.fillRect(px, py, 8, 8);

          if (risk > 0.5 && Math.random() < 0.35) {
            moldCtx.fillStyle = `rgba(0, 0, 0, ${(risk - 0.5) * 0.25})`;
            for (let s = 0; s < 3; s++) {
              const sx = px + Math.random() * 8;
              const sy = py + Math.random() * 8;
              const r = 0.8 + Math.random() * 2.2;
              moldCtx.beginPath();
              moldCtx.arc(sx, sy, r, 0, Math.PI * 2);
              moldCtx.fill();
            }
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(moldCanvas);
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const moldPlaneGeo = new THREE.PlaneGeometry(this.WALL_WIDTH * 0.995, this.WALL_HEIGHT * 0.99);
    const moldPlaneMat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      roughness: 0.9,
      metalness: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const moldPlane = new THREE.Mesh(moldPlaneGeo, moldPlaneMat);
    moldPlane.position.set(0, this.WALL_HEIGHT / 2, 0.004);
    this.moldRiskGroup.add(moldPlane);

    const sideMoldCanvas = document.createElement('canvas');
    sideMoldCanvas.width = gridSizeY * 8;
    sideMoldCanvas.height = gridSizeY * 8;
    const sideCtx = sideMoldCanvas.getContext('2d')!;
    sideCtx.clearRect(0, 0, sideMoldCanvas.width, sideMoldCanvas.height);

    for (let i = 0; i < gridSizeY; i++) {
      for (let j = 0; j < gridSizeY; j++) {
        const x = i / (gridSizeY - 1);
        const y = j / (gridSizeY - 1);

        let risk = moldRiskData.riskLevel * 0.3;
        const cornerEdgeFactor = Math.exp(-x * 6) * 0.35 + 0.1;
        const floorF = Math.exp(-y * 3.5) * 0.25;
        risk = Math.min(1, risk + cornerEdgeFactor + floorF);

        if (risk > 0.2) {
          const color = this.moldRiskAssessor.getRiskColorInterpolated(risk);
          sideCtx.fillStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${(risk - 0.1) * 0.9})`;
          sideCtx.fillRect(i * 8, (gridSizeY - 1 - j) * 8, 8, 8);
        }
      }
    }

    const sideTexture = new THREE.CanvasTexture(sideMoldCanvas);
    sideTexture.anisotropy = 8;
    const sideMoldMat = new THREE.MeshStandardMaterial({
      map: sideTexture,
      transparent: true,
      opacity: 0.9,
      roughness: 0.9,
      metalness: 0,
      depthWrite: false,
    });
    const sideMoldPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(this.CORNER_WIDTH * 0.99, this.WALL_HEIGHT * 0.99),
      sideMoldMat
    );
    sideMoldPlane.position.set(-this.WALL_WIDTH / 2 + 0.001, this.WALL_HEIGHT / 2, -this.CORNER_WIDTH / 2);
    sideMoldPlane.rotation.y = Math.PI / 2;
    this.moldRiskGroup.add(sideMoldPlane);
  }

  private renderInsulation() {
    while (this.insulationGroup.children.length > 0) {
      this.insulationGroup.remove(this.insulationGroup.children[0]);
    }

    if (!this.insulationConfig.enabled) return;

    const wallLayers = this.temperatureSimulator.getWallLayers();
    const geometries = this.insulationVisualizer.getInsulationGeometry(wallLayers);

    for (const geo of geometries) {
      const boxGeo = new THREE.BoxGeometry(geo.size.x, geo.size.y, geo.size.z);
      const boxMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(geo.color.r, geo.color.g, geo.color.b),
        roughness: 0.85,
        metalness: 0.02,
        transparent: true,
        opacity: 0.92,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(geo.position.x, geo.position.y, geo.position.z);
      box.castShadow = true;
      box.receiveShadow = true;
      this.insulationGroup.add(box);

      const edgeGeo = new THREE.EdgesGeometry(boxGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.7 });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.copy(box.position);
      this.insulationGroup.add(edges);

      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 256;
      labelCanvas.height = 64;
      const ctx = labelCanvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.roundRect(0, 0, 256, 64, 8);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🧽 EPS保温 ${this.insulationConfig.thickness}mm`, 128, 32);

      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.13),
        new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true })
      );
      labelPlane.position.set(geo.position.x + 0.5, geo.position.y + geo.size.y / 2 + 0.05, geo.position.z + geo.size.z / 2 + 0.01);
      labelPlane.rotation.y = -0.1;
      this.insulationGroup.add(labelPlane);
    }

    const sideInsulationGeo = new THREE.BoxGeometry(
      this.insulationConfig.thickness / 1000,
      this.WALL_HEIGHT,
      this.CORNER_WIDTH
    );
    const sideInsulationMat = new THREE.MeshStandardMaterial({
      color: 0xf5e0a8,
      roughness: 0.85,
      metalness: 0.02,
      transparent: true,
      opacity: 0.92,
    });

    let mainThickness = 0;
    for (const l of wallLayers) {
      if (l.position !== 'insulation' && l.position !== 'outer') mainThickness += l.thickness * 1000;
    }

    const sideInsulation = new THREE.Mesh(sideInsulationGeo, sideInsulationMat);
    sideInsulation.position.set(
      -this.WALL_WIDTH / 2 - mainThickness / 1000 - this.insulationConfig.thickness / 2000,
      this.WALL_HEIGHT / 2,
      -this.CORNER_WIDTH / 2
    );
    sideInsulation.castShadow = true;
    this.insulationGroup.add(sideInsulation);
  }

  private renderCrossSection() {
    while (this.crossSectionGroup.children.length > 0) {
      this.crossSectionGroup.remove(this.crossSectionGroup.children[0]);
    }

    if (this.displayMode !== 'cross-section') return;

    const wallLayers = this.temperatureSimulator.getWallLayers();
    const crossSection = this.insulationVisualizer.getCrossSectionData(wallLayers);

    const totalThicknessMM = crossSection.reduce((s, l) => s + l.thickness, 0);
    const scale = 1.2 / Math.max(totalThicknessMM, 250);
    const sectionHeight = 1.5;
    let currentX = 0;

    for (const layer of crossSection) {
      const width = layer.thickness * scale;
      const boxGeo = new THREE.BoxGeometry(width, sectionHeight, 0.5);
      const boxMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(layer.color.r, layer.color.g, layer.color.b),
        roughness: 0.75,
        metalness: 0.05,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(currentX + width / 2 - 0.6, sectionHeight / 2 + 0.1, -2.2);
      box.castShadow = true;
      this.crossSectionGroup.add(box);

      const edgeGeo = new THREE.EdgesGeometry(boxGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x333333 });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.copy(box.position);
      this.crossSectionGroup.add(edges);

      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 200;
      labelCanvas.height = 80;
      const ctx = labelCanvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
      ctx.roundRect(0, 0, 200, 80, 6);
      ctx.fill();
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e0e6ed';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(layer.name.split('\\n')[0], 100, 22);
      ctx.font = '12px monospace';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(`${layer.thickness.toFixed(0)}mm  |  λ=${layer.label.split('λ=')[1]}`, 100, 50);

      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.16),
        new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true })
      );
      labelPlane.position.set(currentX + width / 2 - 0.6, sectionHeight + 0.35, -2.2);
      this.crossSectionGroup.add(labelPlane);

      currentX += width;
    }

    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 400;
    arrowCanvas.height = 50;
    const aCtx = arrowCanvas.getContext('2d')!;
    aCtx.fillStyle = '#ef4444';
    aCtx.font = 'bold 14px sans-serif';
    aCtx.textAlign = 'left';
    aCtx.fillText('← 室内', 20, 28);
    aCtx.textAlign = 'right';
    aCtx.fillText('室外 →', 380, 28);
    aCtx.textAlign = 'center';
    aCtx.fillStyle = '#fbbf24';
    aCtx.fillText('墙体剖面分析', 200, 30);

    const arrowTexture = new THREE.CanvasTexture(arrowCanvas);
    const arrowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.22),
      new THREE.MeshBasicMaterial({ map: arrowTexture, transparent: true })
    );
    arrowPlane.position.set(0, -0.1, -2.2);
    this.crossSectionGroup.add(arrowPlane);

    const dewTemp = this.dewPointCalculator.calculateDewPoint();

    const points: THREE.Vector3[] = [];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      const temp = this.temperatureSimulator.getTemperatureAtDepth(t * totalThicknessMM / 1000, 0.3);
      const xNorm = -0.6 + (t * totalThicknessMM * scale);
      const yNorm = 0.1 + ((temp - (dewTemp - 3)) / 12) * sectionHeight;
      points.push(new THREE.Vector3(xNorm, yNorm, -2.19));
    }
    const tempCurve = new THREE.BufferGeometry().setFromPoints(points);
    const tempLine = new THREE.Line(
      tempCurve,
      new THREE.LineBasicMaterial({ color: 0xff6b6b, linewidth: 2 })
    );
    this.crossSectionGroup.add(tempLine);
  }

  private setupVentilationParticles() {
    while (this.ventilationGroup.children.length > 0) {
      this.ventilationGroup.remove(this.ventilationGroup.children[0]);
    }
    this.ventilationParticles = null;
    this.ventilationParticleData = [];
    this.particleGeometry = null;

    if (!this.ventilationConfig.enabled) return;

    const maxParticles = 500;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setDrawRange(0, 0);

    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ventilationParticles = new THREE.Points(this.particleGeometry, particleMat);
    this.ventilationGroup.add(this.ventilationParticles);
  }

  private updateVentilationParticles(deltaTime: number) {
    if (!this.ventilationConfig.enabled || !this.ventilationParticles || !this.particleGeometry) return;

    const newParticles = this.ventilationSimulator.spawnParticles();
    this.ventilationParticleData.push(...newParticles);

    const deadParticles = this.ventilationSimulator.updateParticles(deltaTime);
    for (const dead of deadParticles) {
      const idx = this.ventilationParticleData.indexOf(dead);
      if (idx !== -1) this.ventilationParticleData.splice(idx, 1);
    }

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const sizes = this.particleGeometry.attributes.size.array as Float32Array;

    const max = Math.min(this.ventilationParticleData.length, positions.length / 3);
    for (let i = 0; i < max; i++) {
      const p = this.ventilationParticleData[i];
      positions[i * 3] = -this.WALL_WIDTH / 2 + p.x * this.WALL_WIDTH;
      positions[i * 3 + 1] = p.y * this.WALL_HEIGHT;
      positions[i * 3 + 2] = -p.z * 2;

      if (p.type === 'moisture') {
        colors[i * 3] = 0.4;
        colors[i * 3 + 1] = 0.6;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      }
      sizes[i] = p.size * 1.2;
    }

    this.particleGeometry.setDrawRange(0, max);
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
  }

  private applyDisplayMode() {
    const showTemp = this.displayMode === 'temperature' || this.displayMode === 'combined';
    const showDew = this.displayMode === 'dewpoint' || this.displayMode === 'combined';
    const showMold = this.displayMode === 'mold' || this.displayMode === 'combined';
    const showCross = this.displayMode === 'cross-section';
    const showVent = this.ventilationConfig.enabled;

    for (const child of this.temperatureFieldGroup.children as THREE.Mesh[]) {
      if (child.material) {
        (child.material as THREE.MeshBasicMaterial).opacity = showTemp ? (child.userData.baseOpacity || 0.75) * 0.9 : 0;
      }
    }

    this.dewDropsGroup.visible = showDew;
    this.moldRiskGroup.visible = showMold;
    this.crossSectionGroup.visible = showCross;
    this.ventilationGroup.visible = showVent;

    if (this.displayMode === 'cross-section') {
      this.renderCrossSection();
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    this.controls.update();

    this.updateVentilationParticles(deltaTime);

    const time = this.clock.getElapsedTime();
    for (const child of this.dewDropsGroup.children) {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
        child.position.y += Math.sin(time * 2 + child.position.x * 10) * 0.00008;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new BasementMoldPredictorApp();
});
