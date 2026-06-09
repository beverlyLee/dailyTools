import * as THREE from 'three';
import { LightConfig, LightSourceData, kelvinToRGB } from './types';
import { CeilingGenerator } from './CeilingGenerator';

export class LightEditor {
  private scene: THREE.Scene;
  private ceilingGenerator: CeilingGenerator;
  private config: LightConfig;

  private lightGroup: THREE.Group;
  private lightMeshes: THREE.Mesh[] = [];
  private areaLights: THREE.RectAreaLight[] = [];
  private pointLights: THREE.PointLight[] = [];

  private lightEmissiveMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, ceilingGenerator: CeilingGenerator, config: LightConfig) {
    this.scene = scene;
    this.ceilingGenerator = ceilingGenerator;
    this.config = { ...config };

    this.lightGroup = new THREE.Group();
    this.scene.add(this.lightGroup);

    this.lightEmissiveMaterial = new THREE.MeshBasicMaterial({
      color: this.config.color,
      side: THREE.DoubleSide,
    });

    this.buildLights();
  }

  private buildLights(): void {
    this.clearLights();

    const trenchPositions = this.ceilingGenerator.getTrenchPositions();
    const trenchLengths = this.ceilingGenerator.getTrenchLengths();
    const { trenchWidth, trenchDepth } = this.ceilingGenerator.getCeilingConfig();

    const lightWidth = trenchWidth * 0.6;
    const lightHeight = 0.02;

    if (this.config.type === 'area') {
      this.buildAreaLights(trenchPositions, trenchLengths, lightWidth, lightHeight);
    } else {
      this.buildTubeLights(trenchPositions, trenchLengths, lightWidth);
    }
  }

  private buildAreaLights(
    positions: { front: THREE.Vector3; back: THREE.Vector3; left: THREE.Vector3; right: THREE.Vector3 },
    lengths: { front: number; back: number; left: number; right: number },
    width: number,
    _height: number
  ): void {
    const tiltAngle = Math.PI / 4;

    const createAreaLight = (
      position: THREE.Vector3,
      length: number,
      lightWidth: number,
      wallSide: 'front' | 'back' | 'left' | 'right'
    ) => {
      const areaLight = new THREE.RectAreaLight(
        this.config.color,
        this.config.intensity / 4,
        length,
        lightWidth
      );
      areaLight.position.copy(position);

      let targetX = position.x;
      let targetY = position.y - Math.cos(tiltAngle);
      let targetZ = position.z;

      switch (wallSide) {
        case 'front':
          targetZ = position.z - Math.sin(tiltAngle);
          break;
        case 'back':
          targetZ = position.z + Math.sin(tiltAngle);
          break;
        case 'left':
          targetX = position.x - Math.sin(tiltAngle);
          break;
        case 'right':
          targetX = position.x + Math.sin(tiltAngle);
          break;
      }

      areaLight.lookAt(targetX, targetY, targetZ);
      this.areaLights.push(areaLight);
      this.lightGroup.add(areaLight);

      const meshGeo = new THREE.PlaneGeometry(length, lightWidth);
      const mesh = new THREE.Mesh(meshGeo, this.lightEmissiveMaterial.clone());
      mesh.position.copy(position);

      switch (wallSide) {
        case 'front':
          mesh.rotation.x = -tiltAngle;
          break;
        case 'back':
          mesh.rotation.x = tiltAngle;
          break;
        case 'left':
          mesh.rotation.z = tiltAngle;
          break;
        case 'right':
          mesh.rotation.z = -tiltAngle;
          break;
      }

      mesh.position.y -= 0.005;
      this.lightMeshes.push(mesh);
      this.lightGroup.add(mesh);

      for (let i = 0; i < 5; i++) {
        const pointLight = new THREE.PointLight(
          this.config.color,
          (this.config.intensity / 4) * 0.15,
          10,
          2
        );
        pointLight.position.copy(position);

        if (wallSide === 'front' || wallSide === 'back') {
          pointLight.position.x = position.x - length / 2 + (length / 4) * i;
        } else {
          pointLight.position.z = position.z - length / 2 + (length / 4) * i;
        }
        pointLight.position.y = position.y - 0.05;
        this.pointLights.push(pointLight);
        this.lightGroup.add(pointLight);
      }
    };

    createAreaLight(positions.front, lengths.front, width, 'front');
    createAreaLight(positions.back, lengths.back, width, 'back');
    createAreaLight(positions.left, lengths.left, width, 'left');
    createAreaLight(positions.right, lengths.right, width, 'right');
  }

  private buildTubeLights(
    positions: { front: THREE.Vector3; back: THREE.Vector3; left: THREE.Vector3; right: THREE.Vector3 },
    lengths: { front: number; back: number; left: number; right: number },
    width: number
  ): void {
    const tubeRadius = width * 0.3;
    const tiltAngle = Math.PI / 4;

    const createTubeLight = (
      position: THREE.Vector3,
      length: number,
      wallSide: 'front' | 'back' | 'left' | 'right'
    ) => {
      const tubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, length, 16, 1);
      const tubeMesh = new THREE.Mesh(tubeGeo, this.lightEmissiveMaterial.clone());
      tubeMesh.position.copy(position);

      if (wallSide === 'front' || wallSide === 'back') {
        tubeMesh.rotation.z = Math.PI / 2;
        if (wallSide === 'front') {
          tubeMesh.rotation.x = tiltAngle;
        } else {
          tubeMesh.rotation.x = -tiltAngle;
        }
      } else {
        tubeMesh.rotation.x = Math.PI / 2;
        if (wallSide === 'left') {
          tubeMesh.rotation.z = -tiltAngle;
        } else {
          tubeMesh.rotation.z = tiltAngle;
        }
      }

      this.lightMeshes.push(tubeMesh);
      this.lightGroup.add(tubeMesh);

      const segments = 8;
      for (let i = 0; i <= segments; i++) {
        const pointLight = new THREE.PointLight(
          this.config.color,
          (this.config.intensity / 4) * (1 / segments) * 0.8,
          8,
          2
        );
        pointLight.position.copy(position);

        if (wallSide === 'front' || wallSide === 'back') {
          pointLight.position.x = position.x - length / 2 + (length / segments) * i;
        } else {
          pointLight.position.z = position.z - length / 2 + (length / segments) * i;
        }
        pointLight.position.y = position.y - tubeRadius;
        this.pointLights.push(pointLight);
        this.lightGroup.add(pointLight);
      }

      const areaLight = new THREE.RectAreaLight(
        this.config.color,
        (this.config.intensity / 4) * 0.6,
        length,
        tubeRadius * 2
      );
      areaLight.position.copy(position);
      areaLight.position.y -= tubeRadius + 0.01;

      let targetX = position.x;
      let targetY = position.y - Math.cos(tiltAngle);
      let targetZ = position.z;

      switch (wallSide) {
        case 'front':
          targetZ = position.z - Math.sin(tiltAngle);
          break;
        case 'back':
          targetZ = position.z + Math.sin(tiltAngle);
          break;
        case 'left':
          targetX = position.x - Math.sin(tiltAngle);
          break;
        case 'right':
          targetX = position.x + Math.sin(tiltAngle);
          break;
      }

      areaLight.lookAt(targetX, targetY, targetZ);
      this.areaLights.push(areaLight);
      this.lightGroup.add(areaLight);
    };

    createTubeLight(positions.front, lengths.front, 'front');
    createTubeLight(positions.back, lengths.back, 'back');
    createTubeLight(positions.left, lengths.left, 'left');
    createTubeLight(positions.right, lengths.right, 'right');
  }

  private clearLights(): void {
    this.areaLights.forEach((light) => light.dispose());
    this.areaLights = [];

    this.pointLights.forEach((light) => light.dispose());
    this.pointLights = [];

    this.lightMeshes.forEach((mesh) => {
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.lightMeshes = [];

    while (this.lightGroup.children.length > 0) {
      this.lightGroup.remove(this.lightGroup.children[0]);
    }
  }

  public updateConfig(config: Partial<LightConfig>): void {
    const needsRebuild =
      config.type !== undefined && config.type !== this.config.type;

    this.config = { ...this.config, ...config };

    if (config.colorTemp !== undefined) {
      this.config.color = kelvinToRGB(config.colorTemp);
    }

    this.updateLightProperties();

    if (needsRebuild) {
      this.buildLights();
    }
  }

  private updateLightProperties(): void {
    const color = this.config.color;
    const intensity = this.config.intensity;

    this.areaLights.forEach((light) => {
      light.color = color;
      light.intensity = intensity / 4;
    });

    this.pointLights.forEach((light, index) => {
      light.color = color;
      if (this.config.type === 'area') {
        light.intensity = (intensity / 4) * 0.1;
      } else {
        const segments = 8;
        light.intensity = (intensity / 4) * (1 / segments);
      }
    });

    this.lightMeshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (mat.color) {
        mat.color.copy(color);
      }
    });
  }

  public getLightSources(): LightSourceData[] {
    const sources: LightSourceData[] = [];
    const trenchPositions = this.ceilingGenerator.getTrenchPositions();
    const trenchLengths = this.ceilingGenerator.getTrenchLengths();
    const { trenchWidth } = this.ceilingGenerator.getCeilingConfig();

    const tiltAngle = Math.PI / 4;

    const addSource = (
      pos: THREE.Vector3,
      length: number,
      direction: THREE.Vector3
    ) => {
      sources.push({
        position: pos.clone(),
        direction: direction.clone().normalize(),
        intensity: this.config.intensity / 4,
        color: this.config.color.clone(),
        width: length,
        height: trenchWidth * 0.6,
        type: this.config.type,
      });
    };

    const frontDir = new THREE.Vector3(0, -Math.cos(tiltAngle), -Math.sin(tiltAngle));
    const backDir = new THREE.Vector3(0, -Math.cos(tiltAngle), Math.sin(tiltAngle));
    const leftDir = new THREE.Vector3(-Math.sin(tiltAngle), -Math.cos(tiltAngle), 0);
    const rightDir = new THREE.Vector3(Math.sin(tiltAngle), -Math.cos(tiltAngle), 0);

    addSource(trenchPositions.front, trenchLengths.front, frontDir);
    addSource(trenchPositions.back, trenchLengths.back, backDir);
    addSource(trenchPositions.left, trenchLengths.left, leftDir);
    addSource(trenchPositions.right, trenchLengths.right, rightDir);

    return sources;
  }

  public getLightGroup(): THREE.Group {
    return this.lightGroup;
  }

  public getConfig(): LightConfig {
    return { ...this.config };
  }

  public rebuild(): void {
    this.buildLights();
  }

  public dispose(): void {
    this.clearLights();
    this.lightEmissiveMaterial.dispose();
  }
}
