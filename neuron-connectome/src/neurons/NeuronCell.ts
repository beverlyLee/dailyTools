import * as THREE from 'three'

export interface NeuronData {
  id: number
  position: THREE.Vector3
  connections: number[]
  size: number
  activation: number
  baseColor: THREE.Color
}

export interface AxonConnection {
  from: number
  to: number
  fromPosition: THREE.Vector3
  toPosition: THREE.Vector3
}

const NEURON_RADIUS = 0.1
const NEURON_SEGMENTS = 6
const ACTIVE_COLOR = new THREE.Color(0x66ffff)
const BASE_COLOR_1 = new THREE.Color(0x3a3d80)
const BASE_COLOR_2 = new THREE.Color(0x5040a0)
const AXON_BASE_COLOR = new THREE.Color(0x2a3a5a)
const AXON_ACTIVE_COLOR = new THREE.Color(0x88ffff)

export class NeuronCell {
  geometry: THREE.SphereGeometry
  material: THREE.MeshStandardMaterial
  instancedMesh: THREE.InstancedMesh
  colorAttribute: THREE.InstancedBufferAttribute
  dummy: THREE.Object3D
  count: number

  constructor(count: number) {
    this.count = count
    this.geometry = new THREE.SphereGeometry(NEURON_RADIUS, NEURON_SEGMENTS, NEURON_SEGMENTS)
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      metalness: 0.1,
      roughness: 0.6,
      emissive: 0x000000,
      emissiveIntensity: 0.0
    })

    this.instancedMesh = new THREE.InstancedMesh(this.geometry, this.material, count)
    this.instancedMesh.frustumCulled = false
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const colors = new Float32Array(count * 3)
    this.colorAttribute = new THREE.InstancedBufferAttribute(colors, 3)
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage)
    this.instancedMesh.geometry.setAttribute('color', this.colorAttribute)

    this.dummy = new THREE.Object3D()
  }

  updateInstance(index: number, position: THREE.Vector3, size: number, color: THREE.Color): void {
    this.dummy.position.copy(position)
    this.dummy.scale.setScalar(size)
    this.dummy.updateMatrix()
    this.instancedMesh.setMatrixAt(index, this.dummy.matrix)
    this.colorAttribute.setXYZ(index, color.r, color.g, color.b)
  }

  updateActivation(index: number, activation: number, baseColor: THREE.Color): void {
    const neuronData = (this.instancedMesh.userData.neuronData as NeuronData[])?.[index]
    const baseSize = neuronData?.size ?? 0.8

    const brightness = 0.5 + activation * 0.5
    const color = baseColor.clone().lerp(ACTIVE_COLOR, activation)
    color.multiplyScalar(brightness)
    this.colorAttribute.setXYZ(index, color.r, color.g, color.b)

    this.dummy.position.copy(neuronData?.position || new THREE.Vector3())
    this.dummy.scale.setScalar(baseSize * (1 + activation * 0.3))
    this.dummy.updateMatrix()
    this.instancedMesh.setMatrixAt(index, this.dummy.matrix)
  }

  updateInstances(data: NeuronData[], time: number): void {
    this.instancedMesh.userData.neuronData = data

    for (let i = 0; i < data.length && i < this.count; i++) {
      const neuron = data[i]
      const breatheOffset = Math.sin(time * 0.001 + i * 0.08) * 0.04
      const scale = neuron.size * (1 + breatheOffset) * (1 + neuron.activation * 0.3)
      
      const brightness = 0.5 + neuron.activation * 0.5
      const color = neuron.baseColor.clone().lerp(ACTIVE_COLOR, neuron.activation)
      color.multiplyScalar(brightness)

      this.updateInstance(i, neuron.position, scale, color)
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true
    this.colorAttribute.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.instancedMesh.dispose()
  }
}

export class AxonManager {
  geometry: THREE.CylinderGeometry
  material: THREE.MeshStandardMaterial
  cylinderMesh: THREE.InstancedMesh
  colorAttribute: THREE.InstancedBufferAttribute
  connectionCount: number
  maxVisible: number
  dummy: THREE.Object3D
  allConnections: AxonConnection[]
  visibleIndexMap: Map<number, number>

  constructor(connections: AxonConnection[], maxVisible: number = 20000) {
    this.connectionCount = connections.length
    this.maxVisible = maxVisible
    this.allConnections = connections
    this.dummy = new THREE.Object3D()
    this.visibleIndexMap = new Map()

    this.geometry = new THREE.CylinderGeometry(0.015, 0.015, 1, 5, 1, false)
    this.geometry.translate(0, 0.5, 0)
    this.geometry.rotateX(Math.PI / 2)

    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      metalness: 0.05,
      roughness: 0.85,
      emissive: 0x0a1530,
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide
    })

    this.cylinderMesh = new THREE.InstancedMesh(this.geometry, this.material, maxVisible)
    this.cylinderMesh.frustumCulled = false
    this.cylinderMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.cylinderMesh.count = 0

    const colors = new Float32Array(maxVisible * 3)
    this.colorAttribute = new THREE.InstancedBufferAttribute(colors, 3)
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage)
    this.cylinderMesh.geometry.setAttribute('color', this.colorAttribute)
  }

  updateVisibleAxons(visibleIndices: number[]): void {
    this.visibleIndexMap.clear()
    const up = new THREE.Vector3(0, 1, 0)
    const axis = new THREE.Vector3()

    const actualCount = Math.min(visibleIndices.length, this.maxVisible)
    this.cylinderMesh.count = actualCount

    for (let i = 0; i < actualCount; i++) {
      const connIndex = visibleIndices[i]
      const conn = this.allConnections[connIndex]
      
      this.visibleIndexMap.set(connIndex, i)

      const from = conn.fromPosition
      const to = conn.toPosition
      const direction = new THREE.Vector3().subVectors(to, from)
      const length = direction.length()

      if (length < 0.1) {
        this.dummy.scale.setScalar(0)
        this.dummy.updateMatrix()
        this.cylinderMesh.setMatrixAt(i, this.dummy.matrix)
        this.colorAttribute.setXYZ(i, AXON_BASE_COLOR.r, AXON_BASE_COLOR.g, AXON_BASE_COLOR.b)
        continue
      }

      this.dummy.position.copy(from)
      this.dummy.scale.set(1, 1, length)

      direction.normalize()
      axis.crossVectors(up, direction).normalize()
      const angle = Math.acos(up.dot(direction))
      this.dummy.setRotationFromAxisAngle(axis, angle)

      this.dummy.updateMatrix()
      this.cylinderMesh.setMatrixAt(i, this.dummy.matrix)
      this.colorAttribute.setXYZ(i, AXON_BASE_COLOR.r, AXON_BASE_COLOR.g, AXON_BASE_COLOR.b)
    }

    for (let i = actualCount; i < this.maxVisible; i++) {
      this.dummy.scale.setScalar(0)
      this.dummy.updateMatrix()
      this.cylinderMesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.cylinderMesh.instanceMatrix.needsUpdate = true
    this.colorAttribute.needsUpdate = true
  }

  updateConnectionActivation(connectionIndex: number, activation: number): void {
    const visibleIdx = this.visibleIndexMap.get(connectionIndex)
    if (visibleIdx === undefined || visibleIdx >= this.cylinderMesh.count) return

    const brightness = 0.6 + activation * 0.4
    const color = AXON_BASE_COLOR.clone().lerp(AXON_ACTIVE_COLOR, activation)
    color.multiplyScalar(brightness)
    this.colorAttribute.setXYZ(visibleIdx, color.r, color.g, color.b)
    this.colorAttribute.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.cylinderMesh.dispose()
  }
}

export function getRandomNeuronColor(): THREE.Color {
  return BASE_COLOR_1.clone().lerp(BASE_COLOR_2, Math.random())
}
