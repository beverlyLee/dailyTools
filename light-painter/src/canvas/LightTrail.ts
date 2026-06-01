import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ColorPreset {
  name: string;
  color: number[];
}

interface Stroke {
  points: THREE.Vector3[];
  line: THREE.Line;
  color: number[];
}

export class LightTrail {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private gridHelper: THREE.GridHelper;
  private axesHelper: THREE.AxesHelper;
  private depthIndicator!: THREE.Mesh;
  private drawPlaneHelper!: THREE.Mesh;

  private strokes: Stroke[] = [];
  private currentPoints: THREE.Vector3[] = [];
  private currentLine: THREE.Line | null = null;
  private isDrawing: boolean = false;
  private drawDepth: number = 0;

  private currentColor: number[] = [2.5, 0.5, 0.5];

  private presets: ColorPreset[] = [
    { name: '红色', color: [2.5, 0.5, 0.5] },
    { name: '橙色', color: [2.5, 1.5, 0.0] },
    { name: '黄色', color: [2.5, 2.5, 0.5] },
    { name: '绿色', color: [0.5, 2.5, 0.5] },
    { name: '青色', color: [0.5, 2.5, 2.5] },
    { name: '蓝色', color: [0.5, 1.0, 2.5] },
    { name: '紫色', color: [2.0, 0.5, 2.5] },
    { name: '粉色', color: [2.5, 0.5, 2.0] },
    { name: '白色', color: [2.5, 2.5, 2.5] },
  ];

  private onColorChange: (color: number[]) => void;
  private onDepthChange: (depth: number) => void;

  constructor(
    container: HTMLElement,
    callbacks?: {
      onColorChange?: (color: number[]) => void;
      onDepthChange?: (depth: number) => void;
    }
  ) {
    this.onColorChange = callbacks?.onColorChange || (() => {});
    this.onDepthChange = callbacks?.onDepthChange || (() => {});

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 6, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.mouseButtons = {
      LEFT: undefined as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.touches = {
      ONE: undefined as unknown as THREE.TOUCH,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    this.controls.minDistance = 3;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI * 0.9;

    this.gridHelper = new THREE.GridHelper(20, 40, 0x333366, 0x222244);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.5;
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(5);
    this.scene.add(this.axesHelper);

    this.createDepthIndicator();
    this.createDrawPlaneHelper();

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.6,
      0.05
    );
    this.composer.addPass(bloomPass);

    this.setupEventListeners();
    this.animate();
  }

  private createDepthIndicator(): void {
    const geometry = new THREE.RingGeometry(0.4, 0.6, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6666,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.depthIndicator = new THREE.Mesh(geometry, material);
    this.depthIndicator.rotation.x = -Math.PI / 2;
    this.depthIndicator.position.y = this.drawDepth;
    this.scene.add(this.depthIndicator);
  }

  private createDrawPlaneHelper(): void {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshBasicMaterial({
      color: 0x6666ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.drawPlaneHelper = new THREE.Mesh(geometry, material);
    this.drawPlaneHelper.rotation.x = -Math.PI / 2;
    this.drawPlaneHelper.position.y = this.drawDepth;
    this.scene.add(this.drawPlaneHelper);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    canvas.addEventListener('touchend', () => this.onMouseUp());

    canvas.addEventListener('wheel', (e) => this.onWheel(e));

    window.addEventListener('resize', () => this.onResize());
  }

  private onWheel(e: WheelEvent): void {
    if (e.shiftKey) {
      e.preventDefault();
      this.drawDepth += e.deltaY * 0.01;
      this.drawDepth = Math.max(-8, Math.min(8, this.drawDepth));
      this.updateDepthVisuals();
      this.onDepthChange(this.drawDepth);
    }
  }

  private updateDepthVisuals(): void {
    this.depthIndicator.position.y = this.drawDepth;
    this.drawPlaneHelper.position.y = this.drawDepth;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDrawing = true;
      this.currentPoints = [];
      const point = this.screenToWorld(e.clientX, e.clientY);
      if (point) {
        this.currentPoints.push(point);
        this.createPreviewLine();
      }
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDrawing = true;
      this.currentPoints = [];
      const touch = e.touches[0];
      const point = this.screenToWorld(touch.clientX, touch.clientY);
      if (point) {
        this.currentPoints.push(point);
        this.createPreviewLine();
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const point = this.screenToWorld(e.clientX, e.clientY);
    if (point) {
      this.addPoint(point);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const point = this.screenToWorld(touch.clientX, touch.clientY);
    if (point) {
      this.addPoint(point);
    }
  }

  private onMouseUp(): void {
    if (this.isDrawing && this.currentPoints.length > 1 && this.currentLine) {
      const smoothedPoints = this.smoothPoints(this.currentPoints);
      const finalLine = this.createFinalLine(smoothedPoints);

      if (finalLine) {
        this.scene.remove(this.currentLine);
        this.currentLine.geometry.dispose();
        (this.currentLine.material as THREE.Material).dispose();

        const stroke: Stroke = {
          points: [...this.currentPoints],
          line: finalLine,
          color: [...this.currentColor],
        };
        this.strokes.push(stroke);
      }
      this.currentLine = null;
    } else if (this.currentLine) {
      this.scene.remove(this.currentLine);
      this.currentLine.geometry.dispose();
      (this.currentLine.material as THREE.Material).dispose();
      this.currentLine = null;
    }
    this.isDrawing = false;
    this.currentPoints = [];
  }

  private screenToWorld(screenX: number, screenY: number): THREE.Vector3 | null {
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(ndc, this.camera);

    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planePoint = new THREE.Vector3(0, this.drawDepth, 0);
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(planeNormal, planePoint);

    const intersection = new THREE.Vector3();
    const result = raycaster.ray.intersectPlane(plane, intersection);

    return result ? intersection.clone() : null;
  }

  private addPoint(point: THREE.Vector3): void {
    if (this.currentPoints.length === 0) {
      this.currentPoints.push(point);
      return;
    }

    const lastPoint = this.currentPoints[this.currentPoints.length - 1];
    const distance = lastPoint.distanceTo(point);

    if (distance > 0.05) {
      this.currentPoints.push(point);
      this.updatePreviewLine();
    }
  }

  private smoothPoints(points: THREE.Vector3[]): THREE.Vector3[] {
    if (points.length < 3) {
      return [...points];
    }

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const segments = Math.max(50, points.length * 20);
    return curve.getPoints(segments);
  }

  private createLineMaterial(opacity: number = 1): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(
        this.currentColor[0],
        this.currentColor[1],
        this.currentColor[2]
      ),
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      linewidth: 1,
    });
  }

  private createPreviewLine(): void {
    if (this.currentPoints.length < 2) return;

    const geometry = new THREE.BufferGeometry().setFromPoints(this.currentPoints);
    const material = this.createLineMaterial(0.85);

    this.currentLine = new THREE.Line(geometry, material);
    this.scene.add(this.currentLine);
  }

  private updatePreviewLine(): void {
    if (this.currentPoints.length < 2 || !this.currentLine) {
      if (this.currentPoints.length >= 2 && !this.currentLine) {
        this.createPreviewLine();
      }
      return;
    }

    this.currentLine.geometry.dispose();
    const geometry = new THREE.BufferGeometry().setFromPoints(this.currentPoints);
    this.currentLine.geometry = geometry;
  }

  private createFinalLine(smoothedPoints: THREE.Vector3[]): THREE.Line | null {
    if (smoothedPoints.length < 2) return null;

    const geometry = new THREE.BufferGeometry().setFromPoints(smoothedPoints);
    const material = this.createLineMaterial(1);

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    return line;
  }

  public setColor(r: number, g: number, b: number): void {
    this.currentColor = [r, g, b];
    this.onColorChange(this.currentColor);
    (this.depthIndicator.material as THREE.MeshBasicMaterial).color.setRGB(
      r / 2.5,
      g / 2.5,
      b / 2.5
    );
    (this.drawPlaneHelper.material as THREE.MeshBasicMaterial).color.setRGB(
      r / 2.5,
      g / 2.5,
      b / 2.5
    );
  }

  public setColorByIndex(index: number): void {
    if (index >= 0 && index < this.presets.length) {
      this.currentColor = [...this.presets[index].color];
      this.onColorChange(this.currentColor);
      const [r, g, b] = this.currentColor;
      (this.depthIndicator.material as THREE.MeshBasicMaterial).color.setRGB(
        r / 2.5,
        g / 2.5,
        b / 2.5
      );
      (this.drawPlaneHelper.material as THREE.MeshBasicMaterial).color.setRGB(
        r / 2.5,
        g / 2.5,
        b / 2.5
      );
    }
  }

  public getPresets(): ColorPreset[] {
    return this.presets;
  }

  public getCurrentColor(): number[] {
    return this.currentColor;
  }

  public setDepth(depth: number): void {
    this.drawDepth = Math.max(-8, Math.min(8, depth));
    this.updateDepthVisuals();
    this.onDepthChange(this.drawDepth);
  }

  public getDepth(): number {
    return this.drawDepth;
  }

  public toggleGrid(visible: boolean): void {
    this.gridHelper.visible = visible;
    this.axesHelper.visible = visible;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();

    if (this.currentLine && this.isDrawing) {
      const time = Date.now() * 0.003;
      const pulse = 0.75 + Math.sin(time) * 0.2;
      (this.currentLine.material as THREE.LineBasicMaterial).opacity = pulse;
    }

    this.composer.render();
  }

  public clear(): void {
    for (const stroke of this.strokes) {
      this.scene.remove(stroke.line);
      stroke.line.geometry.dispose();
      (stroke.line.material as THREE.Material).dispose();
    }
    this.strokes = [];

    if (this.currentLine) {
      this.scene.remove(this.currentLine);
      this.currentLine.geometry.dispose();
      (this.currentLine.material as THREE.Material).dispose();
      this.currentLine = null;
    }
    this.currentPoints = [];
  }

  public undo(): void {
    if (this.strokes.length > 0) {
      const stroke = this.strokes.pop()!;
      this.scene.remove(stroke.line);
      stroke.line.geometry.dispose();
      (stroke.line.material as THREE.Material).dispose();
    }
  }

  public destroy(): void {
    this.clear();
    this.renderer.dispose();
    this.composer.dispose();
    this.controls.dispose();
  }
}
