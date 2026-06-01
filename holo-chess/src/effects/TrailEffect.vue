<script setup lang="ts">
import * as THREE from 'three'
import { onMounted } from 'vue'

const props = defineProps<{
  scene: THREE.Scene
  onAnimate: (cb: (delta: number, elapsed: number) => void) => void
}>()

interface TrailGhostMesh {
  mesh: THREE.Mesh
  initialOpacity: number
  initialEmissiveIntensity: number
}

interface TrailGhost {
  meshes: TrailGhostMesh[]
  lineOpacity: number
  line: THREE.Line | null
  life: number
  maxLife: number
}

const activeTrails: TrailGhost[] = []
const trailGroup = new THREE.Group()

function createTrailFromPositions(
  fromWorld: THREE.Vector3,
  toWorld: THREE.Vector3,
  color: number,
  count: number = 8,
  duration: number = 1.2
) {
  const meshes: TrailGhostMesh[] = []
  const maxLife = duration

  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1)
    const geo = new THREE.TorusGeometry(0.15 + Math.random() * 0.1, 0.015, 6, 16)
    const initialOpacity = 0.4 * (1 - t * 0.5)
    const initialEmissive = 1.0
    const mat = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: initialOpacity,
      emissive: color,
      emissiveIntensity: initialEmissive,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = Math.PI / 2

    const x = fromWorld.x + (toWorld.x - fromWorld.x) * t
    const z = fromWorld.z + (toWorld.z - fromWorld.z) * t
    const arcY = 0.3 * Math.sin(Math.PI * t)
    mesh.position.set(x, arcY, z)
    mesh.scale.setScalar(0.5 + Math.random() * 0.5)

    meshes.push({ mesh, initialOpacity, initialEmissiveIntensity: initialEmissive })
    trailGroup.add(mesh)
  }

  const linePoints: THREE.Vector3[] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const x = fromWorld.x + (toWorld.x - fromWorld.x) * t
    const z = fromWorld.z + (toWorld.z - fromWorld.z) * t
    const y = 0.3 * Math.sin(Math.PI * t)
    linePoints.push(new THREE.Vector3(x, y, z))
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints)
  const lineInitialOpacity = 0.5
  const lineMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: lineInitialOpacity,
  })
  const line = new THREE.Line(lineGeo, lineMat)
  trailGroup.add(line)

  activeTrails.push({
    meshes,
    lineOpacity: lineInitialOpacity,
    line,
    life: maxLife,
    maxLife,
  })
}

function spawnTrail(fromWorld: THREE.Vector3, toWorld: THREE.Vector3, color: number) {
  createTrailFromPositions(fromWorld, toWorld, color)
}

onMounted(() => {
  props.scene.add(trailGroup)

  props.onAnimate((delta) => {
    for (let i = activeTrails.length - 1; i >= 0; i--) {
      const trail = activeTrails[i]
      trail.life -= delta

      const lifeRatio = Math.max(0, trail.life / trail.maxLife)

      for (const { mesh, initialOpacity, initialEmissiveIntensity } of trail.meshes) {
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.opacity = initialOpacity * lifeRatio
        mat.emissiveIntensity = initialEmissiveIntensity * lifeRatio
        mesh.scale.setScalar((0.5 + lifeRatio * 0.5))
      }

      if (trail.line) {
        const mat = trail.line.material as THREE.LineBasicMaterial
        mat.opacity = trail.lineOpacity * lifeRatio
      }

      if (trail.life <= 0) {
        for (const { mesh } of trail.meshes) {
          trailGroup.remove(mesh)
          mesh.geometry.dispose()
          ;(mesh.material as THREE.Material).dispose()
        }
        if (trail.line) {
          trailGroup.remove(trail.line)
          trail.line.geometry.dispose()
          ;(trail.line.material as THREE.Material).dispose()
        }
        activeTrails.splice(i, 1)
      }
    }
  })
})

defineExpose({ spawnTrail })
</script>

<template>
  <div></div>
</template>
