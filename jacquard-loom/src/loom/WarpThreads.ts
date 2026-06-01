import * as THREE from 'three'
import { COLORS } from '../types'

export class WarpThreads {
  private mesh: THREE.InstancedMesh
  private count: number
  private height: number
  private spacing: number
  private dummy: THREE.Object3D
  private currentPositions: number[]
  private targetPositions: number[]
  private liftAmount: number = 0.5
  private baseY: number

  constructor(count: number, height: number, spacing: number, baseY: number = 0) {
    this.count = count
    this.height = height
    this.spacing = spacing
    this.baseY = baseY

    this.dummy = new THREE.Object3D()
    this.currentPositions = new Array(count).fill(0)
    this.targetPositions = new Array(count).fill(0)

    const geometry = this.createThreadGeometry()
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.warp,
      metalness: 0.1,
      roughness: 0.8,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, count)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    this.initializePositions()
  }

  private createThreadGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(
      0.015,
      0.015,
      this.height,
      6,
      1,
      true
    )
    geometry.translate(0, this.height / 2, 0)
    return geometry
  }

  private initializePositions(): void {
    const totalWidth = (this.count - 1) * this.spacing
    const startX = -totalWidth / 2

    for (let i = 0; i < this.count; i++) {
      const x = startX + i * this.spacing

      this.dummy.position.set(x, this.baseY, 0)
      this.dummy.rotation.z = 0
      this.dummy.scale.set(1, 1, 1)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
  }

  update(rowPattern: boolean[], deltaTime: number, liftAmount?: number): void {
    if (liftAmount !== undefined) {
      this.liftAmount = liftAmount
    }

    for (let i = 0; i < this.count; i++) {
      const shouldLift = rowPattern[i] || false
      this.targetPositions[i] = shouldLift ? this.liftAmount : 0

      const smoothSpeed = 8 * deltaTime
      this.currentPositions[i] +=
        (this.targetPositions[i] - this.currentPositions[i]) * smoothSpeed
    }

    this.updateInstanceMatrices()
  }

  private updateInstanceMatrices(): void {
    const totalWidth = (this.count - 1) * this.spacing
    const startX = -totalWidth / 2

    for (let i = 0; i < this.count; i++) {
      const x = startX + i * this.spacing
      const zOffset = this.currentPositions[i]
      const tiltAngle = zOffset * 0.15

      this.dummy.position.set(x, this.baseY, zOffset)
      this.dummy.rotation.x = tiltAngle
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
  }

  setLiftAmount(amount: number): void {
    this.liftAmount = amount
  }

  getWarpZ(warpIndex: number): number {
    return this.currentPositions[warpIndex] || 0
  }

  getCount(): number {
    return this.count
  }

  getSpacing(): number {
    return this.spacing
  }

  getTotalWidth(): number {
    return (this.count - 1) * this.spacing
  }

  getStartX(): number {
    return -this.getTotalWidth() / 2
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
