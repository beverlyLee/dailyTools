import * as THREE from 'three'
import { GraffitiWall } from './wall/GraffitiWall'
import { SprayCan } from './tools/SprayCan'

class GraffitiApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private wall: GraffitiWall
  private sprayCan: SprayCan
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private isSpraying: boolean = false
  private lastUV: { x: number; y: number } | null = null
  private isViewLocked: boolean = false
  private cursorIndicator: THREE.Group | null = null
  private cursorPosition: THREE.Vector3 = new THREE.Vector3()
  private wallWidth: number = 12
  private wallHeight: number = 8
  private lastTime: number = 0
  private sprayDot: THREE.Group | null = null

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 0, 8)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    document.body.appendChild(this.renderer.domElement)

    this.wall = new GraffitiWall(this.wallWidth, this.wallHeight)
    this.scene.add(this.wall.mesh)

    this.sprayCan = new SprayCan(this.wall.textureSize)

    const particleSystem = this.sprayCan.getParticleSystem()
    if (particleSystem) {
      this.scene.add(particleSystem)
    }

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.createCursorIndicator()
    this.createSprayDot()
    this.addAmbientParticles()
    this.setupEventListeners()
    this.wall.clear(this.renderer, new THREE.Color(0x2c3e50))
    this.lastTime = performance.now()
    this.animate()
  }

  private createCursorIndicator() {
    this.cursorIndicator = new THREE.Group()

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.13, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    )
    this.cursorIndicator.add(outerRing)

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.1, 32),
      new THREE.MeshBasicMaterial({ color: 0xf8d500, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    )
    innerRing.position.z = 0.001
    this.cursorIndicator.add(innerRing)

    this.cursorIndicator.visible = false
    this.scene.add(this.cursorIndicator)
  }

  private createSprayDot() {
    this.sprayDot = new THREE.Group()

    const outline = new THREE.Mesh(
      new THREE.CircleGeometry(0.025, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    )
    this.sprayDot.add(outline)

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.015, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    )
    dot.position.z = 0.001
    this.sprayDot.add(dot)

    this.sprayDot.visible = false
    this.scene.add(this.sprayDot)
  }

  private updateCursorSize() {
    if (this.cursorIndicator) {
      const sizeRatio = this.sprayCan.getSize() / this.wall.textureSize
      const worldSize = Math.max(this.wallWidth, this.wallHeight) * sizeRatio
      const scale = worldSize * 10
      this.cursorIndicator.scale.set(scale, scale, 1)
    }
  }

  private updateCursorColor() {
    if (this.cursorIndicator) {
      const innerRing = this.cursorIndicator.children[1] as THREE.Mesh
      if (innerRing) {
        (innerRing.material as THREE.MeshBasicMaterial).color = this.sprayCan.getColor()
      }
    }
  }

  private addAmbientParticles() {
    const particlesGeometry = new THREE.BufferGeometry()
    const particlesCount = 200
    const posArray = new Float32Array(particlesCount * 3)

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 30
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    })

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial)
    this.scene.add(particlesMesh)
  }

  private setupEventListeners() {
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))
    window.addEventListener('mousedown', (e) => this.onMouseDown(e))
    window.addEventListener('mouseup', () => this.onMouseUp())
    window.addEventListener('mouseleave', () => this.onMouseLeave())
    window.addEventListener('resize', () => this.onResize())
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false })

    document.querySelectorAll('.color-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'))
        ;(e.target as HTMLElement).classList.add('active')
        const color = (e.target as HTMLElement).dataset.color
        if (color) {
          this.sprayCan.setColor(color)
          this.updateCursorColor()
        }
      })
    })

    const sizeSlider = document.getElementById('brush-size') as HTMLInputElement
    const sizeValue = document.getElementById('size-value')
    const sizePreview = document.getElementById('size-preview') as HTMLElement
    if (sizeSlider && sizeValue && sizePreview) {
      sizeSlider.addEventListener('input', () => {
        const size = parseInt(sizeSlider.value)
        this.sprayCan.setSize(size)
        sizeValue.textContent = size.toString()
        sizePreview.style.width = `${size * 0.8}px`
        sizePreview.style.height = `${size * 0.8}px`
        this.updateCursorSize()
      })
    }

    const clearBtn = document.getElementById('clear-btn')
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.wall.clear(this.renderer, new THREE.Color(0x2c3e50))
      })
    }

    const lockViewBtn = document.getElementById('lock-view-btn')
    if (lockViewBtn) {
      lockViewBtn.addEventListener('click', () => {
        this.isViewLocked = !this.isViewLocked
        lockViewBtn.classList.toggle('active', this.isViewLocked)
        lockViewBtn.textContent = this.isViewLocked ? '🔓 解锁视角' : '🔒 锁定视角'
      })
    }
  }

  private onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.updateCursorPosition()

    if (this.isSpraying) {
      this.sprayAtMousePosition()
    }
  }

  private updateCursorPosition() {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.wall.mesh)

    if (intersects.length > 0 && this.cursorIndicator && this.sprayDot) {
      const point = intersects[0].point
      this.cursorPosition.copy(point)
      
      this.cursorIndicator.position.set(point.x, point.y, point.z + 0.02)
      this.cursorIndicator.lookAt(this.camera.position)
      this.cursorIndicator.visible = true
      
      this.sprayDot.position.set(point.x, point.y, point.z + 0.03)
      this.sprayDot.lookAt(this.camera.position)
      this.sprayDot.visible = true

      if (this.isSpraying) {
        this.sprayCan.emitParticles(point.x, point.y)
      }
    } else if (this.cursorIndicator && this.sprayDot) {
      this.cursorIndicator.visible = false
      this.sprayDot.visible = false
    }
  }

  private onMouseDown(event: MouseEvent) {
    if (event.button === 0) {
      this.isSpraying = true
      this.lastUV = null
      this.sprayAtMousePosition()
    }
  }

  private onMouseUp() {
    this.isSpraying = false
    this.lastUV = null
  }

  private onMouseLeave() {
    this.isSpraying = false
    this.lastUV = null
    if (this.cursorIndicator && this.sprayDot) {
      this.cursorIndicator.visible = false
      this.sprayDot.visible = false
    }
  }

  private sprayAtMousePosition() {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.wall.mesh)

    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv
      const currentUV = { x: uv.x, y: uv.y }

      if (this.lastUV) {
        const distance = Math.sqrt(
          Math.pow(currentUV.x - this.lastUV.x, 2) +
          Math.pow(currentUV.y - this.lastUV.y, 2)
        )
        const steps = Math.max(1, Math.ceil(distance * this.wall.textureSize / 4))
        
        for (let i = 1; i <= steps; i++) {
          const t = i / steps
          const interpolatedX = this.lastUV.x + (currentUV.x - this.lastUV.x) * t
          const interpolatedY = this.lastUV.y + (currentUV.y - this.lastUV.y) * t
          this.sprayCan.spray(
            this.renderer,
            this.wall.renderTarget,
            interpolatedX,
            interpolatedY
          )
        }
      } else {
        this.sprayCan.spray(
          this.renderer,
          this.wall.renderTarget,
          currentUV.x,
          currentUV.y
        )
      }

      this.lastUV = currentUV
    }
  }

  private onWheel(event: WheelEvent) {
    event.preventDefault()
    const zoomSpeed = 0.002
    this.camera.position.z += event.deltaY * zoomSpeed
    this.camera.position.z = Math.max(4, Math.min(20, this.camera.position.z))
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate() {
    requestAnimationFrame(() => this.animate())

    const currentTime = performance.now()
    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime

    this.sprayCan.updateParticles(deltaTime)

    if (!this.isViewLocked && !this.isSpraying) {
      const time = currentTime * 0.0003
      this.wall.mesh.rotation.y = Math.sin(time) * 0.1
      this.wall.mesh.rotation.x = Math.cos(time * 0.7) * 0.05
    }

    this.renderer.render(this.scene, this.camera)
  }

  public dispose() {
    this.wall.dispose()
    this.sprayCan.dispose()
    this.renderer.dispose()
  }
}

new GraffitiApp()
