import * as THREE from 'three'

export class EventHorizon {
  public mesh: THREE.Mesh
  private radius: number

  constructor(radius: number = 1) {
    this.radius = radius
    this.mesh = this.createMesh()
  }

  private createMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.radius, 64, 64)
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.FrontSide
    })
    const mesh = new THREE.Mesh(geometry, material)
    return mesh
  }

  public getRadius(): number {
    return this.radius
  }

  public dispose(): void {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}
