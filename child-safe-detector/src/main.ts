import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { ChildModel } from './modules/ChildModel';
import { TrajectorySimulator } from './modules/TrajectorySimulator';
import { SharpCornerDetector, SharpCornerResult } from './modules/SharpCornerDetector';
import { SoftPaddingSystem, PaddingResult } from './modules/SoftPaddingSystem';
import { GuardrailValidator, GuardrailCheckResult } from './modules/GuardrailValidator';
import { RoomSceneBuilder } from './scene/RoomSceneBuilder';

class ChildSafeDetectorApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private roomBuilder: RoomSceneBuilder;
  private childModel: ChildModel;
  private trajectorySimulator: TrajectorySimulator;
  private sharpCornerDetector: SharpCornerDetector;
  private softPaddingSystem: SoftPaddingSystem;
  private guardrailValidator: GuardrailValidator;

  private sharpCornerResult: SharpCornerResult | null = null;
  private paddingResult: PaddingResult | null = null;
  private guardrailResult: GuardrailCheckResult | null = null;

  private simRunning: boolean = true;
  private lastAuditTime: number = 0;
  private readonly AUDIT_INTERVAL: number = 3000;

  private hudElements: Record<string, HTMLElement> = {};

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 10, 30);

    const container = document.getElementById('app')!;
    const aspect = window.innerWidth / window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 100);
    this.camera.position.set(4.5, 3.5, 4.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0.8, 0);

    this.clock = new THREE.Clock();

    this.roomBuilder = new RoomSceneBuilder();
    this.roomBuilder.build();
    this.roomBuilder.addLights(this.scene);
    this.scene.add(this.roomBuilder.group);

    this.childModel = new ChildModel({ height: 0.9, radius: 0.18 });
    this.childModel.setPosition(-1.5, 0, 0.5);
    this.scene.add(this.childModel.group);

    this.trajectorySimulator = new TrajectorySimulator(this.childModel, {
      roomBounds: this.roomBuilder.roomBounds,
      obstacles: this.roomBuilder.furnitureObjects,
      speed: 0.7,
      changeDirectionInterval: 1800,
      trailMaxPoints: 300,
    });
    this.scene.add(this.trajectorySimulator.group);

    this.sharpCornerDetector = new SharpCornerDetector();
    this.scene.add(this.sharpCornerDetector.group);

    this.softPaddingSystem = new SoftPaddingSystem();
    this.scene.add(this.softPaddingSystem.group);

    this.guardrailValidator = new GuardrailValidator();
    this.scene.add(this.guardrailValidator.group);

    this.setupHUDReferences();
    this.setupEventListeners();
    this.runFullAudit(0);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupHUDReferences(): void {
    const ids = [
      'cornerCount', 'cornerAlerts',
      'paddingArea', 'paddingAlerts',
      'guardrailStatus', 'guardrailAlerts',
      'collisionStatus', 'collisionAlerts',
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) this.hudElements[id] = el;
    }
  }

  private setupEventListeners(): void {
    const toggleSimBtn = document.getElementById('toggleSim');
    const toggleTrajBtn = document.getElementById('toggleTraj');
    const runAuditBtn = document.getElementById('runAudit');
    const resetViewBtn = document.getElementById('resetView');

    toggleSimBtn?.addEventListener('click', () => {
      this.simRunning = this.trajectorySimulator.toggleRunning();
      toggleSimBtn.textContent = this.simRunning ? '⏸ 暂停模拟' : '▶ 开始模拟';
      toggleSimBtn.classList.toggle('active', !this.simRunning);
    });

    toggleTrajBtn?.addEventListener('click', () => {
      const visible = this.trajectorySimulator.toggleTrailVisible();
      toggleTrajBtn.textContent = visible ? '👁 隐藏轨迹' : '👁 显示轨迹';
      toggleTrajBtn.classList.toggle('active', !visible);
    });

    runAuditBtn?.addEventListener('click', () => {
      this.runFullAudit(this.clock.getElapsedTime() * 1000);
      runAuditBtn.style.transform = 'scale(0.95)';
      setTimeout(() => (runAuditBtn.style.transform = ''), 150);
    });

    resetViewBtn?.addEventListener('click', () => {
      this.camera.position.set(4.5, 3.5, 4.5);
      this.controls.target.set(0, 0.8, 0);
      this.controls.update();
    });
  }

  private runFullAudit(currentTime: number): void {
    this.lastAuditTime = currentTime;
    const childHeightRange = { min: 0, max: 0.9 };
    const childPos = this.childModel.getPosition();

    const allObjects = [...this.roomBuilder.furnitureObjects, this.roomBuilder.group];

    this.sharpCornerResult = this.sharpCornerDetector.detect(
      allObjects,
      childHeightRange,
      childPos
    );

    this.paddingResult = this.softPaddingSystem.analyzeAndApply(
      this.sharpCornerResult.corners
    );

    const allSceneObjects = [
      ...this.roomBuilder.furnitureObjects,
      ...this.roomBuilder.windowObjects,
    ];
    this.guardrailResult = this.guardrailValidator.validate(allSceneObjects);

    this.updateHUD();
  }

  private updateHUD(): void {
    if (this.sharpCornerResult) {
      const { highRiskCount, mediumRiskCount } = this.sharpCornerResult;
      const total = highRiskCount + mediumRiskCount;
      const cornerCountEl = this.hudElements['cornerCount'];
      const cornerAlertsEl = this.hudElements['cornerAlerts'];

      if (total > 0) {
        cornerCountEl.innerHTML = `<span class="danger">检测到 ${total} 个风险锐角</span>（高风险 ${highRiskCount} 个）`;
      } else {
        cornerCountEl.innerHTML = `<span class="safe">✅ 未检测到风险锐角</span>`;
      }

      if (cornerAlertsEl) {
        cornerAlertsEl.innerHTML = '';
        const seenNames = new Set<string>();
        for (const corner of this.sharpCornerResult.corners) {
          if (corner.riskLevel !== 'high' && corner.riskLevel !== 'medium') continue;
          const name = corner.objectName || '家具';
          if (seenNames.has(name)) continue;
          seenNames.add(name);
          const heightCm = (corner.height * 100).toFixed(0);
          const angleDeg = (corner.angle * 180 / Math.PI).toFixed(0);
          const alert = document.createElement('div');
          alert.className = corner.riskLevel === 'high' ? 'alert' : 'alert warn';
          alert.innerHTML = `🔴 ${name}边角高度${heightCm}cm，碰撞风险高，建议倒圆角或加装防撞条`;
          cornerAlertsEl.appendChild(alert);
        }
      }
    }

    if (this.paddingResult) {
      const { totalArea, estimatedCost, suggestions } = this.paddingResult;
      const paddingAreaEl = this.hudElements['paddingArea'];
      const paddingAlertsEl = this.hudElements['paddingAlerts'];
      const hasSuggestions = suggestions.length > 0;

      paddingAreaEl.innerHTML =
        hasSuggestions
          ? `建议软包覆盖 <b>${(totalArea * 10000).toFixed(1)} cm²</b>`
          : `<span class="safe">✅ 无需额外软包</span>`;

      if (paddingAlertsEl && hasSuggestions) {
        paddingAlertsEl.innerHTML = '';

        const costAlert = document.createElement('div');
        costAlert.className = 'alert warn';
        costAlert.innerHTML = `💰 预估材料费用：<b>¥${estimatedCost.toFixed(0)}</b>`;
        paddingAlertsEl.appendChild(costAlert);

        const types = new Map<string, number>();
        for (const s of suggestions) {
          const key = s.paddingType === 'corner_guard' ? '防撞角' :
                       s.paddingType === 'edge_trim' ? '防撞条' :
                       '整体软包';
          types.set(key, (types.get(key) || 0) + 1);
        }
        const typeText = Array.from(types.entries())
          .map(([k, v]) => `${k}×${v}`)
          .join('、');
        const typeAlert = document.createElement('div');
        typeAlert.className = 'alert ok';
        typeAlert.innerHTML = `🛠 方案：${typeText}`;
        paddingAlertsEl.appendChild(typeAlert);
      } else if (paddingAlertsEl && !hasSuggestions) {
        paddingAlertsEl.innerHTML = '';
      }
    }

    if (this.guardrailResult) {
      const { unprotectedZones, protectedZones, totalZones, warnings } = this.guardrailResult;
      const statusEl = this.hudElements['guardrailStatus'];
      const alertsEl = this.hudElements['guardrailAlerts'];

      if (totalZones === 0) {
        statusEl.innerHTML = `<span class="warning">未检测到窗户区域</span>`;
      } else if (unprotectedZones === 0) {
        statusEl.innerHTML = `<span class="safe">✅ ${protectedZones}/${totalZones} 处已防护</span>`;
      } else {
        statusEl.innerHTML = `<span class="danger">⚠️ ${unprotectedZones}/${totalZones} 处缺少防护栏</span>`;
      }

      if (alertsEl && warnings.length > 0) {
        alertsEl.innerHTML = '';
        for (const w of warnings.slice(0, 3)) {
          const alert = document.createElement('div');
          alert.className = w.includes('严重') || w.includes('缺少') ? 'alert' : 'alert warn';
          alert.textContent = w;
          alertsEl.appendChild(alert);
        }
      }
    }
  }

  private updateCollisionStatus(nearCorner: boolean): void {
    const statusEl = this.hudElements['collisionStatus'];
    const alertsEl = this.hudElements['collisionAlerts'];
    if (!statusEl || !alertsEl) return;

    const childPos = this.childModel.getPosition();
    const headRange = this.childModel.getHeadHeightRange();

    let collisionRisk = false;
    let riskObjectName = '';
    let minDist = Infinity;

    for (const obj of this.roomBuilder.furnitureObjects) {
      const box = new THREE.Box3().setFromObject(obj);
      const corners = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z),
      ];

      for (const c of corners) {
        if (c.y >= headRange.min && c.y <= headRange.max) {
          const dist = new THREE.Vector3(c.x, 0, c.z).distanceTo(
            new THREE.Vector3(childPos.x, 0, childPos.z)
          );
          if (dist < 0.4 && dist < minDist) {
            minDist = dist;
            collisionRisk = true;
            riskObjectName = obj.name || obj.parent?.name || '家具';
          }
        }
      }
    }

    if (collisionRisk && minDist < 0.35) {
      statusEl.innerHTML = `<span class="danger">⚠️ 接近碰撞（${(minDist * 100).toFixed(0)}cm）</span>`;
      alertsEl.innerHTML = `<div class="alert">🚨 儿童头部正接近 <b>${riskObjectName}</b> 的尖角！</div>`;
    } else if (nearCorner) {
      statusEl.innerHTML = `<span class="warning">注意：附近有边角</span>`;
      alertsEl.innerHTML = '';
    } else {
      statusEl.innerHTML = `<span class="safe">正常</span>`;
      alertsEl.innerHTML = '';
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    const currentTimeMs = this.clock.getElapsedTime() * 1000;
    const timeSec = this.clock.getElapsedTime();

    const nearCorner = this.trajectorySimulator.update(deltaTime, currentTimeMs);

    if (currentTimeMs - this.lastAuditTime > this.AUDIT_INTERVAL) {
      this.runFullAudit(currentTimeMs);
    }

    this.sharpCornerDetector.animatePulse(timeSec);
    this.softPaddingSystem.animate(timeSec);
    this.guardrailValidator.animate(timeSec);
    this.updateCollisionStatus(nearCorner);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }
}

const app = new ChildSafeDetectorApp();
app.start();
