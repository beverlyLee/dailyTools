import * as THREE from 'three'
import { ClothMesh } from './cloth/ClothMesh'
import { SpringSolver } from './physics/SpringSolver'

export class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private clock: THREE.Clock
  private cloth!: ClothMesh
  private solver!: SpringSolver
  private container: HTMLElement

  private fpsPanel!: HTMLDivElement
  private infoPanel!: HTMLDivElement
  private debugOverlay!: HTMLDivElement
  private controlsPanel!: HTMLDivElement

  private showWireframe = false
  private showSprings = false
  private springHelper: THREE.LineSegments | null = null
  private springIndices: number[] = []

  private frameCount = 0
  private lastFpsTime = 0
  private fps = 0
  private showDebug = true

  private impulseStrength = 6.0
  private impulseRadius = 2.0
  private impulseSpread = 2.0
  private lastControlsUpdate = 0

  constructor() {
    this.container = document.body
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    )
    this.camera.position.set(0, 1, 14)
    this.camera.lookAt(0, -0.5, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.clock = new THREE.Clock()
  }

  init(): void {
    this.container.appendChild(this.renderer.domElement)
    this.setupDebugUI()
    this.setupLights()
    this.setupCloth()
    this.setupSpringHelper()
    this.setupEvents()
    this.lastFpsTime = performance.now()
    this.animate()
  }

  private setupDebugUI(): void {
    this.debugOverlay = document.createElement('div')
    this.debugOverlay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      color: #88ccff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      user-select: none;
      z-index: 100;
      text-shadow: 0 0 4px rgba(0,0,0,0.8);
      max-width: 280px;
    `
    this.container.appendChild(this.debugOverlay)

    this.fpsPanel = document.createElement('div')
    this.fpsPanel.textContent = '帧率: 0 | 顶点: 0'
    this.fpsPanel.style.marginBottom = '6px'
    this.fpsPanel.style.fontWeight = 'bold'
    this.debugOverlay.appendChild(this.fpsPanel)

    this.infoPanel = document.createElement('div')
    this.infoPanel.innerHTML = [
      '布料波浪模拟',
      '点击: 强力涟漪 | 移动: 轻柔涟漪',
      '1: 线框模式 | 2: 弹簧网格 | 3: 隐藏面板',
      'Q/E: 冲量强度 | A/D: 涟漪半径 | Z/C: 径向扩散',
    ].join('<br>')
    this.infoPanel.style.marginBottom = '10px'
    this.infoPanel.style.opacity = '0.9'
    this.debugOverlay.appendChild(this.infoPanel)

    this.controlsPanel = document.createElement('div')
    this.controlsPanel.style.cssText = `
      background: rgba(0,0,0,0.4);
      padding: 8px;
      border-radius: 4px;
      border: 1px solid rgba(136,204,255,0.3);
    `
    this.debugOverlay.appendChild(this.controlsPanel)
    this.updateControlsDisplay()
  }

  private updateControlsDisplay(): void {
    if (!this.solver) return
    this.controlsPanel.innerHTML = [
      `<strong>物理参数</strong>`,
      `重力系数: ${this.solver.gravity.toFixed(2)}`,
      `速度阻尼: ${this.solver.damping.toFixed(3)}`,
      `空气阻力: ${this.solver.airDrag.toFixed(3)}`,
      `约束迭代: ${this.solver.iterations}`,
      ``,
      `<strong>涟漪参数</strong>`,
      `冲量强度: ${this.impulseStrength.toFixed(1)}`,
      `涟漪半径: ${this.impulseRadius.toFixed(1)}`,
      `径向扩散: ${this.impulseSpread.toFixed(1)}`,
    ].join('<br>')
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x4466aa, 0.8)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
    dirLight.position.set(5, 10, 7)
    dirLight.castShadow = true
    this.scene.add(dirLight)

    const backLight = new THREE.DirectionalLight(0x88aaff, 0.5)
    backLight.position.set(-5, 5, -7)
    this.scene.add(backLight)

    const bottomLight = new THREE.DirectionalLight(0x6688cc, 0.3)
    bottomLight.position.set(0, -5, 5)
    this.scene.add(bottomLight)
  }

  private setupCloth(): void {
    this.cloth = new ClothMesh(40, 40, 8, 8)
    this.scene.add(this.cloth.mesh)

    this.solver = new SpringSolver(this.cloth)
    this.solver.presimulate(300)
    this.updateControlsDisplay()
  }

  private setupSpringHelper(): void {
    const { cols, rows } = this.cloth
    const idx = (c: number, r: number) => r * cols + c
    this.springIndices = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = idx(c, r)
        if (c < cols - 1) this.springIndices.push(i, idx(c + 1, r))
        if (r < rows - 1) this.springIndices.push(i, idx(c, r + 1))
      }
    }

    const geometry = new THREE.BufferGeometry()
    const material = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.35,
    })
    this.springHelper = new THREE.LineSegments(geometry, material)
    this.springHelper.visible = false
    this.scene.add(this.springHelper)
  }

  private updateSpringHelper(): void {
    if (!this.springHelper || !this.showSprings) return

    const v = this.cloth.vertices
    const worldMat = this.cloth.mesh.matrixWorld
    const positions = new Float32Array(this.springIndices.length * 3)

    const e = worldMat.elements
    const m0 = e[0], m1 = e[1], m2 = e[2]
    const m4 = e[4], m5 = e[5], m6 = e[6]
    const m8 = e[8], m9 = e[9], m10 = e[10]
    const m12 = e[12], m13 = e[13], m14 = e[14]

    let pi = 0
    for (let k = 0; k < this.springIndices.length; k++) {
      const p = v[this.springIndices[k]].position
      const x = p.x, y = p.y, z = p.z
      positions[pi]     = m0 * x + m4 * y + m8 * z + m12
      positions[pi + 1] = m1 * x + m5 * y + m9 * z + m13
      positions[pi + 2] = m2 * x + m6 * y + m10 * z + m14
      pi += 3
    }

    const geo = this.springHelper.geometry as THREE.BufferGeometry
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.computeBoundingSphere()
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize())

    this.renderer.domElement.addEventListener('click', (e) => {
      this.onMouseClick(e)
    })

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      this.onMouseMove(e)
    })

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase()

      if (key === '1') {
        this.showWireframe = !this.showWireframe
        const mat = this.cloth.mesh.material as THREE.MeshStandardMaterial
        mat.wireframe = this.showWireframe
        mat.needsUpdate = true
      } else if (key === '2') {
        this.showSprings = !this.showSprings
        if (this.springHelper) this.springHelper.visible = this.showSprings
      } else if (key === '3') {
        this.showDebug = !this.showDebug
        if (this.debugOverlay) {
          this.debugOverlay.style.display = this.showDebug ? 'block' : 'none'
        }
      } else if (key === 'q') {
        this.impulseStrength = Math.max(0.5, this.impulseStrength - 0.5)
      } else if (key === 'e') {
        this.impulseStrength = Math.min(20, this.impulseStrength + 0.5)
      } else if (key === 'a') {
        this.impulseRadius = Math.max(0.3, this.impulseRadius - 0.1)
      } else if (key === 'd') {
        this.impulseRadius = Math.min(4, this.impulseRadius + 0.1)
      } else if (key === 'z') {
        this.impulseSpread = Math.max(0, this.impulseSpread - 0.1)
      } else if (key === 'c') {
        this.impulseSpread = Math.min(4, this.impulseSpread + 0.1)
      }

      this.updateControlsDisplay()
    })
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private onMouseClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObject(this.cloth.mesh)

    if (hits.length > 0) {
      const hitPoint = hits[0].point.clone()
      const impulse = new THREE.Vector3(0, this.impulseStrength, 0)
      this.cloth.applyImpulse(hitPoint, impulse, this.impulseRadius, this.impulseSpread)
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const hits = this.raycaster.intersectObject(this.cloth.mesh)

    if (hits.length > 0) {
      const hitPoint = hits[0].point.clone()
      const impulse = new THREE.Vector3(0, this.impulseStrength * 0.3, 0)
      this.cloth.applyImpulse(hitPoint, impulse, this.impulseRadius * 0.45, this.impulseSpread * 0.4)
    }
  }

  private updateFps(): void {
    this.frameCount++
    const now = performance.now()
    const elapsed = now - this.lastFpsTime
    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed)
      this.frameCount = 0
      this.lastFpsTime = now
      if (this.fpsPanel) {
        this.fpsPanel.textContent = `帧率: ${this.fps} | 顶点: ${this.cloth.vertices.length}`
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    this.updateFps()

    const now = performance.now()
    if (now - this.lastControlsUpdate > 200) {
      this.updateControlsDisplay()
      this.lastControlsUpdate = now
    }

    const delta = this.clock.getDelta()
    const dt = Math.min(delta, 1 / 30)

    const subSteps = 3
    const subDt = dt / subSteps

    for (let i = 0; i < subSteps; i++) {
      this.solver.step(subDt)
    }

    this.cloth.updateGeometry()
    this.updateSpringHelper()

    this.renderer.render(this.scene, this.camera)
  }
}
