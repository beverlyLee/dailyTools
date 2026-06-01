import * as THREE from 'three';
import { DeepSpace } from './scene/DeepSpace';
import { DarkMatterHalo } from './lens/DarkMatterHalo';
import './style.css';

class GalaxyWeaver {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private deepSpace: DeepSpace;
  private darkMatterHalo: DarkMatterHalo;
  private mouseX: number = 0.5;
  private mouseY: number = 0.5;
  private autoX: number = 0.5;
  private autoY: number = 0.5;
  private time: number = 0;
  private useMouseControl: boolean = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    document.body.appendChild(this.renderer.domElement);

    this.deepSpace = new DeepSpace(4096, 4096);

    this.darkMatterHalo = new DarkMatterHalo();
    this.darkMatterHalo.setSourceTexture(this.deepSpace.getTexture());
    this.darkMatterHalo.setEinsteinRadius(0.14);
    this.darkMatterHalo.setStrength(1.0);
    this.darkMatterHalo.setEllipticity(0.18);
    this.darkMatterHalo.setShear(0.07);
    this.darkMatterHalo.setResolution(window.innerWidth, window.innerHeight);
    this.scene.add(this.darkMatterHalo.getMesh());

    this.setupEventListeners();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('mousemove', (e) => {
      this.useMouseControl = true;
      this.mouseX = e.clientX / window.innerWidth;
      this.mouseY = e.clientY / window.innerHeight;
    });

    window.addEventListener('mouseleave', () => {
      this.useMouseControl = false;
    });

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.darkMatterHalo.setResolution(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    this.time += 1;

    this.deepSpace.update(this.time);

    if (!this.useMouseControl) {
      const driftRadius = 0.01;
      this.autoX = 0.5 + Math.sin(this.time * 0.0006) * driftRadius;
      this.autoY = 0.5 + Math.cos(this.time * 0.0004) * driftRadius * 0.8;
    }

    const targetX = this.useMouseControl ? this.mouseX : this.autoX;
    const targetY = this.useMouseControl ? this.mouseY : this.autoY;

    const smoothFactor = this.useMouseControl ? 0.1 : 0.012;
    const currentCenter = this.darkMatterHalo['material'].uniforms.uLensCenter.value;
    currentCenter.x += (targetX - currentCenter.x) * smoothFactor;
    currentCenter.y += (1 - targetY - currentCenter.y) * smoothFactor;

    this.darkMatterHalo.update(this.time, currentCenter.x, 1 - currentCenter.y);

    this.renderer.render(this.scene, this.camera);
  }
}

new GalaxyWeaver();
