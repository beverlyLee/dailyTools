import * as THREE from 'three'

export class GraffitiWall {
  public mesh: THREE.Mesh
  public renderTarget: THREE.WebGLRenderTarget
  public textureSize: number = 1024

  constructor(width: number = 10, height: number = 6) {
    this.renderTarget = new THREE.WebGLRenderTarget(this.textureSize, this.textureSize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    })

    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
      side: THREE.DoubleSide
    })

    this.mesh = new THREE.Mesh(geometry, material)
  }

  public clear(renderer: THREE.WebGLRenderer, color: THREE.Color = new THREE.Color(0x2c3e50)) {
    const oldRenderTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.renderTarget)
    renderer.setClearColor(color, 1)
    renderer.clear()
    renderer.setRenderTarget(oldRenderTarget)
  }

  public dispose() {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    this.renderTarget.dispose()
  }
}
