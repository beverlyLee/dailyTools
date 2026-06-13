<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { ShoeCabinet, ErgonomicsResult } from '../types'
import { checkErgonomics } from '../utils/calculations'

const props = defineProps<{
  cabinetConfig: ShoeCabinet
}>()

const containerRef = ref<HTMLDivElement>()
const aisleWidth = ref(90)
const bendingAngle = ref(70)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number

const ergonomicsResult = computed(() => {
  return checkErgonomics(props.cabinetConfig.depth, aisleWidth.value)
})

const actionPhases = [
  { name: '站立', angle: 0, icon: '🧍' },
  { name: '弯腰', angle: 45, icon: '🙎' },
  { name: '取鞋', angle: 70, icon: '🤦' },
  { name: '穿鞋', angle: 85, icon: '🦶' },
  { name: '起身', angle: 45, icon: '🙎' },
  { name: '完成', angle: 0, icon: '🧍' }
]

function initScene() {
  if (!containerRef.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  const width = containerRef.value.clientWidth
  const height = 400

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
  camera.position.set(2.5, 1.5, 3)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 0.5, 0)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 5, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  createFloor()
  createCabinet()
  createHuman()
  createDustArea()

  animate()
}

function createFloor() {
  const floorGeometry = new THREE.PlaneGeometry(10, 10)
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4c5a9,
    roughness: 0.8
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
}

function createCabinet() {
  const { width, depth, height } = props.cabinetConfig
  const scale = 0.02

  const cabinetGroup = new THREE.Group()

  const material = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.6
  })

  const frameGeometry = new THREE.BoxGeometry(width * scale, height * scale, depth * scale)
  const frame = new THREE.Mesh(frameGeometry, material)
  frame.position.set(-1, (height * scale) / 2, 0)
  frame.castShadow = true
  frame.receiveShadow = true
  cabinetGroup.add(frame)

  const shelfCount = 3
  const shelfHeight = (height * scale) / (shelfCount + 1)

  for (let i = 1; i <= shelfCount; i++) {
    const shelfGeometry = new THREE.BoxGeometry(width * scale - 0.02, 0.02, depth * scale)
    const shelf = new THREE.Mesh(shelfGeometry, material)
    shelf.position.set(-1, shelfHeight * i, 0)
    shelf.castShadow = true
    cabinetGroup.add(shelf)
  }

  scene.add(cabinetGroup)
}

function createHuman() {
  const humanGroup = new THREE.Group()

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90d9,
    roughness: 0.5
  })

  const headGeometry = new THREE.SphereGeometry(0.08, 32, 32)
  const head = new THREE.Mesh(headGeometry, bodyMaterial)
  head.position.y = 1.5
  humanGroup.add(head)

  const torsoGeometry = new THREE.BoxGeometry(0.3, 0.6, 0.15)
  const torso = new THREE.Mesh(torsoGeometry, bodyMaterial)
  torso.position.y = 1.1
  humanGroup.add(torso)

  const legGeometry = new THREE.BoxGeometry(0.1, 0.7, 0.1)
  const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial)
  leftLeg.position.set(-0.08, 0.35, 0)
  humanGroup.add(leftLeg)

  const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial)
  rightLeg.position.set(0.08, 0.35, 0)
  humanGroup.add(rightLeg)

  humanGroup.position.set(0.8, 0, 0.5)

  scene.add(humanGroup)
}

function createDustArea() {
  const dustGeometry = new THREE.PlaneGeometry(1.5, 2)
  const dustMaterial = new THREE.MeshBasicMaterial({
    color: 0xc9b99a,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  })
  const dustArea = new THREE.Mesh(dustGeometry, dustMaterial)
  dustArea.rotation.x = -Math.PI / 2
  dustArea.position.set(0.3, 0.01, 1)
  scene.add(dustArea)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  controls.update()
  renderer.render(scene, camera)
}

function handleResize() {
  if (!containerRef.value || !camera || !renderer) return

  const width = containerRef.value.clientWidth
  const height = 400

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
}

watch(() => props.cabinetConfig, () => {
  if (scene) {
    scene.children
      .filter(child => child instanceof THREE.Group && child.children.length > 2)
      .forEach(child => scene.remove(child))
    createCabinet()
  }
}, { deep: true })

watch(aisleWidth, () => {
  if (scene) {
    const human = scene.children.find(child =>
      child instanceof THREE.Group && child.children.length === 4
    )
    if (human) {
      human.position.z = 0.5 + (90 - aisleWidth.value) * 0.01
    }
  }
})

onMounted(() => {
  initScene()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', handleResize)
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<template>
  <div class="shoe-fitting-sim">
    <h3 class="section-title">
      <span class="icon">🧍</span>
      穿鞋动作模拟
    </h3>

    <div ref="containerRef" class="scene-container"></div>

    <div class="controls-panel">
      <div class="control-row">
        <label class="control-label">
          <span>🚶</span> 走道宽度
        </label>
        <input
          type="range"
          v-model.number="aisleWidth"
          min="50"
          max="120"
          class="slider"
        />
        <span class="control-value">{{ aisleWidth }} cm</span>
      </div>

      <div class="control-row">
        <label class="control-label">
          <span>📐</span> 弯腰角度
        </label>
        <input
          type="range"
          v-model.number="bendingAngle"
          min="0"
          max="90"
          class="slider"
        />
        <span class="control-value">{{ bendingAngle }}°</span>
      </div>
    </div>

    <div class="phases-indicator">
      <div
        v-for="(phase, index) in actionPhases"
        :key="index"
        :class="['phase-item', { active: Math.abs(bendingAngle - phase.angle) < 15 }]"
      >
        <span class="phase-icon">{{ phase.icon }}</span>
        <span class="phase-name">{{ phase.name }}</span>
      </div>
    </div>

    <div class="result-panel">
      <div :class="['feasibility-badge', { pass: ergonomicsResult.isFeasible, fail: !ergonomicsResult.isFeasible }]">
        {{ ergonomicsResult.isFeasible ? '✓ 空间可行' : '✗ 空间不足' }}
      </div>

      <div class="metrics">
        <div class="metric-item">
          <span class="metric-icon">📏</span>
          <div class="metric-info">
            <span class="metric-label">最小走道宽度</span>
            <span class="metric-value">{{ ergonomicsResult.minAisleWidth }} cm</span>
          </div>
        </div>

        <div class="metric-item">
          <span class="metric-icon">🦶</span>
          <div class="metric-info">
            <span class="metric-label">脚部伸展</span>
            <span class="metric-value">{{ ergonomicsResult.kickClearance }} cm</span>
          </div>
        </div>
      </div>

      <div v-if="ergonomicsResult.warnings.length > 0" class="warnings">
        <div class="warnings-title">
          <span>⚠️</span> 人体工学提醒
        </div>
        <ul class="warnings-list">
          <li v-for="(warning, index) in ergonomicsResult.warnings" :key="index">
            {{ warning }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shoe-fitting-sim {
  padding: var(--space-lg);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.icon {
  font-size: 1.5rem;
}

.scene-container {
  width: 100%;
  height: 400px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-scene);
  margin-bottom: var(--space-lg);
}

.controls-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-card);
  border-radius: var(--radius-md);
}

.control-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.control-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 100px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-secondary);
  border-radius: 3px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
}

.control-value {
  min-width: 70px;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
}

.phases-indicator {
  display: flex;
  justify-content: space-between;
  gap: var(--space-xs);
  margin-bottom: var(--space-lg);
  padding: var(--space-sm);
  background: var(--bg-card);
  border-radius: var(--radius-md);
}

.phase-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  transition: all 0.3s;
  opacity: 0.5;
}

.phase-item.active {
  background: var(--color-primary);
  color: white;
  opacity: 1;
  transform: scale(1.05);
}

.phase-icon {
  font-size: 1.25rem;
  margin-bottom: var(--space-xs);
}

.phase-name {
  font-size: 0.75rem;
  font-weight: 600;
}

.result-panel {
  padding: var(--space-lg);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
}

.feasibility-badge {
  display: inline-block;
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: var(--space-md);
}

.feasibility-badge.pass {
  background: rgba(44, 85, 48, 0.1);
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.feasibility-badge.fail {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border: 2px solid #dc3545;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.metric-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
}

.metric-icon {
  font-size: 1.5rem;
}

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.metric-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.warnings {
  padding: var(--space-md);
  background: rgba(232, 168, 56, 0.1);
  border-left: 4px solid var(--color-accent);
  border-radius: var(--radius-md);
}

.warnings-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: var(--space-sm);
}

.warnings-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.warnings-list li {
  position: relative;
  padding-left: var(--space-md);
  margin-bottom: var(--space-xs);
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.warnings-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-accent);
}
</style>
