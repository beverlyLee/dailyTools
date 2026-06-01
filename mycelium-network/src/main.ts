import * as THREE from 'three'
import { Trees, TreeData } from './trees/Trees'
import { Mycelium } from './fungi/Mycelium'

interface ShockWave {
  mesh: THREE.Mesh
  startTime: number
  duration: number
}

class MyceliumApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private clock: THREE.Clock
  private trees: Trees
  private mycelium: Mycelium
  private treeData: TreeData[] = []
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private ground!: THREE.Mesh
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 }
  private mouseDownPosition: { x: number; y: number } = { x: 0, y: 0 }
  private cameraAngle: number = 0
  private cameraHeight: number = 12
  private cameraDistance: number = 18
  private shockWaves: ShockWave[] = []

  constructor() {
    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0d08)
    this.scene.fog = new THREE.Fog(0x0a0d08, 20, 50)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.updateCameraPosition()

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    document.body.appendChild(this.renderer.domElement)

    this.trees = new Trees(this.scene)
    this.mycelium = new Mycelium(this.scene)

    this.createGround()
    this.setupLighting()
    this.generateForest()
    this.setupEventListeners()
    this.animate()
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(60, 60, 50, 50)
    const positions = groundGeometry.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += (Math.random() - 0.5) * 0.1
    }
    groundGeometry.computeVertexNormals()

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1f12,
      roughness: 0.9,
      metalness: 0.1
    })

    this.ground = new THREE.Mesh(groundGeometry, groundMaterial)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    const undergroundGeometry = new THREE.PlaneGeometry(60, 60, 1, 1)
    const undergroundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d0a06,
      roughness: 0.8,
      side: THREE.DoubleSide
    })
    const underground = new THREE.Mesh(undergroundGeometry, undergroundMaterial)
    underground.rotation.x = -Math.PI / 2
    underground.position.y = -3
    this.scene.add(underground)
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404a40, 0.4)
    this.scene.add(ambientLight)

    const moonLight = new THREE.DirectionalLight(0xccdfff, 0.6)
    moonLight.position.set(10, 20, 10)
    moonLight.castShadow = true
    moonLight.shadow.mapSize.width = 2048
    moonLight.shadow.mapSize.height = 2048
    moonLight.shadow.camera.near = 0.5
    moonLight.shadow.camera.far = 50
    moonLight.shadow.camera.left = -20
    moonLight.shadow.camera.right = 20
    moonLight.shadow.camera.top = 20
    moonLight.shadow.camera.bottom = -20
    this.scene.add(moonLight)

    const fillLight = new THREE.DirectionalLight(0x88ff88, 0.2)
    fillLight.position.set(-5, 5, -5)
    this.scene.add(fillLight)

    const pointLight1 = new THREE.PointLight(0x44ff66, 0.3, 20)
    pointLight1.position.set(5, -1, 5)
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0x66ff44, 0.3, 20)
    pointLight2.position.set(-5, -1, -5)
    this.scene.add(pointLight2)
  }

  private generateForest(): void {
    const treeCount = 7
    this.treeData = this.trees.generateTrees(treeCount, 10)

    const rootPositions = this.trees.getTreeRootPositions()
    this.mycelium.generateNetwork(rootPositions, 6)

    const treeCountEl = document.getElementById('tree-count')
    const connCountEl = document.getElementById('connection-count')
    if (treeCountEl) treeCountEl.textContent = String(treeCount)
    if (connCountEl) connCountEl.textContent = String(this.mycelium.getConnectionCount())
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
    window.addEventListener('click', this.onClick.bind(this))
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private onMouseDown(event: MouseEvent): void {
    this.mouseDownPosition = { x: event.clientX, y: event.clientY }
    this.previousMousePosition = { x: event.clientX, y: event.clientY }
  }

  private onMouseMove(event: MouseEvent): void {
    const dx = event.clientX - this.mouseDownPosition.x
    const dy = event.clientY - this.mouseDownPosition.y
    if (Math.sqrt(dx * dx + dy * dy) <= 5) return

    const deltaX = event.clientX - this.previousMousePosition.x
    const deltaY = event.clientY - this.previousMousePosition.y

    this.cameraAngle += deltaX * 0.01
    this.cameraHeight = Math.max(2, Math.min(25, this.cameraHeight - deltaY * 0.05))

    this.updateCameraPosition()
    this.previousMousePosition = { x: event.clientX, y: event.clientY }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault()
    this.cameraDistance = Math.max(8, Math.min(40, this.cameraDistance + event.deltaY * 0.02))
    this.updateCameraPosition()
  }

  private updateCameraPosition(): void {
    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraDistance
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraDistance
    this.camera.position.y = this.cameraHeight
    this.camera.lookAt(0, 1, 0)
  }

  private onClick(event: MouseEvent): void {
    const dx = event.clientX - this.mouseDownPosition.x
    const dy = event.clientY - this.mouseDownPosition.y
    if (Math.sqrt(dx * dx + dy * dy) > 5) return

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const allMeshes: THREE.Mesh[] = []
    this.treeData.forEach(tree => {
      tree.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          allMeshes.push(child)
        }
      })
    })

    const intersects = this.raycaster.intersectObjects(allMeshes)

    if (intersects.length > 0) {
      let clickedTree: TreeData | null = null

      for (const tree of this.treeData) {
        if (intersects[0].object === tree.mesh ||
            tree.mesh.children.includes(intersects[0].object as THREE.Mesh)) {
          clickedTree = tree
          break
        }
      }

      if (clickedTree) {
        this.mycelium.triggerPulse(clickedTree.id)
        this.highlightTree(clickedTree)
        this.createShockWave(clickedTree.rootPosition)
      }
    }
  }

  private highlightTree(tree: TreeData): void {
    tree.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const originalEmissive = child.material.emissive.clone()
        const originalIntensity = child.material.emissiveIntensity
        child.material.emissive.setHex(0x44ff44)
        child.material.emissiveIntensity = 1.5

        setTimeout(() => {
          child.material.emissive.copy(originalEmissive)
          child.material.emissiveIntensity = originalIntensity
        }, 1500)
      }
    })
  }

  private createShockWave(position: THREE.Vector3): void {
    const ringGeometry = new THREE.RingGeometry(0.1, 0.3, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x66ffaa,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(position)
    ring.position.y = 0.05
    ring.rotation.x = -Math.PI / 2
    this.scene.add(ring)

    this.shockWaves.push({
      mesh: ring,
      startTime: performance.now(),
      duration: 1500
    })
  }

  private updateShockWaves(): void {
    const now = performance.now()

    for (let i = this.shockWaves.length - 1; i >= 0; i--) {
      const wave = this.shockWaves[i]
      const elapsed = now - wave.startTime
      const progress = elapsed / wave.duration

      if (progress >= 1) {
        this.scene.remove(wave.mesh)
        wave.mesh.geometry.dispose()
        ;(wave.mesh.material as THREE.Material).dispose()
        this.shockWaves.splice(i, 1)
        continue
      }

      const maxRadius = 6
      const currentScale = 1 + progress * maxRadius
      wave.mesh.scale.set(currentScale, currentScale, currentScale)

      const material = wave.mesh.material as THREE.MeshBasicMaterial
      material.opacity = 0.8 * (1 - progress * progress)
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    const deltaTime = this.clock.getDelta()

    this.mycelium.update(deltaTime)
    this.updateShockWaves()

    this.renderer.render(this.scene, this.camera)
  }
}

new MyceliumApp()
