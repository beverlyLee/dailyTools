import * as THREE from 'three';
import { WallWashConfig, LightSourceData, gaussianFalloff, smoothstep, clamp } from './types';
import { CeilingGenerator } from './CeilingGenerator';

export class WallWashRenderer {
  private scene: THREE.Scene;
  private ceilingGenerator: CeilingGenerator;
  private config: WallWashConfig;

  private wallWashGroup: THREE.Group;
  private wallWashMeshes: THREE.Mesh[] = [];
  private wallWashMaterials: THREE.ShaderMaterial[] = [];

  constructor(scene: THREE.Scene, ceilingGenerator: CeilingGenerator, config: WallWashConfig) {
    this.scene = scene;
    this.ceilingGenerator = ceilingGenerator;
    this.config = { ...config };

    this.wallWashGroup = new THREE.Group();
    this.scene.add(this.wallWashGroup);

    this.createWallWashEffects();
  }

  private createWallWashEffects(): void {
    this.clearWallWash();

    const roomConfig = this.ceilingGenerator.getRoomConfig();
    const { width, depth, height } = roomConfig;
    const ceilingConfig = this.ceilingGenerator.getCeilingConfig();
    const ceilingY = height - ceilingConfig.drop;

    const washHeight = height * 0.8;

    const frontWash = this.createWallWashPlane(
      width,
      washHeight,
      new THREE.Vector3(0, ceilingY - washHeight / 2 + ceilingConfig.trenchDepth, -depth / 2 + 0.001),
      'front'
    );
    this.wallWashMeshes.push(frontWash);
    this.wallWashGroup.add(frontWash);

    const backWash = this.createWallWashPlane(
      width,
      washHeight,
      new THREE.Vector3(0, ceilingY - washHeight / 2 + ceilingConfig.trenchDepth, depth / 2 - 0.001),
      'back'
    );
    this.wallWashMeshes.push(backWash);
    this.wallWashGroup.add(backWash);

    const leftWash = this.createWallWashPlane(
      depth,
      washHeight,
      new THREE.Vector3(-width / 2 + 0.001, ceilingY - washHeight / 2 + ceilingConfig.trenchDepth, 0),
      'left'
    );
    this.wallWashMeshes.push(leftWash);
    this.wallWashGroup.add(leftWash);

    const rightWash = this.createWallWashPlane(
      depth,
      washHeight,
      new THREE.Vector3(width / 2 - 0.001, ceilingY - washHeight / 2 + ceilingConfig.trenchDepth, 0),
      'right'
    );
    this.wallWashMeshes.push(rightWash);
    this.wallWashGroup.add(rightWash);
  }

  private createWallWashPlane(
    width: number,
    height: number,
    position: THREE.Vector3,
    wallType: 'front' | 'back' | 'left' | 'right'
  ): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(1, 0.95, 0.85) },
        uIntensity: { value: this.config.intensity },
        uBeamAngle: { value: this.config.beamAngle },
        uHaloSpread: { value: this.config.haloSpread },
        uWallWidth: { value: width },
        uWashHeight: { value: height },
        uCeilingY: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uBeamAngle;
        uniform float uHaloSpread;
        uniform float uWallWidth;
        uniform float uWashHeight;
        uniform float uCeilingY;

        varying vec2 vUv;
        varying vec3 vPosition;

        float gaussian(float x, float sigma) {
          return exp(-0.5 * x * x / (sigma * sigma));
        }

        void main() {
          float topDist = 1.0 - vUv.y;
          float centerDist = abs(vUv.x - 0.5) * 2.0;

          float verticalDecay = pow(1.0 - vUv.y, 1.5);

          float beamRad = uBeamAngle * 3.14159 / 180.0;
          float beamWidth = tan(beamRad * 0.5) * uWashHeight * 2.0;
          float normalizedBeamWidth = clamp(beamWidth / uWallWidth, 0.1, 2.0);

          float horizontalDecay = gaussian(centerDist, normalizedBeamWidth * 0.5 + uHaloSpread * 0.3);

          float topGlow = exp(-topDist * 3.0 / max(uHaloSpread, 0.1));

          float wash = verticalDecay * horizontalDecay * 0.7 + topGlow * 0.3;
          wash = pow(wash, 1.2) * uIntensity;

          float halo = gaussian(centerDist, 0.3 + uHaloSpread * 0.5) * topGlow * 0.4;
          wash += halo * uIntensity;

          float edgeFade = smoothstep(0.0, 0.05, vUv.x) * smoothstep(0.0, 0.05, 1.0 - vUv.x);
          edgeFade *= smoothstep(0.0, 0.1, 1.0 - vUv.y);
          wash *= edgeFade;

          wash = clamp(wash, 0.0, 2.0);

          vec3 finalColor = uColor * wash;
          float alpha = clamp(wash * 0.8, 0.0, 1.0);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.wallWashMaterials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    switch (wallType) {
      case 'front':
        mesh.rotation.y = 0;
        break;
      case 'back':
        mesh.rotation.y = Math.PI;
        break;
      case 'left':
        mesh.rotation.y = Math.PI / 2;
        break;
      case 'right':
        mesh.rotation.y = -Math.PI / 2;
        break;
    }

    mesh.renderOrder = 1;

    return mesh;
  }

  private clearWallWash(): void {
    this.wallWashMaterials.forEach((mat) => mat.dispose());
    this.wallWashMaterials = [];

    this.wallWashMeshes.forEach((mesh) => {
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.wallWashMeshes = [];

    while (this.wallWashGroup.children.length > 0) {
      this.wallWashGroup.remove(this.wallWashGroup.children[0]);
    }
  }

  public updateConfig(config: Partial<WallWashConfig>): void {
    this.config = { ...this.config, ...config };

    this.wallWashMaterials.forEach((material) => {
      material.uniforms.uIntensity.value = this.config.intensity;
      material.uniforms.uBeamAngle.value = this.config.beamAngle;
      material.uniforms.uHaloSpread.value = this.config.haloSpread;
    });
  }

  public updateLightColor(color: THREE.Color): void {
    this.wallWashMaterials.forEach((material) => {
      material.uniforms.uColor.value.copy(color);
    });
  }

  public updateLightIntensity(intensity: number): void {
    const normalizedIntensity = intensity / 500;
    this.wallWashMaterials.forEach((material) => {
      material.uniforms.uIntensity.value = this.config.intensity * normalizedIntensity;
    });
  }

  public getWallWashGroup(): THREE.Group {
    return this.wallWashGroup;
  }

  public getConfig(): WallWashConfig {
    return { ...this.config };
  }

  public rebuild(): void {
    this.createWallWashEffects();
  }

  public dispose(): void {
    this.clearWallWash();
  }
}
