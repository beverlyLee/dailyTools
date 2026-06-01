import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Crystal } from './growth/Crystal'

class CrystalGrowthApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private composer: EffectComposer
  private controls: OrbitControls
  private crystal!: Crystal
  private clock: THREE.Clock
  private particles: THREE.Points
  private ambientLight: THREE.AmbientLight
  private mainLight: THREE.DirectionalLight
  private fillLight: THREE.PointLight
  private rimLight: THREE.PointLight
  private autoRotate: boolean = true

  constructor() {
    this.scene = new THREE.Scene()
    this.clock = new THREE.Clock()

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 5, 12)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.4
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setClearColor(0x020010, 1)
    document.body.appendChild(this.renderer.domElement)

    this.composer = new EffectComposer(this.renderer)
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85,
      0.75,
      0.15
    )
    this.composer.addPass(bloomPass)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 5
    this.controls.maxDistance = 35
    this.controls.autoRotate = this.autoRotate
    this.controls.autoRotateSpeed = 0.4

    this.ambientLight = new THREE.AmbientLight(0x5050a0, 0.8)
    this.scene.add(this.ambientLight)

    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.0)
    this.mainLight.position.set(5, 12, 8)
    this.mainLight.castShadow = false
    this.scene.add(this.mainLight)

    this.fillLight = new THREE.PointLight(0x64c8ff, 1.2, 80, 1.5)
    this.fillLight.position.set(-12, 2, -12)
    this.scene.add(this.fillLight)

    this.rimLight = new THREE.PointLight(0xff96d2, 1.0, 80, 1.5)
    this.rimLight.position.set(12, -3, 12)
    this.scene.add(this.rimLight)

    const backLight = new THREE.PointLight(0x9678ff, 0.6, 60, 1.5)
    backLight.position.set(0, 0, -15)
    this.scene.add(backLight)

    this.particles = this.createParticles()
    this.scene.add(this.particles)

    this.crystal = new Crystal(this.scene)

    this.setupEventListeners()
    this.animate()
  }

  private createParticles(): THREE.Points {
    const particleCount = 600
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const colorPalette = [
      new THREE.Color(0x64c8ff),
      new THREE.Color(0x9678ff),
      new THREE.Color(0x64ffe1),
      new THREE.Color(0xff96d2),
      new THREE.Color(0xffc864),
    ]

    for (let i = 0; i < particleCount; i++) {
      const radius = 12 + Math.random() * 14
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    return new THREE.Points(geometry, material)
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this))
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this))
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.composer.setSize(window.innerWidth, window.innerHeight)
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      event.preventDefault()
      this.crystal.reset()
    }
    if (event.code === 'KeyR') {
      this.autoRotate = !this.autoRotate
      this.controls.autoRotate = this.autoRotate
    }
  }

  private onClick() {
    if (this.crystal.getGrowthProgress() >= 1) {
      this.crystal.reset()
    }
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this))

    const deltaTime = this.clock.getDelta()
    const elapsedTime = this.clock.getElapsedTime()

    this.crystal.update(deltaTime)

    this.particles.rotation.y += deltaTime * 0.04
    this.particles.rotation.x += deltaTime * 0.015

    const positions = this.particles.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(elapsedTime * 0.4 + i * 0.008) * 0.0015
    }
    this.particles.geometry.attributes.position.needsUpdate = true

    this.fillLight.intensity = 1.0 + Math.sin(elapsedTime * 0.7) * 0.3
    this.rimLight.intensity = 0.8 + Math.sin(elapsedTime * 1.1) * 0.2

    this.crystal.updateGlowCamera(this.camera.position)

    this.controls.update()
    this.composer.render()
  }
}

new CrystalGrowthApp()
