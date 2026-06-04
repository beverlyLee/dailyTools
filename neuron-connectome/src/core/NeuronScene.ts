import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { NeuronCell, AxonManager } from '../neurons/NeuronCell'
import { NeuronNetwork } from '../neurons/NeuronNetwork'
import { ImpulseSystem } from '../neurons/ImpulseSystem'
import { UIController } from './UIController'

export class NeuronScene {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls

  private neuronNetwork: NeuronNetwork
  private neuronCell: NeuronCell
  private axonManager: AxonManager
  private impulseSystem: ImpulseSystem
  private uiController: UIController

  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  private animationId: number | null = null
  private lastTime: number = 0
  private frameCount: number = 0
  private fpsUpdateTime: number = 0

  private neuronCount: number
  private connectionDensity: number
  private maxVisibleAxons: number

  private starField: THREE.Points
  private frustum: THREE.Frustum
  private projectionScreenMatrix: THREE.Matrix4

  constructor(container: HTMLElement, neuronCount: number = 10000, connectionDensity: number = 3) {
    this.container = container
    this.neuronCount = neuronCount
    this.connectionDensity = connectionDensity
    this.maxVisibleAxons = 20000

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.frustum = new THREE.Frustum()
    this.projectionScreenMatrix = new THREE.Matrix4()

    this.scene = this.createScene()
    this.camera = this.createCamera()
    this.renderer = this.createRenderer()
    this.controls = this.createControls()

    this.neuronNetwork = new NeuronNetwork(this.neuronCount, this.connectionDensity)
    this.neuronCell = new NeuronCell(this.neuronNetwork.neurons.length)
    this.axonManager = new AxonManager(this.neuronNetwork.connections, this.maxVisibleAxons)
    this.impulseSystem = new ImpulseSystem(600)

    this.uiController = new UIController(this.container)
    this.uiController.updateState({
      neuronCount: this.neuronNetwork.neurons.length,
      connectionCount: this.neuronNetwork.connections.length
    })

    this.starField = this.createStarField()

    this.setupLighting()
    this.addObjectsToScene()
    this.setupEventListeners()

    this.updateNeuronInstances(0)
    this.updateVisibleAxons()
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050714)
    scene.fog = new THREE.FogExp2(0x050714, 0.004)
    return scene
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      1,
      200
    )
    camera.position.set(0, 0, 38)
    return camera
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    renderer.setClearColor(0x050714, 1)
    renderer.autoClear = true
    this.container.appendChild(renderer.domElement)
    return renderer
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 8
    controls.maxDistance = 70
    controls.enablePan = true
    controls.rotateSpeed = 0.5
    controls.zoomSpeed = 0.8
    return controls
  }

  private createStarField(): THREE.Points {
    const particleCount = 800
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const radius = 40 + Math.random() * 25
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const color = new THREE.Color()
      color.setHSL(0.6 + Math.random() * 0.1, 0.3, 0.15 + Math.random() * 0.15)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    return new THREE.Points(geometry, material)
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const light1 = new THREE.DirectionalLight(0x6366f1, 0.8)
    light1.position.set(1, 1, 1)
    this.scene.add(light1)

    const light2 = new THREE.DirectionalLight(0x00a8c8, 0.5)
    light2.position.set(-1, -0.5, -1)
    this.scene.add(light2)

    const hemLight = new THREE.HemisphereLight(0x6366f1, 0x050714, 0.4)
    this.scene.add(hemLight)
  }

  private addObjectsToScene(): void {
    this.scene.add(this.neuronCell.instancedMesh)
    this.scene.add(this.axonManager.cylinderMesh)
    this.scene.add(this.impulseSystem.particleMesh)
    this.scene.add(this.starField)
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this))
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this))
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event)
  }

  private onClick(event: MouseEvent): void {
    this.updateMouse(event)

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.neuronCell.instancedMesh)

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId
      if (instanceId !== undefined && instanceId >= 0) {
        this.selectNeuron(instanceId)
        this.triggerImpulse(instanceId)
      }
    }
  }

  private selectNeuron(neuronId: number): void {
    const neuron = this.neuronNetwork.getNeuron(neuronId)
    this.uiController.setSelectedNeuron(neuron || null)
  }

  private triggerImpulse(startNeuronId: number): void {
    this.neuronNetwork.resetActivations()
    this.impulseSystem.triggerImpulse(
      startNeuronId,
      this.neuronNetwork.neurons,
      this.neuronNetwork.connections
    )
    this.uiController.setImpulseActive(true)
  }

  private updateNeuronInstances(time: number): void {
    this.neuronCell.updateInstances(this.neuronNetwork.neurons, time)
  }

  private updateNeuronActivation(index: number, activation: number): void {
    const neuron = this.neuronNetwork.getNeuron(index)
    if (neuron) {
      this.neuronCell.updateActivation(index, activation, neuron.baseColor)
    }
  }

  private updateConnectionActivation(index: number, activation: number): void {
    this.axonManager.updateConnectionActivation(index, activation)
  }

  private updateVisibleAxons(): void {
    this.camera.updateMatrixWorld()
    this.projectionScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    )
    this.frustum.setFromProjectionMatrix(this.projectionScreenMatrix)

    const activeConnections = new Set<number>()
    for (const [neuronId] of this.impulseSystem.activations) {
      const neuron = this.neuronNetwork.getNeuron(neuronId)
      if (neuron) {
        for (const connId of neuron.connections) {
          const idx = this.neuronNetwork.getConnectionIndex(neuronId, connId)
          if (idx !== -1) activeConnections.add(idx)
        }
        for (let i = 0; i < this.neuronNetwork.connections.length; i++) {
          const conn = this.neuronNetwork.connections[i]
          if (conn.to === neuronId) activeConnections.add(i)
        }
      }
    }

    const cameraPos = this.camera.position
    const visibleIndices: number[] = []
    const center = new THREE.Vector3()
    const testSphere = new THREE.Sphere()

    for (let i = 0; i < this.neuronNetwork.connections.length && visibleIndices.length < this.maxVisibleAxons; i++) {
      const conn = this.neuronNetwork.connections[i]
      
      if (activeConnections.has(i)) {
        visibleIndices.push(i)
        continue
      }

      center.copy(conn.fromPosition).add(conn.toPosition).multiplyScalar(0.5)
      
      const distance = center.distanceTo(cameraPos)
      if (distance > 50) continue

      testSphere.center.copy(center)
      testSphere.radius = 2
      if (this.frustum.intersectsSphere(testSphere)) {
        visibleIndices.push(i)
      }
    }

    this.axonManager.updateVisibleAxons(visibleIndices)
  }

  private animate(time: number): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))

    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1)
    this.lastTime = time

    this.frameCount++
    if (time - this.fpsUpdateTime >= 1000) {
      this.uiController.setFPS(this.frameCount)
      this.frameCount = 0
      this.fpsUpdateTime = time
    }

    this.controls.update()

    this.impulseSystem.update(
      deltaTime,
      this.neuronNetwork.neurons,
      this.neuronNetwork.connections,
      this.updateNeuronActivation.bind(this),
      this.updateConnectionActivation.bind(this)
    )

    this.updateNeuronInstances(time)

    if (this.impulseSystem.particles.length === 0 && this.impulseSystem.activations.size === 0) {
      this.uiController.setImpulseActive(false)
    }

    if (this.frameCount % 6 === 0) {
      const selectedId = (this.uiController as any).state?.selectedNeuron?.id
      if (selectedId !== undefined) {
        const updatedNeuron = this.neuronNetwork.getNeuron(selectedId)
        if (updatedNeuron) {
          this.uiController.updateSelectedNeuron(updatedNeuron)
        }
      }
    }

    this.starField.rotation.y += deltaTime * 0.008

    if (this.frameCount % 3 === 0) {
      this.updateVisibleAxons()
    }

    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)
  }

  public start(): void {
    this.lastTime = performance.now()
    this.fpsUpdateTime = performance.now()
    this.animate(this.lastTime)
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  public dispose(): void {
    this.stop()

    window.removeEventListener('resize', this.onWindowResize.bind(this))
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this))
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this))

    this.neuronCell.dispose()
    this.axonManager.dispose()
    this.impulseSystem.dispose()
    this.uiController.dispose()

    this.starField.geometry.dispose()
    ;(this.starField.material as THREE.Material).dispose()

    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
