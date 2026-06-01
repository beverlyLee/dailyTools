import { ClothMesh, ClothVertex } from '../cloth/ClothMesh'

interface Spring {
  a: ClothVertex
  b: ClothVertex
  restLength: number
}

export class SpringSolver {
  private structural: Spring[] = []
  private shear: Spring[] = []
  private bend: Spring[] = []
  private cloth: ClothMesh
  public gravity = 0.4
  public damping = 0.993
  public airDrag = 0.006
  public iterations = 8

  constructor(cloth: ClothMesh) {
    this.cloth = cloth
    this.buildSprings()
  }

  presimulate(steps = 300): void {
    const savedDamping = this.damping
    const savedAirDrag = this.airDrag

    this.damping = 0.96
    this.airDrag = 0.05

    const fixedDt = 1 / 60
    for (let i = 0; i < steps; i++) {
      this.step(fixedDt)
    }

    this.cloth.resetVelocities()
    this.cloth.updateGeometry()

    this.damping = savedDamping
    this.airDrag = savedAirDrag
  }

  private buildSprings(): void {
    const { cols, rows, vertices } = this.cloth
    const idx = (c: number, r: number) => r * cols + c

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = idx(c, r)
        const a = vertices[i]

        if (c < cols - 1) {
          const b = vertices[idx(c + 1, r)]
          this.structural.push({ a, b, restLength: a.position.distanceTo(b.position) })
        }
        if (r < rows - 1) {
          const b = vertices[idx(c, r + 1)]
          this.structural.push({ a, b, restLength: a.position.distanceTo(b.position) })
        }

        if (c < cols - 1 && r < rows - 1) {
          const b = vertices[idx(c + 1, r + 1)]
          this.shear.push({ a, b, restLength: a.position.distanceTo(b.position) })
        }
        if (c > 0 && r < rows - 1) {
          const b = vertices[idx(c - 1, r + 1)]
          this.shear.push({ a, b, restLength: a.position.distanceTo(b.position) })
        }

        if (c < cols - 2) {
          const b = vertices[idx(c + 2, r)]
          this.bend.push({ a, b, restLength: a.position.distanceTo(b.position) })
        }
        if (r < rows - 2) {
          const b = vertices[idx(c, r + 2)]
          this.bend.push({ a, b, restLength: a.position.distanceTo(b.position) })
        }
      }
    }
  }

  step(dt: number): void {
    const v = this.cloth.vertices
    const gAccel = this.gravity * dt * dt * 50

    for (const vert of v) {
      if (vert.pinned) continue

      let vx = (vert.position.x - vert.previous.x) * this.damping
      let vy = (vert.position.y - vert.previous.y) * this.damping
      let vz = (vert.position.z - vert.previous.z) * this.damping

      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
      if (speed > 0.0001) {
        const dragFactor = 1 - this.airDrag * speed * dt * 60
        const clampedDrag = Math.max(dragFactor, 0.8)
        vx *= clampedDrag
        vy *= clampedDrag
        vz *= clampedDrag
      }

      vert.previous.copy(vert.position)

      vert.position.x += vx
      vert.position.y += vy - gAccel
      vert.position.z += vz
    }

    for (let iter = 0; iter < this.iterations; iter++) {
      this.satisfySprings(this.structural, 1.0)
      this.satisfySprings(this.shear, 0.7)
      this.satisfySprings(this.bend, 0.5)
    }

    for (const vert of v) {
      if (vert.pinned) continue
      if (!isFinite(vert.position.x) || !isFinite(vert.position.y) || !isFinite(vert.position.z)) {
        vert.position.copy(vert.previous)
      }
    }
  }

  private satisfySprings(springs: Spring[], stiffness: number): void {
    for (const s of springs) {
      const { a, b, restLength } = s
      const dx = b.position.x - a.position.x
      const dy = b.position.y - a.position.y
      const dz = b.position.z - a.position.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001
      const diff = (dist - restLength) / dist * stiffness

      const offsetX = dx * 0.5 * diff
      const offsetY = dy * 0.5 * diff
      const offsetZ = dz * 0.5 * diff

      if (!a.pinned) {
        a.position.x += offsetX
        a.position.y += offsetY
        a.position.z += offsetZ
      }
      if (!b.pinned) {
        b.position.x -= offsetX
        b.position.y -= offsetY
        b.position.z -= offsetZ
      }
    }
  }
}
