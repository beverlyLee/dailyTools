import * as THREE from 'three'

export interface ClothVertex {
  position: THREE.Vector3
  previous: THREE.Vector3
  pinned: boolean
}

export class ClothMesh {
  public mesh: THREE.Mesh
  public vertices: ClothVertex[]
  public cols: number
  public rows: number
  public width: number
  public height: number

  constructor(cols = 40, rows = 40, width = 8, height = 8) {
    this.cols = cols
    this.rows = rows
    this.width = width
    this.height = height

    const geometry = new THREE.PlaneGeometry(width, height, cols - 1, rows - 1)
    const positions = geometry.attributes.position

    this.vertices = []
    for (let i = 0; i < cols * rows; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const row = Math.floor(i / cols)

      const pos = new THREE.Vector3(x, y, 0)

      this.vertices.push({
        position: pos.clone(),
        previous: pos.clone(),
        pinned: row === 0,
      })
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      side: THREE.FrontSide,
      wireframe: false,
      metalness: 0.0,
      roughness: 0.85,
      flatShading: false,
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.y = 4
    this.mesh.castShadow = true
    this.mesh.receiveShadow = false
  }

  resetVelocities(): void {
    for (const v of this.vertices) {
      v.previous.copy(v.position)
    }
  }

  updateGeometry(): void {
    const positions = this.mesh.geometry.attributes.position
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i]
      positions.setXYZ(i, v.position.x, v.position.y, v.position.z)
    }
    positions.needsUpdate = true
    this.mesh.geometry.computeVertexNormals()
  }

  applyImpulse(
    worldPoint: THREE.Vector3,
    impulse: THREE.Vector3,
    radius = 1.2,
    spread = 0.4,
  ): void {
    const localPoint = this.mesh.worldToLocal(worldPoint.clone())
    for (const v of this.vertices) {
      if (v.pinned) continue
      const d = v.position.distanceTo(localPoint)
      if (d < radius) {
        const falloff = 1 - d / radius

        const dx = v.position.x - localPoint.x
        const dz = v.position.z - localPoint.z
        const horizDist = Math.sqrt(dx * dx + dz * dz) + 0.0001

        const nx = dx / horizDist
        const nz = dz / horizDist

        v.previous.x -= impulse.x * falloff + nx * spread * falloff
        v.previous.y -= impulse.y * falloff
        v.previous.z -= impulse.z * falloff + nz * spread * falloff
      }
    }
  }
}
