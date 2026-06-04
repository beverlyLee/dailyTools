<template>
  <div></div>
</template>

<script setup>
import * as THREE from 'three'

const props = defineProps({
  initialLayer: {
    type: String,
    default: 'midground'
  }
})

const figureGroup = new THREE.Group()
let currentLayer = props.initialLayer
let targetZ = 0.15

const layerZValues = {
  foreground: 2.15,
  midground: 0.15,
  background: -2.85
}

const createFigure = () => {
  const bodyShape = buildSymmetricShape()

  const holes = [
    ...createFaceHoles(),
    ...createClothHoles(),
    ...createBeltHoles()
  ]
  bodyShape.holes.push(...holes)

  const bodyGeometry = new THREE.ShapeGeometry(bodyShape)
  const bodyMaterial = new THREE.MeshBasicMaterial({
    color: 0xcc0000,
    side: THREE.DoubleSide
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  figureGroup.add(body)

  figureGroup.position.z = layerZValues[props.initialLayer]
  targetZ = layerZValues[props.initialLayer]
  figureGroup.scale.set(1.2, 1.2, 1)

  return figureGroup
}

const RIGHT_CONTOUR = [
  { x: 0, y: 2.35, type: 'move' },
  { x: 0.35, y: 2.3 },
  { x: 0.42, y: 2.1 },
  { x: 0.44, y: 1.95 },
  { x: 0.44, y: 1.82 },
  { x: 0.40, y: 1.7 },
  { x: 0.38, y: 1.58 },
  { x: 0.30, y: 1.48 },
  { x: 0.18, y: 1.38 },
  { x: 0.16, y: 1.3 },
  { x: 0.55, y: 1.25 },
  { x: 0.72, y: 1.15 },
  { x: 0.82, y: 0.95 },
  { x: 0.88, y: 0.7 },
  { x: 0.92, y: 0.45 },
  { x: 0.95, y: 0.25 },
  { x: 1.02, y: 0.08 },
  { x: 1.05, y: -0.02 },
  { x: 0.98, y: -0.04 },
  { x: 0.88, y: 0.06 },
  { x: 0.82, y: 0.2 },
  { x: 0.75, y: 0.4 },
  { x: 0.68, y: 0.6 },
  { x: 0.58, y: 0.8 },
  { x: 0.50, y: 0.95 },
  { x: 0.45, y: 0.7 },
  { x: 0.40, y: 0.4 },
  { x: 0.36, y: 0.1 },
  { x: 0.34, y: -0.15 },
  { x: 0.32, y: -0.4 },
  { x: 0.34, y: -0.55 },
  { x: 0.36, y: -0.8 },
  { x: 0.35, y: -1.1 },
  { x: 0.33, y: -1.4 },
  { x: 0.30, y: -1.7 },
  { x: 0.28, y: -1.88 },
  { x: 0.40, y: -1.92 },
  { x: 0.42, y: -2.0 },
  { x: 0.38, y: -2.05 },
  { x: 0.18, y: -2.05 },
  { x: 0.15, y: -2.0 },
  { x: 0.18, y: -1.92 },
  { x: 0.22, y: -1.85 },
  { x: 0.18, y: -1.5 },
  { x: 0.12, y: -1.1 },
  { x: 0.06, y: -0.8 },
  { x: 0, y: -0.65 },
]

const buildSymmetricShape = () => {
  const shape = new THREE.Shape()

  const rightPoints = RIGHT_CONTOUR
  const leftPoints = rightPoints.slice(0, -1).map(p => ({ ...p, x: -p.x })).reverse()

  const allPoints = [...rightPoints, ...leftPoints]

  allPoints.forEach((p, i) => {
    if (p.type === 'move' || i === 0) {
      shape.moveTo(p.x, p.y)
    } else {
      shape.lineTo(p.x, p.y)
    }
  })

  shape.closePath()
  return shape
}

const TORSO_BOUNDS = {
  left: -0.30,
  right: 0.30,
  top: 0.85,
  bottom: -0.35
}

const getSafeHoleRadius = (cx, cy, baseRadius) => {
  const margin = 0.02
  const distToLeft = Math.abs(cx - TORSO_BOUNDS.left)
  const distToRight = Math.abs(cx - TORSO_BOUNDS.right)
  const distToTop = Math.abs(cy - TORSO_BOUNDS.top)
  const distToBottom = Math.abs(cy - TORSO_BOUNDS.bottom)
  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom)
  const maxAllowed = minDist - margin
  return Math.max(0.01, Math.min(baseRadius, maxAllowed))
}

const createFaceHoles = () => {
  const holes = []

  const eyeY = 1.95
  const eyeOffsets = [-0.14, 0.14]
  eyeOffsets.forEach(offsetX => {
    const path = new THREE.Path()
    const rx = 0.055
    const ry = 0.035
    const segments = 16
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const px = offsetX + Math.cos(angle) * rx
      const py = eyeY + Math.sin(angle) * ry
      if (i === 0) path.moveTo(px, py)
      else path.lineTo(px, py)
    }
    path.closePath()
    holes.push(path)
  })

  const nosePath = new THREE.Path()
  nosePath.moveTo(-0.025, 1.8)
  nosePath.lineTo(0.025, 1.8)
  nosePath.lineTo(0.015, 1.76)
  nosePath.lineTo(-0.015, 1.76)
  nosePath.closePath()
  holes.push(nosePath)

  const mouthPath = new THREE.Path()
  const mouthCx = 0, mouthCy = 1.65
  const mrx = 0.08, mry = 0.03
  const mSegments = 16
  for (let i = 0; i <= mSegments; i++) {
    const angle = (i / mSegments) * Math.PI * 2
    const px = mouthCx + Math.cos(angle) * mrx
    const py = mouthCy + Math.sin(angle) * mry
    if (i === 0) mouthPath.moveTo(px, py)
    else mouthPath.lineTo(px, py)
  }
  mouthPath.closePath()
  holes.push(mouthPath)

  return holes
}

const createClothHoles = () => {
  const holes = []
  const flowerCenters = [
    { cx: 0, cy: 0.65 },
    { cx: 0, cy: 0.35 },
    { cx: -0.15, cy: 0.5 },
    { cx: 0.15, cy: 0.5 },
    { cx: -0.12, cy: 0.15 },
    { cx: 0.12, cy: 0.15 },
  ]

  flowerCenters.forEach(fc => {
    const baseR = 0.06
    const safeR = getSafeHoleRadius(fc.cx, fc.cy, baseR)
    const petalR = safeR * 0.28
    const petalDist = safeR * 0.52

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
      const px = fc.cx + Math.cos(angle) * petalDist
      const py = fc.cy + Math.sin(angle) * petalDist
      const petal = new THREE.Path()
      petal.absarc(px, py, petalR, 0, Math.PI * 2, true)
      petal.closePath()
      holes.push(petal)
    }

    const center = new THREE.Path()
    center.absarc(fc.cx, fc.cy, safeR * 0.15, 0, Math.PI * 2, true)
    center.closePath()
    holes.push(center)
  })

  return holes
}

const createBeltHoles = () => {
  const holes = []
  const beltY = -0.4
  const positions = [-0.18, -0.06, 0.06, 0.18]

  positions.forEach(x => {
    const safeR = getSafeHoleRadius(x, beltY, 0.025)
    const hole = new THREE.Path()
    hole.absarc(x, beltY, safeR, 0, Math.PI * 2, true)
    hole.closePath()
    holes.push(hole)
  })

  return holes
}

const moveToLayer = (layerName) => {
  if (layerZValues[layerName] !== undefined) {
    targetZ = layerZValues[layerName]
    currentLayer = layerName
  }
}

const setLayerZValues = (zValues) => {
  Object.assign(layerZValues, zValues)
  if (layerZValues[currentLayer] !== undefined) {
    targetZ = layerZValues[currentLayer]
  }
}

const getCurrentLayer = () => currentLayer

const updatePosition = (delta) => {
  const diff = targetZ - figureGroup.position.z
  if (Math.abs(diff) > 0.01) {
    figureGroup.position.z += diff * delta * 3
  } else {
    figureGroup.position.z = targetZ
  }
}

const setPosition = (x, y) => {
  figureGroup.position.x = x
  figureGroup.position.y = y
}

const getFigure = () => figureGroup

defineExpose({
  createFigure,
  moveToLayer,
  getCurrentLayer,
  updatePosition,
  setPosition,
  getFigure,
  setLayerZValues
})
</script>
