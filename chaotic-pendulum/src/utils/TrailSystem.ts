import * as THREE from 'three';

export class TrailSystem {
  private scene: THREE.Scene;
  private maxPoints: number;
  private color: number;
  private allPositions: THREE.Vector3[];
  
  private lineGeometry: THREE.BufferGeometry;
  private linePositions: Float32Array;
  private line: THREE.Line;
  private lineMaterial: THREE.LineBasicMaterial;
  
  private tubeMesh: THREE.Mesh | null = null;
  private tubeGeometry: THREE.TubeGeometry | null = null;
  private tubeMaterial: THREE.MeshStandardMaterial;
  
  private tubeRebuildCounter: number = 0;
  private readonly TUBE_REBUILD_INTERVAL: number = 8;
  private readonly TUBE_SAMPLE_RATE: number = 10;
  private readonly TUBE_MAX_POINTS: number = 300;

  constructor(scene: THREE.Scene, color: number, maxPoints: number = 4000) {
    this.scene = scene;
    this.maxPoints = maxPoints;
    this.color = color;
    this.allPositions = [];

    this.linePositions = new Float32Array(this.maxPoints * 3);
    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeometry.setDrawRange(0, 0);
    
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.6,
      linewidth: 1
    });
    
    this.line = new THREE.Line(this.lineGeometry, this.lineMaterial);
    this.line.frustumCulled = false;
    this.scene.add(this.line);

    this.tubeMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.4,
      transparent: true,
      opacity: 0.85
    });
  }

  public addPoint(position: THREE.Vector3): void {
    if (this.allPositions.length > 0) {
      const last = this.allPositions[this.allPositions.length - 1];
      const dist = last.distanceTo(position);
      if (dist < 0.008) return;
    }

    this.allPositions.push(position.clone());

    if (this.allPositions.length > this.maxPoints) {
      this.allPositions.shift();
    }

    this.updateLine();
    
    this.tubeRebuildCounter++;
    if (this.tubeRebuildCounter >= this.TUBE_REBUILD_INTERVAL) {
      this.rebuildTube();
      this.tubeRebuildCounter = 0;
    }
  }

  private updateLine(): void {
    const count = this.allPositions.length;
    for (let i = 0; i < count; i++) {
      const pos = this.allPositions[i];
      const idx = i * 3;
      this.linePositions[idx] = pos.x;
      this.linePositions[idx + 1] = pos.y;
      this.linePositions[idx + 2] = pos.z;
    }
    
    const attribute = this.lineGeometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
    this.lineGeometry.setDrawRange(0, count);
    this.lineMaterial.opacity = Math.min(0.6, 0.3 + count / this.maxPoints * 0.3);
  }

  private rebuildTube(): void {
    if (this.allPositions.length < 10) return;

    const sampled: THREE.Vector3[] = [];
    const startIdx = Math.max(0, this.allPositions.length - this.TUBE_MAX_POINTS * this.TUBE_SAMPLE_RATE);
    
    for (let i = startIdx; i < this.allPositions.length; i += this.TUBE_SAMPLE_RATE) {
      sampled.push(this.allPositions[i].clone());
    }
    
    if (sampled.length < 4) return;

    if (this.tubeGeometry) {
      this.tubeGeometry.dispose();
    }

    const curve = new THREE.CatmullRomCurve3(sampled, false, 'catmullrom', 0.5);
    const segments = Math.min(150, sampled.length * 3);
    this.tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.02, 8, false);
    
    if (!this.tubeMesh) {
      const material = this.tubeMaterial.clone();
      material.color.setHex(this.color);
      material.emissive.setHex(this.color);
      this.tubeMesh = new THREE.Mesh(this.tubeGeometry, material);
      this.tubeMesh.frustumCulled = false;
      this.scene.add(this.tubeMesh);
    } else {
      this.tubeMesh.geometry = this.tubeGeometry;
    }
  }

  public clear(): void {
    this.allPositions = [];
    this.tubeRebuildCounter = 0;
    
    this.linePositions.fill(0);
    this.lineGeometry.setDrawRange(0, 0);
    const attr = this.lineGeometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
    
    if (this.tubeGeometry) {
      this.tubeGeometry.dispose();
      this.tubeGeometry = null;
    }
    if (this.tubeMesh) {
      this.scene.remove(this.tubeMesh);
      this.tubeMesh = null;
    }
  }

  public forceUpdate(): void {
    if (this.tubeRebuildCounter > 0) {
      this.rebuildTube();
      this.tubeRebuildCounter = 0;
    }
  }

  public dispose(): void {
    this.scene.remove(this.line);
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    
    if (this.tubeMesh) {
      this.scene.remove(this.tubeMesh);
    }
    if (this.tubeGeometry) {
      this.tubeGeometry.dispose();
    }
    this.tubeMaterial.dispose();
  }
}
