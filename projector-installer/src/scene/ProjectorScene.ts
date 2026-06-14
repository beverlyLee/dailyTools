import * as THREE from 'three'
import type { Projector, ScreenSize } from '../types'
import { calculateProjection } from '../utils/optics'

export class ProjectorScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  
  roomGroup: THREE.Group
  projectorGroup: THREE.Group
  screenGroup: THREE.Group
  lightConeGroup: THREE.Group
  personGroup: THREE.Group
  
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private isDragging: boolean = false
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 }
  private cameraAngle: number = -Math.PI / 4
  private cameraHeight: number = 2
  private cameraDistance: number = 6
  
  private roomWidth: number = 6
  private roomDepth: number = 5
  private roomHeight: number = 2.8
  
  private currentProjector: Projector | null = null
  private currentScreen: ScreenSize | null = null
  private currentDistance: number = 3
  private currentZoom: number = 0
  private lensHeight: number = 0.45
  private horizontalShift: number = 0
  
  private animationId: number = 0
  
  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)
    this.scene.fog = new THREE.Fog(0x1a1a2e, 8, 20)
    
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100)
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)
    
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    this.roomGroup = new THREE.Group()
    this.projectorGroup = new THREE.Group()
    this.screenGroup = new THREE.Group()
    this.lightConeGroup = new THREE.Group()
    this.personGroup = new THREE.Group()
    
    this.scene.add(this.roomGroup)
    this.scene.add(this.projectorGroup)
    this.scene.add(this.screenGroup)
    this.scene.add(this.lightConeGroup)
    this.scene.add(this.personGroup)
    
    this.setupLights()
    this.createRoom()
    this.updateCameraPosition()
    this.bindEvents(container)
    this.animate()
  }
  
  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)
    
    const roomLight = new THREE.PointLight(0xfff8e8, 0.5, 10)
    roomLight.position.set(0, this.roomHeight - 0.2, this.roomDepth / 2)
    roomLight.castShadow = true
    this.scene.add(roomLight)
    
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3)
    fillLight.position.set(-3, 3, -2)
    this.scene.add(fillLight)
  }
  
  private createRoom() {
    const floorGeo = new THREE.PlaneGeometry(this.roomWidth, this.roomDepth)
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a4a,
      roughness: 0.8,
      metalness: 0.1
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.roomGroup.add(floor)
    
    const ceilingGeo = new THREE.PlaneGeometry(this.roomWidth, this.roomDepth)
    const ceilingMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a3a,
      side: THREE.DoubleSide
    })
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat)
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.y = this.roomHeight
    this.roomGroup.add(ceiling)
    
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: 0x4a4a5a,
      roughness: 0.9
    })
    
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomWidth, this.roomHeight),
      wallMat
    )
    backWall.position.z = this.roomDepth
    backWall.position.y = this.roomHeight / 2
    backWall.receiveShadow = true
    this.roomGroup.add(backWall)
    
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomDepth, this.roomHeight),
      wallMat
    )
    leftWall.position.x = -this.roomWidth / 2
    leftWall.position.y = this.roomHeight / 2
    leftWall.rotation.y = Math.PI / 2
    this.roomGroup.add(leftWall)
    
    const gridHelper = new THREE.GridHelper(this.roomWidth, 12, 0x555566, 0x444455)
    this.roomGroup.add(gridHelper)
    
    const sizeLabel = new THREE.Group()
    this.roomGroup.add(sizeLabel)
  }
  
  private updateCameraPosition() {
    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraDistance
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraDistance + this.roomDepth / 2
    this.camera.position.y = this.cameraHeight
    this.camera.lookAt(0, this.roomHeight / 3, this.roomDepth / 2)
  }
  
  setProjector(projector: Projector) {
    this.currentProjector = projector
    this.updateProjector()
    this.updateLightCone()
  }
  
  setScreen(screen: ScreenSize) {
    this.currentScreen = screen
    this.updateScreen()
  }
  
  setDistance(distance: number) {
    this.currentDistance = Math.max(0.5, Math.min(this.roomDepth - 0.5, distance))
    this.updateProjector()
    this.updateLightCone()
    this.updatePerson()
  }
  
  setZoom(zoom: number) {
    this.currentZoom = Math.max(0, Math.min(1, zoom))
    this.updateLightCone()
  }
  
  setLensHeight(height: number) {
    this.lensHeight = Math.max(0.2, Math.min(this.roomHeight - 0.2, height))
    this.updateProjector()
    this.updateLightCone()
  }
  
  setHorizontalShift(shift: number) {
    this.horizontalShift = shift
    this.updateProjector()
    this.updateLightCone()
  }
  
  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }
  }
  
  private updateProjector() {
    this.clearGroup(this.projectorGroup)
    
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.12, 0.3)
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      metalness: 0.6,
      roughness: 0.3
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.castShadow = true
    
    const lensGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.03, 24)
    const lensMat = new THREE.MeshStandardMaterial({ 
      color: 0x3366ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.1
    })
    const lens = new THREE.Mesh(lensGeo, lensMat)
    lens.rotation.x = Math.PI / 2
    lens.position.z = 0.165
    
    this.projectorGroup.add(body)
    this.projectorGroup.add(lens)
    
    this.projectorGroup.position.x = this.horizontalShift
    this.projectorGroup.position.y = this.lensHeight
    this.projectorGroup.position.z = this.roomDepth - this.currentDistance
    
    const lensGlow = new THREE.PointLight(0x6688ff, 0.8, 5)
    lensGlow.position.set(0, 0, 0.18)
    this.projectorGroup.add(lensGlow)
  }
  
  private updateScreen() {
    this.clearGroup(this.screenGroup)
    
    if (!this.currentScreen) return
    
    const screenFrameGeo = new THREE.BoxGeometry(
      this.currentScreen.width + 0.05,
      this.currentScreen.height + 0.05,
      0.03
    )
    const screenFrameMat = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 0.3,
      roughness: 0.5
    })
    const frame = new THREE.Mesh(screenFrameGeo, screenFrameMat)
    frame.position.z = this.roomDepth - 0.015
    frame.position.y = 0.6 + this.currentScreen.height / 2
    frame.castShadow = true
    this.screenGroup.add(frame)
    
    const screenGeo = new THREE.PlaneGeometry(this.currentScreen.width, this.currentScreen.height)
    const screenMat = new THREE.MeshStandardMaterial({ 
      color: 0xf0f0f0,
      emissive: 0x222233,
      emissiveIntensity: 0.2,
      roughness: 0.6
    })
    const screen = new THREE.Mesh(screenGeo, screenMat)
    screen.position.z = this.roomDepth - 0.001
    screen.position.y = 0.6 + this.currentScreen.height / 2
    screen.receiveShadow = true
    this.screenGroup.add(screen)
    
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(
      this.currentScreen.width + 0.02,
      this.currentScreen.height + 0.02,
      0.001
    ))
    const borderMat = new THREE.LineBasicMaterial({ color: 0x888888 })
    const border = new THREE.LineSegments(borderGeo, borderMat)
    border.position.z = this.roomDepth
    border.position.y = 0.6 + this.currentScreen.height / 2
    this.screenGroup.add(border)
    
    const labelCanvas = document.createElement('canvas')
    labelCanvas.width = 256
    labelCanvas.height = 64
    const ctx = labelCanvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.currentScreen.name, 128, 32)
    
    const labelTex = new THREE.CanvasTexture(labelCanvas)
    const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true })
    const label = new THREE.Sprite(labelMat)
    label.position.set(0, 0.6 - 0.15, this.roomDepth + 0.01)
    label.scale.set(0.8, 0.2, 1)
    this.screenGroup.add(label)
  }
  
  private updateLightCone() {
    this.clearGroup(this.lightConeGroup)
    
    if (!this.currentProjector) return
    
    const projection = calculateProjection(this.currentProjector, this.currentDistance, this.currentZoom)
    
    const projX = this.horizontalShift
    const projY = this.lensHeight
    const projZ = this.roomDepth - this.currentDistance
    
    const screenZ = this.roomDepth
    
    const halfWidth = projection.imageWidth / 2
    const topY = projY + projection.offsetHeight
    const bottomY = topY - projection.imageHeight
    
    const coneShape = new THREE.BufferGeometry()
    
    const vertices = new Float32Array([
      projX, projY, projZ + 0.02,
      projX - halfWidth, topY, screenZ,
      projX + halfWidth, topY, screenZ,
      
      projX, projY, projZ + 0.02,
      projX + halfWidth, topY, screenZ,
      projX + halfWidth, bottomY, screenZ,
      
      projX, projY, projZ + 0.02,
      projX + halfWidth, bottomY, screenZ,
      projX - halfWidth, bottomY, screenZ,
      
      projX, projY, projZ + 0.02,
      projX - halfWidth, bottomY, screenZ,
      projX - halfWidth, topY, screenZ,
      
      projX - halfWidth, topY, screenZ,
      projX + halfWidth, topY, screenZ,
      projX + halfWidth, bottomY, screenZ,
      
      projX - halfWidth, topY, screenZ,
      projX + halfWidth, bottomY, screenZ,
      projX - halfWidth, bottomY, screenZ,
    ])
    
    coneShape.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    coneShape.computeVertexNormals()
    
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const cone = new THREE.Mesh(coneShape, coneMat)
    this.lightConeGroup.add(cone)
    
    const edgeGeo = new THREE.BufferGeometry()
    const edgeVertices = new Float32Array([
      projX, projY, projZ + 0.02,
      projX - halfWidth, topY, screenZ,
      
      projX, projY, projZ + 0.02,
      projX + halfWidth, topY, screenZ,
      
      projX, projY, projZ + 0.02,
      projX - halfWidth, bottomY, screenZ,
      
      projX, projY, projZ + 0.02,
      projX + halfWidth, bottomY, screenZ,
    ])
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgeVertices, 3))
    const edgeMat = new THREE.LineBasicMaterial({ 
      color: 0x88ccff, 
      transparent: true, 
      opacity: 0.6 
    })
    const edges = new THREE.LineSegments(edgeGeo, edgeMat)
    this.lightConeGroup.add(edges)
    
    const screenFrameGeo = new THREE.PlaneGeometry(projection.imageWidth, projection.imageHeight)
    const screenFrameMat = new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    })
    const projectionFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat)
    projectionFrame.position.y = topY - projection.imageHeight / 2
    projectionFrame.position.z = screenZ + 0.005
    this.lightConeGroup.add(projectionFrame)
    
    const frameBorderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(projection.imageWidth, projection.imageHeight))
    const frameBorderMat = new THREE.LineBasicMaterial({ color: 0x66ccff })
    const frameBorder = new THREE.LineSegments(frameBorderGeo, frameBorderMat)
    frameBorder.position.y = topY - projection.imageHeight / 2
    frameBorder.position.z = screenZ + 0.006
    this.lightConeGroup.add(frameBorder)
  }
  
  private updatePerson() {
    this.clearGroup(this.personGroup)
    
    const personDistance = this.currentDistance * 0.6
    const eyeHeight = 1.2
    
    const headGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = eyeHeight + 0.05
    head.castShadow = true
    
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.8, 16)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5566aa })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = eyeHeight - 0.35
    body.castShadow = true
    
    const eyeGeo = new THREE.SphereGeometry(0.02, 8, 8)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
    leftEye.position.set(-0.04, eyeHeight + 0.08, 0.1)
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
    rightEye.position.set(0.04, eyeHeight + 0.08, 0.1)
    
    this.personGroup.add(head)
    this.personGroup.add(body)
    this.personGroup.add(leftEye)
    this.personGroup.add(rightEye)
    
    this.personGroup.position.z = this.roomDepth - personDistance
    
    const sightLineGeo = new THREE.BufferGeometry()
    const sightVertices = new Float32Array([
      0, eyeHeight + 0.05, 0.12,
      0, 1.1, personDistance
    ])
    sightLineGeo.setAttribute('position', new THREE.BufferAttribute(sightVertices, 3))
    const sightLineMat = new THREE.LineDashedMaterial({ 
      color: 0xffaa00, 
      dashSize: 0.1, 
      gapSize: 0.05,
      transparent: true,
      opacity: 0.7
    })
    const sightLine = new THREE.Line(sightLineGeo, sightLineMat)
    sightLine.computeLineDistances()
    this.personGroup.add(sightLine)
  }
  
  private bindEvents(container: HTMLElement) {
    container.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })
    
    window.addEventListener('mouseup', () => {
      this.isDragging = false
    })
    
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return
      
      const deltaX = e.clientX - this.previousMousePosition.x
      const deltaY = e.clientY - this.previousMousePosition.y
      
      this.cameraAngle += deltaX * 0.005
      this.cameraHeight = Math.max(0.5, Math.min(this.roomHeight + 1, this.cameraHeight - deltaY * 0.01))
      
      this.updateCameraPosition()
      this.previousMousePosition = { x: e.clientX, y: e.clientY }
    })
    
    container.addEventListener('wheel', (e) => {
      e.preventDefault()
      this.cameraDistance = Math.max(2, Math.min(15, this.cameraDistance + e.deltaY * 0.005))
      this.updateCameraPosition()
    }, { passive: false })
    
    window.addEventListener('resize', () => {
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      this.camera.aspect = container.clientWidth / container.clientHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(container.clientWidth, container.clientHeight)
    })
  }
  
  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate())
    
    if (this.currentProjector) {
      const time = Date.now() * 0.001
      const flicker = 0.15 + Math.sin(time * 2) * 0.02
      
      this.lightConeGroup.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          if (child.material.opacity < 0.2) {
            child.material.opacity = flicker
          }
        }
      })
    }
    
    this.renderer.render(this.scene, this.camera)
  }
  
  dispose() {
    cancelAnimationFrame(this.animationId)
    this.renderer.dispose()
  }
}
