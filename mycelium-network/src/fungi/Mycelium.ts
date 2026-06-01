import * as THREE from 'three'

export interface HyphaNode {
  position: THREE.Vector3
  connections: number[]
  treeId?: number
}

export interface HyphaConnection {
  start: number
  end: number
}

export interface Pulse {
  connectionIndex: number
  progress: number
  speed: number
  color: THREE.Color
  size: number
}

export class Mycelium {
  private scene: THREE.Scene
  private nodes: HyphaNode[] = []
  private connections: HyphaConnection[] = []
  private pulses: Pulse[] = []
  private treeRootIndices: Map<number, number> = new Map()
  private lineSegments: THREE.LineSegments | null = null
  private lineMaterial: THREE.LineBasicMaterial

  private pulseParticles: THREE.Points | null = null
  private pulseGeometry: THREE.BufferGeometry | null = null
  private pulseMaterial: THREE.PointsMaterial | null = null
  private pulsePositionBuffer: Float32Array | null = null
  private pulseColorBuffer: Float32Array | null = null
  private readonly MAX_PULSES = 500

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: false,
      opacity: 1.0
    })

    this.initPulseParticles()
  }

  private initPulseParticles(): void {
    this.pulsePositionBuffer = new Float32Array(this.MAX_PULSES * 3)
    this.pulseColorBuffer = new Float32Array(this.MAX_PULSES * 3)

    this.pulseGeometry = new THREE.BufferGeometry()
    this.pulseGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.pulsePositionBuffer, 3)
    )
    this.pulseGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.pulseColorBuffer, 3)
    )
    this.pulseGeometry.setDrawRange(0, 0)

    this.pulseMaterial = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.pulseParticles = new THREE.Points(this.pulseGeometry, this.pulseMaterial)
    this.scene.add(this.pulseParticles)
  }

  generateNetwork(treePositions: THREE.Vector3[], spreadRadius: number = 8): void {
    this.nodes = []
    this.connections = []

    if (this.lineSegments) {
      this.scene.remove(this.lineSegments)
      this.lineSegments.geometry.dispose()
      this.lineSegments = null
    }

    this.treeRootIndices.clear()

    treePositions.forEach((pos, treeId) => {
      const rootNodeIdx = this.nodes.length
      this.nodes.push({
        position: pos.clone().setY(-0.1),
        connections: [],
        treeId
      })
      this.treeRootIndices.set(treeId, rootNodeIdx)

      this.growFractalHyphae(rootNodeIdx, 4, spreadRadius * 0.5, 0)
    })

    this.connectNearbyTrees()
    this.createMergedLineSegments()
  }

  private growFractalHyphae(
    startNodeIdx: number,
    depth: number,
    length: number,
    currentDepth: number
  ): void {
    if (currentDepth >= depth || length < 0.3) return

    const startNode = this.nodes[startNodeIdx]
    const branches = currentDepth === 0 ? 5 : 2 + Math.floor(Math.random() * 2)

    for (let i = 0; i < branches; i++) {
      const angle = (i / branches) * Math.PI * 2 + Math.random() * 0.8
      const spreadFactor = 0.5 + Math.random() * 0.5
      const newLength = length * spreadFactor

      const dir = new THREE.Vector3(
        Math.cos(angle) + (Math.random() - 0.5) * 0.3,
        -0.02 - Math.random() * 0.05,
        Math.sin(angle) + (Math.random() - 0.5) * 0.3
      ).normalize()

      const newPos = startNode.position.clone().add(dir.multiplyScalar(newLength))

      const newNodeIdx = this.nodes.length
      this.nodes.push({
        position: newPos,
        connections: [startNodeIdx]
      })

      startNode.connections.push(newNodeIdx)

      this.growFractalHyphae(newNodeIdx, depth, newLength * 0.7, currentDepth + 1)
    }
  }

  private connectNearbyTrees(): void {
    const treeIndices = Array.from(this.treeRootIndices.values())

    for (let i = 0; i < treeIndices.length; i++) {
      for (let j = i + 1; j < treeIndices.length; j++) {
        const idxA = treeIndices[i]
        const idxB = treeIndices[j]
        const posA = this.nodes[idxA].position
        const posB = this.nodes[idxB].position

        const dist = posA.distanceTo(posB)

        if (dist < 15) {
          this.connectNodesWithPath(idxA, idxB)
        }
      }
    }

    this.supplementConnections()
  }

  private connectNodesWithPath(fromIdx: number, toIdx: number): void {
    const fromPos = this.nodes[fromIdx].position
    const toPos = this.nodes[toIdx].position
    const dist = fromPos.distanceTo(toPos)

    const steps = Math.floor(dist / 1.5)
    let currentIdx = fromIdx

    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1)
      const midPos = new THREE.Vector3().lerpVectors(fromPos, toPos, t)

      midPos.y = -0.1 - Math.sin(t * Math.PI) * 0.2
      midPos.x += (Math.random() - 0.5) * 0.5
      midPos.z += (Math.random() - 0.5) * 0.5

      const newIdx = this.nodes.length
      this.nodes.push({
        position: midPos,
        connections: [currentIdx]
      })

      this.nodes[currentIdx].connections.push(newIdx)
      currentIdx = newIdx
    }

    this.nodes[currentIdx].connections.push(toIdx)
    this.nodes[toIdx].connections.push(currentIdx)
  }

  private supplementConnections(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      if (node.treeId !== undefined) continue

      let nearestDist = Infinity
      let nearestIdx = -1

      for (let j = 0; j < this.nodes.length; j++) {
        if (i === j || node.connections.includes(j)) continue

        const dist = node.position.distanceTo(this.nodes[j].position)
        if (dist < 2.5 && dist < nearestDist) {
          nearestDist = dist
          nearestIdx = j
        }
      }

      if (nearestIdx >= 0 && Math.random() > 0.7) {
        node.connections.push(nearestIdx)
        this.nodes[nearestIdx].connections.push(i)
      }
    }
  }

  private createMergedLineSegments(): void {
    if (this.lineSegments) {
      this.scene.remove(this.lineSegments)
      this.lineSegments.geometry.dispose()
    }

    const visited = new Set<string>()
    this.connections = []

    const vertices: number[] = []

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]

      for (const connIdx of node.connections) {
        const key = `${Math.min(i, connIdx)}-${Math.max(i, connIdx)}`
        if (visited.has(key)) continue
        visited.add(key)

        vertices.push(
          node.position.x, node.position.y, node.position.z,
          this.nodes[connIdx].position.x, this.nodes[connIdx].position.y, this.nodes[connIdx].position.z
        )

        this.connections.push({
          start: i,
          end: connIdx
        })
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))

    this.lineSegments = new THREE.LineSegments(geometry, this.lineMaterial)
    this.scene.add(this.lineSegments)
  }

  triggerPulse(fromTreeId: number): void {
    const rootIdx = this.treeRootIndices.get(fromTreeId)
    if (rootIdx === undefined) return

    const visited = new Set<number>()
    const queue: { nodeIdx: number; time: number }[] = []

    queue.push({ nodeIdx: rootIdx, time: 0 })
    visited.add(rootIdx)

    while (queue.length > 0) {
      const current = queue.shift()!

      for (const connIdx of this.nodes[current.nodeIdx].connections) {
        if (visited.has(connIdx)) continue
        visited.add(connIdx)

        const connectionIdx = this.findConnectionIndex(current.nodeIdx, connIdx)
        if (connectionIdx >= 0) {
          const dist = this.nodes[current.nodeIdx].position.distanceTo(
            this.nodes[connIdx].position
          )

          setTimeout(() => {
            if (this.pulses.length < this.MAX_PULSES) {
              this.pulses.push({
                connectionIndex: connectionIdx,
                progress: 0,
                speed: 0.015 + Math.random() * 0.01,
                color: new THREE.Color().setHSL(0.25 + Math.random() * 0.15, 1.0, 0.85),
                size: 0.12
              })
            }
          }, current.time * 100)

          queue.push({
            nodeIdx: connIdx,
            time: current.time + dist * 0.3
          })
        }
      }
    }
  }

  private findConnectionIndex(nodeA: number, nodeB: number): number {
    return this.connections.findIndex(
      c =>
        (c.start === nodeA && c.end === nodeB) ||
        (c.start === nodeB && c.end === nodeA)
    )
  }

  update(deltaTime: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]
      pulse.progress += pulse.speed * deltaTime * 60

      if (pulse.progress >= 1) {
        this.pulses.splice(i, 1)
      }
    }

    this.updatePulseParticlesBuffer()
  }

  private updatePulseParticlesBuffer(): void {
    if (!this.pulsePositionBuffer || !this.pulseColorBuffer || !this.pulseGeometry) return

    const activeCount = Math.min(this.pulses.length, this.MAX_PULSES)

    for (let i = 0; i < activeCount; i++) {
      const pulse = this.pulses[i]
      const conn = this.connections[pulse.connectionIndex]
      if (!conn) continue

      const startPos = this.nodes[conn.start].position
      const endPos = this.nodes[conn.end].position

      const t = pulse.progress
      const i3 = i * 3

      this.pulsePositionBuffer[i3] = startPos.x + (endPos.x - startPos.x) * t
      this.pulsePositionBuffer[i3 + 1] = startPos.y + (endPos.y - startPos.y) * t
      this.pulsePositionBuffer[i3 + 2] = startPos.z + (endPos.z - startPos.z) * t

      this.pulseColorBuffer[i3] = pulse.color.r
      this.pulseColorBuffer[i3 + 1] = pulse.color.g
      this.pulseColorBuffer[i3 + 2] = pulse.color.b
    }

    const positionAttr = this.pulseGeometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = this.pulseGeometry.getAttribute('color') as THREE.BufferAttribute

    positionAttr.needsUpdate = true
    colorAttr.needsUpdate = true

    this.pulseGeometry.setDrawRange(0, activeCount)
  }

  getConnectionCount(): number {
    return this.connections.length
  }

  dispose(): void {
    if (this.lineSegments) {
      this.lineSegments.geometry.dispose()
    }
    this.lineMaterial.dispose()

    if (this.pulseGeometry) {
      this.pulseGeometry.dispose()
    }
    if (this.pulseMaterial) {
      this.pulseMaterial.dispose()
    }
  }
}
