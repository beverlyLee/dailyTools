import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CoralBranch, CoralTypes } from './corals/CoralBranch'

class CoralReefScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private corals: CoralBranch[] = []
  private clock: THREE.Clock
  private particles!: THREE.Points
  private lightBeams: THREE.Mesh[] = []

  constructor() {
    this.clock = new THREE.Clock()
    
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a1628)
    this.scene.fog = new THREE.FogExp2(0x0a1628, 0.08)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.set(8, 6, 8)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.minDistance = 3
    this.controls.maxDistance = 20

    this.setupLighting()
    this.createSeafloor()
    this.createCorals()
    this.createParticles()
    this.createLightBeams()

    window.addEventListener('resize', this.onResize.bind(this))
    
    document.body.appendChild(this.renderer.domElement)

    this.animate()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x406080, 0.6)
    this.scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2)
    sunLight.position.set(5, 15, 5)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 50
    sunLight.shadow.camera.left = -15
    sunLight.shadow.camera.right = 15
    sunLight.shadow.camera.top = 15
    sunLight.shadow.camera.bottom = -15
    this.scene.add(sunLight)

    const blueLight = new THREE.PointLight(0x40a0ff, 0.8, 15)
    blueLight.position.set(0, 8, 0)
    this.scene.add(blueLight)

    const fillLight = new THREE.DirectionalLight(0x80a0c0, 0.4)
    fillLight.position.set(-5, 5, -5)
    this.scene.add(fillLight)
  }

  private createSeafloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(30, 30, 64, 64)
    const positions = floorGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.3 +
                    Math.sin(x * 1.2 + 1) * Math.cos(y * 0.8 + 2) * 0.15
      positions.setZ(i, noise)
    }
    floorGeometry.computeVertexNormals()

    const floorMaterial = new THREE.MeshLambertMaterial({
      color: 0xc2b280,
      flatShading: true
    })

    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)

    this.addSandGrains()
    this.addRocks()
  }

  private addSandGrains(): void {
    const grainGeometry = new THREE.SphereGeometry(0.02, 4, 4)
    const grainMaterial = new THREE.MeshLambertMaterial({ color: 0xd4c4a0 })
    
    for (let i = 0; i < 200; i++) {
      const grain = new THREE.Mesh(grainGeometry, grainMaterial)
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 12
      grain.position.set(
        Math.cos(angle) * radius,
        0.02 + Math.random() * 0.05,
        Math.sin(angle) * radius
      )
      grain.scale.setScalar(0.5 + Math.random() * 1.5)
      this.scene.add(grain)
    }
  }

  private addRocks(): void {
    const rockColors = [0x6b6b6b, 0x5a5a5a, 0x4a4a4a]
    
    for (let i = 0; i < 8; i++) {
      const rockGeometry = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.6, 0)
      const rockMaterial = new THREE.MeshLambertMaterial({
        color: rockColors[Math.floor(Math.random() * rockColors.length)],
        flatShading: true
      })
      
      const rock = new THREE.Mesh(rockGeometry, rockMaterial)
      const angle = Math.random() * Math.PI * 2
      const radius = 3 + Math.random() * 8
      rock.position.set(
        Math.cos(angle) * radius,
        0.1 + Math.random() * 0.2,
        Math.sin(angle) * radius
      )
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      rock.scale.set(
        0.8 + Math.random() * 0.4,
        0.6 + Math.random() * 0.4,
        0.8 + Math.random() * 0.4
      )
      rock.castShadow = true
      rock.receiveShadow = true
      this.scene.add(rock)
    }
  }

  private createCorals(): void {
    const coralConfigs = [
      { type: CoralTypes.branchingOrange, pos: [-3, 0, -2], rot: 0.3 },
      { type: CoralTypes.brainPink, pos: [2, 0, 1], rot: -0.2 },
      { type: CoralTypes.purpleStaghorn, pos: [-1, 0, 3], rot: 0.5 },
      { type: CoralTypes.greenMound, pos: [4, 0, -1], rot: 0 },
      { type: CoralTypes.blueSeaFan, pos: [0, 0, -4], rot: 0.8 },
      { type: CoralTypes.branchingOrange, pos: [-4, 0, 2], rot: -0.6 },
      { type: CoralTypes.brainPink, pos: [1, 0, -3], rot: 0.4 },
      { type: CoralTypes.greenMound, pos: [-2, 0, 0], rot: -0.1 }
    ]

    coralConfigs.forEach((config, index) => {
      const coral = new CoralBranch(config.type, Math.floor(index / 3))
      const mesh = coral.getMesh()
      mesh.position.set(config.pos[0], config.pos[1], config.pos[2])
      mesh.rotation.y = config.rot
      this.corals.push(coral)
      this.scene.add(mesh)
    })
  }

  private createParticles(): void {
    const particleCount = 300
    const positions = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25
      positions[i * 3 + 1] = Math.random() * 15
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25
      sizes[i] = Math.random() * 2 + 1
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    })

    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)
  }

  private createLightBeams(): void {
    const beamGeometry = new THREE.PlaneGeometry(0.3, 15)
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    for (let i = 0; i < 5; i++) {
      const beam = new THREE.Mesh(beamGeometry, beamMaterial.clone())
      beam.position.set(
        (Math.random() - 0.5) * 12,
        7.5,
        (Math.random() - 0.5) * 12
      )
      beam.rotation.x = Math.PI / 2
      beam.rotation.z = Math.random() * Math.PI
      this.lightBeams.push(beam)
      this.scene.add(beam)
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this))

    const deltaTime = this.clock.getDelta()
    const time = this.clock.getElapsedTime()

    this.corals.forEach(coral => {
      coral.update(deltaTime)
    })

    this.animateParticles(time)
    this.animateLightBeams(time)

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private animateParticles(time: number): void {
    const positions = this.particles.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += Math.sin(time + i) * 0.001
      positions[i * 3 + 1] += 0.002
      positions[i * 3 + 2] += Math.cos(time + i * 0.5) * 0.001

      if (positions[i * 3 + 1] > 15) {
        positions[i * 3 + 1] = 0
        positions[i * 3] = (Math.random() - 0.5) * 25
        positions[i * 3 + 2] = (Math.random() - 0.5) * 25
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true
  }

  private animateLightBeams(time: number): void {
    this.lightBeams.forEach((beam, index) => {
      beam.rotation.z = Math.sin(time * 0.2 + index) * 0.2 + index * 0.5
      const material = beam.material as THREE.MeshBasicMaterial
      material.opacity = 0.02 + Math.sin(time * 0.5 + index) * 0.01
    })
  }
}

new CoralReefScene()
