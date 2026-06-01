<script setup lang="ts">
import * as THREE from 'three'
import { onMounted, onUnmounted, watch, type ShallowRef } from 'vue'
import type { PieceType, Color, Position } from '@/game/chess'

const CELL_SIZE = 1
const HALF_BOARD = 4

const WHITE_COLOR = 0x00e5ff
const BLACK_COLOR = 0xff00ff

const props = defineProps<{
  scene: THREE.Scene
  pieceType: PieceType
  pieceColor: Color
  position: Position
  isSelected?: boolean
  onAnimate?: (cb: (delta: number, elapsed: number) => void) => void
}>()

const pieceGroup = new THREE.Group()
let allMeshes: THREE.Mesh[] = []
let animationCallback: ((delta: number, elapsed: number) => void) | null = null
let selectionRing: THREE.Mesh | null = null

function createHoloEmissiveMap(ringCount: number = 6): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)')
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  for (let i = 0; i < ringCount; i++) {
    const r = 20 + i * 35
    ctx.beginPath()
    ctx.arc(128, 128, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + Math.sin(i) * 0.1})`
    ctx.lineWidth = 2 + Math.sin(i * 2)
    ctx.stroke()
  }

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const x1 = 128 + Math.cos(angle) * 40
    const y1 = 128 + Math.sin(angle) * 40
    const x2 = 128 + Math.cos(angle) * 120
    const y2 = 128 + Math.sin(angle) * 120
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

let emissiveMap: THREE.CanvasTexture | null = null

function getEmissiveMap(): THREE.CanvasTexture {
  if (!emissiveMap) {
    emissiveMap = createHoloEmissiveMap(8)
  }
  return emissiveMap
}

function getColor(): number {
  return props.pieceColor === 'white' ? WHITE_COLOR : BLACK_COLOR
}

function createMaterial(opacity: number = 0.55): THREE.MeshPhongMaterial {
  const color = getColor()
  return new THREE.MeshPhongMaterial({
    color,
    transparent: true,
    opacity,
    emissive: color,
    emissiveIntensity: 0.7,
    emissiveMap: getEmissiveMap(),
    shininess: 120,
    specular: 0xffffff,
    side: THREE.DoubleSide,
  })
}

function createBaseTorus(radius: number = 0.35): THREE.Mesh {
  const geo = new THREE.TorusGeometry(radius, 0.045, 8, 32)
  const mat = createMaterial(0.5)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = Math.PI / 2
  mesh.position.y = 0.02
  return mesh
}

function createCylinder(height: number, rTop: number, rBot: number, y: number): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rTop, rBot, height, 16, 1, true)
  const mat = createMaterial()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = y
  return mesh
}

function createRing(y: number, radius: number, tube: number = 0.02): THREE.Mesh {
  const geo = new THREE.TorusGeometry(radius, tube, 8, 32)
  const mat = createMaterial(0.6)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = Math.PI / 2
  mesh.position.y = y
  return mesh
}

function createSphere(y: number, radius: number, opacity: number = 0.65): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 16, 12)
  const mat = createMaterial(opacity)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = y
  return mesh
}

function createBox(w: number, h: number, d: number, y: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = createMaterial(0.7)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = y
  return mesh
}

function createCone(radius: number, height: number, y: number): THREE.Mesh {
  const geo = new THREE.ConeGeometry(radius, height, 12)
  const mat = createMaterial(0.65)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = y
  return mesh
}

function buildPawn() {
  allMeshes = []
  const add = (...ms: THREE.Mesh[]) => ms.forEach(m => { allMeshes.push(m); pieceGroup.add(m) })

  add(
    createBaseTorus(0.28),
    createCylinder(0.25, 0.07, 0.12, 0.15),
    createRing(0.28, 0.12, 0.015),
    createCylinder(0.15, 0.08, 0.06, 0.48),
    createSphere(0.68, 0.1, 0.7)
  )
}

function buildRook() {
  allMeshes = []
  const add = (...ms: THREE.Mesh[]) => ms.forEach(m => { allMeshes.push(m); pieceGroup.add(m) })

  add(
    createBaseTorus(0.38),
    createCylinder(0.35, 0.16, 0.22, 0.2),
    createRing(0.38, 0.19, 0.025),
    createCylinder(0.15, 0.18, 0.16, 0.45),
    createCylinder(0.15, 0.2, 0.18, 0.58)
  )

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    const x = Math.cos(angle) * 0.13
    const z = Math.sin(angle) * 0.13
    const battlement = createBox(0.07, 0.12, 0.07, 0.72)
    battlement.position.x = x
    battlement.position.z = z
    battlement.rotation.y = angle
    add(battlement)
  }
}

function buildKnight() {
  allMeshes = []
  const add = (...ms: THREE.Mesh[]) => ms.forEach(m => { allMeshes.push(m); pieceGroup.add(m) })

  add(createBaseTorus(0.3))

  const body = createCylinder(0.2, 0.09, 0.15, 0.14)
  add(body)

  const neckGroup = new THREE.Group()
  const neck = createCylinder(0.28, 0.05, 0.08, 0.1)
  neckGroup.add(neck)
  neckGroup.rotation.z = -0.5
  neckGroup.position.x = 0.08
  neckGroup.position.y = 0.3
  pieceGroup.add(neckGroup)
  allMeshes.push(neck)

  const headGroup = new THREE.Group()
  const head = createCylinder(0.2, 0.04, 0.06, 0)
  headGroup.add(head)
  headGroup.rotation.z = -1.0
  headGroup.position.x = 0.22
  headGroup.position.y = 0.45
  pieceGroup.add(headGroup)
  allMeshes.push(head)

  const snout = createCone(0.035, 0.18, 0.08)
  snout.rotation.z = -1.0
  snout.position.set(0.3, 0.5, 0)
  add(snout)

  const mane1 = createRing(0.35, 0.09, 0.015)
  mane1.position.x = 0.02
  add(mane1)

  const mane2 = createRing(0.42, 0.08, 0.015)
  mane2.position.x = 0.04
  add(mane2)
}

function buildBishop() {
  allMeshes = []
  const add = (...ms: THREE.Mesh[]) => ms.forEach(m => { allMeshes.push(m); pieceGroup.add(m) })

  add(
    createBaseTorus(0.32),
    createCylinder(0.2, 0.12, 0.16, 0.12),
    createRing(0.23, 0.14, 0.02),
    createCylinder(0.35, 0.04, 0.11, 0.4),
    createRing(0.58, 0.07, 0.015)
  )

  const mitre1 = createCylinder(0.3, 0.02, 0.06, 0.72)
  mitre1.scale.x = 1.5
  add(mitre1)

  const mitre2 = createCylinder(0.25, 0.02, 0.04, 0.75)
  mitre2.scale.x = 0.4
  mitre2.rotation.y = Math.PI / 2
  add(mitre2)

  const tip = createSphere(0.9, 0.035, 0.8)
  add(tip)

  const halo = createRing(0.68, 0.085, 0.015)
  halo.rotation.x = Math.PI / 2.5
  add(halo)
}

function buildQueen() {
  allMeshes = []
  const add = (...ms: THREE.Mesh[]) => ms.forEach(m => { allMeshes.push(m); pieceGroup.add(m) })

  add(
    createBaseTorus(0.35),
    createCylinder(0.2, 0.14, 0.18, 0.12),
    createRing(0.23, 0.16, 0.025),
    createCylinder(0.3, 0.08, 0.13, 0.37),
    createRing(0.53, 0.12, 0.02),
    createCylinder(0.15, 0.05, 0.07, 0.65)
  )

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    const x = Math.cos(angle) * 0.07
    const z = Math.sin(angle) * 0.07
    const spike = createCone(0.025, 0.18, 0.82)
    spike.position.x = x
    spike.position.z = z
    add(spike)
  }

  const jewel1 = createSphere(0.78, 0.04, 0.9)
  add(jewel1)

  add(
    createRing(0.75, 0.09, 0.018),
    createRing(0.62, 0.1, 0.015)
  )
}

function buildKing() {
  allMeshes = []
  const add = (...ms: THREE.Mesh[]) => ms.forEach(m => { allMeshes.push(m); pieceGroup.add(m) })

  add(
    createBaseTorus(0.4),
    createCylinder(0.25, 0.15, 0.2, 0.14),
    createRing(0.27, 0.18, 0.025),
    createCylinder(0.35, 0.1, 0.14, 0.44),
    createRing(0.63, 0.13, 0.02),
    createCylinder(0.15, 0.08, 0.1, 0.68),
    createRing(0.76, 0.11, 0.02)
  )

  const crownBase = createCylinder(0.1, 0.07, 0.09, 0.88)
  add(crownBase)

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    const x = Math.cos(angle) * 0.07
    const z = Math.sin(angle) * 0.07
    const crownPoint = createCone(0.03, 0.14, 0.98)
    crownPoint.position.x = x
    crownPoint.position.z = z
    add(crownPoint)
  }

  const crossV = createCylinder(0.16, 0.02, 0.02, 1.05)
  add(crossV)

  const crossH = createCylinder(0.1, 0.02, 0.02, 1.03)
  crossH.rotation.z = Math.PI / 2
  add(crossH)

  const orb = createSphere(1.1, 0.025, 0.85)
  add(orb)
}

function buildPiece() {
  while (pieceGroup.children.length > 0) {
    const child = pieceGroup.children[0]
    pieceGroup.remove(child)
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      ;(child.material as THREE.Material).dispose()
    }
  }
  allMeshes = []

  switch (props.pieceType) {
    case 'pawn': buildPawn(); break
    case 'rook': buildRook(); break
    case 'knight': buildKnight(); break
    case 'bishop': buildBishop(); break
    case 'queen': buildQueen(); break
    case 'king': buildKing(); break
  }

  updateUserData()
}

function updateUserData() {
  for (const mesh of allMeshes) {
    mesh.userData = { piecePart: true, row: props.position.row, col: props.position.col }
  }
  pieceGroup.userData = { type: 'piece', row: props.position.row, col: props.position.col }
}

function updatePosition() {
  const x = (props.position.col - HALF_BOARD + 0.5) * CELL_SIZE
  const z = (props.position.row - HALF_BOARD + 0.5) * CELL_SIZE
  pieceGroup.position.set(x, 0, z)
  updateUserData()
}

function updateSelection() {
  const selected = props.isSelected ?? false

  if (selected) {
    if (!selectionRing) {
      const ringGeo = new THREE.TorusGeometry(0.4, 0.025, 8, 64)
      const ringMat = new THREE.MeshPhongMaterial({
        color: getColor(),
        transparent: true,
        opacity: 0.6,
        emissive: getColor(),
        emissiveIntensity: 1.5,
        side: THREE.DoubleSide,
      })
      selectionRing = new THREE.Mesh(ringGeo, ringMat)
      selectionRing.rotation.x = -Math.PI / 2
      selectionRing.position.y = -0.15
      pieceGroup.add(selectionRing)
    }
  } else {
    if (selectionRing) {
      pieceGroup.remove(selectionRing)
      selectionRing.geometry.dispose()
      ;(selectionRing.material as THREE.Material).dispose()
      selectionRing = null
    }
  }

  for (const mesh of allMeshes) {
    const mat = mesh.material as THREE.MeshPhongMaterial
    if (selected) {
      mat.opacity = 0.85
      mat.emissiveIntensity = 1.5
    } else {
      mat.opacity = mesh === allMeshes[0] ? 0.5 : 0.55
      mat.emissiveIntensity = 0.7
    }
  }
}

function getMeshes(): THREE.Mesh[] {
  return allMeshes
}

function moveToPosition(targetPos: Position, duration: number = 800): Promise<void> {
  return new Promise((resolve) => {
    const startX = pieceGroup.position.x
    const startZ = pieceGroup.position.z
    const startY = pieceGroup.position.y
    const targetX = (targetPos.col - HALF_BOARD + 0.5) * CELL_SIZE
    const targetZ = (targetPos.row - HALF_BOARD + 0.5) * CELL_SIZE
    const arcHeight = 0.5
    const startTime = performance.now()

    function animateMove() {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      pieceGroup.position.x = startX + (targetX - startX) * eased
      pieceGroup.position.z = startZ + (targetZ - startZ) * eased
      pieceGroup.position.y = startY + arcHeight * Math.sin(Math.PI * t)

      if (t < 1) {
        requestAnimationFrame(animateMove)
      } else {
        pieceGroup.position.set(targetX, 0, targetZ)
        resolve()
      }
    }
    requestAnimationFrame(animateMove)
  })
}

function dissolve(scene: THREE.Scene, duration: number = 600): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now()

    function animateDissolve() {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)

      for (const mesh of allMeshes) {
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.opacity = Math.max(0, 0.55 * (1 - t))
        mat.emissiveIntensity = 0.6 * (1 + t * 3)
      }
      pieceGroup.scale.setScalar(1 + t * 0.3)

      if (t < 1) {
        requestAnimationFrame(animateDissolve)
      } else {
        scene.remove(pieceGroup)
        for (const mesh of allMeshes) {
          mesh.geometry.dispose()
          ;(mesh.material as THREE.Material).dispose()
        }
        resolve()
      }
    }
    requestAnimationFrame(animateDissolve)
  })
}

onMounted(() => {
  buildPiece()
  updatePosition()
  props.scene.add(pieceGroup)

  if (props.onAnimate) {
    animationCallback = (_delta: number, elapsed: number) => {
      const selected = props.isSelected ?? false
      if (selected) {
        pieceGroup.position.y = 0.25 + Math.sin(elapsed * 3) * 0.05
        for (const mesh of allMeshes) {
          const mat = mesh.material as THREE.MeshPhongMaterial
          mat.emissiveIntensity = 1.2 + Math.sin(elapsed * 5) * 0.6
        }
        if (selectionRing) {
          const ringMat = selectionRing.material as THREE.MeshPhongMaterial
          ringMat.opacity = 0.4 + Math.sin(elapsed * 4) * 0.3
          selectionRing.rotation.z = elapsed * 2
        }
      } else {
        pieceGroup.position.y = Math.sin(elapsed * 1.5 + props.position.row * 0.3 + props.position.col * 0.5) * 0.02
      }
    }
    props.onAnimate(animationCallback)
  }
})

onUnmounted(() => {
  props.scene.remove(pieceGroup)
  for (const mesh of allMeshes) {
    mesh.geometry.dispose()
    const mat = mesh.material as THREE.MeshPhongMaterial
    mat.dispose()
    if (mat.emissiveMap) {
      mat.emissiveMap.dispose()
    }
  }
  if (selectionRing) {
    selectionRing.geometry.dispose()
    ;(selectionRing.material as THREE.Material).dispose()
  }
  animationCallback = null
})

watch(() => props.isSelected, updateSelection)
watch(() => props.position, updatePosition)
watch(() => props.pieceType, () => {
  buildPiece()
  updateSelection()
  updatePosition()
})

defineExpose({
  pieceGroup,
  getMeshes,
  moveToPosition,
  dissolve,
  updatePosition,
  buildPiece,
  updateSelection,
})

export interface ChessPieceHandle {
  pieceGroup: THREE.Group
  getMeshes: () => THREE.Mesh[]
  moveToPosition: (targetPos: Position, duration?: number) => Promise<void>
  dissolve: (scene: THREE.Scene, duration?: number) => Promise<void>
  updatePosition: () => void
  buildPiece: () => void
  updateSelection: () => void
}
</script>

<template>
  <div></div>
</template>
