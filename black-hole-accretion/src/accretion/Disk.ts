import * as THREE from 'three'
import accretionVertex from '../shaders/accretionVertex.glsl?raw'
import accretionFragment from '../shaders/accretionFragment.glsl?raw'

export class AccretionDisk {
  public mesh: THREE.Mesh
  private innerRadius: number
  private outerRadius: number
  private material: THREE.ShaderMaterial

  constructor(innerRadius: number = 1.5, outerRadius: number = 5) {
    this.innerRadius = innerRadius
    this.outerRadius = outerRadius
    this.material = this.createShaderMaterial()
    this.mesh = this.createMesh()
    this.mesh.rotation.x = -Math.PI / 2
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: accretionVertex,
      fragmentShader: accretionFragment,
      uniforms: {
        uInnerRadius: { value: this.innerRadius },
        uOuterRadius: { value: this.outerRadius },
        uTime: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }

  private createMesh(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(
      this.innerRadius,
      this.outerRadius,
      128,
      32
    )
    return new THREE.Mesh(geometry, this.material)
  }

  public update(time: number): void {
    this.material.uniforms.uTime.value = time
    this.mesh.rotation.z = time * 0.1
  }

  public dispose(): void {
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
