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
  furnitureGroup: THREE.Group
  
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
  private currentViewerDistance: number | null = null
  private lensHeight: number = 0.45
  private horizontalShift: number = 0
  private verticalShift: number = 0
  
  private canShelfMount: boolean = true
  private canCeilingMount: boolean = true
  private installationMode: 'shelf' | 'ceiling' = 'shelf'
  private ceilingMountGroup: THREE.Group | null = null
  
  private tvStand: THREE.Group | null = null
  private sofa: THREE.Group | null = null
  private ceilingWarning: THREE.Mesh | null = null
  private viewerGuideLine: THREE.Line | null = null
  private bestSeatLabel: THREE.Mesh | null = null
  
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
    this.furnitureGroup = new THREE.Group()
    
    this.scene.add(this.roomGroup)
    this.scene.add(this.projectorGroup)
    this.scene.add(this.screenGroup)
    this.scene.add(this.lightConeGroup)
    this.scene.add(this.personGroup)
    this.scene.add(this.furnitureGroup)
    
    this.setupLights()
    this.createRoom()
    this.createFurniture()
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
  }
  
  private createFurniture() {
    this.tvStand = this.createTVStand()
    this.sofa = this.createSofa()
    this.ceilingWarning = this.createCeilingWarning()
    this.viewerGuideLine = this.createViewerGuideLine()
    this.bestSeatLabel = this.createBestSeatLabel()
    
    this.furnitureGroup.add(this.tvStand)
    this.furnitureGroup.add(this.sofa)
    this.furnitureGroup.add(this.ceilingWarning)
    this.furnitureGroup.add(this.viewerGuideLine)
    this.furnitureGroup.add(this.bestSeatLabel)
  }
  
  private createViewerGuideLine(): THREE.Line {
    const points = [
      new THREE.Vector3(0, 0.6, 0),
      new THREE.Vector3(0, 1.1, 0)
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.4,
      linewidth: 2
    })
    const line = new THREE.Line(geometry, material)
    return line
  }
  
  private createBestSeatLabel(): THREE.Mesh {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 70
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(74, 158, 255, 0.85)'
    ctx.roundRect(0, 0, 300, 70, 12)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎬 最佳观看位', 150, 25)
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText('距离约 266 cm', 150, 50)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    const geometry = new THREE.PlaneGeometry(1.0, 0.25)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const label = new THREE.Mesh(geometry, material)
    label.position.y = 1.6
    return label
  }
  
  private createTVStand(): THREE.Group {
    const group = new THREE.Group()
    
    const standWidth = 1.2
    const standHeight = 0.4
    const standDepth = 0.4
    const standY = standHeight / 2
    
    const bodyGeo = new THREE.BoxGeometry(standWidth, standHeight, standDepth)
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x5a4a3a,
      roughness: 0.6,
      metalness: 0.1
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = standY
    body.castShadow = true
    body.receiveShadow = true
    body.userData.originalColor = 0x5a4a3a
    group.add(body)
    
    const topGeo = new THREE.BoxGeometry(standWidth + 0.05, 0.03, standDepth + 0.05)
    const topMat = new THREE.MeshStandardMaterial({ 
      color: 0x4a3a2a,
      roughness: 0.4,
      metalness: 0.2
    })
    const top = new THREE.Mesh(topGeo, topMat)
    top.position.y = standHeight + 0.015
    top.castShadow = true
    top.userData.originalColor = 0x4a3a2a
    group.add(top)
    
    const legGeo = new THREE.BoxGeometry(0.05, standHeight + 0.03, 0.05)
    const legMat = new THREE.MeshStandardMaterial({ 
      color: 0x3a2a1a,
      metalness: 0.3,
      roughness: 0.5
    })
    const legPositions = [
      [-standWidth / 2 + 0.03, standY, -standDepth / 2 + 0.03],
      [standWidth / 2 - 0.03, standY, -standDepth / 2 + 0.03],
      [-standWidth / 2 + 0.03, standY, standDepth / 2 - 0.03],
      [standWidth / 2 - 0.03, standY, standDepth / 2 - 0.03]
    ]
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat)
      leg.position.set(pos[0], pos[1], pos[2])
      leg.castShadow = true
      leg.userData.originalColor = 0x3a2a1a
      group.add(leg)
    })
    
    const drawerGeo = new THREE.BoxGeometry(standWidth * 0.4, 0.12, standDepth - 0.05)
    const drawerMat = new THREE.MeshStandardMaterial({ 
      color: 0x4a3a2a,
      roughness: 0.5,
      metalness: 0.1
    })
    const drawer = new THREE.Mesh(drawerGeo, drawerMat)
    drawer.position.set(0, standY, 0)
    drawer.userData.originalColor = 0x4a3a2a
    group.add(drawer)
    
    const handleGeo = new THREE.BoxGeometry(0.08, 0.015, 0.015)
    const handleMat = new THREE.MeshStandardMaterial({ 
      color: 0x999999,
      metalness: 0.8,
      roughness: 0.2
    })
    const handle = new THREE.Mesh(handleGeo, handleMat)
    handle.position.set(0, standY, standDepth / 2 - 0.04)
    handle.userData.originalColor = 0x999999
    group.add(handle)
    
    group.position.z = this.roomDepth - 0.15
    group.position.y = 0
    group.visible = true
    
    return group
  }
  
  private createSofa(): THREE.Group {
    const group = new THREE.Group()
    
    const sofaWidth = 1.8
    const seatHeight = 0.4
    const seatDepth = 0.6
    const backHeight = 0.5
    
    const seatGeo = new THREE.BoxGeometry(sofaWidth, seatHeight, seatDepth)
    const sofaMat = new THREE.MeshStandardMaterial({ 
      color: 0x7a6b5c,
      roughness: 0.9,
      metalness: 0
    })
    const seat = new THREE.Mesh(seatGeo, sofaMat)
    seat.position.y = seatHeight / 2
    seat.castShadow = true
    seat.receiveShadow = true
    group.add(seat)
    
    const backGeo = new THREE.BoxGeometry(sofaWidth, backHeight, 0.12)
    const back = new THREE.Mesh(backGeo, sofaMat)
    back.position.y = seatHeight + backHeight / 2
    back.position.z = -seatDepth / 2 + 0.06
    back.castShadow = true
    group.add(back)
    
    const armGeo = new THREE.BoxGeometry(0.15, backHeight, seatDepth)
    const leftArm = new THREE.Mesh(armGeo, sofaMat)
    leftArm.position.set(-sofaWidth / 2 + 0.075, seatHeight + backHeight / 2 - 0.05, 0)
    leftArm.castShadow = true
    group.add(leftArm)
    
    const rightArm = new THREE.Mesh(armGeo, sofaMat)
    rightArm.position.set(sofaWidth / 2 - 0.075, seatHeight + backHeight / 2 - 0.05, 0)
    rightArm.castShadow = true
    group.add(rightArm)
    
    const cushionGeo = new THREE.BoxGeometry(sofaWidth * 0.85, 0.08, seatDepth - 0.1)
    const cushionMat = new THREE.MeshStandardMaterial({ 
      color: 0x8a7b6c,
      roughness: 0.95,
      metalness: 0
    })
    const cushion = new THREE.Mesh(cushionGeo, cushionMat)
    cushion.position.y = seatHeight + 0.04
    cushion.position.z = 0.03
    cushion.castShadow = true
    group.add(cushion)
    
    const legGeo = new THREE.BoxGeometry(0.05, 0.08, 0.05)
    const legMat = new THREE.MeshStandardMaterial({ 
      color: 0x3a2a1a,
      metalness: 0.2,
      roughness: 0.6
    })
    const legPositions = [
      [-sofaWidth / 2 + 0.1, 0.04, seatDepth / 2 - 0.03],
      [sofaWidth / 2 - 0.1, 0.04, seatDepth / 2 - 0.03],
      [-sofaWidth / 2 + 0.1, 0.04, -seatDepth / 2 + 0.03],
      [sofaWidth / 2 - 0.1, 0.04, -seatDepth / 2 + 0.03]
    ]
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat)
      leg.position.set(pos[0], pos[1], pos[2])
      leg.castShadow = true
      group.add(leg)
    })
    
    group.position.z = this.roomDepth - 3.0
    group.visible = true
    
    return group
  }
  
  private createCeilingWarning(): THREE.Mesh {
    const warnGeo = new THREE.PlaneGeometry(1.5, 0.8)
    const warnMat = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    })
    const warning = new THREE.Mesh(warnGeo, warnMat)
    warning.rotation.x = Math.PI / 2
    warning.position.y = this.roomHeight - 0.01
    warning.position.z = this.roomDepth - 1.2
    return warning
  }
  
  private updateFurniture() {
    if (!this.tvStand) return
    
    this.tvStand.traverse(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (!this.canShelfMount) {
          child.material.color.setHex(0xaa3333)
          child.material.emissive = new THREE.Color(0x330000)
          child.material.emissiveIntensity = 0.3
        } else {
          const original = child.userData.originalColor
          if (original !== undefined) {
            child.material.color.setHex(original)
          }
          child.material.emissive = new THREE.Color(0x000000)
          child.material.emissiveIntensity = 0
        }
      }
    })
    
    if (this.ceilingWarning && this.ceilingWarning.material instanceof THREE.MeshBasicMaterial) {
      this.ceilingWarning.material.opacity = this.canCeilingMount ? 0 : 0.4
    }
    
    if (this.ceilingMountGroup && this.installationMode === 'ceiling') {
      this.ceilingMountGroup.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (!this.canCeilingMount) {
            child.material.color.setHex(0xaa3333)
            child.material.emissive = new THREE.Color(0x330000)
            child.material.emissiveIntensity = 0.3
          } else {
            const original = child.userData.originalColor
            if (original !== undefined) {
              child.material.color.setHex(original)
            }
            child.material.emissive = new THREE.Color(0x000000)
            child.material.emissiveIntensity = 0
          }
        }
      })
    }
    
    if (this.currentScreen && this.sofa) {
      const viewerDistance = this.currentViewerDistance ?? (this.currentScreen.width * 1.2)
      const minSofaZ = 0.3
      const maxSofaZ = this.roomDepth - this.currentDistance - 0.5
      const sofaZ = Math.max(minSofaZ, Math.min(maxSofaZ, this.roomDepth - viewerDistance - 0.3))
      this.sofa.position.z = sofaZ
      
      if (this.viewerGuideLine && this.viewerGuideLine.geometry) {
        const screenCenterY = 0.6 + this.currentScreen.height / 2
        const sofaEyeY = 1.2
        
        const positions = new Float32Array([
          0, sofaEyeY, this.sofa.position.z,
          0, screenCenterY, this.roomDepth - 0.05
        ])
        this.viewerGuideLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        this.viewerGuideLine.geometry.attributes.position.needsUpdate = true
        this.viewerGuideLine.geometry.computeBoundingSphere()
      }
      
      if (this.bestSeatLabel) {
        this.bestSeatLabel.position.x = 0
        this.bestSeatLabel.position.z = this.sofa.position.z
        this.bestSeatLabel.position.y = 1.6
        
        const canvas = document.createElement('canvas')
        canvas.width = 300
        canvas.height = 70
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'rgba(74, 158, 255, 0.85)'
        ctx.roundRect(0, 0, 300, 70, 12)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 18px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🎬 最佳观看位', 150, 25)
        ctx.font = '14px sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        const distCm = (viewerDistance * 100).toFixed(0)
        ctx.fillText(`距离约 ${distCm} cm`, 150, 50)
        
        const texture = new THREE.CanvasTexture(canvas)
        if (this.bestSeatLabel.material instanceof THREE.MeshBasicMaterial) {
          if (this.bestSeatLabel.material.map) {
            this.bestSeatLabel.material.map.dispose()
          }
          this.bestSeatLabel.material.map = texture
          this.bestSeatLabel.material.needsUpdate = true
        }
      }
    }
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
    this.updateFurniture()
  }
  
  setDistance(distance: number) {
    this.currentDistance = Math.max(0.5, Math.min(this.roomDepth - 0.5, distance))
    this.updateProjector()
    this.updateLightCone()
    this.updatePerson()
    this.updateFurniture()
  }
  
  setViewerDistance(viewerDist: number) {
    const maxDist = this.roomDepth - 0.5
    const minDist = 0.5
    this.currentViewerDistance = Math.max(minDist, Math.min(maxDist, viewerDist))
    this.updateFurniture()
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
  
  setVerticalShift(shift: number) {
    this.verticalShift = shift
    this.updateLightCone()
  }
  
  setInstallationState(canShelf: boolean, canCeiling: boolean) {
    this.canShelfMount = canShelf
    this.canCeilingMount = canCeiling
    this.updateFurniture()
  }
  
  setInstallationMode(mode: 'shelf' | 'ceiling') {
    this.installationMode = mode
    this.updateProjector()
    this.updateFurniture()
  }
  
  setShelfHeight(height: number) {
    this.lensHeight = height
    this.updateProjector()
    this.updateLightCone()
  }
  
  setCeilingHeight(height: number) {
    this.lensHeight = height
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
    
    if (this.ceilingMountGroup) {
      this.furnitureGroup.remove(this.ceilingMountGroup)
      this.ceilingMountGroup = null
    }
    
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
    
    if (this.installationMode === 'ceiling') {
      this.projectorGroup.rotation.x = Math.PI
      this.projectorGroup.rotation.y = Math.PI
    } else {
      this.projectorGroup.rotation.x = 0
      this.projectorGroup.rotation.y = 0
    }
    
    this.projectorGroup.position.x = this.horizontalShift
    this.projectorGroup.position.y = this.lensHeight
    this.projectorGroup.position.z = this.roomDepth - this.currentDistance
    
    if (this.installationMode === 'ceiling') {
      this.ceilingMountGroup = new THREE.Group()
      
      const mountPlateGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24)
      const mountPlateMat = new THREE.MeshStandardMaterial({
        color: this.canCeilingMount ? 0x444444 : 0xaa3333,
        metalness: 0.7,
        roughness: 0.3
      })
      const mountPlate = new THREE.Mesh(mountPlateGeo, mountPlateMat)
      mountPlate.position.y = this.roomHeight - 0.01
      mountPlate.userData.originalColor = 0x444444
      this.ceilingMountGroup.add(mountPlate)
      
      const poleHeight = this.roomHeight - this.lensHeight - 0.06
      const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, poleHeight, 16)
      const poleMat = new THREE.MeshStandardMaterial({
        color: this.canCeilingMount ? 0x555555 : 0xaa3333,
        metalness: 0.6,
        roughness: 0.4
      })
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.y = this.roomHeight - poleHeight / 2 - 0.02
      pole.userData.originalColor = 0x555555
      this.ceilingMountGroup.add(pole)
      
      const bracketGeo = new THREE.BoxGeometry(0.15, 0.04, 0.35)
      const bracketMat = new THREE.MeshStandardMaterial({
        color: this.canCeilingMount ? 0x333333 : 0xaa3333,
        metalness: 0.7,
        roughness: 0.3
      })
      const bracket = new THREE.Mesh(bracketGeo, bracketMat)
      bracket.position.y = this.lensHeight - 0.08
      bracket.position.z = -0.02
      bracket.userData.originalColor = 0x333333
      this.ceilingMountGroup.add(bracket)
      
      this.ceilingMountGroup.position.x = this.horizontalShift
      this.ceilingMountGroup.position.z = this.roomDepth - this.currentDistance
      
      this.furnitureGroup.add(this.ceilingMountGroup)
    }
    
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
    const labelGeo = new THREE.PlaneGeometry(0.8, 0.2)
    const labelMat = new THREE.MeshBasicMaterial({ 
      map: labelTex, 
      transparent: true,
      side: THREE.DoubleSide
    })
    const label = new THREE.Mesh(labelGeo, labelMat)
    label.position.set(0, 0.6 - 0.15, this.roomDepth + 0.02)
    this.screenGroup.add(label)
    
    const sizeLabelCanvas = document.createElement('canvas')
    sizeLabelCanvas.width = 300
    sizeLabelCanvas.height = 40
    const sizeCtx = sizeLabelCanvas.getContext('2d')!
    sizeCtx.fillStyle = 'rgba(0,0,0,0.6)'
    sizeCtx.fillRect(0, 0, 300, 40)
    sizeCtx.fillStyle = '#aaccff'
    sizeCtx.font = '14px sans-serif'
    sizeCtx.textAlign = 'center'
    sizeCtx.textBaseline = 'middle'
    const sizeText = `${(this.currentScreen.width * 100).toFixed(0)} × ${(this.currentScreen.height * 100).toFixed(0)} cm`
    sizeCtx.fillText(sizeText, 150, 20)
    
    const sizeLabelTex = new THREE.CanvasTexture(sizeLabelCanvas)
    const sizeLabelGeo = new THREE.PlaneGeometry(0.9, 0.12)
    const sizeLabelMat = new THREE.MeshBasicMaterial({ 
      map: sizeLabelTex, 
      transparent: true,
      side: THREE.DoubleSide
    })
    const sizeLabel = new THREE.Mesh(sizeLabelGeo, sizeLabelMat)
    sizeLabel.position.set(this.currentScreen.width / 2 - 0.45, 0.6 + this.currentScreen.height / 2, this.roomDepth + 0.02)
    this.screenGroup.add(sizeLabel)
  }
  
  private updateLightCone() {
    this.clearGroup(this.lightConeGroup)
    
    if (!this.currentProjector) return
    
    const projection = calculateProjection(this.currentProjector, this.currentDistance, this.currentZoom)
    
    const projX = this.horizontalShift
    const projY = this.lensHeight + this.verticalShift
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
    
    const viewerDistance = this.currentViewerDistance ?? (this.currentScreen ? this.currentScreen.width * 1.2 : this.currentDistance * 0.6)
    const personDistance = viewerDistance + 0.3
    const personZ = Math.max(0.5, Math.min(this.roomDepth - this.currentDistance - 0.7, this.roomDepth - personDistance))
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
    
    this.personGroup.position.z = personZ
    
    const screenCenterY = this.currentScreen ? 0.6 + this.currentScreen.height / 2 : 1.1
    
    const sightLineGeo = new THREE.BufferGeometry()
    const sightVertices = new Float32Array([
      0, eyeHeight + 0.05, 0.12,
      0, screenCenterY, personDistance
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
    
    if (this.ceilingWarning && !this.canCeilingMount && this.ceilingWarning.material instanceof THREE.MeshBasicMaterial) {
      const time = Date.now() * 0.003
      this.ceilingWarning.material.opacity = 0.3 + Math.sin(time * 2) * 0.15
    }
    
    if (this.bestSeatLabel) {
      this.bestSeatLabel.lookAt(this.camera.position)
    }
    
    this.renderer.render(this.scene, this.camera)
  }
  
  dispose() {
    cancelAnimationFrame(this.animationId)
    this.renderer.dispose()
  }
}
