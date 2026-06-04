import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export class PaperPlane {
  mesh: THREE.Group
  body: CANNON.Body

  constructor() {
    this.mesh = this.createMesh()
    this.body = this.createBody()
  }

  private createMesh(): THREE.Group {
    const group = new THREE.Group()

    const topMat = new THREE.MeshPhongMaterial({
      color: 0xf5f0e8,
      side: THREE.FrontSide,
      flatShading: true,
      shininess: 15,
      specular: 0x555555,
    })

    const bottomMat = new THREE.MeshPhongMaterial({
      color: 0xe0d8c8,
      side: THREE.FrontSide,
      flatShading: true,
      shininess: 8,
      specular: 0x333333,
    })

    const foldMat = new THREE.MeshPhongMaterial({
      color: 0xd8d0c0,
      side: THREE.FrontSide,
      flatShading: true,
      shininess: 25,
      specular: 0x666666,
    })

    const noseX = 2.2
    const midX = 0.2
    const tailX = -1.4
    const keelMidY = 0.12
    const keelTailY = 0.08
    const wingSpanZ = 1.3
    const wingTipDroop = -0.18
    const bodyHalfZ = 0.06
    const bodyThickness = 0.04

    const leftWingTop = this.createLeftWingTop(noseX, midX, tailX, keelMidY, keelTailY, wingSpanZ, wingTipDroop)
    group.add(new THREE.Mesh(leftWingTop, topMat))

    const rightWingTop = this.createRightWingTop(noseX, midX, tailX, keelMidY, keelTailY, wingSpanZ, wingTipDroop)
    group.add(new THREE.Mesh(rightWingTop, topMat))

    const leftWingBottom = this.createLeftWingBottom(noseX, midX, tailX, keelMidY, wingSpanZ, wingTipDroop)
    group.add(new THREE.Mesh(leftWingBottom, bottomMat))

    const rightWingBottom = this.createRightWingBottom(noseX, midX, tailX, keelMidY, wingSpanZ, wingTipDroop)
    group.add(new THREE.Mesh(rightWingBottom, bottomMat))

    const keelLeft = this.createKeelLeft(noseX, midX, tailX, keelMidY, keelTailY, bodyHalfZ)
    group.add(new THREE.Mesh(keelLeft, foldMat))

    const keelRight = this.createKeelRight(noseX, midX, tailX, keelMidY, keelTailY, bodyHalfZ)
    group.add(new THREE.Mesh(keelRight, foldMat))

    const keelBottom = this.createKeelBottom(noseX, midX, tailX, keelMidY, keelTailY, bodyThickness)
    group.add(new THREE.Mesh(keelBottom, bottomMat))

    const tailFin = this.createTailFin(tailX, keelTailY)
    group.add(new THREE.Mesh(tailFin, foldMat))

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    group.scale.set(0.55, 0.55, 0.55)

    return group
  }

  private createLeftWingTop(
    noseX: number, midX: number, tailX: number,
    keelMidY: number, keelTailY: number,
    wingSpanZ: number, wingTipDroop: number
  ): THREE.BufferGeometry {
    const vertices = new Float32Array([
      noseX, 0, 0,
      midX, keelMidY, 0,
      midX, keelMidY * 0.3, wingSpanZ,
      tailX, keelTailY, 0,
      tailX, keelTailY * 0.2, wingSpanZ * 0.85,
      noseX, 0, 0,
      midX, keelMidY * 0.3, wingSpanZ,
      noseX, wingTipDroop * 0.3, wingSpanZ * 0.6,
    ])
    const indices = [
      0, 1, 2,
      1, 3, 4,
      1, 4, 2,
      5, 6, 7,
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  private createRightWingTop(
    noseX: number, midX: number, tailX: number,
    keelMidY: number, keelTailY: number,
    wingSpanZ: number, wingTipDroop: number
  ): THREE.BufferGeometry {
    const vertices = new Float32Array([
      noseX, 0, 0,
      midX, keelMidY, 0,
      midX, keelMidY * 0.3, -wingSpanZ,
      tailX, keelTailY, 0,
      tailX, keelTailY * 0.2, -wingSpanZ * 0.85,
      noseX, 0, 0,
      midX, keelMidY * 0.3, -wingSpanZ,
      noseX, wingTipDroop * 0.3, -wingSpanZ * 0.6,
    ])
    const indices = [
      0, 2, 1,
      1, 4, 3,
      1, 2, 4,
      5, 7, 6,
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  private createLeftWingBottom(
    noseX: number, midX: number, tailX: number,
    _keelMidY: number, wingSpanZ: number, _wingTipDroop: number
  ): THREE.BufferGeometry {
    const bY = -0.02
    const vertices = new Float32Array([
      noseX, bY, 0,
      midX, bY, wingSpanZ,
      midX, bY, 0,
      tailX, bY, wingSpanZ * 0.85,
      tailX, bY, 0,
      noseX, bY, wingSpanZ * 0.6,
    ])
    const indices = [
      0, 1, 2,
      2, 1, 3,
      2, 3, 4,
      0, 5, 1,
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  private createRightWingBottom(
    noseX: number, midX: number, tailX: number,
    _keelMidY: number, wingSpanZ: number, _wingTipDroop: number
  ): THREE.BufferGeometry {
    const bY = -0.02
    const vertices = new Float32Array([
      noseX, bY, 0,
      midX, bY, -wingSpanZ,
      midX, bY, 0,
      tailX, bY, -wingSpanZ * 0.85,
      tailX, bY, 0,
      noseX, bY, -wingSpanZ * 0.6,
    ])
    const indices = [
      0, 2, 1,
      2, 3, 1,
      2, 4, 3,
      0, 1, 5,
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  private createKeelLeft(
    noseX: number, midX: number, tailX: number,
    keelMidY: number, keelTailY: number, bodyHalfZ: number
  ): THREE.BufferGeometry {
    const bY = -0.02
    const vertices = new Float32Array([
      noseX, 0, 0,
      midX, keelMidY, 0,
      midX, keelMidY, bodyHalfZ,
      noseX, 0, bodyHalfZ,
      tailX, keelTailY, 0,
      tailX, keelTailY, bodyHalfZ,
      noseX, bY, 0,
      midX, bY, bodyHalfZ,
      tailX, bY, bodyHalfZ,
    ])
    const indices = [
      0, 1, 2,
      0, 2, 3,
      1, 4, 5,
      1, 5, 2,
      0, 3, 6,
      6, 3, 7,
      3, 5, 7,
      7, 5, 8,
      6, 7, 8,
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  private createKeelRight(
    noseX: number, midX: number, tailX: number,
    keelMidY: number, keelTailY: number, bodyHalfZ: number
  ): THREE.BufferGeometry {
    const bY = -0.02
    const vertices = new Float32Array([
      noseX, 0, 0,
      midX, keelMidY, -bodyHalfZ,
      midX, keelMidY, 0,
      noseX, 0, -bodyHalfZ,
      tailX, keelTailY, -bodyHalfZ,
      tailX, keelTailY, 0,
      noseX, bY, 0,
      midX, bY, -bodyHalfZ,
      tailX, bY, -bodyHalfZ,
    ])
    const indices = [
      0, 2, 1,
      0, 1, 3,
      1, 2, 5,
      1, 5, 4,
      0, 6, 3,
      6, 7, 3,
      3, 7, 4,
      7, 8, 4,
      6, 8, 7,
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  private createKeelBottom(
    noseX: number, midX: number, tailX: number,
    _keelMidY: number, _keelTailY: number, _bodyThickness: number
  ): THREE.BufferGeometry {
    const bY = -0.02
    const vertices = new Float32Array([
      noseX, bY, 0,
      midX, bY, 0,
      tailX, bY, 0,
    ])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.computeVertexNormals()
    return geo
  }

  private createTailFin(tailX: number, keelTailY: number): THREE.BufferGeometry {
    const finH = 0.25
    const vertices = new Float32Array([
      tailX + 0.5, keelTailY, 0,
      tailX, keelTailY + finH, 0,
      tailX, keelTailY, 0,
    ])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.computeVertexNormals()
    return geo
  }

  private createBody(): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0.8,
      linearDamping: 0.01,
      angularDamping: 0.3,
    })

    const mainShape = new CANNON.Box(new CANNON.Vec3(0.8, 0.06, 0.5))
    body.addShape(mainShape, new CANNON.Vec3(0, 0, 0))

    const noseShape = new CANNON.Box(new CANNON.Vec3(0.35, 0.03, 0.15))
    body.addShape(noseShape, new CANNON.Vec3(0.95, 0, 0))

    body.position.set(0, 10, 0)
    body.quaternion.setFromEuler(0, 0, 0)
    body.type = CANNON.Body.STATIC

    return body
  }

  sync() {
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    )
    this.mesh.quaternion.set(
      this.body.quaternion.x,
      this.body.quaternion.y,
      this.body.quaternion.z,
      this.body.quaternion.w
    )
  }

  reset(pos: CANNON.Vec3, vel: CANNON.Vec3, pitchAngleRad: number, dynamic: boolean = false) {
    this.body.position.copy(pos)
    this.body.velocity.copy(vel)
    this.body.angularVelocity.set(0, 0, 0)
    this.body.force.set(0, 0, 0)
    this.body.torque.set(0, 0, 0)
    this.body.type = dynamic ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC
    const pitchAxis = new CANNON.Vec3(0, 0, 1)
    this.body.quaternion.setFromAxisAngle(pitchAxis, pitchAngleRad)
    this.sync()
  }

  setDynamic() {
    this.body.type = CANNON.Body.DYNAMIC
  }

  setStatic() {
    this.body.type = CANNON.Body.STATIC
  }

  stop() {
    this.body.velocity.set(0, 0, 0)
    this.body.angularVelocity.set(0, 0, 0)
    this.body.force.set(0, 0, 0)
    this.body.torque.set(0, 0, 0)
    this.body.type = CANNON.Body.STATIC
  }

  isOnGround(): boolean {
    return this.body.position.y < 0.2
  }
}
