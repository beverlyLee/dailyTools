import * as THREE from 'three'
import lensVertex from '../shaders/lensVertex.glsl?raw'
import lensFragment from '../shaders/lensFragment.glsl?raw'

export class Starfield {
  public mesh: THREE.Mesh
  private material: THREE.ShaderMaterial

  constructor(blackHoleRadius: number = 1) {
    this.material = this.createShaderMaterial(blackHoleRadius)
    this.mesh = this.createMesh()
  }

  private createShaderMaterial(blackHoleRadius: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: lensVertex,
      fragmentShader: lensFragment,
      uniforms: {
        uBlackHoleRadius: { value: blackHoleRadius },
        uLensStrength: { value: 8.0 },
        uTime: { value: 0 }
      },
      side: THREE.BackSide,
      depthWrite: false
    })
  }

  private createMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(100, 64, 64)
    const mesh = new THREE.Mesh(geometry, this.material)
    return mesh
  }

  public update(time: number): void {
    this.material.uniforms.uTime.value = time
  }

  public updateResolution(_width: number, _height: number): void {
  }

  public dispose(): void {
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
