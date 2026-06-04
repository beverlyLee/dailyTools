import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PaperPlane } from './plane/PaperPlane'
import { computeAerodynamicForces } from './physics/Aerodynamics'

const DEFAULT_SPEED = 16
const DEFAULT_ANGLE = 5

const STATE_COLORS = {
  glide: new THREE.Color(0x44ff88),
  noseUp: new THREE.Color(0xffaa44),
  dive: new THREE.Color(0xff6644),
  stall: new THREE.Color(0xff2222),
  slow: new THREE.Color(0xffcc44),
  idle: new THREE.Color(0xaaaaaa),
}

type FlightState = 'glide' | 'noseUp' | 'dive' | 'stall' | 'slow' | 'idle'

class PaperPlaneFlight {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private world: CANNON.World
  private plane: PaperPlane
  private clock: THREE.Clock
  private thrown = false
  private landed = false
  private trail: THREE.Points
  private trailPositions: Float32Array
  private trailColors: Float32Array
  private trailIndex = 0
  private trailLength = 600
  private cameraOffset = new THREE.Vector3(-10, 4, 5)
  private cameraLookOffset = new THREE.Vector3(3, 0, 0)
  private cameraTarget = new THREE.Vector3()
  private cameraPos = new THREE.Vector3()
  private hudElement!: HTMLDivElement
  private aoaElement!: HTMLSpanElement
  private speedElement!: HTMLSpanElement
  private altElement!: HTMLSpanElement
  private distElement!: HTMLSpanElement
  private statusElement!: HTMLDivElement
  private windParticles: THREE.Points
  private groundBody: CANNON.Body
  private clouds: THREE.Group[] = []
  private startPos = new CANNON.Vec3(0, 10, 0)
  private distanceMarker!: THREE.Group
  private distLine!: THREE.Line
  private distLabel!: THREE.Sprite
  private configSpeed = DEFAULT_SPEED
  private configAngle = DEFAULT_ANGLE
  private speedSlider!: HTMLInputElement
  private angleSlider!: HTMLInputElement
  private speedValueLabel!: HTMLSpanElement
  private angleValueLabel!: HTMLSpanElement
  private throwBtn!: HTMLButtonElement
  private landDeceleration = false
  private testRecordsContainer!: HTMLDivElement
  private testCount = 0
  private testSpeed = 0
  private testAngle = 0
  private stallOverlay!: HTMLDivElement

  constructor() {
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200)

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500)
    this.camera.position.set(-8, 11, 3)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1

    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    })
    this.world.broadphase = new CANNON.NaiveBroadphase()
    ;(this.world.solver as CANNON.GSSolver).iterations = 10

    this.groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
    })
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.world.addBody(this.groundBody)

    this.plane = new PaperPlane()
    this.scene.add(this.plane.mesh)
    this.world.addBody(this.plane.body)

    this.trailPositions = new Float32Array(this.trailLength * 3)
    this.trailColors = new Float32Array(this.trailLength * 3)
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3))
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3))
    trailGeo.setDrawRange(0, 0)
    const trailMat = new THREE.PointsMaterial({
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
      vertexColors: true,
    })
    this.trail = new THREE.Points(trailGeo, trailMat)
    this.scene.add(this.trail)

    this.windParticles = this.createWindParticles()
    this.scene.add(this.windParticles)

    this.distanceMarker = this.createDistanceMarker()
    this.distanceMarker.visible = false
    this.scene.add(this.distanceMarker)

    this.setupLighting()
    this.createGround()
    this.createSkyDome()
    this.createClouds()
    this.createConfigPanel()
    this.createHUD()
    this.createStallOverlay()

    window.addEventListener('resize', this.onResize.bind(this))

    document.body.appendChild(this.renderer.domElement)

    this.cameraPos.copy(this.camera.position)
    this.plane.reset(new CANNON.Vec3(0, 10, 0), new CANNON.Vec3(0, 0, 0), 0, false)
    this.plane.sync()
    this.updateHUD(0, 0)

    this.animate()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x8899bb, 0.7)
    this.scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.8)
    sunLight.position.set(30, 50, 20)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 150
    sunLight.shadow.camera.left = -30
    sunLight.shadow.camera.right = 30
    sunLight.shadow.camera.top = 30
    sunLight.shadow.camera.bottom = -30
    this.scene.add(sunLight)

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556633, 0.4)
    this.scene.add(hemiLight)

    const fillLight = new THREE.DirectionalLight(0xaabbdd, 0.3)
    fillLight.position.set(-10, 10, -10)
    this.scene.add(fillLight)
  }

  private createGround(): void {
    const groundGeo = new THREE.PlaneGeometry(400, 400, 80, 80)
    const positions = groundGeo.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.3 +
        Math.sin(x * 0.12 + 1) * Math.cos(y * 0.08 + 2) * 0.15
      positions.setZ(i, noise)
    }
    groundGeo.computeVertexNormals()

    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x5a8f3c,
      flatShading: false,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const darkGroundGeo = new THREE.PlaneGeometry(400, 400)
    const darkGroundMat = new THREE.MeshLambertMaterial({ color: 0x3d6b28 })
    const darkGround = new THREE.Mesh(darkGroundGeo, darkGroundMat)
    darkGround.rotation.x = -Math.PI / 2
    darkGround.position.y = -0.05
    darkGround.receiveShadow = true
    this.scene.add(darkGround)

    const startXGeo = new THREE.PlaneGeometry(3, 0.3)
    const startXMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9 })
    const startLine = new THREE.Mesh(startXGeo, startXMat)
    startLine.rotation.x = -Math.PI / 2
    startLine.position.set(0, 0.03, 0)
    this.scene.add(startLine)

    const startLabel = this.createTextSprite('起点', 1.8, '#ffff00')
    startLabel.position.set(0, 1.2, 0)
    this.scene.add(startLabel)
  }

  private createTextSprite(text: string, scale: number, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 256
    canvas.height = 64
    ctx.fillStyle = color
    ctx.font = 'bold 36px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)

    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: texture, depthWrite: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(scale, scale * 0.25, 1)
    return sprite
  }

  private createDistanceMarker(): THREE.Group {
    const group = new THREE.Group()

    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 12)
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xff3333 })
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.y = 1.5
    group.add(pole)

    const flagGeo = new THREE.PlaneGeometry(1.2, 0.6)
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xff3333, side: THREE.DoubleSide })
    const flag = new THREE.Mesh(flagGeo, flagMat)
    flag.position.set(0.6, 2.7, 0)
    group.add(flag)

    const label = this.createTextSprite('', 2.5, '#ff3333')
    label.position.y = 3.8
    group.add(label)
    this.distLabel = label

    return group
  }

  private updateDistanceMarker(landPos: CANNON.Vec3, distance: number): void {
    this.distanceMarker.visible = true
    this.distanceMarker.position.set(landPos.x, 0, landPos.z)

    const oldMap = (this.distLabel.material as THREE.SpriteMaterial).map
    if (oldMap) oldMap.dispose()

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 320
    canvas.height = 80
    ctx.clearRect(0, 0, 320, 80)
    ctx.fillStyle = '#ff3333'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${distance.toFixed(1)}m`, 160, 40)
    const texture = new THREE.CanvasTexture(canvas)
    ;(this.distLabel.material as THREE.SpriteMaterial).map = texture
    ;(this.distLabel.material as THREE.SpriteMaterial).needsUpdate = true

    if (this.distLine) {
      this.scene.remove(this.distLine)
      this.distLine.geometry.dispose()
      ;(this.distLine.material as THREE.LineDashedMaterial).dispose()
    }
    const linePoints = [
      new THREE.Vector3(this.startPos.x, 0.3, this.startPos.z),
      new THREE.Vector3(landPos.x, 0.3, landPos.z),
    ]
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints)
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xff3333,
      dashSize: 0.8,
      gapSize: 0.5,
      linewidth: 3,
    })
    this.distLine = new THREE.Line(lineGeo, lineMat)
    this.distLine.computeLineDistances()
    this.scene.add(this.distLine)
  }

  private createStallOverlay(): void {
    this.stallOverlay = document.createElement('div')
    this.stallOverlay.className = 'stall-overlay'
    this.stallOverlay.innerHTML = '<div class="stall-text">⚠ 失速警告 ⚠</div>'
    document.body.appendChild(this.stallOverlay)
  }

  private createSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(180, 32, 16)
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x3366aa) },
        bottomColor: { value: new THREE.Color(0x87ceeb) },
        offset: { value: 10 },
        exponent: { value: 0.5 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    })
    const sky = new THREE.Mesh(skyGeo, skyMat)
    this.scene.add(sky)
  }

  private createClouds(): void {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })

    for (let i = 0; i < 15; i++) {
      const cloudGroup = new THREE.Group()
      const numPuffs = 3 + Math.floor(Math.random() * 4)
      for (let j = 0; j < numPuffs; j++) {
        const puffGeo = new THREE.SphereGeometry(3 + Math.random() * 4, 8, 6)
        const puff = new THREE.Mesh(puffGeo, cloudMat)
        puff.position.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 8
        )
        puff.scale.y = 0.4 + Math.random() * 0.3
        cloudGroup.add(puff)
      }
      const angle = Math.random() * Math.PI * 2
      const radius = 30 + Math.random() * 80
      cloudGroup.position.set(
        Math.cos(angle) * radius,
        25 + Math.random() * 30,
        Math.sin(angle) * radius
      )
      this.scene.add(cloudGroup)
      this.clouds.push(cloudGroup)
    }
  }

  private createWindParticles(): THREE.Points {
    const count = 200
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60
      positions[i * 3 + 1] = Math.random() * 25
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.06,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      depthWrite: false,
    })
    return new THREE.Points(geo, mat)
  }

  private getFlightState(aoaDeg: number, speed: number): FlightState {
    if (aoaDeg > 18) return 'stall'
    if (aoaDeg > 10) return 'noseUp'
    if (aoaDeg < -8) return 'dive'
    if (speed < 3) return 'slow'
    return 'glide'
  }

  private createConfigPanel(): void {
    const panel = document.createElement('div')
    panel.className = 'config-panel'
    panel.innerHTML = `
      <div class="config-title">⚙ 投掷参数</div>
      <div class="config-row">
        <label>初速度</label>
        <div class="config-slider-row">
          <input type="range" id="cfg-speed" min="5" max="30" step="1" value="${DEFAULT_SPEED}">
          <span id="cfg-speed-val" class="config-val">${DEFAULT_SPEED} m/s</span>
        </div>
      </div>
      <div class="config-row">
        <label>投掷角度</label>
        <div class="config-slider-row">
          <input type="range" id="cfg-angle" min="-20" max="40" step="1" value="${DEFAULT_ANGLE}">
          <span id="cfg-angle-val" class="config-val">${DEFAULT_ANGLE}°</span>
        </div>
      </div>
      <button id="cfg-throw" class="throw-btn">🚀 投掷飞机</button>
      <button id="cfg-reset" class="reset-btn">🔄 重置</button>
      <div class="config-divider"></div>
      <div class="config-title" style="font-size: 13px;">📊 参数测试记录</div>
      <div id="test-records" class="test-records">
        <div class="test-record-header">
          <span>#</span>
          <span>速度</span>
          <span>角度</span>
          <span>距离</span>
        </div>
      </div>
      <button id="cfg-clear-records" class="clear-records-btn">清空记录</button>
      <div class="config-hint">调整参数后点击投掷<br>系统自动记录每组飞行结果</div>
    `
    document.body.appendChild(panel)

    this.speedSlider = document.getElementById('cfg-speed') as HTMLInputElement
    this.angleSlider = document.getElementById('cfg-angle') as HTMLInputElement
    this.speedValueLabel = document.getElementById('cfg-speed-val') as HTMLSpanElement
    this.angleValueLabel = document.getElementById('cfg-angle-val') as HTMLSpanElement
    this.throwBtn = document.getElementById('cfg-throw') as HTMLButtonElement
    const resetBtn = document.getElementById('cfg-reset') as HTMLButtonElement
    const clearRecordsBtn = document.getElementById('cfg-clear-records') as HTMLButtonElement
    this.testRecordsContainer = document.getElementById('test-records') as HTMLDivElement

    this.speedSlider.addEventListener('input', () => {
      this.configSpeed = parseInt(this.speedSlider.value)
      this.speedValueLabel.textContent = `${this.configSpeed} m/s`
    })

    this.angleSlider.addEventListener('input', () => {
      this.configAngle = parseInt(this.angleSlider.value)
      this.angleValueLabel.textContent = `${this.configAngle}°`
    })

    this.throwBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.testSpeed = this.configSpeed
      this.testAngle = this.configAngle
      this.onThrow()
    })

    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onReset()
    })

    clearRecordsBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.clearTestRecords()
    })

    panel.addEventListener('click', (e) => {
      e.stopPropagation()
    })
    panel.addEventListener('mousedown', (e) => e.stopPropagation())
  }

  private addTestRecord(speed: number, angle: number, distance: number): void {
    this.testCount++
    const record = document.createElement('div')
    record.className = 'test-record-item'
    record.innerHTML = `
      <span>${this.testCount}</span>
      <span>${speed} m/s</span>
      <span>${angle}°</span>
      <span>${distance.toFixed(1)}m</span>
    `
    this.testRecordsContainer.appendChild(record)
    this.testRecordsContainer.scrollTop = this.testRecordsContainer.scrollHeight
  }

  private clearTestRecords(): void {
    this.testCount = 0
    const items = this.testRecordsContainer.querySelectorAll('.test-record-item')
    items.forEach((item) => item.remove())
  }

  private createHUD(): void {
    this.hudElement = document.createElement('div')
    this.hudElement.className = 'hud'
    this.hudElement.innerHTML = `
      <div class="hud-title">✈ 飞行数据</div>
      <div class="hud-row">速度: <span id="hud-speed">0.0</span> m/s</div>
      <div class="hud-row">迎角: <span id="hud-aoa">0.0</span>°</div>
      <div class="hud-row">高度: <span id="hud-alt">0.0</span> m</div>
      <div class="hud-row">距离: <span id="hud-dist">0.0</span> m</div>
      <div class="trail-legend">
        <div class="trail-legend-title">轨迹颜色</div>
        <div class="trail-legend-item"><span class="trail-legend-dot" style="background:#44ff88"></span>滑翔中</div>
        <div class="trail-legend-item"><span class="trail-legend-dot" style="background:#ffaa44"></span>抬头减速</div>
        <div class="trail-legend-item"><span class="trail-legend-dot" style="background:#ff6644"></span>俯冲</div>
        <div class="trail-legend-item"><span class="trail-legend-dot" style="background:#ff2222"></span>失速</div>
        <div class="trail-legend-item"><span class="trail-legend-dot" style="background:#ffcc44"></span>速度过低</div>
      </div>
    `
    document.body.appendChild(this.hudElement)

    this.statusElement = document.createElement('div')
    this.statusElement.className = 'status'
    this.statusElement.textContent = '调整参数后点击「投掷飞机」'
    document.body.appendChild(this.statusElement)

    this.speedElement = document.getElementById('hud-speed')!
    this.aoaElement = document.getElementById('hud-aoa')!
    this.altElement = document.getElementById('hud-alt')!
    this.distElement = document.getElementById('hud-dist')!
  }

  private onThrow(): void {
    if (this.thrown && !this.landed) return

    this.landed = false
    this.thrown = true
    this.landDeceleration = false
    this.trailIndex = 0
    this.trail.geometry.setDrawRange(0, 0)

    const throwSpeed = this.configSpeed
    const angleRad = (this.configAngle * Math.PI) / 180
    const startPos = new CANNON.Vec3(0, 10, 0)
    const throwVel = new CANNON.Vec3(
      throwSpeed * Math.cos(angleRad),
      throwSpeed * Math.sin(angleRad),
      0
    )
    this.startPos.copy(startPos)

    this.plane.reset(startPos, throwVel, angleRad, true)
    this.statusElement.textContent = ''

    this.distanceMarker.visible = false
    if (this.distLine) {
      this.scene.remove(this.distLine)
      this.distLine.geometry.dispose()
      ;(this.distLine.material as THREE.LineDashedMaterial).dispose()
      this.distLine = null!
    }

    this.stallOverlay.classList.remove('active')
  }

  private onReset(): void {
    this.thrown = false
    this.landed = false
    this.landDeceleration = false
    this.trailIndex = 0
    this.trail.geometry.setDrawRange(0, 0)

    this.configSpeed = DEFAULT_SPEED
    this.configAngle = DEFAULT_ANGLE
    this.speedSlider.value = String(DEFAULT_SPEED)
    this.angleSlider.value = String(DEFAULT_ANGLE)
    this.speedValueLabel.textContent = `${DEFAULT_SPEED} m/s`
    this.angleValueLabel.textContent = `${DEFAULT_ANGLE}°`

    this.plane.reset(new CANNON.Vec3(0, 10, 0), new CANNON.Vec3(0, 0, 0), 0, false)
    this.plane.stop()
    this.plane.sync()

    this.startPos.set(0, 10, 0)

    this.speedElement.textContent = '0.0'
    this.aoaElement.textContent = '0.0'
    this.altElement.textContent = '10.0'
    this.distElement.textContent = '0.0'
    this.statusElement.textContent = '调整参数后点击「投掷飞机」'
    this.statusElement.style.color = '#88aaff'

    this.stallOverlay.classList.remove('active')

    this.distanceMarker.visible = false
    if (this.distLine) {
      this.scene.remove(this.distLine)
      this.distLine.geometry.dispose()
      ;(this.distLine.material as THREE.LineDashedMaterial).dispose()
      this.distLine = null!
    }

    this.cameraPos.set(-8, 11, 3)
    this.cameraTarget.set(0, 10, 0)
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private updateTrail(flightState: FlightState): void {
    if (!this.thrown || this.landed) return

    const idx = this.trailIndex % this.trailLength
    this.trailPositions[idx * 3] = this.plane.body.position.x
    this.trailPositions[idx * 3 + 1] = this.plane.body.position.y
    this.trailPositions[idx * 3 + 2] = this.plane.body.position.z

    const color = STATE_COLORS[flightState]
    this.trailColors[idx * 3] = color.r
    this.trailColors[idx * 3 + 1] = color.g
    this.trailColors[idx * 3 + 2] = color.b
    this.trailIndex++

    const drawCount = Math.min(this.trailIndex, this.trailLength)
    this.trail.geometry.attributes.position.needsUpdate = true
    this.trail.geometry.attributes.color.needsUpdate = true
    this.trail.geometry.setDrawRange(0, drawCount)
  }

  private updateWindParticles(time: number): void {
    const positions = this.windParticles.geometry.attributes.position.array as Float32Array
    const planePos = this.plane.body.position
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += 0.03 + Math.sin(time * 0.5 + i) * 0.01
      positions[i * 3 + 1] += Math.sin(time + i * 0.3) * 0.005
      positions[i * 3 + 2] += Math.cos(time * 0.3 + i * 0.7) * 0.005

      const dx = positions[i * 3] - planePos.x
      const dz = positions[i * 3 + 2] - planePos.z
      if (Math.abs(dx) > 30 || Math.abs(dz) > 30) {
        positions[i * 3] = planePos.x + (Math.random() - 0.5) * 50
        positions[i * 3 + 1] = Math.random() * 25
        positions[i * 3 + 2] = planePos.z + (Math.random() - 0.5) * 50
      }
    }
    this.windParticles.geometry.attributes.position.needsUpdate = true
  }

  private updateCamera(): void {
    const planePos = new THREE.Vector3(
      this.plane.body.position.x,
      this.plane.body.position.y,
      this.plane.body.position.z
    )

    const forward = new THREE.Vector3(1, 0, 0)
    const quat = new THREE.Quaternion(
      this.plane.body.quaternion.x,
      this.plane.body.quaternion.y,
      this.plane.body.quaternion.z,
      this.plane.body.quaternion.w
    )
    forward.applyQuaternion(quat)

    const flatForward = forward.clone()
    flatForward.y = 0
    if (flatForward.length() > 0.01) {
      flatForward.normalize()
    } else {
      flatForward.set(1, 0, 0)
    }

    const pitchOffset = forward.y * 2.5
    const desiredPos = planePos.clone()
      .add(flatForward.clone().multiplyScalar(this.cameraOffset.x))
      .add(new THREE.Vector3(0, this.cameraOffset.y + pitchOffset, this.cameraOffset.z))

    const desiredTarget = planePos.clone().add(
      flatForward.clone().multiplyScalar(this.cameraLookOffset.x)
    )

    const lerpFactor = 0.06
    this.cameraPos.lerp(desiredPos, lerpFactor)
    this.cameraTarget.lerp(desiredTarget, lerpFactor)

    this.camera.position.copy(this.cameraPos)
    this.camera.lookAt(this.cameraTarget)
  }

  private updateHUD(currentAoa: number, _currentSpeed: number): void {
    const speed = this.plane.body.velocity.length()
    const aoaDeg = (currentAoa * 180) / Math.PI
    const dx = this.plane.body.position.x - this.startPos.x
    const dz = this.plane.body.position.z - this.startPos.z
    const distance = Math.sqrt(dx * dx + dz * dz)

    const displaySpeed = Math.max(0, speed)
    const displayAoA = this.thrown ? aoaDeg : 0

    this.speedElement.textContent = displaySpeed.toFixed(1)
    this.aoaElement.textContent = displayAoA.toFixed(1)
    this.altElement.textContent = this.plane.body.position.y.toFixed(1)
    this.distElement.textContent = distance.toFixed(1)

    if (this.thrown && !this.landed) {
      const state = this.getFlightState(aoaDeg, speed)


      if (state === 'stall') {
        this.statusElement.textContent = '⚠ 失速！'
        this.statusElement.style.color = '#ff2222'
        this.stallOverlay.classList.add('active')
      } else {
        this.stallOverlay.classList.remove('active')
        if (state === 'noseUp') {
          this.statusElement.textContent = '抬头减速中...'
          this.statusElement.style.color = '#ffaa44'
        } else if (state === 'dive') {
          this.statusElement.textContent = '俯冲！'
          this.statusElement.style.color = '#ff6644'
        } else if (state === 'slow') {
          this.statusElement.textContent = '速度过低...'
          this.statusElement.style.color = '#ffcc44'
        } else {
          this.statusElement.textContent = '滑翔中 ✈'
          this.statusElement.style.color = '#44ff88'
        }
      }
    } else if (!this.thrown) {
      this.statusElement.textContent = '调整参数后点击「投掷飞机」'
      this.statusElement.style.color = '#88aaff'
      this.stallOverlay.classList.remove('active')
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    const deltaTime = Math.min(this.clock.getDelta(), 0.05)
    const time = this.clock.getElapsedTime()

    if (this.thrown && !this.landed) {
      const forces = computeAerodynamicForces(this.plane.body)
      this.plane.body.applyForce(forces.lift)
      this.plane.body.applyForce(forces.drag)
      this.plane.body.applyTorque(forces.torque)

      this.world.step(1 / 60, deltaTime, 3)
      this.plane.sync()

      const state = this.getFlightState(
        (forces.aoa * 180) / Math.PI,
        this.plane.body.velocity.length()
      )

      this.updateTrail(state)
      this.updateHUD(forces.aoa, forces.speed)

      if (this.plane.isOnGround()) {
        if (!this.landDeceleration) {
          this.landDeceleration = true
        }
        this.plane.body.velocity.scale(0.88, this.plane.body.velocity)
        this.plane.body.angularVelocity.scale(0.88, this.plane.body.angularVelocity)

        if (this.plane.body.velocity.length() < 0.3) {
          this.landed = true
          this.plane.stop()
          this.plane.body.position.y = 0.15
          this.plane.sync()

          const dx = this.plane.body.position.x - this.startPos.x
          const dz = this.plane.body.position.z - this.startPos.z
          const distance = Math.sqrt(dx * dx + dz * dz)

          this.addTestRecord(this.testSpeed, this.testAngle, distance)

          this.stallOverlay.classList.remove('active')
          this.updateHUD(0, 0)
          this.statusElement.textContent = `已着陆！飞行距离: ${distance.toFixed(1)}m — 点击「投掷飞机」重试`
          this.statusElement.style.color = '#88aaff'

          this.updateDistanceMarker(this.plane.body.position, distance)
        }
      }
    } else {
      this.updateHUD(0, 0)
    }

    this.updateCamera()
    this.updateWindParticles(time)

    this.clouds.forEach((cloud, i) => {
      cloud.position.x += 0.008 * (1 + i * 0.05)
      if (cloud.position.x > 120) cloud.position.x = -120
    })

    this.renderer.render(this.scene, this.camera)
  }
}

new PaperPlaneFlight()
