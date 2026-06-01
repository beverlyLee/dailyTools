import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { COLORS } from '../types'

export class SceneManager {
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public controls: OrbitControls
  private container: HTMLElement
  private clock: THREE.Clock

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera()
    this.renderer = new THREE.WebGLRenderer()
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    this.init()
  }

  private init(): void {
    this.scene.background = new THREE.Color('#1a1a2e')
    this.scene.fog = new THREE.Fog('#1a1a2e', 15, 35)

    const { clientWidth, clientHeight } = this.container
    this.camera.aspect = clientWidth / clientHeight
    this.camera.fov = 50
    this.camera.near = 0.1
    this.camera.far = 100
    this.camera.position.set(8, 6, 8)
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(clientWidth, clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    this.container.appendChild(this.renderer.domElement)

    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.target.set(0, 2, 0)
    this.controls.minDistance = 4
    this.controls.maxDistance = 20
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1

    this.setupLighting()
    this.createLoomFrame()

    window.addEventListener('resize', this.handleResize)
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
    mainLight.position.set(6, 10, 6)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 30
    mainLight.shadow.camera.left = -10
    mainLight.shadow.camera.right = 10
    mainLight.shadow.camera.top = 10
    mainLight.shadow.camera.bottom = -10
    this.scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.4)
    fillLight.position.set(-5, 5, -3)
    this.scene.add(fillLight)

    const spotLight = new THREE.SpotLight(0xffd700, 0.8, 15, Math.PI / 6, 0.5, 1)
    spotLight.position.set(0, 8, 0)
    spotLight.target.position.set(0, 2, 0)
    spotLight.castShadow = true
    this.scene.add(spotLight)
    this.scene.add(spotLight.target)
  }

  private createLoomFrame(): void {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.wood,
      metalness: 0.1,
      roughness: 0.8,
    })

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.metal,
      metalness: 0.8,
      roughness: 0.3,
    })

    const baseGeometry = new THREE.BoxGeometry(12, 0.3, 2)
    const base = new THREE.Mesh(baseGeometry, woodMaterial)
    base.position.y = -0.15
    base.receiveShadow = true
    this.scene.add(base)

    const legGeometry = new THREE.BoxGeometry(0.3, 4, 0.3)
    const legPositions = [
      [-5.5, 2, -0.85],
      [5.5, 2, -0.85],
      [-5.5, 2, 0.85],
      [5.5, 2, 0.85],
    ]
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, woodMaterial)
      leg.position.set(pos[0], pos[1], pos[2])
      leg.castShadow = true
      this.scene.add(leg)
    })

    const topBeamGeometry = new THREE.BoxGeometry(12, 0.3, 0.3)
    const topBeam = new THREE.Mesh(topBeamGeometry, woodMaterial)
    topBeam.position.y = 4.15
    topBeam.castShadow = true
    this.scene.add(topBeam)

    const backBeamGeometry = new THREE.BoxGeometry(0.3, 4, 0.3)
    const backBeamLeft = new THREE.Mesh(backBeamGeometry, metalMaterial)
    backBeamLeft.position.set(-5.5, 2, 0)
    backBeamLeft.castShadow = true
    this.scene.add(backBeamLeft)

    const backBeamRight = new THREE.Mesh(backBeamGeometry, metalMaterial)
    backBeamRight.position.set(5.5, 2, 0)
    backBeamRight.castShadow = true
    this.scene.add(backBeamRight)

    const rollerGeometry = new THREE.CylinderGeometry(0.2, 0.2, 12, 16)
    const topRoller = new THREE.Mesh(rollerGeometry, woodMaterial)
    topRoller.rotation.z = Math.PI / 2
    topRoller.position.y = 4.15
    topRoller.castShadow = true
    this.scene.add(topRoller)

    const bottomRoller = new THREE.Mesh(rollerGeometry, woodMaterial)
    bottomRoller.rotation.z = Math.PI / 2
    bottomRoller.position.y = 0.15
    bottomRoller.castShadow = true
    this.scene.add(bottomRoller)

    const floorGeometry = new THREE.PlaneGeometry(30, 30)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: '#2d2d44',
      metalness: 0.1,
      roughness: 0.9,
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.3
    floor.receiveShadow = true
    this.scene.add(floor)
  }

  getDeltaTime(): number {
    return this.clock.getDelta()
  }

  update(): void {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private handleResize = (): void => {
    const { clientWidth, clientHeight } = this.container
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight)
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize)
    this.controls.dispose()
    this.renderer.dispose()
    if (
      this.renderer.domElement &&
      this.renderer.domElement.parentNode === this.container
    ) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
