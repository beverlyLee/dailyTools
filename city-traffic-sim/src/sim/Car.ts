import * as THREE from 'three'

export interface RoadNode {
  id: string
  x: number
  y: number
  lng: number
  lat: number
}

export interface RoadNetwork {
  nodes: Map<string, RoadNode>
  edges: [string, string][]
  adjacencyList: Map<string, string[]>
}

export class Car {
  position: THREE.Vector3
  direction: THREE.Vector3
  speed: number
  maxSpeed: number
  currentNodeId: string
  nextNodeId: string
  path: string[]
  color: THREE.Color
  carLength: number
  carWidth: number
  isWaiting: boolean

  constructor(startNodeId: string, roadNetwork: RoadNetwork, index: number) {
    const startNode = roadNetwork.nodes.get(startNodeId)!
    const neighbors = roadNetwork.adjacencyList.get(startNodeId)

    let initialDirection = new THREE.Vector3(1, 0, 0)
    if (neighbors && neighbors.length > 0) {
      const nextNodeId = neighbors[Math.floor(Math.random() * neighbors.length)]
      const nextNode = roadNetwork.nodes.get(nextNodeId)!
      initialDirection = new THREE.Vector3(
        nextNode.x - startNode.x,
        0,
        nextNode.y - startNode.y
      ).normalize()
    }

    const offsetDist = 0.3 + (index % 5) * 0.4
    this.position = new THREE.Vector3(
      startNode.x + initialDirection.x * offsetDist,
      0,
      startNode.y + initialDirection.z * offsetDist
    )
    this.direction = initialDirection.clone()
    this.speed = 0
    this.maxSpeed = 4 + Math.random() * 2
    this.currentNodeId = startNodeId
    this.nextNodeId = ''
    this.path = []
    this.color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
    this.carLength = 1.5
    this.carWidth = 0.8
    this.isWaiting = false

    this.planNextPath(roadNetwork, true)
  }

  planNextPath(roadNetwork: RoadNetwork, isFirstTime: boolean = false): void {
    const neighbors = roadNetwork.adjacencyList.get(this.currentNodeId)
    if (!neighbors || neighbors.length === 0) {
      this.nextNodeId = this.currentNodeId
      return
    }

    let validNeighbors = neighbors

    if (!isFirstTime && this.path.length > 0) {
      const previousNode = this.path[this.path.length - 2]
      if (previousNode) {
        const filtered = neighbors.filter(n => n !== previousNode)
        if (filtered.length > 0) {
          validNeighbors = filtered
        }
      }
    }

    this.nextNodeId = validNeighbors[Math.floor(Math.random() * validNeighbors.length)]
    this.path.push(this.nextNodeId)
  }

  update(
    deltaTime: number,
    roadNetwork: RoadNetwork,
    trafficLightStates: Map<string, 'red' | 'green'>,
    allCars: Car[]
  ): void {
    const currentNode = roadNetwork.nodes.get(this.currentNodeId)
    const nextNode = roadNetwork.nodes.get(this.nextNodeId)

    if (!currentNode || !nextNode) return

    const targetPos = new THREE.Vector3(nextNode.x, 0, nextNode.y)
    const dx = targetPos.x - this.position.x
    const dz = targetPos.z - this.position.z
    const distanceToNext = Math.sqrt(dx * dx + dz * dz)

    if (distanceToNext < 0.5) {
      this.currentNodeId = this.nextNodeId
      this.position.set(nextNode.x, 0, nextNode.y)
      this.planNextPath(roadNetwork)
      return
    }

    const shouldStopForCar = this.checkCarAhead(allCars)
    const shouldStopForLight = this.checkTrafficLight(currentNode, nextNode, trafficLightStates)

    if (shouldStopForCar || shouldStopForLight) {
      this.speed = Math.max(0, this.speed - deltaTime * 8)
      if (this.speed < 0.2) {
        this.speed = 0
        this.isWaiting = true
      }
      this.position.addScaledVector(this.direction, this.speed * deltaTime)
      return
    }

    this.isWaiting = false
    this.speed = Math.min(this.speed + deltaTime * 4, this.maxSpeed)

    const normalizedDir = new THREE.Vector3(dx / distanceToNext, 0, dz / distanceToNext)
    this.direction.lerp(normalizedDir, 0.1)
    this.direction.normalize()

    this.position.addScaledVector(this.direction, this.speed * deltaTime)

    this.snapToRoad(currentNode, nextNode)
  }

  snapToRoad(currentNode: RoadNode, nextNode: RoadNode): void {
    const roadVec = new THREE.Vector2(nextNode.x - currentNode.x, nextNode.y - currentNode.y)
    const roadLength = roadVec.length()

    if (roadLength < 0.001) return

    const roadDir = roadVec.normalize()
    const carVec = new THREE.Vector2(this.position.x - currentNode.x, this.position.z - currentNode.y)
    const projection = carVec.dot(roadDir)

    const clampedProjection = Math.max(0, Math.min(projection, roadLength))

    const perpendicular = new THREE.Vector2(-roadDir.y, roadDir.x)
    const offsetPt = new THREE.Vector2(
      carVec.x - (currentNode.x + roadDir.x * projection),
      carVec.y - (currentNode.y + roadDir.y * projection)
    )
    const lateralOffset = offsetPt.dot(perpendicular)

    const maxLateralOffset = 0.8
    if (Math.abs(lateralOffset) > maxLateralOffset) {
      const clampedOffset = Math.sign(lateralOffset) * maxLateralOffset
      this.position.x = currentNode.x + roadDir.x * clampedProjection + perpendicular.x * clampedOffset
      this.position.z = currentNode.y + roadDir.y * clampedProjection + perpendicular.y * clampedOffset
    }
  }

  checkCarAhead(allCars: Car[]): boolean {
    const lookAheadDistance = 3.0
    const aheadPos = this.position.clone().addScaledVector(this.direction, lookAheadDistance)

    for (const other of allCars) {
      if (other === this) continue

      const dx = other.position.x - aheadPos.x
      const dz = other.position.z - aheadPos.z
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance < 2.0) {
        return true
      }
    }
    return false
  }

  checkTrafficLight(
    currentNode: RoadNode,
    nextNode: RoadNode,
    trafficLightStates: Map<string, 'red' | 'green'>
  ): boolean {
    const lightId = `light_${nextNode.id}`
    const lightState = trafficLightStates.get(lightId)

    if (lightState === 'red') {
      const dx = nextNode.x - this.position.x
      const dz = nextNode.y - this.position.z
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance < 4 && distance > 0.5) {
        return true
      }
    }
    return false
  }
}

export class CarManager {
  cars: Car[]
  instancedMesh: THREE.InstancedMesh
  dummy: THREE.Object3D
  carCount: number
  roadNetwork: RoadNetwork

  constructor(scene: THREE.Scene, carCount: number, roadNetwork: RoadNetwork) {
    this.carCount = carCount
    this.roadNetwork = roadNetwork
    this.cars = []
    this.dummy = new THREE.Object3D()

    const nodeKeys = Array.from(roadNetwork.nodes.keys())
    for (let i = 0; i < carCount; i++) {
      const startNode = nodeKeys[i % nodeKeys.length]
      this.cars.push(new Car(startNode, roadNetwork, i))
    }

    const geometry = new THREE.BoxGeometry(0.8, 0.5, 1.5)
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff })
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, carCount)
    this.instancedMesh.castShadow = true
    scene.add(this.instancedMesh)

    this.updateInstances()
  }

  updateInstances(): void {
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i]
      this.dummy.position.copy(car.position)
      this.dummy.position.y = 0.25

      const angle = Math.atan2(car.direction.x, car.direction.z)
      this.dummy.rotation.set(0, angle, 0)

      this.dummy.updateMatrix()
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix)
      this.instancedMesh.setColorAt(i, car.color)
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true
    }
  }

  update(deltaTime: number, trafficLightStates: Map<string, 'red' | 'green'>): void {
    for (const car of this.cars) {
      car.update(deltaTime, this.roadNetwork, trafficLightStates, this.cars)
    }
    this.updateInstances()
  }

  getCarCount(): number {
    return this.carCount
  }
}

export function buildAdjacencyList(edges: [string, string][]): Map<string, string[]> {
  const adjacencyList = new Map<string, string[]>()

  for (const [a, b] of edges) {
    if (!adjacencyList.has(a)) {
      adjacencyList.set(a, [])
    }
    if (!adjacencyList.has(b)) {
      adjacencyList.set(b, [])
    }
    adjacencyList.get(a)!.push(b)
    adjacencyList.get(b)!.push(a)
  }

  return adjacencyList
}
