import * as THREE from 'three';
import { EntangledPair } from '../particles/EntangledPair';

export class QuantumObserver {
  private entangledPair: EntangledPair;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private onStateChangeCallback?: (colorA: THREE.Color, colorB: THREE.Color) => void;

  private readonly quantumColors: THREE.Color[] = [
    new THREE.Color(0xff0066),
    new THREE.Color(0x00ff88),
    new THREE.Color(0x6600ff),
    new THREE.Color(0xff8800),
    new THREE.Color(0x00ffff),
    new THREE.Color(0xff00ff),
    new THREE.Color(0xffff00),
    new THREE.Color(0xff4400),
  ];

  private colorIndex: number = 0;

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    entangledPair: EntangledPair,
    onStateChangeCallback?: (colorA: THREE.Color, colorB: THREE.Color) => void
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.entangledPair = entangledPair;
    this.onStateChangeCallback = onStateChangeCallback;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  observe(): void {
    this.domElement.addEventListener('click', this.onClick.bind(this));
    this.domElement.addEventListener('touchstart', this.onTouch.bind(this));
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.checkIntersection();
  }

  private onTouch(event: TouchEvent): void {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      this.checkIntersection();
    }
  }

  private checkIntersection(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.entangledPair.getParticleA());

    if (intersects.length > 0) {
      this.onParticleClick();
    }
  }

  private onParticleClick(): void {
    this.colorIndex = (this.colorIndex + 1) % this.quantumColors.length;
    const newColor = this.quantumColors[this.colorIndex];
    this.entangledPair.setColor(newColor);

    if (this.onStateChangeCallback) {
      const complementary = this.entangledPair.getComplementaryColor(newColor);
      this.onStateChangeCallback(newColor, complementary);
    }
  }

  getRandomQuantumColor(): THREE.Color {
    return this.quantumColors[Math.floor(Math.random() * this.quantumColors.length)];
  }

  dispose(): void {
    this.domElement.removeEventListener('click', this.onClick.bind(this));
    this.domElement.removeEventListener('touchstart', this.onTouch.bind(this));
  }
}
