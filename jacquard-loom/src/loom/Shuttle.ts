import * as THREE from 'three'
import { COLORS } from '../types'

export class Shuttle {
  private group: THREE.Group
  private currentX: number
  private targetX: number
  private shuttleY: number
  private shuttleZ: number
  private speed: number
  private moving: boolean
  private weftThread: THREE.Mesh | null
  private weftStartX: number
  private direction: 1 | -1

  constructor(weftColor: string = COLORS.weft, speed: number = 12) {
    this.group = new THREE.Group()
    this.currentX = -6
    this.targetX = -6
    this.shuttleY = 1.5
    this.shuttleZ = 0.25
    this.speed = speed
    this.moving = false
    this.weftThread = null
    this.weftStartX = -6
    this.direction = 1

    this.createShuttleModel(weftColor)
    this.group.position.set(this.currentX, this.shuttleY, this.shuttleZ)
  }

  private createShuttleModel(weftColor: string): void {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.wood,
      metalness: 0.1,
      roughness: 0.7,
    })

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.brass,
      metalness: 0.9,
      roughness: 0.2,
    })

    const bodyLength = 0.8
    const bodyWidth = 0.2
    const bodyHeight = 0.25

    const bodyGeometry = new THREE.BoxGeometry(bodyLength, bodyHeight, bodyWidth)
    const body = new THREE.Mesh(bodyGeometry, woodMaterial)
    this.group.add(body)

    const tipGeometry = new THREE.ConeGeometry(bodyWidth / 2, 0.3, 8)
    const tipLeft = new THREE.Mesh(tipGeometry, metalMaterial)
    tipLeft.rotation.z = Math.PI / 2
    tipLeft.position.x = -bodyLength / 2 - 0.15
    this.group.add(tipLeft)

    const tipRight = new THREE.Mesh(tipGeometry, metalMaterial)
    tipRight.rotation.z = -Math.PI / 2
    tipRight.position.x = bodyLength / 2 + 0.15
    this.group.add(tipRight)

    const bobbinGeometry = new THREE.CylinderGeometry(0.08, 0.08, bodyWidth * 0.9, 12)
    const bobbinMaterial = new THREE.MeshStandardMaterial({
      color: weftColor,
      metalness: 0.0,
      roughness: 0.9,
    })
    const bobbin = new THREE.Mesh(bobbinGeometry, bobbinMaterial)
    bobbin.rotation.x = Math.PI / 2
    bobbin.position.y = 0.05
    this.group.add(bobbin)

    const eyeletGeometry = new THREE.TorusGeometry(0.04, 0.01, 6, 12)
    const eyelet = new THREE.Mesh(eyeletGeometry, metalMaterial)
    eyelet.rotation.y = Math.PI / 2
    eyelet.position.x = bodyLength / 2 + 0.05
    this.group.add(eyelet)
  }

  moveTo(targetX: number, direction: 1 | -1 = 1): void {
    this.targetX = targetX
    this.weftStartX = this.currentX
    this.moving = true
    this.direction = direction
    this.removeWeftThread()
  }

  update(deltaTime: number): boolean {
    if (!this.moving) return false

    const moveAmount = this.speed * deltaTime
    const distance = this.targetX - this.currentX

    if (Math.abs(distance) <= moveAmount) {
      this.currentX = this.targetX
      this.moving = false
      this.group.position.x = this.currentX
      this.removeWeftThread()
      return true
    }

    const move = Math.sign(distance) * moveAmount
    this.currentX += move
    this.group.position.x = this.currentX

    const bobOffset = Math.sin(deltaTime * 30) * 0.01
    this.group.position.y = this.shuttleY + bobOffset
    this.group.rotation.z = Math.sin(deltaTime * 20) * 0.02

    this.updateWeftThread()

    return false
  }

  private updateWeftThread(): void {
    if (!this.weftThread) {
      this.createWeftThread()
    }

    if (this.weftThread) {
      const weftLength = Math.abs(this.currentX - this.weftStartX)
      const midX = (this.currentX + this.weftStartX) / 2

      this.weftThread.scale.x = weftLength
      this.weftThread.position.x = midX
    }
  }

  private createWeftThread(): void {
    const weftGeometry = new THREE.BoxGeometry(1, 0.02, 0.01)
    const weftMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.weft,
      metalness: 0.0,
      roughness: 0.9,
    })
    this.weftThread = new THREE.Mesh(weftGeometry, weftMaterial)
    this.weftThread.position.y = this.shuttleY - 0.05
    this.weftThread.position.z = this.shuttleZ - 0.05
    this.group.parent?.add(this.weftThread)
  }

  private removeWeftThread(): void {
    if (this.weftThread && this.weftThread.parent) {
      this.weftThread.parent.remove(this.weftThread)
      this.weftThread.geometry.dispose()
      ;(this.weftThread.material as THREE.Material).dispose()
      this.weftThread = null
    }
  }

  setZPosition(z: number): void {
    this.shuttleZ = z
    this.group.position.z = z
  }

  setSpeed(speed: number): void {
    this.speed = speed
  }

  getPosition(): THREE.Vector3 {
    return this.group.position.clone()
  }

  getDirection(): 1 | -1 {
    return this.direction
  }

  isMoving(): boolean {
    return this.moving
  }

  getMesh(): THREE.Group {
    return this.group
  }

  dispose(): void {
    this.removeWeftThread()
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }
}
