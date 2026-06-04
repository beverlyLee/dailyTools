import * as THREE from 'three'
import type { NeuronData, AxonConnection } from './NeuronCell'
import { getRandomNeuronColor } from './NeuronCell'

export class NeuronNetwork {
  neurons: NeuronData[]
  connections: AxonConnection[]
  neuronCount: number
  connectionDensity: number
  sceneSize: THREE.Vector3

  constructor(neuronCount: number = 10000, connectionDensity: number = 3) {
    this.neuronCount = neuronCount
    this.connectionDensity = connectionDensity
    this.sceneSize = new THREE.Vector3(35, 25, 20)
    this.neurons = []
    this.connections = []

    this.generatePositions()
    this.generateConnections()
  }

  private generatePositions(): void {
    for (let i = 0; i < this.neuronCount; i++) {
      const position = this.generateEllipsoidalPosition()
      const neuron: NeuronData = {
        id: i,
        position,
        connections: [],
        size: 0.7 + Math.random() * 0.5,
        activation: 0,
        baseColor: getRandomNeuronColor()
      }
      this.neurons.push(neuron)
    }
  }

  private generateEllipsoidalPosition(): THREE.Vector3 {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    
    const densityBias = Math.pow(Math.random(), 0.7)
    const r = densityBias
    
    const x = r * this.sceneSize.x * Math.sin(phi) * Math.cos(theta)
    const y = r * this.sceneSize.y * Math.sin(phi) * Math.sin(theta)
    const z = r * this.sceneSize.z * Math.cos(phi)
    
    return new THREE.Vector3(x, y, z)
  }

  private generateConnections(): void {
    const kdTree = this.buildKDTree()

    for (let i = 0; i < this.neuronCount; i++) {
      const neuron = this.neurons[i]
      const nearbyNeurons = this.findNearbyNeurons(neuron, kdTree, this.connectionDensity + 3)
      
      const connectionCount = Math.floor(Math.random() * this.connectionDensity) + 2
      const shuffled = nearbyNeurons.filter(n => n.id !== i).sort(() => Math.random() - 0.5)
      
      for (let j = 0; j < Math.min(connectionCount, shuffled.length); j++) {
        const targetNeuron = shuffled[j]
        if (!neuron.connections.includes(targetNeuron.id)) {
          neuron.connections.push(targetNeuron.id)
          
          const connection: AxonConnection = {
            from: neuron.id,
            to: targetNeuron.id,
            fromPosition: neuron.position.clone(),
            toPosition: targetNeuron.position.clone()
          }
          this.connections.push(connection)
        }
      }
    }
  }

  private buildKDTree(): { position: THREE.Vector3; id: number }[] {
    return this.neurons.map(n => ({
      position: n.position,
      id: n.id
    })).sort((a, b) => a.position.x - b.position.x)
  }

  private findNearbyNeurons(
    neuron: NeuronData,
    kdTree: { position: THREE.Vector3; id: number }[],
    count: number
  ): NeuronData[] {
    const maxDistance = 7
    const nearby: { distance: number; neuron: NeuronData }[] = []

    for (const node of kdTree) {
      if (node.id === neuron.id) continue
      
      const distance = neuron.position.distanceTo(node.position)
      if (distance < maxDistance && distance > 0.5) {
        nearby.push({
          distance,
          neuron: this.neurons[node.id]
        })
      }
    }

    return nearby
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count)
      .map(n => n.neuron)
  }

  getNeuron(id: number): NeuronData | undefined {
    return this.neurons[id]
  }

  getConnectionIndex(fromId: number, toId: number): number {
    return this.connections.findIndex(c => c.from === fromId && c.to === toId)
  }

  resetActivations(): void {
    for (const neuron of this.neurons) {
      neuron.activation = 0
    }
  }
}
