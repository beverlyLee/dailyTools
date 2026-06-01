import * as THREE from 'three';
import neonVertexShader from '../shaders/neonVertex.glsl';
import neonFragmentShader from '../shaders/neonFragment.glsl';

export class TubeTrack {
  public mesh: THREE.Mesh;
  public curve: THREE.CatmullRomCurve3;
  public material: THREE.ShaderMaterial;
  private geometry: THREE.TubeGeometry;
  private frames: { tangents: THREE.Vector3[]; normals: THREE.Vector3[]; binormals: THREE.Vector3[] };

  constructor() {
    this.curve = this.createCurve();
    this.frames = this.curve.computeFrenetFrames(1000, false);
    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = Math.PI / 2;
  }

  private createCurve(): THREE.CatmullRomCurve3 {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    const radius = 30;
    const height = 500;

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 8;
      const spiralRadius = radius + Math.sin(t * Math.PI * 4) * 10;
      const x = Math.cos(angle) * spiralRadius;
      const y = t * height;
      const z = Math.sin(angle) * spiralRadius;
      points.push(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const angle = Math.PI * 8 + t * Math.PI * 6;
      const spiralRadius = 20 + Math.sin(t * Math.PI * 3 + Math.PI) * 15;
      const x = Math.cos(angle) * spiralRadius + 30;
      const y = height + t * 300;
      const z = Math.sin(angle) * spiralRadius;
      points.push(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const angle = Math.PI * 14 + t * Math.PI * 10;
      const spiralRadius = 40 - t * 20 + Math.sin(t * Math.PI * 5) * 8;
      const x = Math.cos(angle) * spiralRadius - 20;
      const y = height + 300 + t * 400;
      const z = Math.sin(angle) * spiralRadius + 20;
      points.push(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const angle = Math.PI * 24 + t * Math.PI * 12;
      const spiralRadius = 25 + Math.cos(t * Math.PI * 6) * 15;
      const x = Math.cos(angle) * spiralRadius + 10;
      const y = height + 700 + t * 500;
      const z = Math.sin(angle) * spiralRadius - 15;
      points.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }

  private createGeometry(): THREE.TubeGeometry {
    const tubularSegments = 1000;
    const radius = 6;
    const radialSegments = 32;
    const closed = false;

    return new THREE.TubeGeometry(
      this.curve,
      tubularSegments,
      radius,
      radialSegments,
      closed
    );
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: neonVertexShader,
      fragmentShader: neonFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0 }
      },
      side: THREE.BackSide
    });
  }

  public update(time: number, speed: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uSpeed.value = speed;
  }

  public getPointAt(t: number): THREE.Vector3 {
    return this.curve.getPointAt(t);
  }

  public getTangentAt(t: number): THREE.Vector3 {
    return this.curve.getTangentAt(t);
  }

  public getFrenetFrame(t: number): { tangent: THREE.Vector3; normal: THREE.Vector3; binormal: THREE.Vector3 } {
    const segments = this.frames.tangents.length - 1;
    const index = Math.min(Math.floor(t * segments), segments - 1);
    const frac = (t * segments) - index;

    const tangent = new THREE.Vector3().lerpVectors(
      this.frames.tangents[index],
      this.frames.tangents[Math.min(index + 1, segments)],
      frac
    ).normalize();

    const normal = new THREE.Vector3().lerpVectors(
      this.frames.normals[index],
      this.frames.normals[Math.min(index + 1, segments)],
      frac
    ).normalize();

    const binormal = new THREE.Vector3().lerpVectors(
      this.frames.binormals[index],
      this.frames.binormals[Math.min(index + 1, segments)],
      frac
    ).normalize();

    return { tangent, normal, binormal };
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
