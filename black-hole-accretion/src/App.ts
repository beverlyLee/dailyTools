import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EventHorizon } from './blackhole/EventHorizon'
import { AccretionDisk } from './accretion/Disk'
import { Starfield } from './stars/Starfield'

export class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private eventHorizon: EventHorizon
  private accretionDisk: AccretionDisk
  private starfield: Starfield
  private clock: THREE.Clock
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()
    
    this.scene = new THREE.Scene()
    this.camera = this.createCamera()
    this.renderer = this.createRenderer()
    this.controls = this.createControls()
    
    this.starfield = new Starfield(1)
    this.scene.add(this.starfield.mesh)
    
    this.eventHorizon = new EventHorizon(1)
    this.scene.add(this.eventHorizon.mesh)
    
    this.accretionDisk = new AccretionDisk(1.3, 4.5)
    this.scene.add(this.accretionDisk.mesh)
    
    this.setupEventListeners()
    this.animate()
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 3, 8)
    return camera
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 1)
    this.container.appendChild(renderer.domElement)
    return renderer
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 3
    controls.maxDistance = 30
    controls.target.set(0, 0, 0)
    return controls
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this))
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.starfield.updateResolution(window.innerWidth, window.innerHeight)
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))
    
    const time = this.clock.getElapsedTime()
    
    this.accretionDisk.update(time)
    this.starfield.update(time)
    
    this.controls.update()
    
    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    this.eventHorizon.dispose()
    this.accretionDisk.dispose()
    this.starfield.dispose()
    this.renderer.dispose()
    this.controls.dispose()
    window.removeEventListener('resize', this.onResize.bind(this))
  }
}
