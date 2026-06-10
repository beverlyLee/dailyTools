import * as THREE from 'three';
import { WallWashConfig, LightSourceData, clamp } from './types';
import { CeilingGenerator } from './CeilingGenerator';

export class WallWashRenderer {
  private scene: THREE.Scene;
  private ceilingGenerator: CeilingGenerator;
  private config: WallWashConfig;

  private wallWashGroup: THREE.Group;
  private wallWashMeshes: THREE.Mesh[] = [];
  private wallWashMaterials: THREE.ShaderMaterial[] = [];

  private lightTiltAngle: number = Math.PI / 4;
  private lightColor: THREE.Color = new THREE.Color(1, 0.95, 0.85);
  private lightIntensity: number = 500;

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
    const trenchY = ceilingY - ceilingConfig.trenchDepth;

    const washHeight = height * 0.85;

    const frontWash = this.createWallWashPlane(
      width,
      washHeight,
      new THREE.Vector3(0, trenchY - washHeight / 2 + 0.02, -depth / 2 + 0.002),
      'front'
    );
    this.wallWashMeshes.push(frontWash);
    this.wallWashGroup.add(frontWash);

    const backWash = this.createWallWashPlane(
      width,
      washHeight,
      new THREE.Vector3(0, trenchY - washHeight / 2 + 0.02, depth / 2 - 0.002),
      'back'
    );
    this.wallWashMeshes.push(backWash);
    this.wallWashGroup.add(backWash);

    const leftWash = this.createWallWashPlane(
      depth,
      washHeight,
      new THREE.Vector3(-width / 2 + 0.002, trenchY - washHeight / 2 + 0.02, 0),
      'left'
    );
    this.wallWashMeshes.push(leftWash);
    this.wallWashGroup.add(leftWash);

    const rightWash = this.createWallWashPlane(
      depth,
      washHeight,
      new THREE.Vector3(width / 2 - 0.002, trenchY - washHeight / 2 + 0.02, 0),
      'right'
    );
    this.wallWashMeshes.push(rightWash);
    this.wallWashGroup.add(rightWash);
  }

  private createWallWashPlane(
    wallWidth: number,
    washHeight: number,
    position: THREE.Vector3,
    wallType: 'front' | 'back' | 'left' | 'right'
  ): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(wallWidth, washHeight, 1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: this.lightColor.clone() },
        uIntensity: { value: this.config.intensity },
        uBeamAngle: { value: this.config.beamAngle },
        uHaloSpread: { value: this.config.haloSpread },
        uWallWidth: { value: wallWidth },
        uWashHeight: { value: washHeight },
        uTiltAngle: { value: this.lightTiltAngle },
        uLightIntensity: { value: this.lightIntensity / 500.0 },
        uTrenchWidth: { value: this.ceilingGenerator.getCeilingConfig().trenchWidth },
        uCeilingOffset: { value: 0.05 },
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
        uniform float uTiltAngle;
        uniform float uLightIntensity;
        uniform float uTrenchWidth;
        uniform float uCeilingOffset;

        varying vec2 vUv;
        varying vec3 vPosition;

        float smoothFalloff(float x, float edge) {
          if (x >= edge) return 0.0;
          float t = x / edge;
          return 1.0 - t * t * (3.0 - 2.0 * t);
        }

        void main() {
          float topY = 1.0 - vUv.y;

          float tiltFactor = sin(uTiltAngle);
          float beamRad = uBeamAngle * 3.14159 / 180.0;
          float beamSpread = sin(beamRad * 0.5) * 1.0 + 0.15;
          float verticalSpread = beamSpread + tiltFactor * 0.35 + uHaloSpread * 0.5;

          float mainBeam = 0.0;
          if (topY < verticalSpread) {
            float t = topY / verticalSpread;
            mainBeam = pow(1.0 - t, 1.8);
          }

          float softDecay = 2.5 / max(uHaloSpread + 0.25, 0.3);
          float softFalloff = exp(-topY * softDecay);

          float topGlow = exp(-topY * (10.0 - tiltFactor * 3.0)) * (0.5 + tiltFactor * 0.5);

          float verticalWash = mainBeam * 0.45 + softFalloff * 0.35 + topGlow * 0.3;

          float edgeFadeWidth = 0.06;
          float leftEdge = smoothFalloff(vUv.x, edgeFadeWidth);
          float rightEdge = smoothFalloff(1.0 - vUv.x, edgeFadeWidth);
          float horizontalProfile = leftEdge * rightEdge;
          horizontalProfile = mix(0.8, 1.0, horizontalProfile);

          float wash = verticalWash * horizontalProfile;

          float bottomFade = smoothFalloff(1.0 - vUv.y, 0.15);
          wash *= mix(1.0, bottomFade, 0.55);

          float intensityMult = uIntensity * uLightIntensity * 3.0;
          wash = wash * intensityMult;

          wash = clamp(wash, 0.0, 3.0);

          vec3 finalColor = uColor * wash;
          float alpha = clamp(wash * 0.6, 0.0, 1.0);

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

    mesh.renderOrder = 2;

    return mesh;
  }

  private clearWallWash(): void {
    this.wallWashMaterials.forEach(mat => mat.dispose());
    this.wallWashMaterials = [];

    this.wallWashMeshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.wallWashMeshes = [];

    while (this.wallWashGroup.children.length > 0) {
      this.wallWashGroup.remove(this.wallWashGroup.children[0]);
    }
  }

  public updateConfig(config: Partial<WallWashConfig>): void {
    this.config = { ...this.config, ...config };

    this.wallWashMaterials.forEach(material => {
      material.uniforms.uIntensity.value = this.config.intensity;
      material.uniforms.uBeamAngle.value = this.config.beamAngle;
      material.uniforms.uHaloSpread.value = this.config.haloSpread;
    });
  }

  public updateLightColor(color: THREE.Color): void {
    this.lightColor.copy(color);
    this.wallWashMaterials.forEach(material => {
      material.uniforms.uColor.value.copy(color);
    });
  }

  public updateLightIntensity(intensity: number): void {
    this.lightIntensity = intensity;
    this.wallWashMaterials.forEach(material => {
      material.uniforms.uLightIntensity.value = intensity / 500.0;
    });
  }

  public updateLightTiltAngle(angle: number): void {
    this.lightTiltAngle = angle;
    this.wallWashMaterials.forEach(material => {
      material.uniforms.uTiltAngle.value = angle;
    });
  }

  public updateFromLightSources(sources: LightSourceData[]): void {
    if (sources.length === 0) return;

    this.updateLightColor(sources[0].color);
    this.updateLightIntensity(sources[0].intensity);

    const primaryDir = sources[0].direction.clone().normalize();
    const tiltAngle = Math.acos(Math.abs(primaryDir.y));
    this.updateLightTiltAngle(tiltAngle);
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
