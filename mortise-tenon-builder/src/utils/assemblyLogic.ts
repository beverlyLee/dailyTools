import * as THREE from 'three'

export interface PartSlot {
  id: string
  name: string
  modelPath: string
  position: [number, number, number]
  rotation?: [number, number, number]
  color: number
  description: string
}

export const CHAIR_PARTS: PartSlot[] = [
  {
    id: 'seat',
    name: '椅面',
    modelPath: '/models/seat.glb',
    position: [0, 0.55, 0],
    rotation: [0, 0, 0],
    color: 0x8b5a2b,
    description: '四条椅腿通过榫卯嵌入椅面四角'
  },
  {
    id: 'back',
    name: '靠背',
    modelPath: '/models/back.glb',
    position: [0, 1.35, -0.42],
    rotation: [0.15, 0, 0],
    color: 0x9a6b3a,
    description: '靠背下部榫头插入椅面后方卯眼'
  },
  {
    id: 'armFrontLeft',
    name: '前左椅腿',
    modelPath: '/models/armFrontLeft.glb',
    position: [-0.32, 0.275, 0.42],
    rotation: [0, 0, 0],
    color: 0x7a4d24,
    description: '顶部榫头嵌入椅面卯眼'
  },
  {
    id: 'armFrontRight',
    name: '前右椅腿',
    modelPath: '/models/armFrontRight.glb',
    position: [0.32, 0.275, 0.42],
    rotation: [0, 0, 0],
    color: 0x7a4d24,
    description: '顶部榫头嵌入椅面卯眼'
  },
  {
    id: 'legBackLeft',
    name: '后左椅腿',
    modelPath: '/models/legBackLeft.glb',
    position: [-0.32, 0.6, -0.42],
    rotation: [0, 0, 0],
    color: 0x7a4d24,
    description: '顶部榫头插入椅面；上部榫头支撑扶手'
  },
  {
    id: 'legBackRight',
    name: '后右椅腿',
    modelPath: '/models/legBackRight.glb',
    position: [0.32, 0.6, -0.42],
    rotation: [0, 0, 0],
    color: 0x7a4d24,
    description: '顶部榫头插入椅面；上部榫头支撑扶手'
  },
  {
    id: 'armLeft',
    name: '左扶手',
    modelPath: '/models/armLeft.glb',
    position: [-0.32, 1.05, 0],
    rotation: [0, 0, 0],
    color: 0xa5743f,
    description: '扶手两端嵌入前后椅腿顶部'
  },
  {
    id: 'armRight',
    name: '右扶手',
    modelPath: '/models/armRight.glb',
    position: [0.32, 1.05, 0],
    rotation: [0, 0, 0],
    color: 0xa5743f,
    description: '扶手两端嵌入前后椅腿顶部'
  },
  {
    id: 'stretcher',
    name: '前枨',
    modelPath: '/models/stretcher.glb',
    position: [0, 0.2, 0.32],
    rotation: [0, 0, 0],
    color: 0x6e4621,
    description: '连接前腿的横枨，加固结构'
  }
]

export const FULL_CHAIR_MODEL = '/models/chair-full.glb'
export const SNAP_DISTANCE = 0.8
export const SNAP_ANGLE = 0.25

export function distanceToSlot(obj: THREE.Object3D, slot: PartSlot): number {
  const p = new THREE.Vector3(...slot.position)
  return obj.position.distanceTo(p)
}

export function isNearSlot(obj: THREE.Object3D, slot: PartSlot): boolean {
  return distanceToSlot(obj, slot) <= SNAP_DISTANCE
}

export function snapToSlot(obj: THREE.Object3D, slot: PartSlot): void {
  obj.position.set(...slot.position)
  if (slot.rotation) obj.rotation.set(...slot.rotation)
  obj.userData.locked = true
}

export function playSnapSound(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.16)
    setTimeout(() => ctx.close(), 300)
  } catch {
    // ignore audio errors
  }
}

export function createWoodPBRMaterial(
  baseColor: number,
  map?: THREE.Texture,
  roughnessMap?: THREE.Texture
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.75,
    metalness: 0.05,
    map: map || null,
    roughnessMap: roughnessMap || null,
    envMapIntensity: 0.8
  })
  if (map) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.set(2, 2)
    map.anisotropy = 8
    map.needsUpdate = true
  }
  return mat
}
