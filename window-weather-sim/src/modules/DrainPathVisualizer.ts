import * as THREE from 'three';
import { WindowSystem } from './WindowSystem';

export class DrainPathVisualizer {
  private scene: THREE.Scene;
  private windowSystem: WindowSystem;
  private drainGroup: THREE.Group;
  private flowParticles: THREE.Points | null = null;
  private flowPositions: Float32Array | null = null;
  private flowProgress: Float32Array | null = null;
  private flowPaths: THREE.Vector3[][] = [];
  private maxFlowParticles: number = 600;
  private visible: boolean = true;
  private rainIntensity: number = 0;
  private drainHoles: THREE.Mesh[] = [];
  private pathLines: THREE.Line[] = [];

  constructor(scene: THREE.Scene, windowSystem: WindowSystem) {
    this.scene = scene;
    this.windowSystem = windowSystem;
    this.drainGroup = new THREE.Group();
    this.scene.add(this.drainGroup);
    
    this.createDrainPaths();
    this.createFlowParticles();
    this.createDrainHoles();
    this.createPathLines();
  }

  private createDrainPaths(): void {
    const dimensions = this.windowSystem.getDimensions();
    const halfW = dimensions.width / 2;
    const halfH = dimensions.height / 2;
    const frameDepth = 0.12;

    const leftPath: THREE.Vector3[] = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = -halfW + 0.05;
      const y = halfH - 0.05 - t * (dimensions.height - 0.1);
      const z = -frameDepth / 2 + Math.sin(t * Math.PI) * 0.01;
      leftPath.push(new THREE.Vector3(x, y, z));
    }
    this.flowPaths.push(leftPath);

    const rightPath: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = halfW - 0.05;
      const y = halfH - 0.05 - t * (dimensions.height - 0.1);
      const z = -frameDepth / 2 + Math.sin(t * Math.PI) * 0.01;
      rightPath.push(new THREE.Vector3(x, y, z));
    }
    this.flowPaths.push(rightPath);

    const bottomPath: THREE.Vector3[] = [];
    const bottomSteps = 15;
    for (let i = 0; i <= bottomSteps; i++) {
      const t = i / bottomSteps;
      const x = -halfW + 0.05 + t * (dimensions.width - 0.1);
      const y = -halfH + 0.04;
      const z = -frameDepth / 2 + 0.02;
      bottomPath.push(new THREE.Vector3(x, y, z));
    }
    this.flowPaths.push(bottomPath);

    const centerDrainPath: THREE.Vector3[] = [];
    const drainSteps = 8;
    for (let i = 0; i <= drainSteps; i++) {
      const t = i / drainSteps;
      const x = 0;
      const y = -halfH + 0.04 - t * 0.15;
      const z = -frameDepth / 2 + 0.02 + t * 0.05;
      centerDrainPath.push(new THREE.Vector3(x, y, z));
    }
    this.flowPaths.push(centerDrainPath);

    const leftDrainPath: THREE.Vector3[] = [];
    for (let i = 0; i <= drainSteps; i++) {
      const t = i / drainSteps;
      const x = -halfW * 0.5;
      const y = -halfH + 0.04 - t * 0.15;
      const z = -frameDepth / 2 + 0.02 + t * 0.05;
      leftDrainPath.push(new THREE.Vector3(x, y, z));
    }
    this.flowPaths.push(leftDrainPath);

    const rightDrainPath: THREE.Vector3[] = [];
    for (let i = 0; i <= drainSteps; i++) {
      const t = i / drainSteps;
      const x = halfW * 0.5;
      const y = -halfH + 0.04 - t * 0.15;
      const z = -frameDepth / 2 + 0.02 + t * 0.05;
      rightDrainPath.push(new THREE.Vector3(x, y, z));
    }
    this.flowPaths.push(rightDrainPath);
  }

  private createFlowParticles(): void {
    const geometry = new THREE.BufferGeometry();
    this.flowPositions = new Float32Array(this.maxFlowParticles * 3);
    this.flowProgress = new Float32Array(this.maxFlowParticles);

    for (let i = 0; i < this.maxFlowParticles; i++) {
      this.flowPositions[i * 3 + 1] = -100;
      this.flowProgress[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.flowPositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x5cabff,
      size: 0.08,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.flowParticles = new THREE.Points(geometry, material);
    this.drainGroup.add(this.flowParticles);
  }

  private createDrainHoles(): void {
    const dimensions = this.windowSystem.getDimensions();
    const halfW = dimensions.width / 2;
    const halfH = dimensions.height / 2;

    const holeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.5,
      metalness: 0.8
    });

    const holePositions = [
      { x: 0, y: -halfH + 0.03, z: -0.05 },
      { x: -halfW * 0.5, y: -halfH + 0.03, z: -0.05 },
      { x: halfW * 0.5, y: -halfH + 0.03, z: -0.05 }
    ];

    holePositions.forEach(pos => {
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.025, 0.05, 16),
        holeMaterial
      );
      hole.rotation.x = Math.PI / 2;
      hole.position.set(pos.x, pos.y, pos.z);
      this.drainGroup.add(hole);
      this.drainHoles.push(hole);
    });
  }

  private createPathLines(): void {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.7
    });

    this.flowPaths.forEach(path => {
      const points = path;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      this.drainGroup.add(line);
      this.pathLines.push(line);
    });
  }

  setRainIntensity(intensity: number): void {
    this.rainIntensity = Math.max(0, Math.min(1, intensity));
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.drainGroup.visible = visible;
  }

  update(deltaTime: number): void {
    if (!this.flowParticles || !this.flowPositions || !this.flowProgress || !this.visible) return;

    const speed = this.rainIntensity * 2.5 + 0.8;
    const minParticles = Math.floor(this.maxFlowParticles * 0.15);
    const rainParticles = Math.floor(this.maxFlowParticles * this.rainIntensity * 0.7);
    const activeCount = Math.max(minParticles, rainParticles);

    for (let i = 0; i < activeCount; i++) {
      this.flowProgress[i] += deltaTime * speed * (0.8 + Math.random() * 0.5);
      
      if (this.flowProgress[i] >= 1) {
        this.flowProgress[i] = 0;
      }

      const pathIndex = i % this.flowPaths.length;
      const path = this.flowPaths[pathIndex];
      const progress = this.flowProgress[i];
      
      const segIndex = Math.floor(progress * (path.length - 1));
      const segProgress = (progress * (path.length - 1)) % 1;
      
      const currentPoint = path[Math.min(segIndex, path.length - 1)];
      const nextPoint = path[Math.min(segIndex + 1, path.length - 1)];

      const i3 = i * 3;
      this.flowPositions[i3] = currentPoint.x + (nextPoint.x - currentPoint.x) * segProgress;
      this.flowPositions[i3 + 1] = currentPoint.y + (nextPoint.y - currentPoint.y) * segProgress;
      this.flowPositions[i3 + 2] = currentPoint.z + (nextPoint.z - currentPoint.z) * segProgress;
    }

    for (let i = activeCount; i < this.maxFlowParticles; i++) {
      this.flowPositions[i * 3 + 1] = -100;
    }

    (this.flowParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.drainGroup);
    
    if (this.flowParticles) {
      this.flowParticles.geometry.dispose();
      (this.flowParticles.material as THREE.Material).dispose();
    }

    this.drainHoles.forEach(hole => {
      hole.geometry.dispose();
      (hole.material as THREE.Material).dispose();
    });

    this.pathLines.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
  }
}
