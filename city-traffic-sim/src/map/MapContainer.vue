<template>
  <div ref="mapContainerRef" class="map-container">
    <div ref="threeLayerRef" class="three-layer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const mapContainerRef = ref<HTMLDivElement | null>(null)
const threeLayerRef = ref<HTMLDivElement | null>(null)

let map: any = null
let customLayer: any = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let animationId: number = 0
let clock: THREE.Clock | null = null

const CENTER_LNG = 116.397428
const CENTER_LAT = 39.90923

const PIXEL_SCALE = 0.4

const lngLatToWorld = (lng: number, lat: number): THREE.Vector3 => {
  if (!map) return new THREE.Vector3(0, 0, 0)

  const center = map.getCenter()
  const centerPixel = map.lngLatToContainer([center.lng, center.lat])
  const targetPixel = map.lngLatToContainer([lng, lat])

  const x = (targetPixel.x - centerPixel.x) * PIXEL_SCALE
  const z = (targetPixel.y - centerPixel.y) * PIXEL_SCALE

  return new THREE.Vector3(x, 0, z)
}

const getMapCenterWorld = (): THREE.Vector3 => {
  if (!map) return new THREE.Vector3(0, 0, 0)
  return new THREE.Vector3(0, 0, 0)
}

const initThreeScene = () => {
  if (!threeLayerRef.value) return

  scene = new THREE.Scene()

  const width = window.innerWidth
  const height = window.innerHeight

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000)
  camera.position.set(0, 80, 80)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  threeLayerRef.value.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(50, 100, 50)
  scene.add(directionalLight)

  clock = new THREE.Clock()
}

const updateCameraFromMap = () => {
  if (!camera || !map) return

  const zoom = map.getZoom()
  const pitch = map.getPitch()
  const rotation = map.getRotation()

  const baseHeight = 100
  const heightScale = Math.pow(2, 16 - zoom)
  const cameraHeight = Math.max(baseHeight * heightScale, 60)

  const pitchRad = (pitch * Math.PI) / 180
  const rotationRad = (rotation * Math.PI) / 180

  const distance = cameraHeight / Math.cos(pitchRad)
  const centerWorld = getMapCenterWorld()

  const offsetX = Math.sin(rotationRad) * distance * Math.sin(pitchRad)
  const offsetZ = Math.cos(rotationRad) * distance * Math.sin(pitchRad)

  camera.position.set(
    centerWorld.x + offsetX,
    cameraHeight,
    centerWorld.z + offsetZ
  )

  camera.lookAt(centerWorld.x, 0, centerWorld.z)

  camera.fov = 60
  camera.near = 0.1
  camera.far = 10000
  camera.updateProjectionMatrix()
}

const createRoadNetwork = () => {
  const nodes = new Map<string, { id: string; x: number; y: number; lng: number; lat: number }>()
  const edges: [string, string][] = []

  const intersections = [
    { id: 'n1', lng: 116.395, lat: 39.911 },
    { id: 'n2', lng: 116.398, lat: 39.911 },
    { id: 'n3', lng: 116.401, lat: 39.911 },
    { id: 'n4', lng: 116.395, lat: 39.908 },
    { id: 'n5', lng: 116.398, lat: 39.908 },
    { id: 'n6', lng: 116.401, lat: 39.908 },
    { id: 'n7', lng: 116.395, lat: 39.905 },
    { id: 'n8', lng: 116.398, lat: 39.905 },
    { id: 'n9', lng: 116.401, lat: 39.905 }
  ]

  if (map) {
    intersections.forEach(n => {
      const worldPos = lngLatToWorld(n.lng, n.lat)
      nodes.set(n.id, { id: n.id, x: worldPos.x, y: worldPos.z, lng: n.lng, lat: n.lat })
    })
  } else {
    const fallbackPositions: Record<string, { x: number; y: number }> = {
      n1: { x: -40, y: 35 },
      n2: { x: 0, y: 35 },
      n3: { x: 40, y: 35 },
      n4: { x: -40, y: 0 },
      n5: { x: 0, y: 0 },
      n6: { x: 40, y: 0 },
      n7: { x: -40, y: -35 },
      n8: { x: 0, y: -35 },
      n9: { x: 40, y: -35 }
    }
    intersections.forEach(n => {
      const pos = fallbackPositions[n.id]
      nodes.set(n.id, { id: n.id, x: pos.x, y: pos.y, lng: n.lng, lat: n.lat })
    })
  }

  const roadEdges: [string, string][] = [
    ['n1', 'n2'], ['n2', 'n3'],
    ['n4', 'n5'], ['n5', 'n6'],
    ['n7', 'n8'], ['n8', 'n9'],
    ['n1', 'n4'], ['n4', 'n7'],
    ['n2', 'n5'], ['n5', 'n8'],
    ['n3', 'n6'], ['n6', 'n9']
  ]

  roadEdges.forEach(e => edges.push(e))

  return { nodes, edges }
}

const render = () => {
  if (!renderer || !scene || !camera || !clock) return

  animationId = requestAnimationFrame(render)

  updateCameraFromMap()
  renderer.render(scene, camera)
}

const initMap = () => {
  if (!mapContainerRef.value || !window.AMap) {
    console.log('AMap not available, using fallback mode')
    initThreeScene()
    render()
    setTimeout(() => emit('map-ready'), 300)
    return
  }

  map = new window.AMap.Map(mapContainerRef.value, {
    viewMode: '3D',
    pitch: 60,
    rotation: 0,
    zoom: 16,
    center: [CENTER_LNG, CENTER_LAT],
    mapStyle: 'amap://styles/normal',
    showBuildingBlock: true,
    features: ['bg', 'road', 'building', 'point']
  })

  map.on('complete', () => {
    if (!threeLayerRef.value) return

    initThreeScene()

    customLayer = new window.AMap.CustomLayer(threeLayerRef.value, {
      map: map,
      zIndex: 120,
      rendering: 'always'
    })

    customLayer.render = () => {
      if (renderer && map) {
        const size = map.getSize()
        renderer.setSize(size.getWidth(), size.getHeight())
      }
    }

    render()
    emit('map-ready')
  })

  map.on('error', (e: any) => {
    console.warn('AMap error:', e, 'Using fallback mode')
    if (mapContainerRef.value && threeLayerRef.value) {
      initThreeScene()
      render()
      emit('map-ready')
    }
  })

  map.on('mapmove', updateCameraFromMap)
  map.on('zoomchange', updateCameraFromMap)
  map.on('rotatechange', updateCameraFromMap)
  map.on('pitchchange', updateCameraFromMap)
}

const emit = defineEmits<{
  (e: 'map-ready'): void
}>()

const getScene = () => scene
const getCamera = () => camera
const getMap = () => map

onMounted(() => {
  if (window.AMap) {
    initMap()
  } else {
    const checkAMap = setInterval(() => {
      if (window.AMap) {
        clearInterval(checkAMap)
        initMap()
      }
    }, 100)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (map) {
    map.off('mapmove', updateCameraFromMap)
    map.off('zoomchange', updateCameraFromMap)
    map.off('rotatechange', updateCameraFromMap)
    map.off('pitchchange', updateCameraFromMap)
    map.destroy()
  }
  if (renderer) {
    renderer.dispose()
  }
})

defineExpose({ getScene, getCamera, getMap, lngLatToWorld, createRoadNetwork, CENTER_LNG, CENTER_LAT })
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.three-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}
</style>
