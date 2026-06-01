import * as THREE from 'three'
import { COLORS } from '../types'

export class WeftThreads {
  private mesh: THREE.InstancedMesh
  private maxRows: number
  private warpCount: number
  private warpSpacing: number
  private completedRows: number
  private dummy: THREE.Object3D
  private weftSpacing: number
  private startX: number
  private baseY: number
  private totalInstances: number
  private segmentWidth: number
  private colorWeft: THREE.Color
  private colorPattern: THREE.Color
  private zOffsetPattern: number
  private zOffsetWeft: number

  constructor(
    maxRows: number,
    warpCount: number,
    warpSpacing: number,
    baseY: number = 0
  ) {
    this.maxRows = maxRows
    this.warpCount = warpCount
    this.warpSpacing = warpSpacing
    this.completedRows = 0
    this.weftSpacing = 0.08
    this.baseY = baseY
    this.totalInstances = maxRows * warpCount
    this.segmentWidth = warpSpacing * 0.98
    this.zOffsetPattern = 0.08
    this.zOffsetWeft = -0.08

    this.colorWeft = new THREE.Color(COLORS.weft)
    this.colorPattern = new THREE.Color(COLORS.weftPattern)

    const totalWidth = (warpCount - 1) * warpSpacing
    this.startX = -totalWidth / 2

    this.dummy = new THREE.Object3D()

    const geometry = new THREE.BoxGeometry(
      this.segmentWidth,
      0.035,
      0.025
    )
    const material = new THREE.MeshStandardMaterial({
      metalness: 0.0,
      roughness: 0.85,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.totalInstances)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.totalInstances * 3),
      3
    )
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)

    this.initializeEmpty()
  }

  private getInstanceIndex(row: number, col: number): number {
    return row * this.warpCount + col
  }

  private initializeEmpty(): void {
    const emptyColor = new THREE.Color('#000000')
    for (let row = 0; row < this.maxRows; row++) {
      for (let col = 0; col < this.warpCount; col++) {
        const idx = this.getInstanceIndex(row, col)
        this.dummy.position.set(0, -100, 0)
        this.dummy.scale.set(0, 0, 0)
        this.dummy.updateMatrix()
        this.mesh.setMatrixAt(idx, this.dummy.matrix)
        this.mesh.setColorAt(idx, emptyColor)
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true
    this.mesh.instanceColor.needsUpdate = true
  }

  addRow(rowPattern: boolean[], _liftAmount: number): void {
    if (this.completedRows >= this.maxRows) return

    const rowY = this.baseY + this.completedRows * this.weftSpacing
    const rowIndex = this.completedRows
    const rowWeaveOffset = rowIndex % 2 === 0 ? 0.006 : -0.006

    for (let col = 0; col < this.warpCount; col++) {
      const idx = this.getInstanceIndex(rowIndex, col)
      const x = this.startX + col * this.warpSpacing

      const isWarpLifted = rowPattern[col]

      const zOffset = isWarpLifted
        ? this.zOffsetWeft + rowWeaveOffset
        : this.zOffsetPattern + rowWeaveOffset
      const heightScale = isWarpLifted ? 0.7 : 1.0

      this.dummy.position.set(x, rowY, zOffset)
      this.dummy.scale.set(1, heightScale, 1)
      this.dummy.rotation.set(0, 0, 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(idx, this.dummy.matrix)

      if (isWarpLifted) {
        this.mesh.setColorAt(idx, this.colorWeft)
      } else {
        this.mesh.setColorAt(idx, this.colorPattern)
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true
    this.mesh.instanceColor.needsUpdate = true

    this.completedRows++
  }

  getCompletedRows(): number {
    return this.completedRows
  }

  getMaxRows(): number {
    return this.maxRows
  }

  getCurrentRowY(): number {
    return this.baseY + this.completedRows * this.weftSpacing
  }

  reset(): void {
    this.completedRows = 0
    this.initializeEmpty()
  }

  getMesh(): THREE.InstancedMesh {
    return this.mesh
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
    this.mesh.dispose()
  }
}
