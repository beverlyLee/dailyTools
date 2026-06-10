import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RainParticleSystem } from './modules/RainParticleSystem';
import { WindowSystem } from './modules/WindowSystem';
import { WaterTightnessDetector } from './modules/WaterTightnessDetector';
import { AirTightnessDetector } from './modules/AirTightnessDetector';
import { DrainPathVisualizer } from './modules/DrainPathVisualizer';
import type { WindowType } from './types';

export class WeatherScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  
  private rainSystem: RainParticleSystem;
  private windowSystem: WindowSystem;
  private waterDetector: WaterTightnessDetector;
  private airDetector: AirTightnessDetector;
  private drainVisualizer: DrainPathVisualizer;

  private room: THREE.Group;
  private outsideWall: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2c3e50);
    this.scene.fog = new THREE.Fog(0x2c3e50, 10, 30);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1, 4);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0, 0);

    this.clock = new THREE.Clock();

    this.room = new THREE.Group();
    this.scene.add(this.room);
    
    this.outsideWall = this.createOutsideWall();
    this.createRoom();
    this.createLighting();

    this.windowSystem = new WindowSystem(this.scene);
    this.rainSystem = new RainParticleSystem(this.scene);
    this.waterDetector = new WaterTightnessDetector(this.scene, this.windowSystem, this.rainSystem);
    this.airDetector = new AirTightnessDetector(this.scene, this.windowSystem);
    this.drainVisualizer = new DrainPathVisualizer(this.scene, this.windowSystem);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createOutsideWall(): THREE.Mesh {
    const wallGeometry = new THREE.BoxGeometry(12, 8, 0.3);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      roughness: 0.8,
      metalness: 0.1
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(0, 0, -0.15);
    this.scene.add(wall);
    return wall;
  }

  private createRoom(): void {
    const roomMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f0eb,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.BackSide
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.BackSide
    });

    const roomGeo = new THREE.BoxGeometry(6, 5, 6);
    const room = new THREE.Mesh(roomGeo, roomMaterial);
    room.position.set(0, 0.5, 3);
    this.room.add(room);

    const floorGeo = new THREE.PlaneGeometry(6, 6);
    const floor = new THREE.Mesh(floorGeo, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -2, 3);
    this.room.add(floor);

    const paintingGeo = new THREE.PlaneGeometry(1.2, 0.8);
    const paintingMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      roughness: 0.5
    });
    const painting = new THREE.Mesh(paintingGeo, paintingMat);
    painting.position.set(2, 0.5, 0.01);
    this.room.add(painting);

    const frameGeo = new THREE.BoxGeometry(1.3, 0.9, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(2, 0.5, 0);
    this.room.add(frame);

    const vaseGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 16);
    const vaseMat = new THREE.MeshStandardMaterial({
      color: 0x2d5016,
      roughness: 0.4
    });
    const vase = new THREE.Mesh(vaseGeo, vaseMat);
    vase.position.set(-1.5, -1.8, 0.2);
    this.room.add(vase);
  }

  private createLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x5a6c7d, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x9ec5fe, 0.8);
    directionalLight.position.set(3, 5, -5);
    this.scene.add(directionalLight);

    const rainLight = new THREE.DirectionalLight(0x7eb8ff, 0.4);
    rainLight.position.set(-2, 3, -3);
    this.scene.add(rainLight);

    const roomLight = new THREE.PointLight(0xfff0e0, 0.5, 10);
    roomLight.position.set(0, 2, 2);
    this.scene.add(roomLight);
  }

  setWindowType(type: WindowType): void {
    this.windowSystem.setWindowType(type);
    this.airDetector.setWindStrength(this.rainSystem.getConfig().windSpeed);
    this.waterDetector.reset();
  }

  setRainIntensity(intensity: number): void {
    this.rainSystem.setIntensity(intensity);
    this.drainVisualizer.setRainIntensity(intensity);
  }

  setWindSpeed(speed: number): void {
    this.rainSystem.setWindSpeed(speed);
    this.airDetector.setWindStrength(speed);
  }

  setDrainVisible(visible: boolean): void {
    this.drainVisualizer.setVisible(visible);
  }

  setCurtainVisible(visible: boolean): void {
    this.airDetector.setVisible(visible);
  }

  reset(): void {
    this.waterDetector.reset();
    this.rainSystem.setIntensity(0);
    this.rainSystem.setWindSpeed(0);
    this.rainSystem.setWindDirection(0);
    this.airDetector.setWindStrength(0);
    this.drainVisualizer.setRainIntensity(0);
    this.windowSystem.setWindowType('sliding');
  }

  getWaterAmount(): number {
    return this.waterDetector.getWaterAmount();
  }

  getMaxWaterAmount(): number {
    return this.waterDetector.getMaxWaterAmount();
  }

  getWaterTightnessStatus(): 'good' | 'warning' | 'danger' {
    return this.waterDetector.getWaterTightnessStatus();
  }

  getAirTightnessStatus(): 'good' | 'warning' | 'danger' {
    return this.airDetector.getAirTightnessStatus();
  }

  getWindowType(): WindowType {
    return this.windowSystem.getWindowType();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.waterDetector.update(deltaTime);
    this.rainSystem.update(deltaTime);
    this.airDetector.update(deltaTime);
    this.drainVisualizer.update(deltaTime);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    this.animate();
  }

  dispose(): void {
    this.rainSystem.dispose();
    this.windowSystem.dispose();
    this.waterDetector.dispose();
    this.airDetector.dispose();
    this.drainVisualizer.dispose();
    this.renderer.dispose();
  }
}
