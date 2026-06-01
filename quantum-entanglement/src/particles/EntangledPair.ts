import * as THREE from 'three';

export class EntangledPair {
  public particleA: THREE.Mesh;
  public particleB: THREE.Mesh;
  public lightA: THREE.PointLight;
  public lightB: THREE.PointLight;
  private targetColorA: THREE.Color;
  private targetColorB: THREE.Color;
  private currentColorA: THREE.Color;
  private currentColorB: THREE.Color;
  private pulseScale: number = 1;
  private targetPulseScale: number = 1;
  private readonly lerpSpeed: number = 0.15;
  private readonly initialColor: THREE.Color = new THREE.Color(0x00ffff);

  constructor(scene: THREE.Scene) {
    this.targetColorA = this.initialColor.clone();
    this.targetColorB = this.initialColor.clone();
    this.currentColorA = this.initialColor.clone();
    this.currentColorB = this.initialColor.clone();

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    const materialA = new THREE.MeshStandardMaterial({
      color: this.initialColor,
      emissive: this.initialColor,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.2,
    });

    const materialB = new THREE.MeshStandardMaterial({
      color: this.initialColor,
      emissive: this.initialColor,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.2,
    });

    this.particleA = new THREE.Mesh(geometry, materialA);
    this.particleA.position.set(-4, 0, 0);
    this.particleA.userData.isParticleA = true;

    this.particleB = new THREE.Mesh(geometry, materialB);
    this.particleB.position.set(4, 0, 0);
    this.particleB.userData.isParticleB = true;

    this.lightA = new THREE.PointLight(this.initialColor, 2, 10);
    this.lightA.position.copy(this.particleA.position);

    this.lightB = new THREE.PointLight(this.initialColor, 2, 10);
    this.lightB.position.copy(this.particleB.position);

    const glowGeometry = new THREE.SphereGeometry(1.3, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.initialColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });

    const glowA = new THREE.Mesh(glowGeometry, glowMaterial.clone());
    const glowB = new THREE.Mesh(glowGeometry, glowMaterial.clone());

    this.particleA.add(glowA);
    this.particleB.add(glowB);

    scene.add(this.particleA);
    scene.add(this.particleB);
    scene.add(this.lightA);
    scene.add(this.lightB);
  }

  setColor(color: THREE.Color): void {
    this.targetColorA = color.clone();
    this.targetColorB = this.getComplementaryColor(color);
    this.targetPulseScale = 1.3;
  }

  getComplementaryColor(color: THREE.Color): THREE.Color {
    const r = 1 - color.r;
    const g = 1 - color.g;
    const b = 1 - color.b;
    return new THREE.Color(r, g, b);
  }

  getParticleA(): THREE.Mesh {
    return this.particleA;
  }

  getParticleB(): THREE.Mesh {
    return this.particleB;
  }

  update(deltaTime: number): void {
    this.currentColorA.lerp(this.targetColorA, this.lerpSpeed);
    this.currentColorB.lerp(this.targetColorB, this.lerpSpeed);

    const materialA = this.particleA.material as THREE.MeshStandardMaterial;
    const materialB = this.particleB.material as THREE.MeshStandardMaterial;

    materialA.color.copy(this.currentColorA);
    materialA.emissive.copy(this.currentColorA);

    materialB.color.copy(this.currentColorB);
    materialB.emissive.copy(this.currentColorB);

    const glowA = this.particleA.children[0] as THREE.Mesh;
    const glowB = this.particleB.children[0] as THREE.Mesh;
    (glowA.material as THREE.MeshBasicMaterial).color.copy(this.currentColorA);
    (glowB.material as THREE.MeshBasicMaterial).color.copy(this.currentColorB);

    this.lightA.color.copy(this.currentColorA);
    this.lightB.color.copy(this.currentColorB);

    this.pulseScale += (this.targetPulseScale - this.pulseScale) * 0.1;
    this.particleA.scale.setScalar(this.pulseScale);
    this.particleB.scale.setScalar(this.pulseScale);

    if (this.targetPulseScale > 1) {
      this.targetPulseScale -= 0.01;
      if (this.targetPulseScale < 1) this.targetPulseScale = 1;
    }

    this.particleA.rotation.y += 0.01;
    this.particleB.rotation.y += 0.01;
    this.particleA.rotation.x += 0.005;
    this.particleB.rotation.x += 0.005;
  }

  getCurrentColorA(): THREE.Color {
    return this.currentColorA.clone();
  }

  getCurrentColorB(): THREE.Color {
    return this.currentColorB.clone();
  }
}
