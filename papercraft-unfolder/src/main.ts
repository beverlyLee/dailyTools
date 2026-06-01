import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createDogModel } from './models/Animal'
import { Unfolder, UnfoldResult, LabelData } from './unfolder/Unfolder'

class PapercraftApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private dogModel: THREE.Mesh | null = null
  private unfoldedGroup: THREE.Group | null = null
  private isUnfolded: boolean = false
  private unfoldResult: UnfoldResult | null = null
  private labelSprites: THREE.Sprite[] = []

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(5, 5, 8)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true

    const container = document.getElementById('canvas-container')
    if (container) {
      container.appendChild(this.renderer.domElement)
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05

    this.setupLights()
    this.createDogModel()
    this.setupEventListeners()
    this.animate()
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    this.scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0x667eea, 0.5)
    pointLight.position.set(-5, 3, -5)
    this.scene.add(pointLight)
  }

  private createDogModel(): void {
    const geometry = createDogModel()
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 30,
    })

    this.dogModel = new THREE.Mesh(geometry, material)
    this.dogModel.castShadow = true
    this.dogModel.receiveShadow = true
    this.scene.add(this.dogModel)

    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333)
    this.scene.add(gridHelper)
  }

  private setupEventListeners(): void {
    const unfoldBtn = document.getElementById('unfoldBtn')
    const resetBtn = document.getElementById('resetBtn')

    if (unfoldBtn) {
      unfoldBtn.addEventListener('click', () => this.unfoldModel())
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetModel())
    }

    window.addEventListener('resize', () => this.onWindowResize())
  }

  private createLabelSprite(text: string, size: number): THREE.Sprite {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = 256
    canvas.height = 256

    context.clearRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = 'rgba(0, 0, 0, 0.75)'
    context.beginPath()
    context.arc(128, 128, 95, 0, Math.PI * 2)
    context.fill()

    context.strokeStyle = '#ffffff'
    context.lineWidth = 8
    context.stroke()

    context.fillStyle = '#ffffff'
    const fontSize = Math.max(60, Math.min(140, 120 * size))
    context.font = `bold ${fontSize}px Arial`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, 128, 128)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })

    const sprite = new THREE.Sprite(material)
    sprite.scale.set(size, size, 1)
    return sprite
  }

  private unfoldModel(): void {
    if (this.isUnfolded || !this.dogModel) return

    this.isUnfolded = true
    this.updateModeIndicator(true)

    const geometry = this.dogModel.geometry
    const unfolder = new Unfolder(geometry)
    this.unfoldResult = unfolder.unfold()

    this.unfoldedGroup = new THREE.Group()

    for (const geo of this.unfoldResult.geometries) {
      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 30,
        transparent: true,
        opacity: 0.95,
      })
      const mesh = new THREE.Mesh(geo, material)
      this.unfoldedGroup.add(mesh)
    }

    this.unfoldedGroup.add(this.unfoldResult.cutLines)
    this.unfoldedGroup.add(this.unfoldResult.foldLines)

    this.labelSprites = []
    for (const label of this.unfoldResult.labels) {
      const sprite = this.createLabelSprite(label.text, label.size)
      sprite.position.set(label.position.x, 0.2, label.position.y)
      this.labelSprites.push(sprite)
      this.unfoldedGroup.add(sprite)
    }

    this.scene.add(this.unfoldedGroup)

    this.animateTransitionTo2D()
  }

  private calculate2DCameraPosition(): {
    position: THREE.Vector3
    target: THREE.Vector3
  } {
    if (!this.unfoldResult) {
      return {
        position: new THREE.Vector3(0, 15, 0.1),
        target: new THREE.Vector3(4, 0, 0),
      }
    }

    const { min, max } = this.unfoldResult.totalBounds
    const centerX = (min.x + max.x) / 2
    const centerZ = (min.y + max.y) / 2
    const width = max.x - min.x
    const height = max.y - min.y

    const aspect = window.innerWidth / window.innerHeight
    const fov = (this.camera.fov * Math.PI) / 180
    const padding = 1.5

    const maxDim = Math.max(width, height)
    const requiredHeight = maxDim * padding

    let distance: number
    if (aspect >= 1) {
      distance = requiredHeight / (2 * Math.tan(fov / 2))
    } else {
      distance = (requiredHeight / aspect) / (2 * Math.tan(fov / 2))
    }

    return {
      position: new THREE.Vector3(centerX, distance, centerZ + 0.01),
      target: new THREE.Vector3(centerX, 0, centerZ),
    }
  }

  private animateTransitionTo2D(): void {
    const duration = 2000
    const startTime = Date.now()
    const startPos = this.camera.position.clone()
    const startTarget = this.controls.target.clone()

    const { position: targetPos, target: targetTarget } =
      this.calculate2DCameraPosition()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = this.easeInOutCubic(progress)

      if (this.dogModel) {
        this.dogModel.visible = 1 - eased > 0.1
      }

      this.camera.position.lerpVectors(startPos, targetPos, eased)
      this.controls.target.lerpVectors(startTarget, targetTarget, eased)
      this.controls.update()

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private resetModel(): void {
    if (this.unfoldedGroup) {
      this.scene.remove(this.unfoldedGroup)
      this.unfoldedGroup = null
    }
    this.unfoldResult = null
    this.labelSprites = []

    if (this.dogModel) {
      this.dogModel.visible = true
    }

    this.isUnfolded = false
    this.updateModeIndicator(false)

    const duration = 1500
    const startTime = Date.now()
    const startPos = this.camera.position.clone()
    const startTarget = this.controls.target.clone()

    const targetPos = new THREE.Vector3(5, 5, 8)
    const targetTarget = new THREE.Vector3(0, 0, 0)

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = this.easeInOutCubic(progress)

      this.camera.position.lerpVectors(startPos, targetPos, eased)
      this.controls.target.lerpVectors(startTarget, targetTarget, eased)
      this.controls.update()

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  private updateModeIndicator(is2D: boolean): void {
    const modeText = document.getElementById('modeText')
    if (modeText) {
      modeText.textContent = is2D ? '2D 折纸图纸' : '3D 视图'
      modeText.className = is2D ? 'mode-2d' : 'mode-3d'
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    if (this.isUnfolded && this.unfoldResult) {
      const { position: targetPos, target: targetTarget } =
        this.calculate2DCameraPosition()
      this.camera.position.copy(targetPos)
      this.controls.target.copy(targetTarget)
      this.controls.update()
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    if (!this.isUnfolded && this.dogModel) {
      this.dogModel.rotation.y += 0.003
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}

new PapercraftApp()
