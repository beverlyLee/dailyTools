import * as THREE from 'three'

export interface LSystemRule {
  [key: string]: string
}

export interface CoralConfig {
  axiom: string
  rules: LSystemRule
  iterations: number
  angle: number
  length: number
  color: THREE.Color
  branchRadius: number
  type: 'branching' | 'brain'
  tropismStrength: number
}

export const CoralTypes: { [key: string]: CoralConfig } = {
  branchingOrange: {
    axiom: 'F',
    rules: {
      'F': 'F[+>F][-<F][&>F]'
    },
    iterations: 3,
    angle: 25,
    length: 0.8,
    color: new THREE.Color(0xff7f50),
    branchRadius: 0.08,
    type: 'branching',
    tropismStrength: 1.2
  },
  brainPink: {
    axiom: 'X',
    rules: {
      'X': 'F[+>X][-<X][&X]FX',
      'F': 'F'
    },
    iterations: 4,
    angle: 22,
    length: 0.5,
    color: new THREE.Color(0xff69b4),
    branchRadius: 0.1,
    type: 'brain',
    tropismStrength: 1.4
  },
  purpleStaghorn: {
    axiom: 'F',
    rules: {
      'F': 'FF[+<F][->F][&<F]'
    },
    iterations: 3,
    angle: 22,
    length: 0.6,
    color: new THREE.Color(0x9370db),
    branchRadius: 0.06,
    type: 'branching',
    tropismStrength: 1.0
  },
  greenMound: {
    axiom: 'X',
    rules: {
      'X': 'F[+>X][&<X]F[-<X]FX',
      'F': 'F'
    },
    iterations: 4,
    angle: 20,
    length: 0.35,
    color: new THREE.Color(0x98fb98),
    branchRadius: 0.12,
    type: 'brain',
    tropismStrength: 1.3
  },
  blueSeaFan: {
    axiom: 'F',
    rules: {
      'F': 'F[+>F][-<F][&>F][^<F]'
    },
    iterations: 3,
    angle: 28,
    length: 0.5,
    color: new THREE.Color(0x40e0d0),
    branchRadius: 0.05,
    type: 'branching',
    tropismStrength: 0.8
  }
}

class LSystem {
  private current: string
  private rules: LSystemRule

  constructor(axiom: string, rules: LSystemRule) {
    this.current = axiom
    this.rules = rules
  }

  iterate(n: number): string {
    for (let i = 0; i < n; i++) {
      this.current = this.expand()
    }
    return this.current
  }

  private expand(): string {
    let result = ''
    for (const char of this.current) {
      result += this.rules[char] || char
    }
    return result
  }
}

interface TurtleState {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  depth: number
}

const LOCAL_Z = new THREE.Vector3(0, 0, 1)
const LOCAL_X = new THREE.Vector3(1, 0, 0)
const LOCAL_Y = new THREE.Vector3(0, 1, 0)
const LIGHT_DIR = new THREE.Vector3(0, 1, 0).normalize()
const INITIAL_HEADING = new THREE.Vector3(0, 1, 0)

export class CoralBranch {
  private mesh: THREE.Group
  private config: CoralConfig
  private currentIteration: number = 0
  private targetIteration: number
  private growthProgress: number = 0
  private isGrowing: boolean = true

  constructor(config: CoralConfig, startIteration: number = 0) {
    this.config = config
    this.targetIteration = config.iterations
    this.currentIteration = startIteration
    this.mesh = new THREE.Group()
    this.buildCoral()
  }

  getMesh(): THREE.Group {
    return this.mesh
  }

  update(deltaTime: number): void {
    if (!this.isGrowing) return

    this.growthProgress += deltaTime * 0.3

    if (this.growthProgress >= 1) {
      this.growthProgress = 0
      if (this.currentIteration < this.targetIteration) {
        this.currentIteration++
        this.buildCoral()
      } else {
        this.isGrowing = false
      }
    }

    const scale = 0.5 + 0.5 * this.growthProgress
    this.mesh.scale.setScalar(scale)
  }

  resetGrowth(): void {
    this.currentIteration = 0
    this.growthProgress = 0
    this.isGrowing = true
    this.buildCoral()
  }

  private buildCoral(): void {
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0]
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
      this.mesh.remove(child)
    }

    if (this.currentIteration === 0) return

    const lsystem = new LSystem(this.config.axiom, this.config.rules)
    const instructions = lsystem.iterate(this.currentIteration)

    const turtle: TurtleState = {
      position: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      depth: 0
    }

    const initialTiltX = (Math.random() - 0.5) * Math.PI * 0.4
    const initialTiltZ = (Math.random() - 0.5) * Math.PI * 0.4
    const initialRotY = Math.random() * Math.PI * 2
    const tiltX = new THREE.Quaternion().setFromAxisAngle(LOCAL_X, initialTiltX)
    const tiltZ = new THREE.Quaternion().setFromAxisAngle(LOCAL_Z, initialTiltZ)
    const rotY = new THREE.Quaternion().setFromAxisAngle(LOCAL_Y, initialRotY)
    turtle.quaternion.multiply(tiltX).multiply(tiltZ).multiply(rotY).normalize()

    const stack: TurtleState[] = []
    const angleRad = (this.config.angle * Math.PI) / 180

    for (const cmd of instructions) {
      switch (cmd) {
        case 'F':
        case 'X':
          this.applyTropism(turtle)
          this.drawBranch(turtle)
          break
        case '+':
          this.rotateLocal(turtle, LOCAL_Z, angleRad)
          break
        case '-':
          this.rotateLocal(turtle, LOCAL_Z, -angleRad)
          break
        case '&':
          this.rotateLocal(turtle, LOCAL_X, angleRad)
          break
        case '^':
          this.rotateLocal(turtle, LOCAL_X, -angleRad)
          break
        case '<':
          this.rotateLocal(turtle, LOCAL_Y, angleRad)
          break
        case '>':
          this.rotateLocal(turtle, LOCAL_Y, -angleRad)
          break
        case '[':
          stack.push({
            position: turtle.position.clone(),
            quaternion: turtle.quaternion.clone(),
            depth: turtle.depth
          })
          turtle.depth++
          this.applyBranchingDivergence(turtle)
          break
        case ']':
          const state = stack.pop()
          if (state) {
            turtle.position.copy(state.position)
            turtle.quaternion.copy(state.quaternion)
            turtle.depth = state.depth
          }
          break
      }
    }
  }

  private rotateLocal(turtle: TurtleState, axis: THREE.Vector3, angle: number): void {
    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle)
    turtle.quaternion.multiply(rotation)
    turtle.quaternion.normalize()
  }

  private applyBranchingDivergence(turtle: TurtleState): void {
    const randomYAngle = (Math.random() - 0.5) * Math.PI * 0.5
    const randomXAngle = (Math.random() - 0.5) * Math.PI * 0.15
    const yRotation = new THREE.Quaternion().setFromAxisAngle(LOCAL_Y, randomYAngle)
    const xRotation = new THREE.Quaternion().setFromAxisAngle(LOCAL_X, randomXAngle)
    turtle.quaternion.multiply(yRotation)
    turtle.quaternion.multiply(xRotation)
    turtle.quaternion.normalize()
  }

  private applyTropism(turtle: TurtleState): void {
    const heading = INITIAL_HEADING.clone().applyQuaternion(turtle.quaternion)

    const dot = heading.dot(LIGHT_DIR)
    const deviation = 1 - dot

    if (deviation < 0.001) return

    const axis = new THREE.Vector3().crossVectors(heading, LIGHT_DIR)
    const axisLength = axis.length()

    if (axisLength < 0.001) return

    axis.normalize()

    const depthFactor = 0.3 + 0.7 * Math.min(turtle.depth * 0.5, 1)
    const tropismAngle = this.config.tropismStrength * deviation * (0.5 + 0.5 * deviation) * depthFactor

    const correction = new THREE.Quaternion().setFromAxisAngle(axis, tropismAngle)

    turtle.quaternion.premultiply(correction)
    turtle.quaternion.normalize()
  }

  private drawBranch(turtle: TurtleState): void {
    const heading = INITIAL_HEADING.clone().applyQuaternion(turtle.quaternion)
    const dot = heading.dot(LIGHT_DIR)
    const deviation = 1 - Math.max(dot, -1)

    const length = this.config.length * (0.7 + Math.random() * 0.3)
    const endPos = turtle.position.clone().add(heading.clone().multiplyScalar(length))

    const bendDepthFactor = 0.5 + 0.5 * Math.min(turtle.depth * 0.5, 1)
    const branchGeometry = this.createBranchGeometry(turtle.position, endPos, turtle.depth, deviation * bendDepthFactor)
    const material = new THREE.MeshLambertMaterial({
      color: this.config.color,
      flatShading: true
    })

    const branch = new THREE.Mesh(branchGeometry, material)
    branch.castShadow = true
    branch.receiveShadow = true
    this.mesh.add(branch)

    if (this.config.type === 'brain' && turtle.depth > 0) {
      this.addPolyps(endPos, turtle.depth)
    }

    turtle.position.copy(endPos)
  }

  private createBranchGeometry(start: THREE.Vector3, end: THREE.Vector3, depth: number, deviation: number): THREE.BufferGeometry {
    const mid = start.clone().add(end).multiplyScalar(0.5)

    const bendAmount = deviation * this.config.length * 0.8
    mid.y += bendAmount

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    const points = curve.getPoints(12)

    const radius = this.config.branchRadius * Math.pow(0.65, depth)
    const clampedRadius = Math.max(radius, 0.01)
    const variation = 0.6 + Math.random() * 0.4

    const geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      12,
      clampedRadius * variation,
      8,
      false
    )

    return geometry
  }

  private addPolyps(position: THREE.Vector3, depth: number): void {
    const polypCount = 2 + Math.floor(Math.random() * 3)

    for (let i = 0; i < polypCount; i++) {
      const polypRadius = Math.max(this.config.branchRadius * 0.4 * Math.pow(0.65, depth), 0.005)
      const polypGeometry = new THREE.SphereGeometry(polypRadius, 4, 4)

      const polypColor = this.config.color.clone()
      polypColor.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.1)

      const material = new THREE.MeshLambertMaterial({
        color: polypColor,
        flatShading: true
      })

      const polyp = new THREE.Mesh(polypGeometry, material)
      const angle = Math.random() * Math.PI * 2
      const offsetRadius = this.config.branchRadius * 0.8 * Math.pow(0.65, depth)

      polyp.position.set(
        position.x + Math.cos(angle) * offsetRadius,
        position.y + (Math.random() - 0.5) * 0.1,
        position.z + Math.sin(angle) * offsetRadius
      )

      this.mesh.add(polyp)
    }
  }
}
