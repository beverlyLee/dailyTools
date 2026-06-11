import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WheelchairGenerator } from './wheelchair/WheelchairGenerator';
import { CollisionDetector, CollisionInfo } from './collision/CollisionDetector';
import { GrabInteractionSystem } from './interaction/GrabInteractionSystem';
import { ClearWidthVerifier } from './verification/ClearWidthVerifier';
import { BathroomSceneBuilder, DEFAULT_BATHROOM_CONFIG, SPACIOUS_BATHROOM_CONFIG, SceneElements } from './scene/BathroomSceneBuilder';

type AppState = 'idle' | 'running' | 'completed_pass' | 'completed_fail' | 'stopped';

class AgingInPlaceValidator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private glContextLost = false;

  private wheelchairGenerator: WheelchairGenerator;
  private wheelchair: THREE.Group | null = null;
  private wheelchairCollisionBoxes: THREE.Box3[] = [];

  private collisionDetector: CollisionDetector;
  private grabSystem: GrabInteractionSystem;
  private widthVerifier: ClearWidthVerifier;
  private bathroomBuilder: BathroomSceneBuilder;
  private sceneElements: SceneElements | null = null;
  private isSpaciousMode = false;

  private rotationPathVisual: THREE.Object3D | null = null;

  private appState: AppState = 'idle';
  private rotationProgress = 0;
  private baseRotationSpeed = 0.10;
  private currentRotationSpeed = 0.10;
  private initialWheelchairPosition = new THREE.Vector3();
  private initialWheelchairRotation = 0;
  private collisionGracePeriod = 0;
  private minRotationProgressBeforeCollision = 0.25;
  private easingProgress = 0;

  private lights: THREE.Light[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(4.5, 3.5, 4.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('app')?.appendChild(this.renderer.domElement);

    this.setupWebGLContextListeners();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(1.2, 0.5, 1.4);
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10;

    this.clock = new THREE.Clock();

    this.collisionDetector = new CollisionDetector(this.scene);
    this.grabSystem = new GrabInteractionSystem(this.scene);
    this.widthVerifier = new ClearWidthVerifier(this.scene);
    this.bathroomBuilder = new BathroomSceneBuilder(this.scene, this.collisionDetector);
    this.wheelchairGenerator = new WheelchairGenerator();

    this.setupLights();
    this.buildScene();
    this.setupWheelchair();
    this.setupEventListeners();
    this.setupUIHandlers();

    window.addEventListener('resize', this.onResize.bind(this));

    this.updateUIFromState();
    this.startAnimationLoop();
  }

  private setupWebGLContextListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.glContextLost = true;
      this.stopAnimationLoop();
      console.warn('WebGL context lost');
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.glContextLost = false;
      console.info('WebGL context restored');
      this.restoreRenderer();
      this.startAnimationLoop();
    });
  }

  private restoreRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private startAnimationLoop(): void {
    if (this.animationId !== null) return;
    const loop = () => {
      if (this.glContextLost) return;
      this.animationId = requestAnimationFrame(loop);
      this.animate();
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private stopAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 30;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    this.scene.add(directionalLight);
    this.lights.push(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    fillLight.position.set(-3, 4, -3);
    this.scene.add(fillLight);
    this.lights.push(fillLight);
  }

  private buildScene(): void {
    const config = this.isSpaciousMode ? SPACIOUS_BATHROOM_CONFIG : DEFAULT_BATHROOM_CONFIG;

    this.clearSceneElements();
    this.collisionDetector.removeAllObstacles();
    this.widthVerifier.removeAllDoorways();
    this.grabSystem.removeAllGrabPoints();

    this.sceneElements = this.bathroomBuilder.build(config);

    this.sceneElements.doorways.forEach(d => this.widthVerifier.addDoorway(d));
    this.sceneElements.grabPoints.forEach(g =>
      this.grabSystem.addGrabPoint(g.position, g.name, g.type)
    );

    this.updateUIWidth();
  }

  private clearSceneElements(): void {
    if (!this.sceneElements) return;

    const disposeObject = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => {
            if (m instanceof THREE.Material) m.dispose();
          });
        } else if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
      if (obj instanceof THREE.Sprite && obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
      if (obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
      obj.children.forEach(child => disposeObject(child));
    };

    this.sceneElements.walls.forEach(w => {
      this.scene.remove(w);
      disposeObject(w);
    });
    if (this.sceneElements.floor) {
      this.scene.remove(this.sceneElements.floor);
      disposeObject(this.sceneElements.floor);
    }
    if (this.sceneElements.doorFrame) {
      this.scene.remove(this.sceneElements.doorFrame);
      disposeObject(this.sceneElements.doorFrame);
    }
    if (this.sceneElements.toilet) {
      this.scene.remove(this.sceneElements.toilet);
      disposeObject(this.sceneElements.toilet);
    }
    if (this.sceneElements.sink) {
      this.scene.remove(this.sceneElements.sink);
      disposeObject(this.sceneElements.sink);
    }
    this.sceneElements.grabBars.forEach(g => {
      this.scene.remove(g);
      disposeObject(g);
    });

    this.sceneElements = null;
  }

  private setupWheelchair(): void {
    if (this.wheelchair) {
      this.scene.remove(this.wheelchair);
      this.disposeGroup(this.wheelchair);
      this.wheelchair = null;
    }

    this.wheelchair = this.wheelchairGenerator.generate();
    this.wheelchairCollisionBoxes = this.wheelchairGenerator.getCollisionBoxes();

    const startX = this.isSpaciousMode ? 1.2 : 0.85;
    const startZ = this.isSpaciousMode ? 1.6 : 1.55;
    this.wheelchair.position.set(startX, 0, startZ);
    this.wheelchair.rotation.y = -Math.PI / 2;

    this.initialWheelchairPosition.set(startX, 0, startZ);
    this.initialWheelchairRotation = -Math.PI / 2;

    this.scene.add(this.wheelchair);

    this.grabSystem.setWheelchairPose(
      this.wheelchair.position,
      this.wheelchair.rotation.y
    );
  }

  private disposeGroup(group: THREE.Group): void {
    const disposeRecursive = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => { if (m instanceof THREE.Material) m.dispose(); });
        } else if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
      obj.children.forEach(child => disposeRecursive(child));
    };
    disposeRecursive(group);
  }

  private setupEventListeners(): void {
  }

  private setupUIHandlers(): void {
    const btnRotate = document.getElementById('btn-rotate');
    const btnStop = document.getElementById('btn-stop');
    const btnReset = document.getElementById('btn-reset');
    const btnVerifyWidth = document.getElementById('btn-verify-width');
    const btnVerifyGrab = document.getElementById('btn-verify-grab');
    const btnToggleScene = document.getElementById('btn-toggle-scene');

    btnRotate?.addEventListener('click', () => this.startRotationTest());
    btnStop?.addEventListener('click', () => this.stopRotationTest());
    btnReset?.addEventListener('click', () => this.resetScene());
    btnVerifyWidth?.addEventListener('click', () => this.verifyWidth());
    btnVerifyGrab?.addEventListener('click', () => this.verifyGrabReachability());
    btnToggleScene?.addEventListener('click', () => this.toggleSceneMode());
  }

  private setState(newState: AppState): void {
    this.appState = newState;
    this.updateUIFromState();
  }

  private updateUIFromState(): void {
    const btnRotate = document.getElementById('btn-rotate') as HTMLButtonElement;
    const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
    const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

    if (btnRotate) {
      btnRotate.disabled = this.appState === 'running';
      switch (this.appState) {
        case 'idle':
        case 'stopped':
          btnRotate.textContent = '🔄 开始轮椅回转测试';
          break;
        case 'running':
          btnRotate.textContent = '⏳ 回转中...';
          break;
        case 'completed_pass':
        case 'completed_fail':
          btnRotate.textContent = '🔄 重新开始回转测试';
          break;
      }
    }

    if (btnStop) {
      btnStop.disabled = this.appState !== 'running';
      btnStop.textContent = this.appState === 'running' ? '⏹ 停止测试' : '⏹ 停止（不可用）';
      btnStop.style.opacity = this.appState === 'running' ? '1' : '0.6';
    }

    if (btnReset) {
      btnReset.disabled = false;
    }

    const stateBadge = document.getElementById('state-badge');
    if (stateBadge) {
      const stateLabels: Record<AppState, { text: string; class: string }> = {
        idle: { text: '就绪', class: 'badge-info' },
        running: { text: '测试中', class: 'badge-running' },
        completed_pass: { text: '✓ 通过', class: 'badge-success' },
        completed_fail: { text: '✗ 失败', class: 'badge-error' },
        stopped: { text: '已停止', class: 'badge-warning' }
      };
      const s = stateLabels[this.appState];
      stateBadge.textContent = s.text;
      stateBadge.className = 'state-badge ' + s.class;
    }
  }

  private startRotationTest(): void {
    if (!this.wheelchair) return;

    this.rotationProgress = 0;
    this.easingProgress = 0;
    this.collisionGracePeriod = 1.2;
    this.currentRotationSpeed = this.baseRotationSpeed * 0.3;

    const center = new THREE.Vector3(
      this.wheelchair.position.x,
      0,
      this.wheelchair.position.z
    );

    if (this.rotationPathVisual) {
      this.scene.remove(this.rotationPathVisual);
      this.disposeGroup(this.rotationPathVisual as THREE.Group);
      this.rotationPathVisual = null;
    }
    this.rotationPathVisual = this.createRotationSpaceVisualization(center);
    this.scene.add(this.rotationPathVisual);

    this.collisionDetector.clearCollisionMarkers();
    this.updateCollisionPoints([]);
    this.grabSystem.clearMarkers();
    this.widthVerifier.clearVisualization();

    this.updateStatus(
      '正在进行回转测试...',
      '轮椅正在以最小回转半径 1.5m 进行 360° 回转，系统实时检测碰撞。',
      'info'
    );

    this.setState('running');
  }

  private stopRotationTest(): void {
    if (this.appState !== 'running') return;

    this.setState('stopped');
    this.updateStatus(
      '测试已停止',
      '用户手动停止了回转测试。可点击「重新开始」继续，或「重置场景」恢复初始状态。',
      'warning'
    );
  }

  private resetScene(): void {
    this.rotationProgress = 0;
    this.easingProgress = 0;
    this.collisionGracePeriod = 0;
    this.currentRotationSpeed = this.baseRotationSpeed;

    if (this.wheelchair) {
      this.wheelchair.position.copy(this.initialWheelchairPosition);
      this.wheelchair.rotation.y = this.initialWheelchairRotation;
    }

    if (this.rotationPathVisual) {
      this.scene.remove(this.rotationPathVisual);
      this.disposeGroup(this.rotationPathVisual as THREE.Group);
      this.rotationPathVisual = null;
    }

    this.collisionDetector.clearCollisionMarkers();
    this.updateCollisionPoints([]);
    this.grabSystem.clearMarkers();
    this.widthVerifier.clearVisualization();

    const angleEl = document.getElementById('angle-value');
    if (angleEl) angleEl.textContent = '0°';

    this.updateStatus(
      '系统就绪',
      '点击「开始轮椅回转测试」验证卫生间空间是否满足适老化标准。',
      'info'
    );

    this.updateUIWidth();
    this.grabSystem.setWheelchairPose(
      this.initialWheelchairPosition,
      this.initialWheelchairRotation
    );

    this.setState('idle');
  }

  private toggleSceneMode(): void {
    this.isSpaciousMode = !this.isSpaciousMode;
    this.buildScene();
    this.setupWheelchair();
    this.setState('idle');
    this.resetScene();

    const btnToggle = document.getElementById('btn-toggle-scene');
    if (btnToggle) {
      btnToggle.textContent = this.isSpaciousMode ? '🏠 切换到狭窄场景' : '🏡 切换到宽敞场景';
    }

    const sceneLabel = document.getElementById('scene-label');
    if (sceneLabel) {
      sceneLabel.textContent = this.isSpaciousMode ? '宽敞型（对照）' : '狭窄型（标准）';
    }
  }

  private verifyWidth(): void {
    if (!this.sceneElements) return;

    const doorway = this.sceneElements.doorways[0];
    const result = this.widthVerifier.verifyDoorway(doorway);

    this.widthVerifier.visualizeVerification(doorway, result);

    if (result.passed) {
      this.updateStatus(
        '✓ 门洞净宽验证通过',
        result.recommendation,
        'success'
      );
    } else {
      this.updateStatus(
        '✗ 门洞净宽验证失败',
        result.recommendation,
        'error'
      );
    }
  }

  private verifyGrabReachability(): void {
    if (!this.wheelchair) return;

    this.grabSystem.setWheelchairPose(
      this.wheelchair.position,
      this.wheelchair.rotation.y
    );

    const analysis = this.grabSystem.analyzeReachability();
    this.grabSystem.visualizeGrabPoints(analysis);

    if (analysis.reachablePoints.length > 0) {
      this.updateStatus(
        `✓ 扶手可达性分析完成`,
        analysis.suggestion + `\n可达 ${analysis.reachablePoints.length} 个 / 共 ${analysis.reachablePoints.length + analysis.unreachablePoints.length} 个扶手。`,
        'success'
      );
    } else {
      this.updateStatus(
        '✗ 扶手可达性验证失败',
        analysis.suggestion,
        'error'
      );
    }
  }

  private updateStatus(title: string, message: string, type: 'info' | 'success' | 'error' | 'warning'): void {
    const panel = document.getElementById('status-panel');
    const titleEl = document.getElementById('status-title');
    const messageEl = document.getElementById('status-message');

    if (panel) {
      panel.className = '';
      panel.classList.add(type);
    }
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
  }

  private updateCollisionPoints(collisions: CollisionInfo[]): void {
    const container = document.getElementById('collision-points');
    if (!container) return;

    if (collisions.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = collisions
      .map(c => `⚠ ${c.obstacleName} (位置: ${c.collisionPoint.x.toFixed(2)}, ${c.collisionPoint.z.toFixed(2)})`)
      .join('<br/>');
  }

  private updateUIWidth(): void {
    if (!this.sceneElements) return;
    const doorway = this.sceneElements.doorways[0];
    const result = this.widthVerifier.verifyDoorway(doorway);
    const el = document.getElementById('width-value');
    if (el) {
      el.textContent = `${result.clearWidth.toFixed(2)}m`;
      el.className = 'info-value ' + (result.passed ? 'pass' : 'fail');
    }
  }

  private onResize(): void {
    if (this.glContextLost) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    const delta = this.clock.getDelta();

    if (this.collisionGracePeriod > 0) {
      this.collisionGracePeriod -= delta;
    }

    if (this.appState === 'running' && this.wheelchair) {
      this.easingProgress = Math.min(1.0, this.easingProgress + delta * 0.8);
      const speedEase = this.easeInOutCubic(this.easingProgress);
      this.currentRotationSpeed = this.baseRotationSpeed * (0.3 + 0.7 * speedEase);

      this.rotationProgress += this.currentRotationSpeed * delta;

      if (this.rotationProgress >= 1.0) {
        this.rotationProgress = 1.0;
        this.completeRotationTest(true);
      }

      const totalRotation = Math.PI * 2;
      const currentRotation = this.initialWheelchairRotation + this.rotationProgress * totalRotation;
      this.wheelchair.rotation.y = currentRotation;

      const angleDeg = Math.round((this.rotationProgress * 360) % 360);
      const angleEl = document.getElementById('angle-value');
      if (angleEl) angleEl.textContent = `${angleDeg}°`;

      const worldBoxes = this.getRotatedWheelchairBoxes(
        this.wheelchair.position,
        currentRotation
      );

      const canCheckCollision = this.collisionGracePeriod <= 0 &&
                                 this.rotationProgress >= this.minRotationProgressBeforeCollision;

      if (canCheckCollision) {
        const collisions = this.collisionDetector.checkCollisions(worldBoxes);
        if (collisions.length > 0) {
          this.collisionDetector.showCollisionMarkers(collisions);
          this.updateCollisionPoints(collisions);
          this.completeRotationTest(false, collisions);
        }
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private getRotatedWheelchairBoxes(position: THREE.Vector3, rotationY: number): THREE.Box3[] {
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);

    return this.wheelchairCollisionBoxes.map(box => {
      const center = new THREE.Vector3();
      box.getCenter(center);

      const corners = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z)
      ];

      const transformedCorners = corners.map(corner => {
        const dx = corner.x - center.x;
        const dz = corner.z - center.z;
        return new THREE.Vector3(
          position.x + center.x + dx * cos - dz * sin,
          center.y + corner.y,
          position.z + center.z + dx * sin + dz * cos
        );
      });

      const newBox = new THREE.Box3();
      transformedCorners.forEach(c => newBox.expandByPoint(c));
      return newBox;
    });
  }

  private createRotationSpaceVisualization(center: THREE.Vector3): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'RotationSpace';

    const outerRadius = 1.5;

    const outerRingGeom = new THREE.RingGeometry(outerRadius - 0.02, outerRadius, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xe74c3c,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.copy(center);
    outerRing.position.y = 0.02;
    group.add(outerRing);

    const safeZoneGeom = new THREE.RingGeometry(0, outerRadius - 0.03, 64);
    const safeZoneMat = new THREE.MeshBasicMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const safeZone = new THREE.Mesh(safeZoneGeom, safeZoneMat);
    safeZone.rotation.x = -Math.PI / 2;
    safeZone.position.copy(center);
    safeZone.position.y = 0.01;
    group.add(safeZone);

    const centerMarkerGeom = new THREE.CircleGeometry(0.08, 32);
    const centerMarkerMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.9 });
    const centerMarker = new THREE.Mesh(centerMarkerGeom, centerMarkerMat);
    centerMarker.rotation.x = -Math.PI / 2;
    centerMarker.position.copy(center);
    centerMarker.position.y = 0.03;
    group.add(centerMarker);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('回转半径 R=1.5m', 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const label = new THREE.Sprite(spriteMat);
    label.position.set(center.x, 0.3, center.z + outerRadius + 0.15);
    label.scale.set(0.7, 0.18, 1);
    group.add(label);

    return group;
  }

  private completeRotationTest(success: boolean, collisions?: CollisionInfo[]): void {
    if (success) {
      this.setState('completed_pass');
      this.updateStatus(
        '✓ 回转测试通过',
        '轮椅成功完成 360° 回转，空间满足适老化改造标准。',
        'success'
      );
      this.updateCollisionPoints([]);
    } else if (collisions && collisions.length > 0) {
      this.setState('completed_fail');
      const obstacleNames = [...new Set(collisions.map(c => c.obstacleName))].join('、');
      const progressPercent = Math.round(this.rotationProgress * 100);
      this.updateStatus(
        '✗ 空间不足，无法完成回转动作',
        `轮椅在回转 ${progressPercent}% 时发生碰撞。阻碍点：${obstacleNames}。建议移除障碍物或扩大空间，确保最小回转半径 1.5m 内无遮挡。`,
        'error'
      );
    }
  }

  public dispose(): void {
    this.stopAnimationLoop();

    window.removeEventListener('resize', this.onResize.bind(this));

    if (this.rotationPathVisual) {
      this.scene.remove(this.rotationPathVisual);
      this.disposeGroup(this.rotationPathVisual as THREE.Group);
    }

    this.clearSceneElements();

    if (this.wheelchair) {
      this.scene.remove(this.wheelchair);
      this.disposeGroup(this.wheelchair);
    }

    this.lights.forEach(light => {
      this.scene.remove(light);
      if (light instanceof THREE.DirectionalLight && light.shadow && light.shadow.map) {
        light.shadow.map.dispose();
      }
    });
    this.lights = [];

    this.renderer.dispose();
    this.controls.dispose();
  }
}

let app: AgingInPlaceValidator | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new AgingInPlaceValidator();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
