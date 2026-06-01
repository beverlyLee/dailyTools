import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sundial } from './objects/Sundial'
import { SunPosition, SunPositionResult } from './systems/SunPosition'

const LATITUDE = 39.9042
const LONGITUDE = 116.4074

class SundialApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private sundial: Sundial
  private sunPosition: SunPosition
  private sunLight: THREE.DirectionalLight
  private sunMesh: THREE.Mesh
  private ambientLight: THREE.AmbientLight
  private ground: THREE.Mesh

  private currentDate: Date
  private timeSlider: HTMLInputElement
  private dateSlider: HTMLInputElement
  private timeValue: HTMLElement
  private dateValue: HTMLElement
  private sundialTimeDisplay: HTMLElement

  private clock: THREE.Clock

  constructor() {
    this.clock = new THREE.Clock()
    this.currentDate = new Date()
    
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(12, 10, -15)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    document.body.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 8
    this.controls.maxDistance = 40
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1
    this.controls.target.set(0, 2, 0)

    this.sunPosition = new SunPosition(LATITUDE, LONGITUDE)

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.ambientLight)

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.5)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.width = 2048
    this.sunLight.shadow.mapSize.height = 2048
    this.sunLight.shadow.camera.near = 0.5
    this.sunLight.shadow.camera.far = 100
    this.sunLight.shadow.camera.left = -20
    this.sunLight.shadow.camera.right = 20
    this.sunLight.shadow.camera.top = 20
    this.sunLight.shadow.camera.bottom = -20
    this.sunLight.shadow.bias = -0.0001
    this.scene.add(this.sunLight)
    this.scene.add(this.sunLight.target)

    const sunGeometry = new THREE.SphereGeometry(2, 32, 32)
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd00
    })
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
    this.scene.add(this.sunMesh)

    this.sundial = new Sundial(LATITUDE)
    this.scene.add(this.sundial.group)

    this.addCompassMarkers()

    this.ground = this.createGround()
    this.scene.add(this.ground)

    this.timeSlider = document.getElementById('timeSlider') as HTMLInputElement
    this.dateSlider = document.getElementById('dateSlider') as HTMLInputElement
    this.timeValue = document.getElementById('timeValue') as HTMLElement
    this.dateValue = document.getElementById('dateValue') as HTMLElement
    this.sundialTimeDisplay = document.getElementById('sundialTime') as HTMLElement

    this.setupEventListeners()
    this.initializeSliders()
    this.updateSun()

    window.addEventListener('resize', () => this.onWindowResize())

    this.animate()
  }

  private addCompassMarkers(): void {
    const directions = [
      { label: 'N', x: 0, z: 7, rotY: 0 },
      { label: 'E', x: 7, z: 0, rotY: Math.PI / 2 },
      { label: 'S', x: 0, z: -7, rotY: Math.PI },
      { label: 'W', x: -7, z: 0, rotY: -Math.PI / 2 }
    ]

    directions.forEach(dir => {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 64
      const ctx = canvas.getContext('2d')!
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#333333'
      ctx.fillText(dir.label, 64, 32)

      const texture = new THREE.CanvasTexture(canvas)
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
      const geometry = new THREE.PlaneGeometry(1.2, 0.6)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(dir.x, 0.1, dir.z)
      mesh.rotation.x = -Math.PI / 2
      mesh.rotation.z = -dir.rotY
      this.scene.add(mesh)
    })
  }

  private createGround(): THREE.Mesh {
    const groundGeometry = new THREE.CircleGeometry(30, 64)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7cfc00,
      roughness: 0.9,
      metalness: 0.0
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.3
    ground.receiveShadow = true
    return ground
  }

  private setupEventListeners(): void {
    this.timeSlider.addEventListener('input', () => {
      this.updateDateFromSliders()
      this.updateSun()
    })

    this.dateSlider.addEventListener('input', () => {
      this.updateDateFromSliders()
      this.updateSun()
    })
  }

  private initializeSliders(): void {
    const now = new Date()
    const localHours = now.getUTCHours() + this.sunPosition.getTimezoneOffset()
    const normalizedHours = ((localHours % 24) + 24) % 24
    const minutes = Math.floor(normalizedHours) * 60 + now.getUTCMinutes()
    this.timeSlider.value = minutes.toString()
    
    const dayOfYear = this.sunPosition.getDayOfYear(now)
    this.dateSlider.value = dayOfYear.toString()
    
    this.updateDateFromSliders()
  }

  private updateDateFromSliders(): void {
    const timeMinutes = parseInt(this.timeSlider.value)
    const dayOfYear = parseInt(this.dateSlider.value)
    
    const { hours, minutes } = this.sunPosition.getTimeFromMinutes(timeMinutes)
    this.currentDate = this.sunPosition.getDateFromDayOfYear(dayOfYear, hours, minutes)
    
    this.timeValue.textContent = this.sunPosition.formatTime(this.currentDate)
    this.dateValue.textContent = this.sunPosition.formatDate(this.currentDate)
  }

  private updateSun(): void {
    const sunResult = this.sunPosition.getSunPosition(this.currentDate)
    
    this.sunLight.position.copy(sunResult.position)
    this.sunLight.target.position.set(0, 0, 0)
    this.sunLight.target.updateMatrixWorld()
    
    this.sunMesh.position.copy(sunResult.position)
    
    this.updateSkyColor(sunResult)
    
    this.updateSundialShadow(sunResult)
  }

  private updateSkyColor(sunResult: SunPositionResult): void {
    const altitude = sunResult.altitude
    
    if (altitude < -0.1) {
      this.scene.background = new THREE.Color(0x0a1628)
      this.scene.fog = new THREE.Fog(0x0a1628, 50, 150)
      this.ambientLight.intensity = 0.1
      this.sunLight.intensity = 0.1
      this.sunMesh.visible = false
    } else if (altitude < 0.2) {
      const t = (altitude + 0.1) / 0.3
      this.scene.background = new THREE.Color().lerpColors(
        new THREE.Color(0x0a1628),
        new THREE.Color(0xff7f50),
        t
      )
      this.scene.fog = new THREE.Fog(this.scene.background.getHex(), 50, 150)
      this.ambientLight.intensity = 0.1 + t * 0.3
      this.sunLight.intensity = 0.5 + t * 1.0
      this.sunMesh.visible = true
    } else {
      this.scene.background = new THREE.Color(0x87ceeb)
      this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150)
      this.ambientLight.intensity = 0.4
      this.sunLight.intensity = 1.5
      this.sunMesh.visible = true
    }
  }

  private updateSundialShadow(sunResult: SunPositionResult): void {
    if (!sunResult.isVisible || sunResult.altitude <= 0) {
      this.sundial.hideShadow()
      this.sundialTimeDisplay.textContent = '夜间'
      return
    }

    const gnomonTip = this.sundial.getGnomonTipWorld()
    
    const shadowEnd = this.sunPosition.calculateShadowEndpoint(
      sunResult.direction,
      gnomonTip,
      0.01
    )

    if (!shadowEnd) {
      this.sundial.hideShadow()
      this.sundialTimeDisplay.textContent = '日出/日落'
      return
    }

    console.log(
      `[日晷调试] 时区偏移:UTC+${this.sunPosition.getTimezoneOffset()} |`,
      `UTC时间: ${this.currentDate.toISOString()} |`,
      `太阳方位角(suncalc): ${(sunResult.azimuth * 180 / Math.PI).toFixed(1)}° |`,
      `高度角: ${(sunResult.altitude * 180 / Math.PI).toFixed(1)}° |`,
      `太阳方向: (${sunResult.direction.x.toFixed(3)}, ${sunResult.direction.y.toFixed(3)}, ${sunResult.direction.z.toFixed(3)}) |`,
      `晷针尖端: (${gnomonTip.x.toFixed(2)}, ${gnomonTip.y.toFixed(2)}, ${gnomonTip.z.toFixed(2)}) |`,
      `阴影端点: (${shadowEnd.x.toFixed(2)}, ${shadowEnd.y.toFixed(2)}, ${shadowEnd.z.toFixed(2)})`
    )

    const shadowDist = Math.sqrt(shadowEnd.x * shadowEnd.x + shadowEnd.z * shadowEnd.z)
    const maxDist = 4.5
    let displayX = shadowEnd.x
    let displayZ = shadowEnd.z

    if (shadowDist > maxDist) {
      const scale = maxDist / shadowDist
      displayX = shadowEnd.x * scale
      displayZ = shadowEnd.z * scale
    }

    const { hourIndex, minutes } = this.sundial.getHourIndexFromShadow(displayX, displayZ)
    this.sundial.updateShadow(displayX, displayZ, hourIndex)
    
    if (hourIndex !== null) {
      const hour24 = this.sundial.getHourFromIndex(hourIndex)
      const roman = this.sundial.getRomanNumeral(hourIndex)
      const displayHour = hour24 === 0 ? 12 : hour24
      this.sundialTimeDisplay.textContent = `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} (${roman})`
    } else {
      this.sundialTimeDisplay.textContent = '日出/日落'
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())
    
    this.clock.getDelta()
    
    this.controls.update()
    
    this.renderer.render(this.scene, this.camera)
  }
}

new SundialApp()
