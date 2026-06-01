<script setup lang="ts">
import * as THREE from 'three'
import { onMounted, type Ref } from 'vue'
import type { Position } from '@/game/chess'

const CELL_SIZE = 1
const BOARD_SIZE = 8
const HALF_BOARD = BOARD_SIZE / 2

const props = defineProps<{
  scene: THREE.Scene
  onAnimate: (cb: (delta: number, elapsed: number) => void) => void
  highlightedCells: Position[]
  selectedCell: Position | null
}>()

const gridGroup = new THREE.Group()
const highlightMeshes: THREE.Mesh[] = []
const cellPlanes: THREE.Mesh[][] = []

function boardToWorld(row: number, col: number): THREE.Vector3 {
  return new THREE.Vector3(
    (col - HALF_BOARD + 0.5) * CELL_SIZE,
    0,
    (row - HALF_BOARD + 0.5) * CELL_SIZE
  )
}

function createGrid() {
  const vertices: number[] = []
  const totalSize = BOARD_SIZE * CELL_SIZE

  for (let i = 0; i <= BOARD_SIZE; i++) {
    const pos = (i - HALF_BOARD) * CELL_SIZE
    vertices.push(-HALF_BOARD * CELL_SIZE, 0, pos, HALF_BOARD * CELL_SIZE, 0, pos)
    vertices.push(pos, 0, -HALF_BOARD * CELL_SIZE, pos, 0, HALF_BOARD * CELL_SIZE)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))

  const material = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.8,
  })

  const lines = new THREE.LineSegments(geometry, material)
  lines.name = 'gridLines'
  gridGroup.add(lines)

  const outerVertices = [
    -HALF_BOARD * CELL_SIZE, 0, -HALF_BOARD * CELL_SIZE,
    HALF_BOARD * CELL_SIZE, 0, -HALF_BOARD * CELL_SIZE,
    HALF_BOARD * CELL_SIZE, 0, -HALF_BOARD * CELL_SIZE,
    HALF_BOARD * CELL_SIZE, 0, HALF_BOARD * CELL_SIZE,
    HALF_BOARD * CELL_SIZE, 0, HALF_BOARD * CELL_SIZE,
    -HALF_BOARD * CELL_SIZE, 0, HALF_BOARD * CELL_SIZE,
    -HALF_BOARD * CELL_SIZE, 0, HALF_BOARD * CELL_SIZE,
    -HALF_BOARD * CELL_SIZE, 0, -HALF_BOARD * CELL_SIZE,
  ]
  const outerGeometry = new THREE.BufferGeometry()
  outerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(outerVertices, 3))
  const outerMaterial = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 1.0,
    linewidth: 2,
  })
  const outerLines = new THREE.LineSegments(outerGeometry, outerMaterial)
  gridGroup.add(outerLines)

  for (let row = 0; row < BOARD_SIZE; row++) {
    cellPlanes[row] = []
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isDark = (row + col) % 2 === 1
      const planeGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.98, CELL_SIZE * 0.98)
      const planeMat = new THREE.MeshPhongMaterial({
        color: isDark ? 0x001122 : 0x002244,
        transparent: true,
        opacity: 0.15,
        emissive: isDark ? 0x000508 : 0x001020,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      })
      const plane = new THREE.Mesh(planeGeo, planeMat)
      plane.rotation.x = -Math.PI / 2
      const worldPos = boardToWorld(row, col)
      plane.position.set(worldPos.x, -0.01, worldPos.z)
      plane.name = `cell_${row}_${col}`
      plane.userData = { row, col, type: 'cell' }
      cellPlanes[row][col] = plane
      gridGroup.add(plane)
    }
  }
}

function createHighlightMeshes() {
  for (let i = 0; i < 64; i++) {
    const geo = new THREE.PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9)
    const mat = new THREE.MeshPhongMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0.01
    mesh.visible = false
    mesh.name = `highlight_${i}`
    highlightMeshes.push(mesh)
    gridGroup.add(mesh)
  }
}

function updateHighlights() {
  for (const mesh of highlightMeshes) {
    mesh.visible = false
  }

  props.highlightedCells.forEach((pos, idx) => {
    if (idx >= highlightMeshes.length) return
    const mesh = highlightMeshes[idx]
    const worldPos = boardToWorld(pos.row, pos.col)
    mesh.position.set(worldPos.x, 0.02, worldPos.z)
    mesh.visible = true
    ;(mesh.material as THREE.MeshPhongMaterial).opacity = 0.25
    ;(mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.8
  })

  if (props.selectedCell) {
    const selMesh = highlightMeshes[highlightMeshes.length - 1]
    const worldPos = boardToWorld(props.selectedCell.row, props.selectedCell.col)
    selMesh.position.set(worldPos.x, 0.02, worldPos.z)
    selMesh.visible = true
    ;(selMesh.material as THREE.MeshPhongMaterial).opacity = 0.4
    ;(selMesh.material as THREE.MeshPhongMaterial).color.set(0xff00ff)
    ;(selMesh.material as THREE.MeshPhongMaterial).emissive.set(0xff00ff)
  }
}

function getCellMeshes(): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      meshes.push(cellPlanes[r][c])
    }
  }
  return meshes
}

onMounted(() => {
  createGrid()
  createHighlightMeshes()
  props.scene.add(gridGroup)

  props.onAnimate((_delta, elapsed) => {
    gridGroup.position.y = Math.sin(elapsed * 0.5) * 0.05

    const gridLines = gridGroup.getObjectByName('gridLines')
    if (gridLines) {
      const mat = (gridLines as THREE.LineSegments).material as THREE.LineBasicMaterial
      mat.opacity = 0.5 + Math.sin(elapsed * 2) * 0.3
    }

    for (const mesh of highlightMeshes) {
      if (mesh.visible) {
        ;(mesh.material as THREE.MeshPhongMaterial).opacity = (mesh.material as THREE.MeshPhongMaterial).opacity *
          (0.7 + Math.sin(elapsed * 4) * 0.3)
      }
    }
  })
})

defineExpose({ boardToWorld, getCellMeshes, updateHighlights, gridGroup })
</script>

<template>
  <div></div>
</template>
