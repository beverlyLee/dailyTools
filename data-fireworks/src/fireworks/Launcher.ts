import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { DataPoint } from '../data/CSVLoader';
import { Firework, getCategoryColor } from './Firework';

export class Launcher {
  private scene: THREE.Scene;
  private data: DataPoint[] = [];
  private fireworks: Firework[] = [];
  private launchTimer = 0;
  private launchInterval = 0.8;
  private dataIndex = 0;
  private groundMeshes: THREE.Mesh[] = [];
  private groundGlowMeshes: THREE.Mesh[] = [];
  private groundMaterials: THREE.MeshBasicMaterial[] = [];
  private pulseTweens: TWEEN.Tween<{ scale: number; opacity: number }>[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setData(data: DataPoint[]) {
    this.data = data;
    this.dataIndex = 0;
    this.buildGroundMarkers();
  }

  private buildGroundMarkers() {
    this.pulseTweens.forEach((t) => t.stop());
    this.pulseTweens = [];
    this.groundMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).dispose();
    });
    this.groundGlowMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).dispose();
    });
    this.groundMeshes = [];
    this.groundGlowMeshes = [];
    this.groundMaterials = [];

    const categories = [...new Set(this.data.map((d) => d.category))];
    const spacing = 24 / categories.length;

    categories.forEach((cat, i) => {
      const color = getCategoryColor(cat);
      const x = -12 + i * spacing + spacing / 2;

      const glowGeo = new THREE.RingGeometry(1.3, 1.8, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(x, -1.95, 0);
      this.scene.add(glow);
      this.groundGlowMeshes.push(glow);

      const coreGeo = new THREE.CircleGeometry(2.2, 32);
      const coreMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.rotation.x = -Math.PI / 2;
      core.position.set(x, -1.97, 0);
      this.scene.add(core);
      this.groundMeshes.push(core);
      this.groundMaterials.push(coreMat);

      const pulseState = { scale: 1, opacity: 0.8 };
      const tween = new TWEEN.Tween(pulseState)
        .to({ scale: 1.4, opacity: 0.4 }, 900 + i * 120)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .yoyo(true)
        .repeat(Infinity)
        .onUpdate(() => {
          core.scale.setScalar(pulseState.scale);
          glow.scale.setScalar(pulseState.scale);
          coreMat.opacity = pulseState.opacity;
          glowMat.opacity = pulseState.opacity * 0.6;
        });
      tween.start();
      this.pulseTweens.push(tween);
    });
  }

  private getXForCategory(category: string): number {
    const categories = [...new Set(this.data.map((d) => d.category))];
    const idx = categories.indexOf(category);
    const spacing = 24 / categories.length;
    return -12 + idx * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.6;
  }

  update(dt: number) {
    this.launchTimer += dt;
    if (this.launchTimer >= this.launchInterval && this.data.length > 0) {
      this.launchTimer = 0;
      const point = this.data[this.dataIndex % this.data.length];
      this.dataIndex++;

      const x = this.getXForCategory(point.category);
      const fw = new Firework(this.scene, x, point);
      this.fireworks.push(fw);
    }

    this.fireworks = this.fireworks.filter((fw) => {
      const alive = fw.update(dt);
      if (!alive) {
        fw.dispose();
      }
      return alive;
    });
  }

  dispose() {
    this.pulseTweens.forEach((t) => t.stop());
    this.pulseTweens = [];
    this.fireworks.forEach((fw) => fw.dispose());
    this.fireworks = [];
    this.groundMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).dispose();
    });
    this.groundGlowMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).dispose();
    });
    this.groundMeshes = [];
    this.groundGlowMeshes = [];
    this.groundMaterials = [];
  }
}
