import * as THREE from 'three';
import { fbmNoise3D, perlinNoise3D } from '../utils/noise';

export class RockFormation {
  public mesh: THREE.Mesh;
  public geometry: THREE.BufferGeometry;
  public originalPositions: Float32Array;
  public originalColors: Float32Array;
  public currentPositions: Float32Array;
  public vertexCount: number;
  public baseRadius: number = 2.0;

  constructor() {
    this.geometry = this.createIrregularRockGeometry();
    this.vertexCount = this.geometry.attributes.position.count;

    const posAttr = this.geometry.attributes.position;
    this.originalPositions = new Float32Array(posAttr.array as Float32Array);
    this.currentPositions = posAttr.array as Float32Array;

    const colorAttr = this.geometry.attributes.color;
    this.originalColors = new Float32Array(colorAttr.array as Float32Array);

    const material = this.createRockMaterial();
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  private createIrregularRockGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.DodecahedronGeometry(this.baseRadius, 2);

    const positions = geometry.attributes.position.array as Float32Array;
    const normals = geometry.attributes.normal.array as Float32Array;
    const vertexCount = positions.length / 3;
    const colors = new Float32Array(vertexCount * 3);

    const clipPlanes = [
      { normal: new THREE.Vector3(1, 0.3, 0.4).normalize(), offset: 0.15 },
      { normal: new THREE.Vector3(-0.8, 0.2, 0.6).normalize(), offset: 0.1 },
      { normal: new THREE.Vector3(0.5, -0.5, 0.7).normalize(), offset: -0.05 },
      { normal: new THREE.Vector3(-0.5, -0.4, -0.6).normalize(), offset: 0.2 },
      { normal: new THREE.Vector3(0.4, 0.7, -0.5).normalize(), offset: -0.08 },
      { normal: new THREE.Vector3(-0.3, 0.6, 0.6).normalize(), offset: 0.12 },
      { normal: new THREE.Vector3(0.6, 0.1, -0.7).normalize(), offset: 0.08 },
      { normal: new THREE.Vector3(-0.7, -0.2, 0.3).normalize(), offset: -0.03 },
    ];

    const baseColors = [
      new THREE.Color('#3D2B1F'),
      new THREE.Color('#4A3728'),
      new THREE.Color('#5C3D2E'),
      new THREE.Color('#352A21'),
      new THREE.Color('#4D3622'),
    ];

    const tempNormal = new THREE.Vector3();

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      tempNormal.set(normals[i], normals[i + 1], normals[i + 2]).normalize();

      let clipFactor = 1.0;
      for (const plane of clipPlanes) {
        const dist = x * plane.normal.x + y * plane.normal.y + z * plane.normal.z;
        const planeDist = dist - plane.offset * this.baseRadius;
        if (planeDist > 0) {
          const cutFactor = 1.0 - planeDist / this.baseRadius * 0.7;
          clipFactor = Math.min(clipFactor, Math.max(0.4, cutFactor));
        }
      }

      const noiseScale = 1.8;
      const noiseVal = fbmNoise3D(
        x * noiseScale,
        y * noiseScale,
        z * noiseScale,
        4,
        0.5,
        2.0
      );

      const ridgeNoise = Math.abs(perlinNoise3D(
        x * noiseScale * 2.5,
        y * noiseScale * 2.5,
        z * noiseScale * 2.5
      ));
      const ridgeDetail = Math.abs(perlinNoise3D(
        x * noiseScale * 5,
        y * noiseScale * 5,
        z * noiseScale * 5
      )) * 0.35;

      const angularFactor = 1.0 - ridgeNoise * 0.5 - ridgeDetail * 0.2;
      const noiseMultiplier = 1.0 + noiseVal * 0.45;
      const heightMultiplier = noiseMultiplier * angularFactor * clipFactor;

      const verticalBias = Math.max(0, tempNormal.y * 0.1);
      const finalMultiplier = heightMultiplier + verticalBias;

      const yRandom = 0.92 + Math.random() * 0.2;
      positions[i] = tempNormal.x * this.baseRadius * finalMultiplier;
      positions[i + 1] = tempNormal.y * this.baseRadius * finalMultiplier * yRandom;
      positions[i + 2] = tempNormal.z * this.baseRadius * finalMultiplier;

      const colorNoise = fbmNoise3D(x * 1.5, y * 1.5, z * 1.5, 3, 0.5, 2.0);
      const colorIndex = Math.floor(
        ((colorNoise + 1) / 2) * (baseColors.length - 1)
      );
      const clampedIndex = Math.max(0, Math.min(baseColors.length - 1, colorIndex));
      const baseColor = baseColors[clampedIndex];

      const variation = (Math.random() - 0.5) * 0.04;
      colors[i] = baseColor.r + variation;
      colors[i + 1] = baseColor.g + variation;
      colors[i + 2] = baseColor.b + variation;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.attributes.position.needsUpdate = true;

    return geometry;
  }

  private createRockMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });
  }

  public updatePositions(): void {
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public reset(): void {
    this.currentPositions.set(this.originalPositions);
    const colors = this.geometry.attributes.color.array as Float32Array;
    colors.set(this.originalColors);
    this.geometry.attributes.color.needsUpdate = true;
    this.updatePositions();
  }

  public getVertexPosition(index: number, out: THREE.Vector3): void {
    const i = index * 3;
    out.set(
      this.currentPositions[i],
      this.currentPositions[i + 1],
      this.currentPositions[i + 2]
    );
  }

  public getVertexNormal(index: number, out: THREE.Vector3): void {
    const normals = this.geometry.attributes.normal.array as Float32Array;
    const i = index * 3;
    out.set(normals[i], normals[i + 1], normals[i + 2]);
    out.normalize();
  }

  public setVertexPosition(index: number, pos: THREE.Vector3): void {
    const i = index * 3;
    this.currentPositions[i] = pos.x;
    this.currentPositions[i + 1] = pos.y;
    this.currentPositions[i + 2] = pos.z;
  }
}
