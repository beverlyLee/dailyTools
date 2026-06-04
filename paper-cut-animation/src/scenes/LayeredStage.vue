<template>
  <div ref="containerRef" class="stage-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import * as THREE from 'three'

const containerRef = ref(null)
const scene = shallowRef(null)
const camera = shallowRef(null)
const renderer = shallowRef(null)
const animationId = ref(null)
const isSceneInitialized = ref(false)

const layers = {
  foreground: { z: 2, color: 0xf5e6d0, opacity: 0.9 },
  midground: { z: 0, color: 0xe8d4b8, opacity: 0.7 },
  background: { z: -3, color: 0xd4c4a8, opacity: 0.5 }
}

const decorationOffsets = {
  foreground: 0.12,
  midground: 0.12,
  background: 0.12
}

const figureOffsets = {
  foreground: 0.15,
  midground: 0.15,
  background: 0.15
}

const layerPlanes = shallowRef({})

const initScene = () => {
  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  scene.value = new THREE.Scene()
  scene.value.background = new THREE.Color(0xfff8e7)

  camera.value = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
  camera.value.position.set(0, 0, 8)

  renderer.value = new THREE.WebGLRenderer({ antialias: true })
  renderer.value.setSize(width, height)
  renderer.value.setPixelRatio(window.devicePixelRatio)
  container.appendChild(renderer.value.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.value.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(5, 5, 5)
  scene.value.add(directionalLight)

  createLayers()
  isSceneInitialized.value = true
  animate()
}

const createLayers = () => {
  const planeWidth = 12
  const planeHeight = 8

  Object.entries(layers).forEach(([name, config]) => {
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: config.opacity,
      side: THREE.DoubleSide
    })
    const plane = new THREE.Mesh(geometry, material)
    plane.position.z = config.z
    plane.name = name
    scene.value.add(plane)
    layerPlanes.value[name] = plane
  })

  addDecorations()
}

const addDecorations = () => {
  const bgPattern = createCloudPattern()
  bgPattern.position.z = layers.background.z + decorationOffsets.background
  scene.value.add(bgPattern)

  const midPattern = createMountainPattern()
  midPattern.position.z = layers.midground.z + decorationOffsets.midground
  scene.value.add(midPattern)

  const fgPattern = createFramePattern()
  fgPattern.position.z = layers.foreground.z + decorationOffsets.foreground
  scene.value.add(fgPattern)
}

const createCloudPattern = () => {
  const group = new THREE.Group()
  const cloudShape = new THREE.Shape()
  cloudShape.absarc(-2, 2, 0.8, 0, Math.PI * 2)
  cloudShape.absarc(-1.2, 2.2, 0.6, 0, Math.PI * 2)
  cloudShape.absarc(-0.5, 2, 0.7, 0, Math.PI * 2)
  
  cloudShape.absarc(2, 1.5, 0.6, 0, Math.PI * 2)
  cloudShape.absarc(2.8, 1.7, 0.5, 0, Math.PI * 2)
  cloudShape.absarc(3.4, 1.5, 0.55, 0, Math.PI * 2)

  const geometry = new THREE.ShapeGeometry(cloudShape)
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)
  return group
}

const createMountainPattern = () => {
  const group = new THREE.Group()
  const mountainShape = new THREE.Shape()
  mountainShape.moveTo(-5, -3)
  mountainShape.lineTo(-3, 0)
  mountainShape.lineTo(-1, -2)
  mountainShape.lineTo(1, -0.5)
  mountainShape.lineTo(3, -2.5)
  mountainShape.lineTo(5, -1)
  mountainShape.lineTo(5, -3)
  mountainShape.lineTo(-5, -3)

  const geometry = new THREE.ShapeGeometry(mountainShape)
  const material = new THREE.MeshBasicMaterial({
    color: 0x8b7355,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)
  return group
}

const createFramePattern = () => {
  const group = new THREE.Group()
  
  const frameShape = new THREE.Shape()
  frameShape.moveTo(-5.5, 3.5)
  frameShape.lineTo(-5.5, -3.5)
  frameShape.lineTo(-5.2, -3.5)
  frameShape.lineTo(-5.2, 3.5)
  frameShape.lineTo(-5.5, 3.5)
  
  frameShape.moveTo(5.2, 3.5)
  frameShape.lineTo(5.2, -3.5)
  frameShape.lineTo(5.5, -3.5)
  frameShape.lineTo(5.5, 3.5)
  frameShape.lineTo(5.2, 3.5)

  const geometry = new THREE.ShapeGeometry(frameShape)
  const material = new THREE.MeshBasicMaterial({
    color: 0x8b0000,
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geometry, material)
  group.add(mesh)
  return group
}

const addToScene = (obj) => {
  if (!isSceneInitialized.value || !scene.value) {
    throw new Error('Scene is not initialized yet. Please wait for the component to mount before adding objects.')
  }
  scene.value.add(obj)
}

const getFigureZForLayer = (layerName) => {
  if (layers[layerName]) {
    return layers[layerName].z + figureOffsets[layerName]
  }
  return 0
}

const animate = () => {
  animationId.value = requestAnimationFrame(animate)
  if (renderer.value && scene.value && camera.value) {
    renderer.value.render(scene.value, camera.value)
  }
}

const handleResize = () => {
  if (!containerRef.value || !camera.value || !renderer.value) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera.value.aspect = width / height
  camera.value.updateProjectionMatrix()
  renderer.value.setSize(width, height)
}

onMounted(() => {
  initScene()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  if (renderer.value) {
    renderer.value.dispose()
  }
  isSceneInitialized.value = false
})

defineExpose({
  scene,
  layers,
  figureOffsets,
  isSceneInitialized,
  addToScene,
  getFigureZForLayer
})
</script>

<style scoped>
.stage-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
