import * as THREE from 'three';
import { SandTable } from './map/SandTable';
import { Soldier, Faction } from './units/Soldier';

interface HealthLabel {
  element: HTMLDivElement;
  soldier: Soldier;
}

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sandTable: SandTable;
  private soldiers: Soldier[] = [];
  private clock: THREE.Clock;
  private selectedFaction: Faction = 'red';
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private placementPreview: THREE.Mesh | null = null;
  private gameOver: boolean = false;
  private winner: Faction | null = null;
  private healthLabels: Map<string, HealthLabel> = new Map();
  private labelContainer: HTMLDivElement;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2a3a);
    this.scene.fog = new THREE.Fog(0x2a2a3a, 30, 80);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 35, 35);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.getElementById('app')!.appendChild(this.renderer.domElement);

    this.labelContainer = document.createElement('div');
    this.labelContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    `;
    document.getElementById('app')!.appendChild(this.labelContainer);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLighting();
    this.sandTable = new SandTable(40);
    this.scene.add(this.sandTable.mesh);
    this.scene.add(this.sandTable.obstacles);

    this.createPlacementPreview();
    this.setupEventListeners();
    this.spawnInitialSoldiers();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-15, 20, -15);
    this.scene.add(fillLight);
  }

  private createPlacementPreview(): void {
    const geometry = new THREE.CylinderGeometry(0.5, 0.6, 0.1, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.5,
    });
    this.placementPreview = new THREE.Mesh(geometry, material);
    this.placementPreview.visible = false;
    this.scene.add(this.placementPreview);
  }

  private createHealthLabel(soldier: Soldier): void {
    const element = document.createElement('div');
    element.className = `health-label ${soldier.faction}`;
    element.style.cssText = `
      position: absolute;
      transform: translate(-50%, -50%);
    `;
    this.labelContainer.appendChild(element);
    this.healthLabels.set(soldier.id, { element, soldier });
  }

  private updateHealthLabelPosition(label: HealthLabel): void {
    const vector = new THREE.Vector3(
      label.soldier.mesh.position.x,
      label.soldier.mesh.position.y + 3,
      label.soldier.mesh.position.z
    );
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    label.element.style.left = `${x}px`;
    label.element.style.top = `${y}px`;

    const health = Math.ceil(label.soldier.getDisplayedHealth());
    const maxHealth = label.soldier.maxHealth;
    label.element.textContent = `${health}/${maxHealth}`;

    if (label.soldier.isAlive) {
      label.element.style.display = 'block';
    } else {
      label.element.style.display = 'none';
    }
  }

  private removeHealthLabel(soldierId: string): void {
    const label = this.healthLabels.get(soldierId);
    if (label) {
      label.element.remove();
      this.healthLabels.delete(soldierId);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));

    const redBtn = document.getElementById('redBtn')!;
    const blueBtn = document.getElementById('blueBtn')!;
    const resetBtn = document.getElementById('resetBtn')!;
    const stressBtn = document.getElementById('stressBtn')!;

    redBtn.addEventListener('click', () => {
      this.selectedFaction = 'red';
      redBtn.classList.add('active');
      blueBtn.classList.remove('active');
      this.updatePreviewColor();
    });

    blueBtn.addEventListener('click', () => {
      this.selectedFaction = 'blue';
      blueBtn.classList.add('active');
      redBtn.classList.remove('active');
      this.updatePreviewColor();
    });

    resetBtn.addEventListener('click', () => this.resetGame());
    stressBtn.addEventListener('click', () => this.startStressTest());

    redBtn.classList.add('active');
  }

  private updatePreviewColor(): void {
    if (this.placementPreview) {
      const mat = this.placementPreview.material as THREE.MeshBasicMaterial;
      mat.color.setHex(this.selectedFaction === 'red' ? 0xff4444 : 0x4488ff);
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.sandTable.mesh);

    if (intersects.length > 0 && this.placementPreview) {
      const point = intersects[0].point;
      const clamped = this.sandTable.clampPosition(point);
      this.placementPreview.position.set(clamped.x, 0.06, clamped.z);
      this.placementPreview.visible = true;
    } else if (this.placementPreview) {
      this.placementPreview.visible = false;
    }
  }

  private onClick(event: MouseEvent): void {
    if (event.target instanceof HTMLButtonElement) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.sandTable.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const clamped = this.sandTable.clampPosition(point);
      this.spawnSoldier(this.selectedFaction, clamped);
      this.gameOver = false;
      this.winner = null;
    }
  }

  private spawnSoldier(faction: Faction, position: THREE.Vector3): void {
    const soldier = new Soldier({
      faction,
      position: position.clone(),
    });
    this.soldiers.push(soldier);
    this.scene.add(soldier.mesh);
    this.createHealthLabel(soldier);
    this.updateStats();
  }

  private spawnInitialSoldiers(): void {
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const radius = 8;
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius - 10,
        0.5,
        Math.sin(angle) * radius
      );
      this.spawnSoldier('red', pos);
    }

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const radius = 8;
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius + 10,
        0.5,
        Math.sin(angle) * radius
      );
      this.spawnSoldier('blue', pos);
    }
  }

  private startStressTest(): void {
    this.resetGame();
    
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const radius = 12 + Math.random() * 3;
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius - 8,
        0.5,
        Math.sin(angle) * radius + (Math.random() - 0.5) * 4
      );
      this.spawnSoldier('red', pos);
    }

    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2 + Math.PI / 15;
      const radius = 12 + Math.random() * 3;
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius + 8,
        0.5,
        Math.sin(angle) * radius + (Math.random() - 0.5) * 4
      );
      this.spawnSoldier('blue', pos);
    }

    console.log('⚡ 压力测试开始: 30 士兵已部署');
    console.log('📊 请观察右侧面板的 FPS 和内存变化');
  }

  private resetGame(): void {
    for (const soldier of this.soldiers) {
      this.removeHealthLabel(soldier.id);
      soldier.dispose();
      this.scene.remove(soldier.mesh);
    }
    this.soldiers = [];
    this.gameOver = false;
    this.winner = null;
    this.spawnInitialSoldiers();
  }

  private updateStats(): void {
    const redCount = this.soldiers.filter(s => s.faction === 'red' && s.isAlive).length;
    const blueCount = this.soldiers.filter(s => s.faction === 'blue' && s.isAlive).length;
    
    const redEl = document.getElementById('redCount')!;
    const blueEl = document.getElementById('blueCount')!;
    
    redEl.textContent = redCount.toString();
    blueEl.textContent = blueCount.toString();

    if (!this.gameOver) {
      if (redCount > 0 && blueCount === 0) {
        this.gameOver = true;
        this.winner = 'red';
        this.showWinner('red');
      } else if (blueCount > 0 && redCount === 0) {
        this.gameOver = true;
        this.winner = 'blue';
        this.showWinner('blue');
      }
    }
  }

  private updatePerformanceStats(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.lastFpsUpdate >= 1) {
      this.currentFps = Math.round(this.frameCount / (currentTime - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;

      const fpsEl = document.getElementById('fpsCount')!;
      const memEl = document.getElementById('memUsage')!;
      
      fpsEl.textContent = this.currentFps.toString();
      
      if ((performance as any).memory) {
        const usedMB = Math.round((performance as any).memory.usedJSHeapSize / 1048576);
        memEl.textContent = `${usedMB} MB`;
      } else {
        memEl.textContent = 'N/A';
      }
    }
  }

  private showWinner(faction: Faction): void {
    const winnerEl = document.getElementById('winnerMessage')!;
    winnerEl.textContent = faction === 'red' ? '🎉 红方获胜！' : '🎉 蓝方获胜！';
    winnerEl.style.color = faction === 'red' ? '#ff6666' : '#6699ff';
    winnerEl.style.display = 'block';
    
    setTimeout(() => {
      winnerEl.style.display = 'none';
    }, 5000);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const currentTime = this.clock.getElapsedTime();

    for (const soldier of this.soldiers) {
      if (soldier.isAlive) {
        soldier.update(
          this.soldiers,
          deltaTime,
          currentTime,
          this.sandTable.clampPosition.bind(this.sandTable)
        );
      }
    }

    for (const label of this.healthLabels.values()) {
      this.updateHealthLabelPosition(label);
    }

    this.cleanupDeadSoldiers();
    this.updateStats();
    this.updatePerformanceStats(currentTime);

    const time = this.clock.getElapsedTime();
    this.camera.position.x = Math.sin(time * 0.05) * 2;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private cleanupDeadSoldiers(): void {
    const deadSoldiers = this.soldiers.filter(s => !s.isAlive);
    
    for (const soldier of deadSoldiers) {
      setTimeout(() => {
        this.removeHealthLabel(soldier.id);
        soldier.dispose();
        this.scene.remove(soldier.mesh);
      }, 3000);
    }

    this.soldiers = this.soldiers.filter(s => s.isAlive);
  }
}

new Game();
