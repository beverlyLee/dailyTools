<template>
  <div class="scene-container">
    <canvas ref="canvasRef"></canvas>
    <div style="position: absolute; top: 20px; left: 20px; background: rgba(10, 14, 20, 0.85); padding: 14px 20px; border-radius: 10px; border: 1px solid #2a3040; pointer-events: none;">
      <div style="font-size: 16px; font-weight: 600; color: #4fc3f7; margin-bottom: 6px;">毫米波雷达存在传感器模拟器</div>
      <div style="font-size: 12px; color: #90a4ae;">旋转视角: 鼠标左键拖动 | 平移: 右键拖动 | 缩放: 滚轮</div>
    </div>
  </div>
  <div class="control-panel">
    <div class="panel-title">控制面板</div>

    <div class="status-card" :class="humanDetected ? 'detected' : 'undetected'">
      <div class="status-row">
        <span class="status-label">人体检测状态</span>
        <span class="status-value" :class="humanDetected ? 'on' : 'off'">
          {{ humanDetected ? '✓ 检测到人体' : '✗ 未检测到' }}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">微动信号强度</span>
        <span class="status-value info">{{ microMotionSignal.toFixed(2) }} dB</span>
      </div>
      <div class="status-row">
        <span class="status-label">信号语义</span>
        <span class="status-value" :style="{ color: signalSemantic.color, fontWeight: 600 }">
          {{ signalSemantic.text }}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">遮挡程度</span>
        <span class="status-value" :class="occlusionLevel > 0.5 ? 'warn' : 'info'">
          {{ (occlusionLevel * 100).toFixed(0) }}%
        </span>
      </div>
    </div>

    <div class="status-card" :class="lightOn ? 'detected' : 'undetected'">
      <div class="status-row">
        <span class="status-label">灯光状态</span>
        <span class="status-value" :class="lightOn ? 'on' : 'off'">
          {{ lightOn ? '💡 灯光开启' : '🌙 灯光关闭' }}
        </span>
      </div>
      <div class="status-row">
        <span class="status-label">延时倒计时</span>
        <span class="status-value info">{{ delayCountdown.toFixed(1) }} s</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: delayProgress + '%' }"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span>1. 雷达参数</div>
      <div class="form-group">
        <div class="form-label">
          <span>雷达类型</span>
        </div>
        <select class="select" v-model="radarType">
          <option value="sector">扇形雷达（定向 FoV）</option>
          <option value="sphere">球形雷达（全向 360°）</option>
        </select>
      </div>
      <div class="form-group">
        <div class="form-label">
          <span>水平 FoV 角度</span>
          <span class="value">{{ horizontalFov }}°</span>
        </div>
        <input class="slider" type="range" min="30" max="180" step="5" v-model.number="horizontalFov" />
      </div>
      <div class="form-group">
        <div class="form-label">
          <span>垂直 FoV 角度</span>
          <span class="value">{{ verticalFov }}°</span>
        </div>
        <input class="slider" type="range" min="20" max="120" step="5" v-model.number="verticalFov" />
      </div>
      <div class="form-group">
        <div class="form-label">
          <span>探测距离</span>
          <span class="value">{{ detectionRange }} m</span>
        </div>
        <input class="slider" type="range" min="2" max="15" step="0.5" v-model.number="detectionRange" />
      </div>
      <div class="form-group">
        <div class="form-label">
          <span>安装高度</span>
          <span class="value">{{ radarHeight }} m</span>
        </div>
        <input class="slider" type="range" min="1.5" max="4" step="0.1" v-model.number="radarHeight" />
      </div>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span>2. 人体微动模拟</div>
      <div class="form-group">
        <div class="form-label">
          <span>微动模式</span>
        </div>
        <select class="select" v-model="motionMode">
          <option value="breathing">静止呼吸（玩手机/看电视）</option>
          <option value="sitting">坐姿微动</option>
          <option value="walking">步行移动</option>
        </select>
      </div>
      <div class="form-group">
        <div class="form-label">
          <span>呼吸频率</span>
          <span class="value">{{ breathRate }} 次/分</span>
        </div>
        <input class="slider" type="range" min="8" max="25" step="1" v-model.number="breathRate" />
      </div>
      <div class="form-group">
        <div class="form-label">
          <span>微动幅度</span>
          <span class="value">{{ motionAmplitude }} mm</span>
        </div>
        <input class="slider" type="range" min="0.1" max="10" step="0.1" v-model.number="motionAmplitude" />
      </div>
      <button class="btn btn-secondary" @click="toggleHumanPosition">
        {{ humanOnSofa ? '🚶 让人体离开沙发' : '🛋️ 让人体坐在沙发上' }}
      </button>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span>3. 灯光联动</div>
      <div class="form-group">
        <div class="form-label">
          <span>延时关闭时间</span>
          <span class="value">{{ lightDelay }} s</span>
        </div>
        <input class="slider" type="range" min="1" max="60" step="1" v-model.number="lightDelay" />
      </div>
      <div class="form-group">
        <div class="form-label">
          <span>检测灵敏度</span>
          <span class="value">{{ sensitivity }}</span>
        </div>
        <input class="slider" type="range" min="0.1" max="1" step="0.05" v-model.number="sensitivity" />
      </div>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span>4. 图例说明</div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: rgba(79, 195, 247, 0.3); border: 1px solid #4fc3f7;"></div>
          <span>雷达探测范围</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ff9800;"></div>
          <span>人体模型</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #795548;"></div>
          <span>沙发/家具</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: rgba(244, 67, 54, 0.3); border: 1px solid #f44336;"></div>
          <span>遮挡死角</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: radial-gradient(circle, #ffeb3b 0%, transparent 70%);"></div>
          <span>灯光照射</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title"><span class="dot"></span>5. 快捷操作</div>
      <button class="btn" @click="resetView">🎯 重置视角</button>
      <button class="btn btn-secondary" @click="runScenario">📊 运行完整场景演示</button>
    </div>

    <div style="margin-top: 16px; padding: 12px; background: rgba(76, 175, 80, 0.08); border: 1px solid rgba(76, 175, 80, 0.2); border-radius: 8px;">
      <div style="font-size: 12px; color: #81c784; font-weight: 500; margin-bottom: 4px;">✅ 系统说明</div>
      <div style="font-size: 11px; color: #a5d6a7; line-height: 1.6;">
        本系统模拟毫米波雷达 60GHz 频段的存在检测能力，通过 FMCW 技术捕捉毫米级的呼吸微动信号，解决传统 PIR 传感器"人在灯灭"的误判问题。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, reactive } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const canvasRef = ref<HTMLCanvasElement | null>(null)

const radarType = ref<'sector' | 'sphere'>('sector')
const horizontalFov = ref(120)
const verticalFov = ref(80)
const detectionRange = ref(8)
const radarHeight = ref(2.8)
const breathRate = ref(16)
const motionAmplitude = ref(2)
const motionMode = ref<'breathing' | 'sitting' | 'walking'>('breathing')
const lightDelay = ref(10)
const sensitivity = ref(0.3)
const humanOnSofa = ref(true)

const humanDetected = ref(false)
const microMotionSignal = ref(0)
const occlusionLevel = ref(0)
const lightOn = ref(false)
const delayCountdown = ref(0)
const delayProgress = computed(() => {
  if (humanDetected.value) return 100
  return Math.max(0, (delayCountdown.value / lightDelay.value) * 100)
})
const signalSemantic = computed(() => {
  if (!detectionVolumeMesh) return { text: '初始化中', color: '#90a4ae' }
  if (!humanGroup) return { text: '—', color: '#90a4ae' }
  const humanCenter = humanGroup.position.clone()
  humanCenter.y += 1.2
  const inVol = isPointInDetectionVolume(humanCenter)
  if (!inVol) {
    return { text: '超出探测范围', color: '#ef5350' }
  }
  if (occlusionLevel.value > 0.6) {
    return { text: '强遮挡衰减', color: '#ff9800' }
  } else if (occlusionLevel.value > 0.25) {
    return { text: '部分遮挡', color: '#ffc107' }
  } else {
    return { text: '正常探测', color: '#66bb6a' }
  }
})

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationFrameId: number
let clock: THREE.Clock

let radarMesh: THREE.Group | null = null
let detectionVolumeMesh: THREE.Mesh | null = null
let humanGroup: THREE.Group | null = null
let roomGroup: THREE.Group | null = null
let sofaGroup: THREE.Group | null = null
let wardrobeGroup: THREE.Group | null = null
let lightMesh: THREE.PointLight | null = null
let lightBulbMesh: THREE.Mesh | null = null
let lightCone: THREE.Mesh | null = null
let occlusionZones: THREE.Mesh[] = []
let radarBeamLines: THREE.Line[] = []
let detectionHysteresisCounter = 0
const HYSTERESIS_FRAMES = 3

const humanConfig = reactive({
  basePosition: new THREE.Vector3(0, 0, -2),
  targetPosition: new THREE.Vector3(0, 0, -2),
  breathPhase: 0,
  walkPhase: 0,
  walkPath: [
    new THREE.Vector3(-0.8, 0, -4.2),
    new THREE.Vector3(-1.6, 0, -3.6),
    new THREE.Vector3(-2.5, 0, -3.1),
    new THREE.Vector3(-3.2, 0, -2.6),
    new THREE.Vector3(-4.2, 0, -1.5),
  ],
  walkIndex: 0,
  chestOriginalY: 1.3,
  headOriginalY: 1.65,
})

const radarConfig = reactive({
  position: new THREE.Vector3(-5.5, 2.8, -5.5),
  targetYaw: Math.PI / 3,
  targetPitch: -0.4,
})

function initScene() {
  if (!canvasRef.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0e14)
  scene.fog = new THREE.Fog(0x0a0e14, 20, 50)

  const rect = canvasRef.value.parentElement!.getBoundingClientRect()
  camera = new THREE.PerspectiveCamera(50, rect.width / rect.height, 0.1, 200)
  camera.position.set(10, 10, 10)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(rect.width, rect.height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxPolarAngle = Math.PI / 2.05
  controls.minDistance = 3
  controls.maxDistance = 30
  controls.target.set(0, 0.5, 0)

  clock = new THREE.Clock()

  addLights()
  createRoom()
  createRadar()
  createDetectionVolume()
  createFurniture()
  createHuman()
  createLightSystem()

  window.addEventListener('resize', onWindowResize)
  animate()
}

function addLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.35)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
  dirLight.position.set(8, 12, 6)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 50
  dirLight.shadow.camera.left = -15
  dirLight.shadow.camera.right = 15
  dirLight.shadow.camera.top = 15
  dirLight.shadow.camera.bottom = -15
  dirLight.shadow.bias = -0.0005
  scene.add(dirLight)

  const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3)
  fillLight.position.set(-5, 5, -5)
  scene.add(fillLight)
}

function createRoom() {
  roomGroup = new THREE.Group()

  const floorGeo = new THREE.PlaneGeometry(12, 12)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x3a3530,
    roughness: 0.85,
    metalness: 0.05,
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  roomGroup.add(floor)

  const gridHelper = new THREE.GridHelper(12, 24, 0x2a3040, 0x1a1f2b)
  gridHelper.position.y = 0.001
  roomGroup.add(gridHelper)

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe8e0d5,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.5), wallMat)
  backWall.position.set(0, 1.75, -6)
  backWall.receiveShadow = true
  roomGroup.add(backWall)

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.5), wallMat)
  leftWall.rotation.y = Math.PI / 2
  leftWall.position.set(-6, 1.75, 0)
  leftWall.receiveShadow = true
  roomGroup.add(leftWall)

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.5), wallMat)
  rightWall.rotation.y = -Math.PI / 2
  rightWall.position.set(6, 1.75, 0)
  rightWall.receiveShadow = true
  roomGroup.add(rightWall)

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0eb,
    roughness: 0.95,
    side: THREE.DoubleSide,
  })
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ceilingMat)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = 3.5
  roomGroup.add(ceiling)

  const wallFrameMat = new THREE.LineBasicMaterial({ color: 0x2a3040 })
  const corners = [
    [[-6, 0, -6], [6, 0, -6], [6, 3.5, -6], [-6, 3.5, -6], [-6, 0, -6]],
    [[-6, 0, -6], [-6, 0, 6], [-6, 3.5, 6], [-6, 3.5, -6]],
    [[6, 0, -6], [6, 0, 6], [6, 3.5, 6], [6, 3.5, -6]],
  ]
  corners.forEach(shape => {
    const pts = shape.map(p => new THREE.Vector3(...(p as [number, number, number])))
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
    roomGroup!.add(new THREE.Line(lineGeo, wallFrameMat))
  })

  scene.add(roomGroup)
}

function createRadar() {
  if (radarMesh) scene.remove(radarMesh)
  radarMesh = new THREE.Group()

  const baseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.08, 24)
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x37474f,
    roughness: 0.4,
    metalness: 0.7,
  })
  const base = new THREE.Mesh(baseGeo, baseMat)
  base.castShadow = true
  radarMesh.add(base)

  const domeGeo = radarType.value === 'sphere'
    ? new THREE.SphereGeometry(0.12, 32, 32)
    : new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x4fc3f7,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
    emissive: 0x1976d2,
    emissiveIntensity: 0.5,
  })
  const dome = new THREE.Mesh(domeGeo, domeMat)
  dome.position.y = -0.08
  dome.castShadow = true
  radarMesh.add(dome)

  const ledGeo = new THREE.SphereGeometry(0.02, 16, 16)
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x4caf50 })
  const led = new THREE.Mesh(ledGeo, ledMat)
  led.position.set(0, -0.14, -0.08)
  radarMesh.add(led)

  const antennaGroup = new THREE.Group()
  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0x8d6e63,
    roughness: 0.6,
    metalness: 0.3,
  })
  if (radarType.value === 'sector') {
    for (let i = -1; i <= 1; i++) {
      const ant = new THREE.Mesh(
        new THREE.ConeGeometry(0.015, 0.12, 8),
        antennaMat
      )
      ant.position.set(i * 0.05, -0.14, -0.1)
      ant.rotation.x = -Math.PI / 3
      antennaGroup.add(ant)
    }
  }
  radarMesh.add(antennaGroup)

  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 256
  labelCanvas.height = 64
  const ctx = labelCanvas.getContext('2d')!
  ctx.fillStyle = 'rgba(10, 14, 20, 0.9)'
  ctx.roundRect(0, 0, 256, 64, 8)
  ctx.fill()
  ctx.strokeStyle = '#4fc3f7'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#4fc3f7'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('毫米波雷达', 128, 22)
  ctx.fillStyle = '#90a4ae'
  ctx.font = '16px sans-serif'
  ctx.fillText('60GHz FMCW', 128, 46)
  const labelTex = new THREE.CanvasTexture(labelCanvas)
  labelTex.colorSpace = THREE.SRGBColorSpace
  labelTex.format = THREE.RGBAFormat
  labelTex.type = THREE.UnsignedByteType
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true })
  const label = new THREE.Sprite(labelMat)
  label.scale.set(1, 0.25, 1)
  label.position.set(0, -0.55, 0)
  radarMesh.add(label)

  radarMesh.position.copy(radarConfig.position)
  radarMesh.position.y = radarHeight.value
  radarMesh.rotation.set(Math.PI + radarConfig.targetPitch, radarConfig.targetYaw, 0)
  scene.add(radarMesh)
}

function createDetectionVolume() {
  if (detectionVolumeMesh) {
    scene.remove(detectionVolumeMesh)
    detectionVolumeMesh.geometry.dispose()
  }

  const geo = radarType.value === 'sphere'
    ? new THREE.SphereGeometry(detectionRange.value, 48, 32)
    : createFanGeometry(
        detectionRange.value,
        (horizontalFov.value * Math.PI) / 180,
        (verticalFov.value * Math.PI) / 180,
        36,
        24
      )

  const mat = new THREE.MeshBasicMaterial({
    color: 0x4fc3f7,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  detectionVolumeMesh = new THREE.Mesh(geo, mat)

  const edgesGeo = new THREE.EdgesGeometry(geo, 30)
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0x4fc3f7,
    transparent: true,
    opacity: 0.4,
  })
  const edges = new THREE.LineSegments(edgesGeo, edgesMat)
  detectionVolumeMesh.add(edges)

  detectionVolumeMesh.position.copy(radarConfig.position)
  detectionVolumeMesh.position.y = radarHeight.value
  detectionVolumeMesh.rotation.set(radarConfig.targetPitch, radarConfig.targetYaw, 0)
  scene.add(detectionVolumeMesh)
}

function createFanGeometry(
  radius: number,
  horizontalAngle: number,
  verticalAngle: number,
  widthSegments: number,
  heightSegments: number
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const vertices: number[] = []
  const indices: number[] = []
  const hStart = -horizontalAngle / 2
  const vStart = -verticalAngle / 2
  const hStep = horizontalAngle / widthSegments
  const vStep = verticalAngle / heightSegments

  vertices.push(0, 0, 0)

  for (let i = 0; i <= heightSegments; i++) {
    const v = vStart + i * vStep
    const cosV = Math.cos(v)
    const sinV = Math.sin(v)
    for (let j = 0; j <= widthSegments; j++) {
      const h = hStart + j * hStep
      const x = radius * Math.sin(h) * cosV
      const y = radius * sinV
      const z = radius * Math.cos(h) * cosV
      vertices.push(x, y, z)
    }
  }

  const widthSeg = widthSegments + 1
  for (let i = 0; i < heightSegments; i++) {
    for (let j = 0; j < widthSegments; j++) {
      const a = 1 + i * widthSeg + j
      const b = a + 1
      const c = a + widthSeg
      const d = c + 1
      indices.push(0, a, b)
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function createFurniture() {
  if (sofaGroup) scene.remove(sofaGroup)
  sofaGroup = new THREE.Group()

  const sofaMat = new THREE.MeshStandardMaterial({
    color: 0x6d4c41,
    roughness: 0.85,
    metalness: 0.05,
  })
  const sofaDarkMat = new THREE.MeshStandardMaterial({
    color: 0x5d4037,
    roughness: 0.9,
  })
  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0x8d6e63,
    roughness: 0.8,
  })

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 0.95), sofaMat)
  base.position.y = 0.2
  base.castShadow = true
  base.receiveShadow = true
  sofaGroup.add(base)

  const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.18), sofaDarkMat)
  back.position.set(0, 0.7, -0.38)
  back.castShadow = true
  back.receiveShadow = true
  sofaGroup.add(back)

  for (let i = -1; i <= 1; i++) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.8), cushionMat)
    cushion.position.set(i * 0.85, 0.45, -0.05)
    cushion.castShadow = true
    cushion.receiveShadow = true
    sofaGroup.add(cushion)
  }

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.95), sofaDarkMat)
  leftArm.position.set(-1.37, 0.5, 0)
  leftArm.castShadow = true
  sofaGroup.add(leftArm)

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.95), sofaDarkMat)
  rightArm.position.set(1.37, 0.5, 0)
  rightArm.castShadow = true
  sofaGroup.add(rightArm)

  const legMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.6 })
  const legPositions = [[-1.2, -0.4], [1.2, -0.4], [-1.2, 0.4], [1.2, 0.4]]
  legPositions.forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8), legMat)
    leg.position.set(x, 0.075, z)
    leg.castShadow = true
    sofaGroup!.add(leg)
  })

  sofaGroup.position.set(0, 0, -3)
  scene.add(sofaGroup)

  if (wardrobeGroup) scene.remove(wardrobeGroup)
  wardrobeGroup = new THREE.Group()

  const wMat = new THREE.MeshStandardMaterial({
    color: 0x4e342e,
    roughness: 0.7,
    metalness: 0.05,
  })
  const wDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3e2723,
    roughness: 0.75,
  })

  const wBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 1.2), wMat)
  wBody.position.y = 1.4
  wBody.castShadow = true
  wBody.receiveShadow = true
  wardrobeGroup.add(wBody)

  for (let i = -1; i <= 1; i += 2) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.7, 0.06), wDarkMat)
    door.position.set(i * 0.45, 1.4, 0.63)
    door.castShadow = true
    wardrobeGroup.add(door)

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 })
    )
    handle.rotation.z = Math.PI / 2
    handle.position.set(i * 0.65, 1.4, 0.67)
    wardrobeGroup.add(handle)
  }

  wardrobeGroup.position.set(-3.0, 0, -2.8)
  scene.add(wardrobeGroup)

  const coffeeTable = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.06, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.5 })
  )
  coffeeTable.position.set(0, 0.38, -1.2)
  coffeeTable.castShadow = true
  coffeeTable.receiveShadow = true
  scene.add(coffeeTable)

  const tblLegMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.6 })
  const tblLegPositions = [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]
  tblLegPositions.forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.06), tblLegMat)
    leg.position.set(coffeeTable.position.x + x, 0.19, coffeeTable.position.z + z)
    leg.castShadow = true
    scene.add(leg)
  })

  updateOcclusionZones()
}

function updateOcclusionZones() {
  occlusionZones.forEach(z => scene.remove(z))
  occlusionZones = []

  if (!wardrobeGroup) return

  const wPos = wardrobeGroup.position
  const wSize = { x: 1.8, y: 2.8, z: 1.2 }

  const radarPos = new THREE.Vector3(radarConfig.position.x, radarHeight.value, radarConfig.position.z)
  const wCenter = new THREE.Vector3(wPos.x, wSize.y / 2, wPos.z)

  const toWardrobe = new THREE.Vector3().subVectors(wCenter, radarPos)
  const distToWardrobe = toWardrobe.length()
  toWardrobe.normalize()

  if (distToWardrobe < detectionRange.value * 1.5) {
    const shadowDepth = Math.min(detectionRange.value - distToWardrobe + 1, 7)
    if (shadowDepth > 0) {
      const shadowGeo = new THREE.BoxGeometry(wSize.x * 0.9, wSize.y * 0.95, shadowDepth)
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0xf44336,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
      shadowMesh.position.copy(wCenter)
      shadowMesh.position.add(toWardrobe.clone().multiplyScalar(shadowDepth / 2 + wSize.z / 2))

      const edgeGeo = new THREE.EdgesGeometry(shadowGeo)
      const edgeMat = new THREE.LineDashedMaterial({
        color: 0xf44336,
        dashSize: 0.15,
        gapSize: 0.08,
        transparent: true,
        opacity: 0.5,
      })
      const edges = new THREE.LineSegments(edgeGeo, edgeMat)
      edges.computeLineDistances()
      shadowMesh.add(edges)

      occlusionZones.push(shadowMesh)
      scene.add(shadowMesh)
    }
  }
}

function createHuman() {
  if (humanGroup) scene.remove(humanGroup)
  humanGroup = new THREE.Group()

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffcc80,
    roughness: 0.7,
  })
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0x2196f3,
    roughness: 0.65,
  })
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x303030,
    roughness: 0.75,
  })

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), skinMat)
  head.position.y = 1.65
  head.castShadow = true
  head.name = 'head'
  humanGroup.add(head)

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.185, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.2),
    new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 })
  )
  hair.position.y = 1.66
  humanGroup.add(hair)

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.24), shirtMat)
  torso.position.y = 1.22
  torso.castShadow = true
  torso.name = 'chest'
  humanGroup.add(torso)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 12), skinMat)
  neck.position.y = 1.47
  neck.castShadow = true
  humanGroup.add(neck)

  for (let i = -1; i <= 1; i += 2) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.55, 16), shirtMat)
    arm.position.set(i * 0.32, 1.1, 0.18)
    arm.rotation.z = i * 0.4
    arm.rotation.x = 0.25
    arm.castShadow = true
    humanGroup.add(arm)

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), skinMat)
    hand.position.set(i * (0.32 + 0.28 * Math.sin(0.4)), 1.1 - 0.28 * Math.cos(0.4), 0.18 + 0.15)
    hand.castShadow = true
    humanGroup.add(hand)
  }

  for (let i = -1; i <= 1; i += 2) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.5, 16), pantsMat)
    thigh.position.set(i * 0.12, 0.7, -0.02)
    thigh.rotation.x = -0.15
    thigh.castShadow = true
    humanGroup.add(thigh)

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.48, 16), pantsMat)
    shin.position.set(i * 0.12, 0.22, -0.1)
    shin.rotation.x = 0.1
    shin.castShadow = true
    humanGroup.add(shin)

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.22), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }))
    foot.position.set(i * 0.12, 0.03, 0.02)
    foot.castShadow = true
    humanGroup.add(foot)
  }

  humanConfig.basePosition.set(0, 0, -3)
  humanGroup.position.copy(humanConfig.basePosition)
  scene.add(humanGroup)
}

function createLightSystem() {
  lightMesh = new THREE.PointLight(0xfff8e1, 0, 12, 1.5)
  lightMesh.position.set(0, 3.2, 0)
  lightMesh.castShadow = true
  lightMesh.shadow.mapSize.width = 1024
  lightMesh.shadow.mapSize.height = 1024
  scene.add(lightMesh)

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.4,
    metalness: 0.6,
    emissive: 0x000000,
    emissiveIntensity: 0,
  })
  lightBulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 24), bulbMat)
  lightBulbMesh.position.copy(lightMesh.position)
  scene.add(lightBulbMesh)

  const cordMat = new THREE.MeshBasicMaterial({ color: 0x424242 })
  const cordGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 3.5, 0),
    new THREE.Vector3(0, 3.28, 0),
  ])
  scene.add(new THREE.Line(cordGeo, cordMat))

  const coneGeo = new THREE.ConeGeometry(2.5, 3.2, 48, 1, true)
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffeb3b,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  lightCone = new THREE.Mesh(coneGeo, coneMat)
  lightCone.position.set(0, 3.2 - 3.2 / 2, 0)
  scene.add(lightCone)
}

function isPointInDetectionVolume(point: THREE.Vector3): boolean {
  if (!detectionVolumeMesh) return false

  const localPoint = point.clone()
  detectionVolumeMesh.updateMatrixWorld(true)
  const invMatrix = new THREE.Matrix4().copy(detectionVolumeMesh.matrixWorld).invert()
  localPoint.applyMatrix4(invMatrix)

  if (radarType.value === 'sphere') {
    return localPoint.length() <= detectionRange.value
  }

  if (localPoint.z < 0) return false

  const dist = localPoint.length()
  if (dist > detectionRange.value) return false

  const horAngle = Math.abs(Math.atan2(localPoint.x, localPoint.z))
  if (horAngle > horizontalFov.value * Math.PI / 360) return false

  const verAngle = Math.asin(localPoint.y / Math.max(dist, 0.001))
  if (Math.abs(verAngle) > verticalFov.value * Math.PI / 360) return false

  return true
}

function calculateOcclusion(humanPos: THREE.Vector3): number {
  if (!wardrobeGroup) return 0

  const radarPos = new THREE.Vector3(radarConfig.position.x, radarHeight.value, radarConfig.position.z)
  const wPos = wardrobeGroup.position
  const wSize = { x: 1.8, y: 2.8, z: 1.2 }

  const dirToHuman = new THREE.Vector3().subVectors(humanPos, radarPos)
  const totalDist = dirToHuman.length()
  if (totalDist < 0.1) return 0
  dirToHuman.normalize()

  const wMin = new THREE.Vector3(wPos.x - wSize.x / 2, wPos.y, wPos.z - wSize.z / 2)
  const wMax = new THREE.Vector3(wPos.x + wSize.x / 2, wPos.y + wSize.y, wPos.z + wSize.z / 2)
  const rayHit = rayBoxIntersect(radarPos, dirToHuman, wMin, wMax)

  let rayOcc = 0
  let rayBlocked = false
  if (rayHit.hit && rayHit.tHit < totalDist) {
    rayBlocked = true
    rayOcc = 1 - rayHit.tHit / totalDist
  }

  const wCenter = new THREE.Vector3(wPos.x, wPos.y + wSize.y / 2, wPos.z)
  const toWCenter = new THREE.Vector3().subVectors(wCenter, radarPos)
  const distWC = toWCenter.length()

  const toHuman = new THREE.Vector3().subVectors(humanPos, radarPos)
  const distH = toHuman.length()

  const wAngH = Math.atan2(toWCenter.x, toWCenter.z)
  const hAngH = Math.atan2(toHuman.x, toHuman.z)
  let diffH = hAngH - wAngH
  while (diffH > Math.PI) diffH -= Math.PI * 2
  while (diffH < -Math.PI) diffH += Math.PI * 2
  diffH = Math.abs(diffH)

  const halfAngH = Math.atan2(wSize.x / 2, distWC)
  const softBandH = halfAngH * 2.2
  const normDiffH = diffH / halfAngH

  let hOcc = 0
  if (normDiffH < 1.0) {
    hOcc = 1.0
  } else if (normDiffH < 1.0 + softBandH / halfAngH) {
    const t = (normDiffH - 1.0) / (softBandH / halfAngH)
    hOcc = 0.5 + 0.5 * Math.cos(Math.PI * t)
  }

  const wAngV = Math.asin(toWCenter.y / distWC)
  const hAngV = Math.asin(toHuman.y / Math.max(distH, 0.001))
  const diffV = Math.abs(hAngV - wAngV)

  const halfAngV = Math.atan2(wSize.y / 2, distWC)
  const softBandV = halfAngV * 2.0
  const normDiffV = diffV / halfAngV

  let vOcc = 0
  if (normDiffV < 1.0) {
    vOcc = 1.0
  } else if (normDiffV < 1.0 + softBandV / halfAngV) {
    const t = (normDiffV - 1.0) / (softBandV / halfAngV)
    vOcc = 0.5 + 0.5 * Math.cos(Math.PI * t)
  }

  const distRatio = distWC / Math.max(distH, 0.001)
  const tDist = THREE.MathUtils.clamp(1.0 - distRatio, 0, 1)
  const distFactor = 1.0 - 0.7 * (0.5 - 0.5 * Math.cos(Math.PI * tDist))

  const angleOcc = hOcc * vOcc * distFactor
  if (rayBlocked) {
    return THREE.MathUtils.clamp(Math.max(angleOcc, rayOcc * 0.95), 0, 1)
  }
  return THREE.MathUtils.clamp(angleOcc, 0, 1)
}

function rayBoxIntersect(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  boxMin: THREE.Vector3,
  boxMax: THREE.Vector3
): { hit: boolean; tHit: number } {
  let tmin = -Infinity
  let tmax = Infinity

  for (let i = 0; i < 3; i++) {
    const o = [origin.x, origin.y, origin.z][i]
    const d = [dir.x, dir.y, dir.z][i]
    const bmin = [boxMin.x, boxMin.y, boxMin.z][i]
    const bmax = [boxMax.x, boxMax.y, boxMax.z][i]

    if (Math.abs(d) < 1e-8) {
      if (o < bmin || o > bmax) return { hit: false, tHit: 0 }
    } else {
      let t1 = (bmin - o) / d
      let t2 = (bmax - o) / d
      if (t1 > t2) [t1, t2] = [t2, t1]
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) return { hit: false, tHit: 0 }
    }
  }

  if (tmax < 0) return { hit: false, tHit: 0 }
  return { hit: true, tHit: tmin > 0 ? tmin : tmax }
}

function calculateMicroMotionSignal(dt: number): number {
  const breathFreq = breathRate.value / 60
  humanConfig.breathPhase += dt * breathFreq * Math.PI * 2

  let baseSignal = 0
  switch (motionMode.value) {
    case 'breathing':
      baseSignal = Math.sin(humanConfig.breathPhase) * motionAmplitude.value
      break
    case 'sitting':
      baseSignal = Math.sin(humanConfig.breathPhase) * motionAmplitude.value
        + Math.sin(humanConfig.breathPhase * 0.3) * motionAmplitude.value * 0.5
      break
    case 'walking':
      humanConfig.walkPhase += dt * 1.2
      baseSignal = Math.sin(humanConfig.walkPhase * 8) * motionAmplitude.value * 3
      break
  }

  const noise = (Math.random() - 0.5) * 0.1
  return Math.max(0.05, Math.abs(baseSignal) + noise)
}

function updateHumanAnimation(dt: number) {
  if (!humanGroup) return

  if (motionMode.value === 'walking') {
    const target = humanConfig.walkPath[humanConfig.walkIndex]
    const current = humanGroup.position
    const toTarget = new THREE.Vector3().subVectors(target, current)
    const dist = toTarget.length()
    const walkSpeed = 1.2 * dt

    if (dist < walkSpeed) {
      humanGroup.position.copy(target)
      humanConfig.walkIndex = (humanConfig.walkIndex + 1) % humanConfig.walkPath.length
    } else {
      humanGroup.position.add(toTarget.normalize().multiplyScalar(walkSpeed))
      humanGroup.rotation.y = Math.atan2(toTarget.x, toTarget.z)
    }
  } else {
    humanConfig.basePosition.set(0, 0, -3)
    if (!humanOnSofa.value) {
      humanConfig.basePosition.set(-3.0, 0, -3.0)
    }
    humanGroup.position.lerp(humanConfig.basePosition, 0.05)
    const lookDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), humanGroup.position)
    if (lookDir.length() > 0.1) {
      const targetYaw = Math.atan2(lookDir.x, lookDir.z)
      const currentYaw = humanGroup.rotation.y
      let diff = targetYaw - currentYaw
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      humanGroup.rotation.y += diff * 0.05
    }
  }

  const breathOffset = Math.sin(humanConfig.breathPhase) * motionAmplitude.value * 0.002
  const chest = humanGroup.children.find(c => c.name === 'chest')
  const head = humanGroup.children.find(c => c.name === 'head')
  if (chest) chest.position.y = humanConfig.chestOriginalY + breathOffset * 2.5
  if (head) head.position.y = humanConfig.headOriginalY + breathOffset * 1.8
}

function updateLightLogic(dt: number, detected: boolean) {
  if (!lightMesh || !lightBulbMesh || !lightCone) return

  if (detected) {
    delayCountdown.value = lightDelay.value
  } else {
    delayCountdown.value = Math.max(0, delayCountdown.value - dt)
  }

  const shouldBeOn = delayCountdown.value > 0
  const targetIntensity = shouldBeOn ? 1.8 : 0
  const currentIntensity = lightMesh.intensity
  lightMesh.intensity += (targetIntensity - currentIntensity) * 0.1

  lightOn.value = lightMesh.intensity > 0.1

  const bulbMat = lightBulbMesh.material as THREE.MeshStandardMaterial
  const emissiveTarget = shouldBeOn ? 1.0 : 0
  bulbMat.emissiveIntensity += (emissiveTarget - bulbMat.emissiveIntensity) * 0.1
  bulbMat.emissive = new THREE.Color(shouldBeOn ? 0xffeb3b : 0x000000)
  bulbMat.color = new THREE.Color(shouldBeOn ? 0xffffcc : 0x333333)

  const coneMat = lightCone.material as THREE.MeshBasicMaterial
  const opacityTarget = shouldBeOn ? 0.12 : 0
  coneMat.opacity += (opacityTarget - coneMat.opacity) * 0.08
}

function updateDetectionStatus(dt: number) {
  if (!humanGroup) {
    humanDetected.value = false
    microMotionSignal.value = 0
    occlusionLevel.value = 0
    detectionHysteresisCounter = 0
    return
  }

  const humanCenter = humanGroup.position.clone()
  humanCenter.y += 1.2

  const inVolume = isPointInDetectionVolume(humanCenter)
  const occlusion = calculateOcclusion(humanCenter)
  occlusionLevel.value = occlusion

  const rawMotion = calculateMicroMotionSignal(dt)

  const rawDetected = inVolume && (1 - occlusion) > 0.15 && rawMotion > sensitivity.value * 0.5

  if (rawDetected) {
    detectionHysteresisCounter = Math.min(HYSTERESIS_FRAMES, detectionHysteresisCounter + 1)
  } else {
    detectionHysteresisCounter = Math.max(-HYSTERESIS_FRAMES, detectionHysteresisCounter - 1)
  }

  if (detectionHysteresisCounter >= HYSTERESIS_FRAMES) {
    humanDetected.value = true
  } else if (detectionHysteresisCounter <= -HYSTERESIS_FRAMES) {
    humanDetected.value = false
  }

  if (inVolume) {
    const occludedFactor = 1 - occlusion * 0.85
    const effectiveSignal = rawMotion * occludedFactor
    if (humanDetected.value) {
      microMotionSignal.value = -28 + effectiveSignal * 14
    } else {
      const targetSignal = -28 + effectiveSignal * 14 - (1 - occludedFactor) * 25
      microMotionSignal.value += (targetSignal - microMotionSignal.value) * 0.15
    }
  } else {
    microMotionSignal.value = Math.max(-60, microMotionSignal.value - dt * 40)
  }

  updateHumanAnimation(dt)
  updateLightLogic(dt, humanDetected.value)
}

function onWindowResize() {
  if (!canvasRef.value) return
  const rect = canvasRef.value.parentElement!.getBoundingClientRect()
  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
  renderer.setSize(rect.width, rect.height)
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05)
  controls.update()
  updateDetectionStatus(dt)

  if (detectionVolumeMesh && detectionVolumeMesh.material instanceof THREE.MeshBasicMaterial) {
    const t = performance.now() * 0.001
    detectionVolumeMesh.material.opacity = 0.1 + Math.sin(t * 2) * 0.03
  }

  renderer.render(scene, camera)
  animationFrameId = requestAnimationFrame(animate)
}

function toggleHumanPosition() {
  humanOnSofa.value = !humanOnSofa.value
  delayCountdown.value = lightDelay.value
  detectionHysteresisCounter = humanOnSofa.value ? HYSTERESIS_FRAMES : -HYSTERESIS_FRAMES
  if (humanGroup) {
    const targetPos = humanOnSofa.value
      ? new THREE.Vector3(0, 0, -3)
      : new THREE.Vector3(-3.0, 0, -3.0)
    humanGroup.position.copy(targetPos)
  }
}

function resetView() {
  camera.position.set(10, 10, 10)
  controls.target.set(0, 0.5, 0)
  controls.update()
}

async function runScenario() {
  humanOnSofa.value = true
  motionMode.value = 'breathing'
  sensitivity.value = 0.3
  await sleep(2000)

  humanOnSofa.value = false
  await sleep(3000)

  motionMode.value = 'walking'
  await sleep(8000)

  humanOnSofa.value = true
  motionMode.value = 'breathing'
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

watch([radarType, horizontalFov, verticalFov, detectionRange, radarHeight], () => {
  radarConfig.position.y = radarHeight.value
  createRadar()
  createDetectionVolume()
  updateOcclusionZones()
}, { deep: true })

onMounted(() => {
  setTimeout(() => {
    initScene()
  }, 50)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onWindowResize)
  if (renderer) {
    renderer.dispose()
  }
})
</script>
