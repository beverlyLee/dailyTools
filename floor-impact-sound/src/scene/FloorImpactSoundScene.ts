import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ImpactSourceGenerator, impactSources } from '../sources/ImpactSourceGenerator'
import { FloorStructureManager, floorStructures } from '../structure/FloorStructureManager'
import { VibrationTransmission } from '../physics/VibrationTransmission'
import { SolutionAdvisor } from '../solutions/SolutionAdvisor'
import type { ImpactEvent, FloorStructure, VibrationPoint } from '../types'

export class FloorImpactSoundScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private clock: THREE.Clock

  private impactGenerator: ImpactSourceGenerator
  private floorManager: FloorStructureManager
  private vibrationCalc: VibrationTransmission
  private solutionAdvisor: SolutionAdvisor

  private floorGroup: THREE.Group
  private impactMarkers: Map<string, THREE.Mesh> = new Map()
  private heatmapMesh!: THREE.Mesh
  private heatmapCanvas!: HTMLCanvasElement
  private heatmapTexture!: THREE.CanvasTexture
  private waveParticles!: THREE.Points
  private particlePositions: Float32Array = new Float32Array()
  private particleVelocities: Float32Array = new Float32Array()
  private particleLifetimes: Float32Array = new Float32Array()

  private gridSize: number = 10
  private particleCount: number = 5000
  private isRunning: boolean = true
  private currentStructureId: string = 'bareConcrete'
  private currentSourceId: string = 'highHeel'
  private currentIntensity: number = 1.0
  private autoWalkTimer: number = 0
  private walkPath: { x: number; z: number }[] = []
  private walkIndex: number = 0

  private onSPLUpdate?: (avg: number, peak: number, level: string) => void
  private onSolutionsUpdate?: (solutions: any[], peakSPL: number) => void

  constructor() {
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.set(10, 6, 12)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI / 2.2
    this.controls.minDistance = 3
    this.controls.maxDistance = 25

    this.impactGenerator = new ImpactSourceGenerator()
    this.floorManager = new FloorStructureManager('bareConcrete')
    this.vibrationCalc = new VibrationTransmission(this.floorManager.getCurrentStructure())
    this.solutionAdvisor = new SolutionAdvisor(this.floorManager.getCurrentStructure())

    this.floorGroup = new THREE.Group()

    this.setupLighting()
    this.createRoom()
    this.createFloorStructure()
    this.createHeatmap()
    this.createWaveParticles()
    this.generateWalkPath()

    window.addEventListener('resize', this.onResize.bind(this))
    window.addEventListener('click', this.onClick.bind(this))

    document.body.appendChild(this.renderer.domElement)

    this.animate()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.9)
    mainLight.position.set(5, 15, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 50
    mainLight.shadow.camera.left = -12
    mainLight.shadow.camera.right = 12
    mainLight.shadow.camera.top = 12
    mainLight.shadow.camera.bottom = -12
    this.scene.add(mainLight)

    const upstairsLight = new THREE.PointLight(0xffeedd, 0.5, 15)
    upstairsLight.position.set(0, 3, 0)
    this.scene.add(upstairsLight)

    const downstairsLight = new THREE.PointLight(0x88ccff, 0.3, 15)
    downstairsLight.position.set(0, -3, 0)
    this.scene.add(downstairsLight)
  }

  private createRoom(): void {
    const roomSize = this.gridSize + 4

    const upstairsWallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f0e8,
      side: THREE.BackSide,
      roughness: 0.9
    })

    const upstairsWall = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize, 4, roomSize),
      upstairsWallMat
    )
    upstairsWall.position.y = 2
    this.scene.add(upstairsWall)

    const downstairsWallMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      side: THREE.BackSide,
      roughness: 0.8
    })

    const downstairsWall = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize, 4, roomSize),
      downstairsWallMat
    )
    downstairsWall.position.y = -2
    this.scene.add(downstairsWall)
  }

  private createFloorStructure(): void {
    while (this.floorGroup.children.length > 0) {
      const child = this.floorGroup.children[0]
      this.floorGroup.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }

    const structure = this.floorManager.getCurrentStructure()
    let yOffset = 0

    for (let i = structure.layers.length - 1; i >= 0; i--) {
      const layer = structure.layers[i]
      const layerHeight = layer.thickness * 30

      const geometry = new THREE.BoxGeometry(this.gridSize, layerHeight, this.gridSize)
      const color = new THREE.Color(layer.color)

      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.1
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.y = yOffset + layerHeight / 2
      mesh.receiveShadow = true
      mesh.castShadow = true
      this.floorGroup.add(mesh)

      yOffset += layerHeight
    }

    this.floorGroup.position.y = -yOffset / 2
    this.scene.add(this.floorGroup)
  }

  private createHeatmap(): void {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    this.heatmapCanvas = canvas

    this.heatmapTexture = new THREE.CanvasTexture(canvas)
    this.heatmapTexture.needsUpdate = true

    const heatmapGeo = new THREE.PlaneGeometry(this.gridSize * 0.95, this.gridSize * 0.95)
    const heatmapMat = new THREE.MeshBasicMaterial({
      map: this.heatmapTexture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    this.heatmapMesh = new THREE.Mesh(heatmapGeo, heatmapMat)
    this.heatmapMesh.rotation.x = -Math.PI / 2
    this.heatmapMesh.position.y = -this.getFloorTotalHeight() / 2 - 0.01
    this.scene.add(this.heatmapMesh)

    this.updateHeatmap()
  }

  private getFloorTotalHeight(): number {
    const structure = this.floorManager.getCurrentStructure()
    return structure.layers.reduce((sum: number, layer: any) => sum + layer.thickness * 30, 0)
  }

  private createWaveParticles(): void {
    const positions = new Float32Array(this.particleCount * 3)
    this.particlePositions = new Float32Array(this.particleCount * 3)
    this.particleVelocities = new Float32Array(this.particleCount * 3)
    this.particleLifetimes = new Float32Array(this.particleCount)

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      this.particleLifetimes[i] = -1
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: 0xffff00,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.waveParticles = new THREE.Points(geometry, material)
    this.waveParticles.position.y = -this.getFloorTotalHeight() / 2
    this.scene.add(this.waveParticles)
  }

  private generateWalkPath(): void {
    this.walkPath = []
    const pathPoints = 8
    for (let i = 0; i < pathPoints; i++) {
      const angle = (i / pathPoints) * Math.PI * 2
      const radius = 3
      this.walkPath.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius
      })
    }
  }

  private updateHeatmap(): void {
    const ctx = this.heatmapCanvas.getContext('2d')
    if (!ctx) return

    const w = this.heatmapCanvas.width
    const h = this.heatmapCanvas.height

    ctx.fillStyle = '#00ff00'
    ctx.fillRect(0, 0, w, h)

    const currentTime = this.clock.getElapsedTime()
    const activeImpacts = this.impactGenerator.getActiveImpacts(currentTime)

    if (activeImpacts.length === 0) {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
      gradient.addColorStop(0, 'rgba(0, 255, 100, 0.8)')
      gradient.addColorStop(1, 'rgba(0, 200, 80, 0.6)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
    } else {
      const imageData = ctx.createImageData(w, h)
      const data = imageData.data

      const gridRes = 50
      const cellSize = this.gridSize / gridRes
      const halfSize = this.gridSize / 2

      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const worldX = -halfSize + (px / w) * this.gridSize
          const worldZ = -halfSize + (py / h) * this.gridSize

          let totalSPL = 0
          for (const impact of activeImpacts) {
            const vib = this.vibrationCalc.calculateVibrationAtPoint(
              impact, worldX, worldZ, currentTime
            )
            const spl = this.vibrationCalc.calculateSoundPressureLevel(vib, 500)
            totalSPL = Math.max(totalSPL, spl)
          }

          const idx = (py * w + px) * 4
          const color = this.getHeatmapColor(totalSPL)

          data[idx] = color.r
          data[idx + 1] = color.g
          data[idx + 2] = color.b
          data[idx + 3] = 230
        }
      }

      ctx.putImageData(imageData, 0, 0)
    }

    this.heatmapTexture.needsUpdate = true
  }

  private getHeatmapColor(spl: number): { r: number; g: number; b: number } {
    const normalized = Math.min(Math.max((spl - 20) / 60, 0), 1)

    if (normalized < 0.25) {
      const t = normalized / 0.25
      return {
        r: Math.floor(30),
        g: Math.floor(180 + t * 75),
        b: Math.floor(255 - t * 155)
      }
    } else if (normalized < 0.5) {
      const t = (normalized - 0.25) / 0.25
      return {
        r: Math.floor(30 + t * 200),
        g: Math.floor(255),
        b: Math.floor(100 - t * 100)
      }
    } else if (normalized < 0.75) {
      const t = (normalized - 0.5) / 0.25
      return {
        r: Math.floor(230 + t * 25),
        g: Math.floor(255 - t * 100),
        b: Math.floor(0)
      }
    } else {
      const t = (normalized - 0.75) / 0.25
      return {
        r: Math.floor(255),
        g: Math.floor(155 - t * 155),
        b: Math.floor(0)
      }
    }
  }

  private updateWaveParticles(deltaTime: number): void {
    const positions = this.waveParticles.geometry.attributes.position.array as Float32Array
    const currentTime = this.clock.getElapsedTime()
    const activeImpacts = this.impactGenerator.getActiveImpacts(currentTime)

    const floorBottom = -this.getFloorTotalHeight() / 2

    for (let i = 0; i < this.particleCount; i++) {
      if (this.particleLifetimes[i] <= 0) {
        continue
      }

      this.particleLifetimes[i] -= deltaTime

      positions[i * 3] += this.particleVelocities[i * 3] * deltaTime
      positions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * deltaTime
      positions[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * deltaTime

      this.particleVelocities[i * 3 + 1] -= 2 * deltaTime
      this.particleVelocities[i * 3] *= 0.99
      this.particleVelocities[i * 3 + 2] *= 0.99

      if (this.particleLifetimes[i] <= 0) {
        positions[i * 3] = 0
        positions[i * 3 + 1] = -100
        positions[i * 3 + 2] = 0
      }
    }

    for (const impact of activeImpacts) {
      const elapsed = currentTime - impact.timestamp
      if (elapsed < 0.01 && Math.random() < 0.3) {
        this.emitParticles(impact, floorBottom)
      }
    }

    this.waveParticles.geometry.attributes.position.needsUpdate = true
  }

  private emitParticles(impact: ImpactEvent, floorY: number): void {
    const emitCount = 30 + Math.floor(Math.random() * 20)
    const color = new THREE.Color(impact.source.color)

    const material = this.waveParticles.material as THREE.PointsMaterial
    material.color.lerp(color, 0.1)

    for (let k = 0; k < emitCount; k++) {
      let idx = -1
      for (let i = 0; i < this.particleCount; i++) {
        if (this.particleLifetimes[i] <= 0) {
          idx = i
          break
        }
      }
      if (idx < 0) break

      const positions = this.waveParticles.geometry.attributes.position.array as Float32Array

      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.8
      const speed = 2 + Math.random() * 3

      positions[idx * 3] = impact.position.x + Math.cos(angle) * radius
      positions[idx * 3 + 1] = floorY - 0.1
      positions[idx * 3 + 2] = impact.position.z + Math.sin(angle) * radius

      this.particleVelocities[idx * 3] = Math.cos(angle) * speed * 0.7
      this.particleVelocities[idx * 3 + 1] = -(0.5 + Math.random() * 1.5)
      this.particleVelocities[idx * 3 + 2] = Math.sin(angle) * speed * 0.7

      this.particleLifetimes[idx] = 1.2 + Math.random() * 0.8
    }
  }

  private createImpactMarker(impact: ImpactEvent): void {
    const geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16)
    const material = new THREE.MeshBasicMaterial({
      color: impact.source.color,
      transparent: true,
      opacity: 0.9
    })

    const marker = new THREE.Mesh(geometry, material)
    marker.position.set(
      impact.position.x,
      this.getFloorTotalHeight() / 2 + 0.02,
      impact.position.z
    )

    const ringGeo = new THREE.RingGeometry(0.2, 0.25, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: impact.source.color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.015
    marker.add(ring)

    this.scene.add(marker)
    this.impactMarkers.set(impact.id, marker)
  }

  private updateImpactMarkers(currentTime: number): void {
    const activeImpacts = this.impactGenerator.getActiveImpacts(currentTime)
    const activeIds = new Set(activeImpacts.map(i => i.id))

    for (const [id, marker] of this.impactMarkers) {
      if (!activeIds.has(id)) {
        this.scene.remove(marker)
        marker.geometry.dispose()
        if (marker.material instanceof THREE.Material) {
          marker.material.dispose()
        }
        this.impactMarkers.delete(id)
      }
    }

    for (const impact of activeImpacts) {
      if (!this.impactMarkers.has(impact.id)) {
        this.createImpactMarker(impact)
      }

      const marker = this.impactMarkers.get(impact.id)
      if (marker) {
        const elapsed = currentTime - impact.timestamp
        const scale = 1 + elapsed * 3
        const opacity = Math.max(0, 1 - elapsed * 3)

        marker.scale.setScalar(scale)
        const mat = marker.material as THREE.MeshBasicMaterial
        mat.opacity = opacity * 0.9
      }
    }
  }

  private updateAutoWalk(deltaTime: number): void {
    if (!this.isRunning) return

    this.autoWalkTimer += deltaTime

    const walkSpeed = 0.8
    const stepInterval = 0.5

    if (this.autoWalkTimer >= stepInterval) {
      this.autoWalkTimer = 0

      const pos = this.walkPath[this.walkIndex]
      this.impactGenerator.createImpact(this.currentSourceId, pos, this.currentIntensity * 0.8)

      this.walkIndex = (this.walkIndex + 1) % this.walkPath.length
    }
  }

  private updateSPLDisplay(): void {
    const currentTime = this.clock.getElapsedTime()
    const activeImpacts = this.impactGenerator.getActiveImpacts(currentTime)

    const avgSPL = this.vibrationCalc.getAverageSPL(activeImpacts, currentTime)
    const peakSPL = this.vibrationCalc.getPeakSPL(activeImpacts, currentTime)

    const level = this.floorManager.getInsulationLevel(this.currentSourceId)

    if (this.onSPLUpdate) {
      this.onSPLUpdate(avgSPL, peakSPL, level)
    }

    if (this.onSolutionsUpdate) {
      if (peakSPL > 45) {
        const solutions = this.solutionAdvisor.getTopSuggestions(this.currentSourceId, peakSPL, 3)
        this.onSolutionsUpdate(solutions, peakSPL)
      } else {
        const solutions = this.solutionAdvisor.getPreventiveSuggestions(this.currentSourceId, 3)
        this.onSolutionsUpdate(solutions, peakSPL)
      }
    }
  }

  private onClick = (event: MouseEvent): void => {
    if (event.target !== this.renderer.domElement) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const floorTop = this.getFloorTotalHeight() / 2
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorTop)

    const intersect = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, intersect)

    if (intersect && Math.abs(intersect.x) < this.gridSize / 2 && Math.abs(intersect.z) < this.gridSize / 2) {
      this.impactGenerator.createImpact(
        this.currentSourceId,
        { x: intersect.x, z: intersect.z },
        this.currentIntensity
      )
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

    this.updateAutoWalk(deltaTime)
    this.updateHeatmap()
    this.updateWaveParticles(deltaTime)
    this.updateImpactMarkers(this.clock.getElapsedTime())
    this.updateSPLDisplay()

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  setStructure(structureId: string): void {
    if (this.floorManager.setStructure(structureId)) {
      this.currentStructureId = structureId
      this.vibrationCalc.updateStructure(this.floorManager.getCurrentStructure())
      this.solutionAdvisor.updateStructure(this.floorManager.getCurrentStructure())
      this.createFloorStructure()
      this.heatmapMesh.position.y = -this.getFloorTotalHeight() / 2 - 0.01
      this.waveParticles.position.y = -this.getFloorTotalHeight() / 2
      this.refreshSolutions()
    }
  }

  triggerImpact(sourceId: string, intensity?: number): void {
    const pos = {
      x: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 4
    }
    const impactIntensity = intensity !== undefined ? intensity : this.currentIntensity
    this.impactGenerator.createImpact(sourceId, pos, impactIntensity)
  }

  triggerImpactAtPosition(sourceId: string, x: number, z: number, intensity: number = 1.0): void {
    this.impactGenerator.createImpact(sourceId, { x, z }, intensity)
  }

  setAutoWalk(enabled: boolean): void {
    this.isRunning = enabled
  }

  setSourceId(sourceId: string): void {
    this.currentSourceId = sourceId
    this.refreshSolutions()
  }

  setIntensity(intensity: number): void {
    this.currentIntensity = Math.max(0.2, Math.min(2.0, intensity))
  }

  private refreshSolutions(): void {
    if (!this.onSolutionsUpdate) return
    const currentTime = this.clock.getElapsedTime()
    const activeImpacts = this.impactGenerator.getActiveImpacts(currentTime)
    const peakSPL = this.vibrationCalc.getPeakSPL(activeImpacts, currentTime)
    const solutions = this.solutionAdvisor.getPreventiveSuggestions(this.currentSourceId, 3)
    this.onSolutionsUpdate(solutions, peakSPL)
  }

  setOnSPLUpdate(callback: (avg: number, peak: number, level: string) => void): void {
    this.onSPLUpdate = callback
  }

  setOnSolutionsUpdate(callback: (solutions: any[], peakSPL: number) => void): void {
    this.onSolutionsUpdate = callback
  }

  getStructures(): typeof floorStructures {
    return floorStructures
  }

  getCurrentStructure(): FloorStructure {
    return this.floorManager.getCurrentStructure()
  }

  getImpactSources() {
    return impactSources
  }
}
