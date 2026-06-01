import * as THREE from "three";
import type { AudioData } from "../audio/Analyser";

const PARTICLE_COUNT = 6000;
const SPIRAL_TURNS = 12;
const SPIRAL_RADIUS = 8;

export class ParticleField {
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private basePositions: Float32Array;
  private targetPositions: Float32Array;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.targetPositions = new Float32Array(PARTICLE_COUNT * 3);

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / PARTICLE_COUNT;
      const angle = t * SPIRAL_TURNS * Math.PI * 2;
      const r = t * SPIRAL_RADIUS;
      const y = (t - 0.5) * 12;

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      this.targetPositions[i * 3] = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;

      colors[i * 3] = 0.3;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 1.0;

      sizes[i] = 0.08 + Math.random() * 0.04;
    }

    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  getObject(): THREE.Points {
    return this.points;
  }

  update(audioData: AudioData, time: number): void {
    const { bass, treble, mid } = audioData;
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    const spiralTightness = 1.0 + bass * 2.5;
    const spiralExpansion = 1.0 - bass * 0.4;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / PARTICLE_COUNT;
      const angle = t * SPIRAL_TURNS * Math.PI * 2 * spiralTightness + time * 0.3;
      const r = t * SPIRAL_RADIUS * spiralExpansion;

      const yOffset = Math.sin(time * 0.5 + t * Math.PI * 4) * mid * 2;

      const x = Math.cos(angle) * r;
      const y = (t - 0.5) * 12 + yOffset;
      const z = Math.sin(angle) * r;

      this.targetPositions[i * 3] = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;
    }

    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      positions[i] += (this.targetPositions[i] - positions[i]) * 0.12;
    }

    const coolColor = new THREE.Color(0.2, 0.4, 1.0);
    const warmColor = new THREE.Color(1.0, 0.3, 0.1);
    const midColor = new THREE.Color(0.5, 0.2, 0.8);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / PARTICLE_COUNT;
      const perParticleTreble = treble + Math.sin(time * 2 + t * 10) * 0.1;
      const clampedTreble = Math.max(0, Math.min(1, perParticleTreble));

      const blended = new THREE.Color();
      if (clampedTreble < 0.5) {
        blended.lerpColors(coolColor, midColor, clampedTreble * 2);
      } else {
        blended.lerpColors(midColor, warmColor, (clampedTreble - 0.5) * 2);
      }

      colors[i * 3] = blended.r;
      colors[i * 3 + 1] = blended.g;
      colors[i * 3 + 2] = blended.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    this.points.rotation.y += 0.002 + bass * 0.005;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
