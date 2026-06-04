import * as THREE from 'three'
import type { NeuronData, AxonConnection } from './NeuronCell'

export interface ImpulseParticle {
  id: number
  fromNeuronId: number
  toNeuronId: number
  progress: number
  speed: number
  active: boolean
  path: THREE.Vector3[]
  trail: THREE.Vector3[]
}

export interface ActivationEvent {
  neuronId: number
  startTime: number
  duration: number
}

export class ImpulseSystem {
  particles: ImpulseParticle[]
  particleMesh: THREE.Points
  particleGeometry: THREE.BufferGeometry
  particleMaterial: THREE.PointsMaterial
  activations: Map<number, ActivationEvent>
  maxParticles: number
  impulseSpeed: number
  maxDepth: number
  particleIdCounter: number
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array

  constructor(maxParticles: number = 1000) {
    this.maxParticles = maxParticles
    this.particles = []
    this.activations = new Map()
    this.impulseSpeed = 15
    this.maxDepth = 3
    this.particleIdCounter = 0

    this.positions = new Float32Array(maxParticles * 3)
    this.colors = new Float32Array(maxParticles * 3)
    this.sizes = new Float32Array(maxParticles)

    this.particleGeometry = new THREE.BufferGeometry()
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial)
    this.particleMesh.frustumCulled = false
  }

  triggerImpulse(startNeuronId: number, network: NeuronData[], connections: AxonConnection[]): void {
    this.clearAll()

    this.activations.set(startNeuronId, {
      neuronId: startNeuronId,
      startTime: performance.now(),
      duration: 450
    })

    const startNeuron = network[startNeuronId]
    if (!startNeuron) return

    startNeuron.activation = 1

    for (const targetId of startNeuron.connections) {
      this.createParticle(startNeuronId, targetId, network, connections, 1)
    }
  }

  private createParticle(
    fromId: number,
    toId: number,
    network: NeuronData[],
    connections: AxonConnection[],
    depth: number
  ): void {
    if (depth > this.maxDepth) return
    if (this.particles.length >= this.maxParticles) return

    const fromNeuron = network[fromId]
    const toNeuron = network[toId]
    if (!fromNeuron || !toNeuron) return

    const connection = connections.find(c => c.from === fromId && c.to === toId)
    if (!connection) return

    const path = this.generateCurvedPath(
      fromNeuron.position,
      toNeuron.position
    )

    const particle: ImpulseParticle = {
      id: this.particleIdCounter++,
      fromNeuronId: fromId,
      toNeuronId: toId,
      progress: 0,
      speed: this.impulseSpeed * (0.85 + Math.random() * 0.3),
      active: true,
      path,
      trail: []
    }

    this.particles.push(particle)
  }

  private generateCurvedPath(start: THREE.Vector3, end: THREE.Vector3, segments: number = 10): THREE.Vector3[] {
    const path: THREE.Vector3[] = []
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    
    const direction = new THREE.Vector3().subVectors(end, start)
    const normal = new THREE.Vector3(direction.y, -direction.x, direction.z * 0.5).normalize()
    const distance = start.distanceTo(end)
    const curveAmount = distance * 0.12
    normal.multiplyScalar(curveAmount * (Math.random() > 0.5 ? 1 : -1))
    midPoint.add(normal)

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const t2 = t * t
      const mt = 1 - t
      const mt2 = mt * mt

      const point = new THREE.Vector3()
      point.x = mt2 * start.x + 2 * mt * t * midPoint.x + t2 * end.x
      point.y = mt2 * start.y + 2 * mt * t * midPoint.y + t2 * end.y
      point.z = mt2 * start.z + 2 * mt * t * midPoint.z + t2 * end.z

      path.push(point)
    }

    return path
  }

  update(
    deltaTime: number,
    network: NeuronData[],
    connections: AxonConnection[],
    updateNeuronActivation: (index: number, activation: number) => void,
    updateConnectionActivation: (index: number, activation: number) => void
  ): void {
    const now = performance.now()

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      if (!particle.active) continue

      const pathLength = this.getPathLength(particle.path)
      const progressDelta = (particle.speed * deltaTime) / pathLength
      particle.progress += progressDelta

      if (particle.progress >= 1) {
        particle.progress = 1
        particle.active = false

        const targetNeuron = network[particle.toNeuronId]
        if (targetNeuron && targetNeuron.activation < 1) {
          targetNeuron.activation = 1
          this.activations.set(particle.toNeuronId, {
            neuronId: particle.toNeuronId,
            startTime: now,
            duration: 450
          })
          updateNeuronActivation(particle.toNeuronId, 1)

          const depth = this.getActivationDepth(particle.toNeuronId)
          for (const nextTargetId of targetNeuron.connections) {
            setTimeout(() => {
              this.createParticle(particle.toNeuronId, nextTargetId, network, connections, depth + 1)
            }, 80 + Math.random() * 120)
          }
        }

        this.particles.splice(i, 1)
        continue
      }

      particle.trail.push(this.getPointOnPath(particle.path, particle.progress).clone())
      if (particle.trail.length > 6) {
        particle.trail.shift()
      }

      const connectionIndex = connections.findIndex(
        c => c.from === particle.fromNeuronId && c.to === particle.toNeuronId
      )
      if (connectionIndex !== -1) {
        updateConnectionActivation(connectionIndex, Math.sin(particle.progress * Math.PI))
      }
    }

    this.updateParticleRendering()

    for (const [neuronId, event] of this.activations) {
      const elapsed = now - event.startTime
      if (elapsed < event.duration) {
        const t = elapsed / event.duration
        const activation = Math.exp(-t * 3)
        network[neuronId].activation = activation
        updateNeuronActivation(neuronId, activation)
      } else {
        network[neuronId].activation = 0
        updateNeuronActivation(neuronId, 0)
        this.activations.delete(neuronId)
      }
    }
  }

  private getPathLength(path: THREE.Vector3[]): number {
    let length = 0
    for (let i = 1; i < path.length; i++) {
      length += path[i].distanceTo(path[i - 1])
    }
    return length
  }

  private getPointOnPath(path: THREE.Vector3[], t: number): THREE.Vector3 {
    if (t <= 0) return path[0].clone()
    if (t >= 1) return path[path.length - 1].clone()

    const totalLength = this.getPathLength(path)
    const targetDistance = t * totalLength

    let currentDistance = 0
    for (let i = 1; i < path.length; i++) {
      const segmentLength = path[i].distanceTo(path[i - 1])
      if (currentDistance + segmentLength >= targetDistance) {
        const segmentT = (targetDistance - currentDistance) / segmentLength
        return new THREE.Vector3().lerpVectors(path[i - 1], path[i], segmentT)
      }
      currentDistance += segmentLength
    }

    return path[path.length - 1].clone()
  }

  private getActivationDepth(neuronId: number): number {
    let maxDepth = 0
    for (const particle of this.particles) {
      if (particle.toNeuronId === neuronId || particle.fromNeuronId === neuronId) {
        const depth = this.estimateParticleDepth(particle)
        maxDepth = Math.max(maxDepth, depth)
      }
    }
    return maxDepth
  }

  private estimateParticleDepth(particle: ImpulseParticle): number {
    let depth = 1
    let currentId = particle.fromNeuronId
    const visited = new Set<number>()

    while (depth < this.maxDepth && !visited.has(currentId)) {
      visited.add(currentId)
      let foundParent = false
      for (const p of this.particles) {
        if (p.toNeuronId === currentId && !visited.has(p.fromNeuronId)) {
          currentId = p.fromNeuronId
          depth++
          foundParent = true
          break
        }
      }
      if (!foundParent) break
    }

    return depth
  }

  private updateParticleRendering(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = this.particles[i]
      const pi = i * 3

      if (particle && particle.active) {
        const position = this.getPointOnPath(particle.path, particle.progress)
        this.positions[pi] = position.x
        this.positions[pi + 1] = position.y
        this.positions[pi + 2] = position.z

        const intensity = 0.9 - particle.progress * 0.3
        this.colors[pi] = 0.15 * intensity
        this.colors[pi + 1] = 0.7 * intensity
        this.colors[pi + 2] = 1.0 * intensity
      } else {
        this.positions[pi] = 0
        this.positions[pi + 1] = 0
        this.positions[pi + 2] = -9999
        this.colors[pi] = 0
        this.colors[pi + 1] = 0
        this.colors[pi + 2] = 0
        this.sizes[i] = 0
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true
    this.particleGeometry.attributes.color.needsUpdate = true
  }

  clearAll(): void {
    this.particles = []
    this.activations.clear()
    this.updateParticleRendering()
  }

  dispose(): void {
    this.particleGeometry.dispose()
    this.particleMaterial.dispose()
  }
}
