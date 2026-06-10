import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WheelchairGenerator } from './wheelchair/WheelchairGenerator';
import { TurnPathCalculator, RotationPathConfig } from './path/TurnPathCalculator';
import { CollisionDetector, CollisionInfo } from './collision/CollisionDetector';
import { GrabInteractionSystem } from './interaction/GrabInteractionSystem';
import { ClearWidthVerifier } from './verification/ClearWidthVerifier';
import { BathroomSceneBuilder, DEFAULT_BATHROOM_CONFIG, SceneElements } from './scene/BathroomSceneBuilder';

class AgingInPlaceValidator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private wheelchairGenerator: WheelchairGenerator;
  private wheelchair: THREE.Group | null = null;
  private wheelchairCollisionBoxes: THREE.Box3[] = [];

  private collisionDetector: CollisionDetector;
  private grabSystem: GrabInteractionSystem;
  private widthVerifier: ClearWidthVerifier;
  private bathroomBuilder: BathroomSceneBuilder;
  private sceneElements: SceneElements | null = null;

  private rotationPath: RotationPathConfig | null = null;
  private rotationPathVisual: THREE.Object3D | null = null;

  private isRotating = false;
  private rotationProgress = 0;
  private rotationSpeed = 0.15;
  private initialWheelchairPosition = new THREE.Vector3();
  private initialWheelchairRotation = 0;

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

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(1.5, 0.5, 1.5);
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

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

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

    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    fillLight.position.set(-3, 4, -3);
    this.scene.add(fillLight);
  }

  private buildScene(): void {
    this.sceneElements = this.bathroomBuilder.build(DEFAULT_BATHROOM_CONFIG);

    this.sceneElements.doorways.forEach(d => this.widthVerifier.addDoorway(d));
    this.sceneElements.grabPoints.forEach(g =>
      this.grabSystem.addGrabPoint(g.position, g.name, g.type)
    );

    this.updateUIWidth();
  }

  private setupWheelchair(): void {
    this.wheelchair = this.wheelchairGenerator.generate();
    this.wheelchairCollisionBoxes = this.wheelchairGenerator.getCollisionBoxes();

    const startX = 1.5;
    const startZ = 1.8;
    this.wheelchair.position.set(startX, 0, startZ);
    this.wheelchair.rotation.y = Math.PI;

    this.initialWheelchairPosition.set(startX, 0, startZ);
    this.initialWheelchairRotation = Math.PI;

    this.scene.add(this.wheelchair);

    this.grabSystem.setWheelchairPose(
      this.wheelchair.position,
      this.wheelchair.rotation.y
    );
  }

  private setupEventListeners(): void {
  }

  private setupUIHandlers(): void {
    const btnRotate = document.getElementById('btn-rotate');
    const btnStop = document.getElementById('btn-stop');
    const btnReset = document.getElementById('btn-reset');
    const btnVerifyWidth = document.getElementById('btn-verify-width');
    const btnVerifyGrab = document.getElementById('btn-verify-grab');

    btnRotate?.addEventListener('click', () => this.startRotationTest());
    btnStop?.addEventListener('click', () => this.stopRotationTest());
    btnReset?.addEventListener('click', () => this.resetScene());
    btnVerifyWidth?.addEventListener('click', () => this.verifyWidth());
    btnVerifyGrab?.addEventListener('click', () => this.verifyGrabReachability());
  }

  private startRotationTest(): void {
    if (!this.wheelchair) return;

    this.isRotating = true;
    this.rotationProgress = 0;

    const center = new THREE.Vector3(
      this.wheelchair.position.x,
      0,
      this.wheelchair.position.z
    );

    this.rotationPath = TurnPathCalculator.calculateRotationPath(
      center,
      this.wheelchair.rotation.y - Math.PI / 2,
      Math.PI * 2
    );

    if (this.rotationPathVisual) {
      this.scene.remove(this.rotationPathVisual);
    }
    this.rotationPathVisual = TurnPathCalculator.createPathVisualization(this.rotationPath);
    this.scene.add(this.rotationPathVisual);

    this.collisionDetector.clearCollisionMarkers();

    this.updateStatus(
      '正在进行回转测试...',
      '轮椅正在以最小回转半径 1.5m 进行 360° 回转，系统实时检测碰撞。',
      'info'
    );

    this.setButtonStates(true);
  }

  private stopRotationTest(): void {
    this.isRotating = false;
    this.setButtonStates(false);
    this.updateStatus(
      '测试已停止',
      '用户手动停止了回转测试。',
      'warning'
    );
  }

  private resetScene(): void {
    this.isRotating = false;
    this.rotationProgress = 0;

    if (this.wheelchair) {
      this.wheelchair.position.copy(this.initialWheelchairPosition);
      this.wheelchair.rotation.y = this.initialWheelchairRotation;
    }

    if (this.rotationPathVisual) {
      this.scene.remove(this.rotationPathVisual);
      this.rotationPathVisual = null;
    }

    this.collisionDetector.clearCollisionMarkers();
    this.grabSystem.clearMarkers();
    this.widthVerifier.clearVisualization();

    this.rotationPath = null;

    document.getElementById('angle-value')!.textContent = '0°';

    this.updateStatus(
      '系统就绪',
      '点击「开始轮椅回转测试」验证卫生间空间是否满足适老化标准。',
      'info'
    );

    this.setButtonStates(false);
    this.grabSystem.setWheelchairPose(
      this.initialWheelchairPosition,
      this.initialWheelchairRotation
    );
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

  private setButtonStates(rotating: boolean): void {
    const btnRotate = document.getElementById('btn-rotate') as HTMLButtonElement;
    const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;

    if (btnRotate) btnRotate.disabled = rotating;
    if (btnStop) btnStop.disabled = !rotating;
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
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    if (this.isRotating && this.rotationPath && this.wheelchair) {
      this.rotationProgress += this.rotationSpeed * delta;

      if (this.rotationProgress >= 1.0) {
        this.rotationProgress = 1.0;
        this.isRotating = false;
        this.completeRotationTest(true);
      }

      const point = TurnPathCalculator.getPositionAtProgress(this.rotationPath, this.rotationProgress);
      this.wheelchair.position.copy(point.position);
      this.wheelchair.rotation.y = point.rotation;

      const angleDeg = Math.round((this.rotationProgress * 360) % 360);
      document.getElementById('angle-value')!.textContent = `${angleDeg}°`;

      const worldBoxes = this.wheelchairCollisionBoxes.map(box => {
        const worldBox = box.clone();
        const center = new THREE.Vector3();
        worldBox.getCenter(center);

        const angle = point.rotation;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const corners = [
          new THREE.Vector3(worldBox.min.x, worldBox.min.y, worldBox.min.z),
          new THREE.Vector3(worldBox.max.x, worldBox.min.y, worldBox.min.z),
          new THREE.Vector3(worldBox.max.x, worldBox.max.y, worldBox.min.z),
          new THREE.Vector3(worldBox.min.x, worldBox.max.y, worldBox.min.z),
          new THREE.Vector3(worldBox.min.x, worldBox.min.y, worldBox.max.z),
          new THREE.Vector3(worldBox.max.x, worldBox.min.y, worldBox.max.z),
          new THREE.Vector3(worldBox.max.x, worldBox.max.y, worldBox.max.z),
          new THREE.Vector3(worldBox.min.x, worldBox.max.y, worldBox.max.z)
        ];

        const transformedCorners = corners.map(corner => {
          const dx = corner.x - center.x;
          const dz = corner.z - center.z;
          return new THREE.Vector3(
            point.position.x + center.x + dx * cos - dz * sin,
            center.y + corner.y,
            point.position.z + center.z + dx * sin + dz * cos
          );
        });

        const newBox = new THREE.Box3();
        transformedCorners.forEach(c => newBox.expandByPoint(c));
        return newBox;
      });

      const collisions = this.collisionDetector.checkCollisions(worldBoxes);
      this.collisionDetector.showCollisionMarkers(collisions);
      this.updateCollisionPoints(collisions);

      if (collisions.length > 0) {
        this.completeRotationTest(false, collisions);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private completeRotationTest(success: boolean, collisions?: CollisionInfo[]): void {
    this.isRotating = false;
    this.setButtonStates(false);

    if (success) {
      this.updateStatus(
        '✓ 回转测试通过',
        '轮椅成功完成 360° 回转，空间满足适老化改造标准。',
        'success'
      );
      this.updateCollisionPoints([]);
    } else if (collisions && collisions.length > 0) {
      const obstacleNames = [...new Set(collisions.map(c => c.obstacleName))].join('、');
      const progressPercent = Math.round(this.rotationProgress * 100);
      this.updateStatus(
        '✗ 空间不足，无法完成回转动作',
        `轮椅在回转 ${progressPercent}% 时发生碰撞。阻碍点：${obstacleNames}。建议移除障碍物或扩大空间，确保最小回转半径 1.5m 内无遮挡。`,
        'error'
      );
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AgingInPlaceValidator();
});
