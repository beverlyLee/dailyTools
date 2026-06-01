<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DragControls } from 'three/addons/controls/DragControls.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  CHAIR_PARTS,
  FULL_CHAIR_MODEL,
  isNearSlot,
  snapToSlot,
  distanceToSlot,
  playSnapSound,
  createWoodPBRMaterial,
  SNAP_DISTANCE,
  type PartSlot
} from '../utils/assemblyLogic'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const statusText = ref('正在加载 3D 模型资源…')
const loadingProgress = ref(0)
const loadedCount = ref(0)
const assembledCount = ref(0)
const totalCount = ref(CHAIR_PARTS.length)
const selectedInfo = ref<PartSlot | null>(null)
const isLoading = ref(true)
const showFullChair = ref(false)

let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let dragControls: DragControls
let raycaster: THREE.Raycaster
let mouse: THREE.Vector2
let partGroups: THREE.Group[] = []
let slotMarkers: THREE.Mesh[] = []
let draggableObjects: THREE.Object3D[] = []
let clock: THREE.Clock
let frameId = 0
let fullChairGroup: THREE.Group | null = null
let woodDiffuseMap: THREE.Texture | null = null
let woodRoughnessMap: THREE.Texture | null = null
let hoveredPart: THREE.Object3D | null = null
let draggedPart: THREE.Object3D | null = null
let isActuallyDragging = false
let dragStartScreenPos = { x: 0, y: 0 }
let currentScreenPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
let confettiParticles: THREE.Mesh[] = []
let confettiActive = false
let canvasElement: HTMLCanvasElement | null = null
let pointerDownHandler: ((e: PointerEvent) => void) | null = null
let pointerUpHandler: ((e: PointerEvent) => void) | null = null
let pointerMoveHandler: ((e: PointerEvent) => void) | null = null

function resize() {
  const canvas = renderer.domElement
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function updateMouse(e: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

function pick(): THREE.Object3D | null {
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(draggableObjects, true)
  if (hits.length > 0) {
    let obj: THREE.Object3D | null = hits[0].object
    while (obj && !obj.userData.partId) obj = obj.parent
    return obj
  }
  return null
}

function createSlotMarker(part: PartSlot): THREE.Mesh {
  const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd54a,
    transparent: true,
    opacity: 0.35,
    wireframe: true,
    depthTest: false
  })
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...part.position)
  m.userData.partId = part.id
  m.renderOrder = 999
  return m
}

function createProceduralPart(part: PartSlot): THREE.Group {
  const TENON_DEPTH = 0.06
  const TENON_SIZE = 0.055
  const group = new THREE.Group()

  const addMesh = (geo: THREE.BufferGeometry, color: number) => {
    const mesh = new THREE.Mesh(geo, createWoodPBRMaterial(color, woodDiffuseMap || undefined, woodRoughnessMap || undefined))
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  switch (part.id) {
    case 'seat': {
      addMesh(new THREE.BoxGeometry(0.78, 0.12, 0.92), part.color)
      const mortiseGeo = new THREE.BoxGeometry(TENON_SIZE, TENON_DEPTH, TENON_SIZE)
      const mortiseMat = new THREE.MeshStandardMaterial({ color: 0x3a2410, roughness: 0.8 })
      const mortisePositions = [[-0.32, -0.05, 0.42], [0.32, -0.05, 0.42], [-0.32, -0.05, -0.42], [0.32, -0.05, -0.42], [0, -0.05, -0.42]]
      for (const p of mortisePositions) {
        const m = new THREE.Mesh(mortiseGeo, mortiseMat)
        m.position.set(p[0], p[1], p[2])
        group.add(m)
      }
      break
    }
    case 'back': {
      addMesh(new THREE.BoxGeometry(0.72, 0.9, 0.06), part.color)
      const tenon = addMesh(new THREE.BoxGeometry(TENON_SIZE, TENON_DEPTH, TENON_SIZE), part.color)
      tenon.position.set(0, -0.45 - TENON_DEPTH / 2, 0)
      const railMat = new THREE.MeshStandardMaterial({ color: 0x6b4020, roughness: 0.75 })
      const railGeo = new THREE.BoxGeometry(0.72, 0.04, 0.04)
      const r1 = new THREE.Mesh(railGeo, railMat); r1.position.set(0, -0.3, 0.02); r1.castShadow = true; group.add(r1)
      const r2 = new THREE.Mesh(railGeo, railMat); r2.position.set(0, 0.2, 0.02); r2.castShadow = true; group.add(r2)
      break
    }
    case 'armFrontLeft':
    case 'armFrontRight': {
      addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 12), part.color)
      const tenon = addMesh(new THREE.BoxGeometry(TENON_SIZE, TENON_DEPTH, TENON_SIZE), part.color)
      tenon.position.set(0, 0.275 + TENON_DEPTH / 2, 0)
      break
    }
    case 'legBackLeft':
    case 'legBackRight': {
      addMesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 12), part.color)
      const topTenon = addMesh(new THREE.BoxGeometry(TENON_SIZE, TENON_DEPTH, TENON_SIZE), part.color)
      topTenon.position.set(0, 0.6 + TENON_DEPTH / 2, 0)
      const armTenon = addMesh(new THREE.BoxGeometry(TENON_SIZE, TENON_DEPTH, TENON_SIZE), part.color)
      armTenon.position.set(0, 0.45, 0)
      armTenon.rotation.x = Math.PI / 2
      break
    }
    case 'armLeft':
    case 'armRight': {
      addMesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), part.color)
      const t1 = addMesh(new THREE.BoxGeometry(TENON_SIZE, TENON_SIZE, TENON_DEPTH), part.color)
      t1.position.set(0, -0.02, 0.45 + TENON_DEPTH / 2)
      const t2 = addMesh(new THREE.BoxGeometry(TENON_SIZE, TENON_SIZE, TENON_DEPTH), part.color)
      t2.position.set(0, -0.02, -0.45 - TENON_DEPTH / 2)
      break
    }
    case 'stretcher': {
      addMesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), part.color)
      const t1 = addMesh(new THREE.BoxGeometry(TENON_DEPTH, TENON_SIZE, TENON_SIZE), part.color)
      t1.position.set(-0.275 - TENON_DEPTH / 2, 0, 0)
      const t2 = addMesh(new THREE.BoxGeometry(TENON_DEPTH, TENON_SIZE, TENON_SIZE), part.color)
      t2.position.set(0.275 + TENON_DEPTH / 2, 0, 0)
      break
    }
    default:
      addMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), part.color)
  }
  return group
}

function initScene(canvas: HTMLCanvasElement) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.outputColorSpace = THREE.SRGBColorSpace

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a20)

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
  camera.position.set(2.2, 1.6, 2.2)
  camera.lookAt(0, 0.7, 0)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.7, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 1.2
  controls.maxDistance = 6
  controls.maxPolarAngle = Math.PI / 2 - 0.1
  controls.mouseButtons = {
    LEFT: null as any,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  }
  controls.touches = {
    ONE: null as any,
    TWO: THREE.TOUCH.DOLLY_ROTATE
  }

  const hemi = new THREE.HemisphereLight(0xfff2dd, 0x332a22, 0.55)
  scene.add(hemi)

  const keyLight = new THREE.DirectionalLight(0xfff0d0, 1.2)
  keyLight.position.set(3, 4.5, 2.5)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.left = -3
  keyLight.shadow.camera.right = 3
  keyLight.shadow.camera.top = 3
  keyLight.shadow.camera.bottom = -3
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 12
  keyLight.shadow.bias = -0.0005
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.35)
  fillLight.position.set(-2.5, 2, -1.5)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xffddaa, 0.4)
  rimLight.position.set(-1, 3, -3)
  scene.add(rimLight)

  const envRT = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color(0x2a2a35)
  const envTex = envRT.fromScene(envScene, 0.04).texture
  scene.environment = envTex

  const groundGeo = new THREE.CircleGeometry(8, 64)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a32,
    roughness: 0.95,
    metalness: 0.02
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new THREE.GridHelper(6, 24, 0x444455, 0x333344)
  ;(grid.material as THREE.Material).opacity = 0.25
  ;(grid.material as THREE.Material).transparent = true
  scene.add(grid)

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  clock = new THREE.Clock()
}

function applyPBRMaterials(group: THREE.Group, baseColor: number) {
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.material = createWoodPBRMaterial(baseColor, woodDiffuseMap || undefined, woodRoughnessMap || undefined)
    }
  })
}

function scatterPart(group: THREE.Group) {
  const angle = Math.random() * Math.PI * 2
  const dist = 0.6 + Math.random() * 0.9
  group.position.set(
    Math.cos(angle) * dist,
    0.15 + Math.random() * 0.3,
    Math.sin(angle) * dist
  )
  group.rotation.set(
    (Math.random() - 0.5) * 0.4,
    Math.random() * Math.PI * 2,
    (Math.random() - 0.5) * 0.25
  )
}

async function loadTextures(): Promise<void> {
  const loader = new THREE.TextureLoader()
  return new Promise((resolve) => {
    let remaining = 2
    const done = () => { if (--remaining === 0) resolve() }

    loader.load(
      '/textures/wood-diffuse.png',
      (tex) => {
        woodDiffuseMap = tex
        woodDiffuseMap.colorSpace = THREE.SRGBColorSpace
        done()
      },
      undefined,
      () => { woodDiffuseMap = null; done() }
    )

    loader.load(
      '/textures/wood-roughness.png',
      (tex) => { woodRoughnessMap = tex; done() },
      undefined,
      () => { woodRoughnessMap = null; done() }
    )
  })
}

async function loadAllModels(): Promise<void> {
  const loader = new GLTFLoader()
  const totalToLoad = CHAIR_PARTS.length + 2
  let failedGLBs = 0

  await loadTextures()
  loadedCount.value++
  loadingProgress.value = Math.round((loadedCount.value / totalToLoad) * 100)

  try {
    const fullGLTF = await loader.loadAsync(FULL_CHAIR_MODEL, (prog) => {
      const p = (loadedCount.value + (prog.loaded / (prog.total || 1))) / totalToLoad
      loadingProgress.value = Math.min(99, Math.round(p * 100))
    })
    fullChairGroup = fullGLTF.scene as THREE.Group
    fullChairGroup.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const m = c as THREE.Mesh
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    fullChairGroup.position.set(0, 0, 0)
    fullChairGroup.rotation.set(0, 0, 0)
    fullChairGroup.visible = false
    scene.add(fullChairGroup)
    loadedCount.value++
    loadingProgress.value = Math.round((loadedCount.value / totalToLoad) * 100)
  } catch (e) {
    console.warn('Full chair model failed to load, creating procedurally:', e)
    fullChairGroup = new THREE.Group()
    for (const p of CHAIR_PARTS) {
      const proc = createProceduralPart(p)
      proc.position.set(p.position[0], p.position[1], p.position[2])
      if (p.rotation) proc.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2])
      fullChairGroup.add(proc)
    }
    fullChairGroup.position.set(0, 0, 0)
    fullChairGroup.visible = false
    scene.add(fullChairGroup)
    loadedCount.value++
    loadingProgress.value = Math.round((loadedCount.value / totalToLoad) * 100)
  }

  for (const part of CHAIR_PARTS) {
    let group: THREE.Group
    try {
      const gltf = await loader.loadAsync(part.modelPath, (prog) => {
        const base = loadedCount.value / totalToLoad
        const add = (prog.loaded / (prog.total || 1)) / totalToLoad
        loadingProgress.value = Math.min(99, Math.round((base + add) * 100))
      })
      group = gltf.scene as THREE.Group
      applyPBRMaterials(group, part.color)
    } catch (e) {
      failedGLBs++
      console.warn(`Failed to load ${part.id}.glb, using procedural fallback:`, e)
      group = createProceduralPart(part)
    }
    group.userData.partId = part.id
    group.userData.partSlot = part
    group.userData.locked = false
    group.userData.originalColor = part.color
    scatterPart(group)
    scene.add(group)
    partGroups.push(group)
    draggableObjects.push(group)
    loadedCount.value++
    loadingProgress.value = Math.round((loadedCount.value / totalToLoad) * 100)
  }

  for (const part of CHAIR_PARTS) {
    const marker = createSlotMarker(part)
    scene.add(marker)
    slotMarkers.push(marker)
  }

  setupDragControls()

  isLoading.value = false
  loadingProgress.value = 100
  if (failedGLBs > 0) {
    statusText.value = `准备就绪（${failedGLBs} 个模型使用程序生成）：拖动任一黄色部件靠近其目标插槽即可自动「咔哒」归位`
  } else {
    statusText.value = '准备就绪：拖动任一黄色部件靠近其目标插槽即可自动「咔哒」归位'
  }
}

function setupDragControls() {
  dragControls = new DragControls(draggableObjects, camera, renderer.domElement)
  dragControls.transformGroup = true

  dragControls.addEventListener('dragstart', (e) => {
    if (e.object.userData.locked) {
      dragControls.enabled = false
      requestAnimationFrame(() => { dragControls.enabled = true })
      return
    }
    draggedPart = e.object
    isActuallyDragging = false
    dragStartScreenPos = { x: currentScreenPos.x, y: currentScreenPos.y }
    controls.enabled = false
    const part: PartSlot = draggedPart.userData.partSlot
    selectedInfo.value = part
  })

  dragControls.addEventListener('drag', () => {
    if (!draggedPart || draggedPart.userData.locked) return
    const dx = Math.abs(currentScreenPos.x - dragStartScreenPos.x)
    const dy = Math.abs(currentScreenPos.y - dragStartScreenPos.y)
    if (!isActuallyDragging && (dx > 3 || dy > 3)) {
      isActuallyDragging = true
      draggedPart.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
          const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
          mat.emissive.setHex(0x2b1a06)
        }
      })
    }
    if (!isActuallyDragging) return

    const part: PartSlot = draggedPart.userData.partSlot
    const dist = distanceToSlot(draggedPart, part)
    const marker = slotMarkers.find(m => m.userData.partId === part.id)
    if (marker) {
      const near = isNearSlot(draggedPart, part)
      ;(marker.material as THREE.MeshBasicMaterial).opacity = near ? 0.75 : 0.25
      ;(marker.material as THREE.MeshBasicMaterial).color.setHex(near ? 0x6dff6d : 0xffd54a)
      marker.scale.setScalar(near ? 1.6 : 1.0)
    }
    statusText.value = `正在拖动「${part.name}」，距离目标 ${dist.toFixed(2)} / ${SNAP_DISTANCE.toFixed(2)}`
  })

  dragControls.addEventListener('dragend', (e) => {
    controls.enabled = true

    if (!isActuallyDragging) {
      draggedPart = null
      isActuallyDragging = false
      return
    }

    const part: PartSlot = e.object.userData.partSlot
    e.object.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
        const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
        mat.emissive.setHex(0x000000)
      }
    })

    const dist = distanceToSlot(e.object, part)
    if (isNearSlot(e.object, part) && !e.object.userData.locked) {
      snapToSlot(e.object, part)
      e.object.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
          const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
          mat.color.setHex(0x5c3a18)
        }
      })
      playSnapSound()
      const marker = slotMarkers.find(m => m.userData.partId === part.id)
      if (marker) marker.visible = false
      updateAssembledCount()
      if (assembledCount.value < totalCount.value) {
        statusText.value = `「${part.name}」已归位 — ${part.description}`
      }
    } else {
      statusText.value = `「${part.name}」还未靠近正确位置（距离 ${dist.toFixed(2)}，需 ≤ ${SNAP_DISTANCE.toFixed(2)}）`
    }
    draggedPart = null
    isActuallyDragging = false
  })

  dragControls.addEventListener('hoveron', (e) => {
    let obj: THREE.Object3D | null = e.object
    while (obj && !obj.userData.partId) obj = obj.parent
    hoveredPart = obj
    if (hoveredPart && !hoveredPart.userData.locked && !isActuallyDragging && hoveredPart !== draggedPart) {
      hoveredPart.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
          const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
          mat.emissive.setHex(0x1a0f04)
        }
      })
    }
  })

  dragControls.addEventListener('hoveroff', () => {
    if (hoveredPart && !isActuallyDragging && hoveredPart !== draggedPart && !hoveredPart.userData.locked) {
      hoveredPart.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
          const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
          mat.emissive.setHex(0x000000)
        }
      })
    }
    hoveredPart = null
  })
}

function updateAssembledCount() {
  const prevCount = assembledCount.value
  assembledCount.value = partGroups.filter(g => g.userData.locked).length
  if (assembledCount.value === totalCount.value && prevCount < totalCount.value) {
    statusText.value = '🎉 全部榫卯部件组装完成！椅子完整呈现。'
    triggerCelebration()
  }
}

function triggerCelebration() {
  if (confettiActive) return
  confettiActive = true
  const colors = [0xffd54a, 0x6dff6d, 0xff6b6b, 0x4ecdc4, 0xff9a76, 0xa8e6cf]
  for (let i = 0; i < 80; i++) {
    const geo = new THREE.BoxGeometry(0.06 + Math.random() * 0.08, 0.02 + Math.random() * 0.04, 0.01 + Math.random() * 0.03)
    const mat = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.4,
      metalness: 0.1,
      emissive: colors[Math.floor(Math.random() * colors.length)],
      emissiveIntensity: 0.5
    })
    const particle = new THREE.Mesh(geo, mat)
    particle.position.set(
      (Math.random() - 0.5) * 0.5,
      1.0 + Math.random() * 0.8,
      (Math.random() - 0.5) * 0.5
    )
    particle.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      2 + Math.random() * 3,
      (Math.random() - 0.5) * 3
    )
    particle.userData.rot = new THREE.Vector3(
      Math.random() * 10 - 5,
      Math.random() * 10 - 5,
      Math.random() * 10 - 5
    )
    particle.userData.life = 0
    scene.add(particle)
    confettiParticles.push(particle)
  }
  setTimeout(() => {
    confettiActive = false
  }, 4000)
}

function updateConfetti(dt: number) {
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i]
    p.userData.life += dt
    if (p.userData.life > 3.5) {
      scene.remove(p)
      p.geometry.dispose()
      ;(p.material as THREE.Material).dispose()
      confettiParticles.splice(i, 1)
      continue
    }
    p.userData.vel.y -= 9.8 * dt
    p.position.addScaledVector(p.userData.vel, dt)
    p.rotation.x += p.userData.rot.x * dt
    p.rotation.y += p.userData.rot.y * dt
    p.rotation.z += p.userData.rot.z * dt
    const fade = 1 - Math.min(1, p.userData.life / 3.5)
    ;(p.material as THREE.MeshStandardMaterial).opacity = fade
    ;(p.material as THREE.MeshStandardMaterial).transparent = true
    ;(p.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 * fade
  }
}

function animate() {
  frameId = requestAnimationFrame(animate)
  const dt = clock.getDelta()
  controls.update()

  for (const group of partGroups) {
    const part: PartSlot = group.userData.partSlot
    if (!group.userData.locked && group !== draggedPart) {
      const marker = slotMarkers.find(m => m.userData.partId === part.id)
      if (marker) {
        const near = isNearSlot(group, part)
        ;(marker.material as THREE.MeshBasicMaterial).opacity = near ? 0.55 : 0.2
        ;(marker.material as THREE.MeshBasicMaterial).color.setHex(near ? 0x6dff6d : 0xffd54a)
        marker.scale.setScalar(near ? 1.2 : 1.0)
        marker.rotation.y += dt * 0.6
      }
    }
  }

  if (confettiParticles.length > 0) {
    updateConfetti(dt)
  }

  renderer.render(scene, camera)
}

function explodeAll() {
  for (const group of partGroups) {
    group.userData.locked = false
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
        const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
        mat.color.setHex(group.userData.originalColor)
        mat.emissive.setHex(0x000000)
      }
    })
    scatterPart(group)
    const part: PartSlot = group.userData.partSlot
    const marker = slotMarkers.find(m => m.userData.partId === part.id)
    if (marker) {
      marker.visible = true
      ;(marker.material as THREE.MeshBasicMaterial).opacity = 0.25
      ;(marker.material as THREE.MeshBasicMaterial).color.setHex(0xffd54a)
    }
  }
  if (fullChairGroup) fullChairGroup.visible = false
  showFullChair.value = false
  selectedInfo.value = null
  for (const p of confettiParticles) {
    scene.remove(p)
    p.geometry.dispose()
    ;(p.material as THREE.Material).dispose()
  }
  confettiParticles = []
  confettiActive = false
  updateAssembledCount()
  statusText.value = '已重置：拖动任一部件靠近其目标位置即可自动归位'
}

function assembleAll() {
  assembledCount.value = 0
  for (const group of partGroups) {
    const part: PartSlot = group.userData.partSlot
    snapToSlot(group, part)
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
        const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
        mat.color.setHex(0x5c3a18)
        mat.emissive.setHex(0x000000)
      }
    })
    const marker = slotMarkers.find(m => m.userData.partId === part.id)
    if (marker) marker.visible = false
  }
  playSnapSound()
  updateAssembledCount()
}

function toggleFullChair() {
  showFullChair.value = !showFullChair.value
  if (fullChairGroup) {
    fullChairGroup.visible = showFullChair.value
  }
}

onMounted(async () => {
  if (!canvasRef.value) return
  canvasElement = canvasRef.value
  initScene(canvasElement)
  resize()
  animate()
  window.addEventListener('resize', resize)

  pointerMoveHandler = (e: PointerEvent) => {
    currentScreenPos = { x: e.clientX, y: e.clientY }
  }
  window.addEventListener('pointermove', pointerMoveHandler)

  pointerDownHandler = (e: PointerEvent) => {
    if (e.button !== 0) return
    updateMouse(e)
    const picked = pick()
    if (picked && !picked.userData.locked) {
      const part: PartSlot = picked.userData.partSlot
      selectedInfo.value = part
    }
  }
  pointerUpHandler = (e: PointerEvent) => {
    if (e.button !== 0 || isActuallyDragging) return
    updateMouse(e)
    const picked = pick()
    if (!picked) {
      selectedInfo.value = null
    }
  }

  canvasElement.addEventListener('pointerdown', pointerDownHandler)
  window.addEventListener('pointerup', pointerUpHandler)

  try {
    await loadAllModels()
  } catch (e) {
    console.error(e)
    statusText.value = '模型加载失败，请刷新重试'
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  window.removeEventListener('resize', resize)
  if (pointerMoveHandler) {
    window.removeEventListener('pointermove', pointerMoveHandler)
  }
  if (pointerUpHandler) {
    window.removeEventListener('pointerup', pointerUpHandler)
  }
  if (canvasElement && pointerDownHandler) {
    canvasElement.removeEventListener('pointerdown', pointerDownHandler)
  }
  if (woodDiffuseMap) woodDiffuseMap.dispose()
  if (woodRoughnessMap) woodRoughnessMap.dispose()
  for (const p of confettiParticles) {
    p.geometry.dispose()
    ;(p.material as THREE.Material).dispose()
  }
  confettiParticles = []
  controls?.dispose()
  dragControls?.dispose()
  renderer?.dispose()
})

const progress = computed(() => Math.round((assembledCount.value / totalCount.value) * 100))
</script>

<template>
  <div class="wrapper">
    <canvas ref="canvasRef" class="stage"></canvas>

    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-card">
          <div class="spinner"></div>
          <div class="loading-title">榫卯椅 · 3D 模型加载中</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
          </div>
          <div class="loading-text">{{ statusText }} ({{ loadingProgress }}%)</div>
        </div>
      </div>
    </Transition>

    <div class="hud">
      <div class="status">{{ statusText }}</div>
      <div class="progress">
        <div class="bar" :style="{ width: progress + '%' }"></div>
        <span>{{ assembledCount }} / {{ totalCount }} 部件已归位</span>
      </div>
      <div class="actions">
        <button @click="explodeAll">重置（拆散开）</button>
        <button @click="assembleAll">一键组装</button>
        <button @click="toggleFullChair" :class="{ active: showFullChair }">
          {{ showFullChair ? '隐藏' : '显示' }}参考模型
        </button>
      </div>
      <div v-if="selectedInfo" class="selected">
        <div><b>{{ selectedInfo.name }}</b></div>
        <div class="desc">{{ selectedInfo.description }}</div>
      </div>
      <div class="tips">
        <div>🖱️ 左键拖拽部件 · 右键拖拽旋转视角 · 滚轮缩放</div>
        <div>📍 绿色标记 = 可吸附 · 黄色标记 = 目标插槽</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
}
.stage {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 20, 28, 0.9);
  backdrop-filter: blur(6px);
  z-index: 50;
}
.loading-card {
  padding: 36px 48px;
  background: rgba(35, 35, 45, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  text-align: center;
  min-width: 320px;
}
.spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  border: 3px solid rgba(255, 213, 74, 0.2);
  border-top-color: #ffd54a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffd54a;
  margin-bottom: 16px;
  letter-spacing: 1px;
}
.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd54a, #6dff6d);
  transition: width 0.25s ease;
}
.loading-text {
  font-size: 12px;
  color: #aaa;
}

.hud {
  position: absolute;
  left: 14px;
  bottom: 14px;
  max-width: 380px;
  padding: 12px 14px;
  background: rgba(15, 15, 22, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #eee;
  font-size: 12px;
  backdrop-filter: blur(10px);
  z-index: 5;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.status { margin-bottom: 8px; line-height: 1.6; }
.progress {
  position: relative;
  height: 18px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  overflow: hidden;
  margin-bottom: 10px;
}
.progress .bar {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  background: linear-gradient(90deg, #6dff6d, #ffd54a);
  transition: width 0.3s ease;
}
.progress span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #1a1a20;
  font-weight: 700;
}
.actions {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.actions button {
  flex: 1;
  min-width: 80px;
  background: rgba(255, 255, 255, 0.08);
  color: #eee;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.actions button:hover {
  background: rgba(255, 213, 74, 0.15);
  border-color: rgba(255, 213, 74, 0.4);
}
.actions button.active {
  background: rgba(255, 213, 74, 0.25);
  border-color: #ffd54a;
  color: #ffd54a;
}
.selected {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 4px;
}
.selected .desc { color: #bbb; margin-top: 4px; line-height: 1.6; }
.tips {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 8px;
  font-size: 10.5px;
  color: #888;
  line-height: 1.8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
