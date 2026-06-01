import * as THREE from 'three';
import { WaxParticles } from './fluid/WaxParticles';
import { HeatBuoyancy } from './physics/HeatBuoyancy';

class LavaLampApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private waxParticles: WaxParticles;
  private heatBuoyancy: HeatBuoyancy;
  private timer: THREE.Timer;
  private containerMesh!: THREE.Mesh;
  private heaterLight!: THREE.PointLight;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.timer = new THREE.Timer();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.Fog(0x0a0a0f, 8, 20);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 3, 10);
    this.camera.lookAt(0, 3, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.container.appendChild(this.renderer.domElement);

    const containerBounds = {
      min: new THREE.Vector3(-2, 0, -2),
      max: new THREE.Vector3(2, 10, 2),
    };

    this.createContainer(containerBounds);
    this.setupLighting(containerBounds);

    this.waxParticles = new WaxParticles(this.scene, containerBounds, 80);
    this.heatBuoyancy = new HeatBuoyancy(
      this.waxParticles.getParticles(),
      containerBounds
    );

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.animate();
  }

  private createContainer(bounds: { min: THREE.Vector3; max: THREE.Vector3 }): void {
    const width = bounds.max.x - bounds.min.x;
    const height = bounds.max.y - bounds.min.y;

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x333344,
      transparent: true,
      opacity: 0.15,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      side: THREE.DoubleSide,
    });

    const containerGeo = new THREE.CylinderGeometry(
      width * 0.55,
      width * 0.45,
      height,
      32,
      1,
      true
    );
    this.containerMesh = new THREE.Mesh(containerGeo, glassMaterial);
    this.containerMesh.position.y = height / 2;
    this.containerMesh.castShadow = true;
    this.containerMesh.receiveShadow = true;
    this.scene.add(this.containerMesh);

    const liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a0a20,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0,
    });
    const liquidGeo = new THREE.CylinderGeometry(
      width * 0.52,
      width * 0.42,
      height * 0.95,
      32
    );
    const liquid = new THREE.Mesh(liquidGeo, liquidMaterial);
    liquid.position.y = height * 0.48;
    this.scene.add(liquid);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.3,
    });
    const baseGeo = new THREE.CylinderGeometry(width * 0.65, width * 0.7, 0.5, 32);
    const base = new THREE.Mesh(baseGeo, baseMaterial);
    base.position.y = -0.25;
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);

    const topGeo = new THREE.CylinderGeometry(width * 0.55, width * 0.6, 0.4, 32);
    const top = new THREE.Mesh(topGeo, baseMaterial);
    top.position.y = height + 0.2;
    top.castShadow = true;
    this.scene.add(top);
  }

  private setupLighting(bounds: { min: THREE.Vector3; max: THREE.Vector3 }): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    this.scene.add(ambientLight);

    this.heaterLight = new THREE.PointLight(0xff4400, 2, 8);
    this.heaterLight.position.set(0, bounds.min.y + 0.5, 0);
    this.heaterLight.castShadow = true;
    this.scene.add(this.heaterLight);

    const topLight = new THREE.PointLight(0x6666ff, 0.5, 10);
    topLight.position.set(0, bounds.max.y, 0);
    this.scene.add(topLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(5, 5, 5);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x4444ff, 0.2);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
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

    this.heatBuoyancy.update(deltaTime);
    this.waxParticles.setNeighborMap(this.heatBuoyancy.getNeighborMap());
    this.waxParticles.updateAllVisuals(this.heatBuoyancy.getParticles());

    const time = this.timer.getElapsed();
    this.heaterLight.intensity = 1.5 + Math.sin(time * 2) * 0.3;

    this.camera.position.x = Math.sin(time * 0.1) * 0.5;
    this.camera.lookAt(0, 4, 0);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.waxParticles.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

new LavaLampApp('canvas-container');
