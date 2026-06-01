import * as THREE from 'three';
import { Integrator, type PendulumState, type PhysicsParams } from '../physics/Integrator';

export class DoublePendulum {
  private scene: THREE.Scene;
  private integrator: Integrator;
  private state: PendulumState;
  private initialState: PendulumState;
  private params: PhysicsParams;
  private color: number;

  private pivot: THREE.Object3D;
  private rod1: THREE.Mesh;
  private rod2: THREE.Mesh;
  private bob1: THREE.Mesh;
  private bob2: THREE.Mesh;
  private bobLight1: THREE.PointLight;
  private bobLight2: THREE.PointLight;

  private position1: THREE.Vector3;
  private position2: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    initialState: PendulumState,
    params: PhysicsParams,
    color: number = 0x00d4ff
  ) {
    this.scene = scene;
    this.initialState = { ...initialState };
    this.state = { ...initialState };
    this.params = { ...params };
    this.color = color;

    this.integrator = new Integrator(this.params);

    this.position1 = new THREE.Vector3();
    this.position2 = new THREE.Vector3();

    this.pivot = new THREE.Object3D();
    this.scene.add(this.pivot);

    this.rod1 = this.createRod(this.params.l1, color);
    this.rod2 = this.createRod(this.params.l2, color);
    this.bob1 = this.createBob(this.params.m1, color);
    this.bob2 = this.createBob(this.params.m2, color);

    this.bobLight1 = new THREE.PointLight(color, 0.5, 3);
    this.bobLight2 = new THREE.PointLight(color, 0.5, 3);

    this.pivot.add(this.rod1);
    this.rod1.add(this.bob1);
    this.rod1.add(this.bobLight1);
    this.bob1.add(this.rod2);
    this.rod2.add(this.bob2);
    this.rod2.add(this.bobLight2);

    this.updatePositions();
  }

  private createRod(length: number, color: number): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.03, 0.03, length, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const rod = new THREE.Mesh(geometry, material);
    rod.position.y = -length / 2;
    return rod;
  }

  private createBob(mass: number, color: number): THREE.Mesh {
    const radius = Math.max(0.12, Math.pow(mass, 0.33) * 0.15);
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.9,
      roughness: 0.1,
      emissive: color,
      emissiveIntensity: 0.3
    });
    const bob = new THREE.Mesh(geometry, material);
    bob.castShadow = true;
    return bob;
  }

  public update(dt: number, substeps: number = 4): void {
    const subDt = dt / substeps;
    for (let i = 0; i < substeps; i++) {
      this.state = this.integrator.rk4Step(this.state, subDt);
    }
    this.updatePositions();
    this.updateLightIntensity();
  }

  private updatePositions(): void {
    const { theta1, theta2 } = this.state;
    const { l1, l2 } = this.params;

    this.pivot.rotation.z = theta1;

    const jointAngle = theta2 - theta1;
    this.rod2.rotation.z = jointAngle;

    const x1 = l1 * Math.sin(theta1);
    const y1 = -l1 * Math.cos(theta1);
    this.position1.set(x1, y1, 0);

    const x2 = x1 + l2 * Math.sin(theta2);
    const y2 = y1 - l2 * Math.cos(theta2);
    this.position2.set(x2, y2, 0);
  }

  private updateLightIntensity(): void {
    const speed = Math.abs(this.state.omega2);
    const intensity = Math.min(2, 0.3 + speed * 0.15);
    this.bobLight1.intensity = intensity * 0.5;
    this.bobLight2.intensity = intensity;

    const bobMat2 = this.bob2.material as THREE.MeshStandardMaterial;
    bobMat2.emissiveIntensity = Math.min(0.8, 0.2 + speed * 0.08);
  }

  public getBob2Position(): THREE.Vector3 {
    return this.position2.clone();
  }

  public getState(): PendulumState {
    return { ...this.state };
  }

  public getInitialState(): PendulumState {
    return { ...this.initialState };
  }

  public reset(): void {
    this.state = { ...this.initialState };
    this.updatePositions();
  }

  public getColor(): number {
    return this.color;
  }

  public dispose(): void {
    this.scene.remove(this.pivot);
    this.rod1.geometry.dispose();
    (this.rod1.material as THREE.Material).dispose();
    this.rod2.geometry.dispose();
    (this.rod2.material as THREE.Material).dispose();
    this.bob1.geometry.dispose();
    (this.bob1.material as THREE.Material).dispose();
    this.bob2.geometry.dispose();
    (this.bob2.material as THREE.Material).dispose();
  }
}
