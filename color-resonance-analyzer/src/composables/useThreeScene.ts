import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { ColorInfo } from '../utils/colorTheory'
import { createColorInfo } from '../utils/colorTheory'

export interface SceneObject {
  id: string
  name: string
  type: 'sofa' | 'pillow' | 'floor' | 'curtain'
  mesh: THREE.Mesh
  originalColor: string
  currentColor: string
}

export function useThreeScene(containerRef: { value: HTMLElement | null }) {
  const scene = shallowRef<THREE.Scene | null>(null)
  const camera = shallowRef<THREE.PerspectiveCamera | null>(null)
  const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
  const controls = shallowRef<OrbitControls | null>(null)
  
  const sofaObjects = ref<SceneObject[]>([])
  const pillowObjects = ref<SceneObject[]>([])
  const curtainObjects = ref<SceneObject[]>([])
  
  const selectedObject = ref<SceneObject | null>(null)
  const selectedPillowIndex = ref<number>(-1)
  const selectedCurtainIndex = ref<number>(-1)
  
  const ambientOcclusionIntensity = ref(0.5)
  
  let raycaster: THREE.Raycaster
  let mouse: THREE.Vector2
  let animationFrameId: number = 0
  let ambientLight: THREE.AmbientLight
  let directionalLight: THREE.DirectionalLight
  
  const defaultSofaColor = '#1e3a5f'
  const defaultPillowColors = ['#c9a66b', '#8b6f47', '#d4a855']
  const defaultCurtainColor = '#f5f0e8'
  
  function init() {
    if (!containerRef.value) return
    
    const container = containerRef.value
    const width = container.clientWidth
    const height = container.clientHeight
    
    scene.value = new THREE.Scene()
    scene.value.background = new THREE.Color(0xe8e4df)
    
    camera.value = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.value.position.set(0, 2.5, 6)
    
    renderer.value = new THREE.WebGLRenderer({ antialias: true })
    renderer.value.setSize(width, height)
    renderer.value.setPixelRatio(window.devicePixelRatio)
    renderer.value.shadowMap.enabled = true
    renderer.value.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.value.toneMapping = THREE.ACESFilmicToneMapping
    renderer.value.toneMappingExposure = 1.2
    
    container.appendChild(renderer.value.domElement)
    
    controls.value = new OrbitControls(camera.value, renderer.value.domElement)
    controls.value.enableDamping = true
    controls.value.dampingFactor = 0.05
    controls.value.minDistance = 3
    controls.value.maxDistance = 10
    controls.value.maxPolarAngle = Math.PI / 2
    controls.value.target.set(0, 0.8, 0)
    
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.value.add(ambientLight)
    
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 8, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -5
    directionalLight.shadow.camera.right = 5
    directionalLight.shadow.camera.top = 5
    directionalLight.shadow.camera.bottom = -5
    scene.value.add(directionalLight)
    
    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3)
    fillLight.position.set(-5, 3, -5)
    scene.value.add(fillLight)
    
    createFloor()
    createSofa()
    createCurtains()
    
    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()
    
    renderer.value.domElement.addEventListener('click', onMouseClick)
    
    window.addEventListener('resize', onWindowResize)
    
    animate()
  }
  
  function createFloor() {
    if (!scene.value) return
    
    const floorGeometry = new THREE.PlaneGeometry(20, 20)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4c8b8,
      roughness: 0.8,
      metalness: 0.1,
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.value.add(floor)
    
    const rugGeometry = new THREE.PlaneGeometry(4, 3)
    const rugMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a8b7a,
      roughness: 0.9,
      metalness: 0.05,
    })
    const rug = new THREE.Mesh(rugGeometry, rugMaterial)
    rug.rotation.x = -Math.PI / 2
    rug.position.y = 0.01
    rug.receiveShadow = true
    scene.value.add(rug)
  }
  
  function createSofa() {
    if (!scene.value) return
    
    const sofaGroup = new THREE.Group()
    
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(defaultSofaColor),
      roughness: 0.7,
      metalness: 0.1,
    })
    
    const seatGeometry = new THREE.BoxGeometry(2.5, 0.3, 1)
    const seat = new THREE.Mesh(seatGeometry, baseMaterial.clone())
    seat.position.y = 0.4
    seat.castShadow = true
    seat.receiveShadow = true
    sofaGroup.add(seat)
    
    const backGeometry = new THREE.BoxGeometry(2.5, 0.9, 0.25)
    const back = new THREE.Mesh(backGeometry, baseMaterial.clone())
    back.position.set(0, 1, -0.37)
    back.castShadow = true
    back.receiveShadow = true
    sofaGroup.add(back)
    
    const leftArmGeometry = new THREE.BoxGeometry(0.25, 0.6, 1)
    const leftArm = new THREE.Mesh(leftArmGeometry, baseMaterial.clone())
    leftArm.position.set(-1.125, 0.55, 0)
    leftArm.castShadow = true
    leftArm.receiveShadow = true
    sofaGroup.add(leftArm)
    
    const rightArmGeometry = new THREE.BoxGeometry(0.25, 0.6, 1)
    const rightArm = new THREE.Mesh(rightArmGeometry, baseMaterial.clone())
    rightArm.position.set(1.125, 0.55, 0)
    rightArm.castShadow = true
    rightArm.receiveShadow = true
    sofaGroup.add(rightArm)
    
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 16)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2914,
      roughness: 0.5,
      metalness: 0.2,
    })
    
    const legPositions = [
      [-1, 0.075, 0.4],
      [1, 0.075, 0.4],
      [-1, 0.075, -0.4],
      [1, 0.075, -0.4],
    ]
    
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(x, y, z)
      leg.castShadow = true
      sofaGroup.add(leg)
    })
    
    seat.userData.objectId = 'sofa-seat'
    seat.userData.objectType = 'sofa'
    back.userData.objectId = 'sofa-back'
    back.userData.objectType = 'sofa'
    leftArm.userData.objectId = 'sofa-left-arm'
    leftArm.userData.objectType = 'sofa'
    rightArm.userData.objectId = 'sofa-right-arm'
    rightArm.userData.objectType = 'sofa'
    
    scene.value.add(sofaGroup)
    
    sofaObjects.value = [
      { id: 'sofa-seat', name: '沙发坐垫', type: 'sofa', mesh: seat, originalColor: defaultSofaColor, currentColor: defaultSofaColor },
      { id: 'sofa-back', name: '沙发靠背', type: 'sofa', mesh: back, originalColor: defaultSofaColor, currentColor: defaultSofaColor },
      { id: 'sofa-left-arm', name: '左扶手', type: 'sofa', mesh: leftArm, originalColor: defaultSofaColor, currentColor: defaultSofaColor },
      { id: 'sofa-right-arm', name: '右扶手', type: 'sofa', mesh: rightArm, originalColor: defaultSofaColor, currentColor: defaultSofaColor },
    ]
    
    createPillows()
  }
  
  function createPillows() {
    if (!scene.value) return
    
    const pillowPositions = [
      { x: -0.7, z: -0.2, scale: 1 },
      { x: 0, z: -0.15, scale: 1.1 },
      { x: 0.7, z: -0.2, scale: 1 },
    ]
    
    pillowPositions.forEach((pos, index) => {
      const pillowGroup = new THREE.Group()
      
      const pillowGeometry = new THREE.BoxGeometry(0.5, 0.45, 0.15)
      const pillowMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(defaultPillowColors[index]),
        roughness: 0.65,
        metalness: 0.1,
      })
      
      const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial)
      pillow.position.y = 0.7
      pillow.rotation.y = (Math.random() - 0.5) * 0.3
      pillow.castShadow = true
      pillow.receiveShadow = true
      
      pillow.scale.setScalar(pos.scale)
      
      pillow.userData.objectId = `pillow-${index}`
      pillow.userData.objectType = 'pillow'
      pillow.userData.pillowIndex = index
      
      pillowGroup.add(pillow)
      pillowGroup.position.set(pos.x, 0, pos.z)
      
      scene.value!.add(pillowGroup)
      
      pillowObjects.value.push({
        id: `pillow-${index}`,
        name: `抱枕 ${index + 1}`,
        type: 'pillow',
        mesh: pillow,
        originalColor: defaultPillowColors[index],
        currentColor: defaultPillowColors[index],
      })
    })
  }
  
  function createCurtains() {
    if (!scene.value) return
    
    const curtainGeometry = new THREE.PlaneGeometry(1.5, 2.5)
    const curtainMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(defaultCurtainColor),
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    })
    
    const leftCurtain = new THREE.Mesh(curtainGeometry, curtainMaterial.clone())
    leftCurtain.position.set(-2.5, 1.5, -2)
    leftCurtain.rotation.y = Math.PI / 6
    leftCurtain.receiveShadow = true
    leftCurtain.castShadow = true
    leftCurtain.userData.objectId = 'curtain-left'
    leftCurtain.userData.objectType = 'curtain'
    leftCurtain.userData.curtainIndex = 0
    scene.value.add(leftCurtain)
    
    const rightCurtain = new THREE.Mesh(curtainGeometry, curtainMaterial.clone())
    rightCurtain.position.set(2.5, 1.5, -2)
    rightCurtain.rotation.y = -Math.PI / 6
    rightCurtain.receiveShadow = true
    rightCurtain.castShadow = true
    rightCurtain.userData.objectId = 'curtain-right'
    rightCurtain.userData.objectType = 'curtain'
    rightCurtain.userData.curtainIndex = 1
    scene.value.add(rightCurtain)
    
    curtainObjects.value = [
      { id: 'curtain-left', name: '左窗帘', type: 'curtain', mesh: leftCurtain, originalColor: defaultCurtainColor, currentColor: defaultCurtainColor },
      { id: 'curtain-right', name: '右窗帘', type: 'curtain', mesh: rightCurtain, originalColor: defaultCurtainColor, currentColor: defaultCurtainColor },
    ]
  }
  
  function onMouseClick(event: MouseEvent) {
    if (!containerRef.value || !scene.value || !camera.value) return
    
    const rect = containerRef.value.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    raycaster.setFromCamera(mouse, camera.value)
    
    const allMeshes: THREE.Mesh[] = [
      ...sofaObjects.value.map(o => o.mesh),
      ...pillowObjects.value.map(o => o.mesh),
      ...curtainObjects.value.map(o => o.mesh),
    ]
    
    const intersects = raycaster.intersectObjects(allMeshes)
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh
      const objectType = clickedMesh.userData.objectType
      
      if (objectType === 'sofa') {
        const sofaObj = sofaObjects.value.find(o => o.id === clickedMesh.userData.objectId)
        if (sofaObj) {
          selectedObject.value = sofaObj
          selectedPillowIndex.value = -1
          selectedCurtainIndex.value = -1
        }
      } else if (objectType === 'pillow') {
        const pillowIndex = clickedMesh.userData.pillowIndex
        const pillowObj = pillowObjects.value[pillowIndex]
        if (pillowObj) {
          selectedObject.value = pillowObj
          selectedPillowIndex.value = pillowIndex
          selectedCurtainIndex.value = -1
        }
      } else if (objectType === 'curtain') {
        const curtainIndex = clickedMesh.userData.curtainIndex
        const curtainObj = curtainObjects.value[curtainIndex]
        if (curtainObj) {
          selectedObject.value = curtainObj
          selectedCurtainIndex.value = curtainIndex
          selectedPillowIndex.value = -1
        }
      }
    }
  }
  
  function onWindowResize() {
    if (!containerRef.value || !camera.value || !renderer.value) return
    
    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight
    
    camera.value.aspect = width / height
    camera.value.updateProjectionMatrix()
    
    renderer.value.setSize(width, height)
  }
  
  function animate() {
    animationFrameId = requestAnimationFrame(animate)
    controls.value?.update()
    
    if (renderer.value && scene.value && camera.value) {
      renderer.value.render(scene.value, camera.value)
    }
  }
  
  function getSofaColorInfo(): ColorInfo {
    return createColorInfo(sofaObjects.value[0]?.currentColor || defaultSofaColor, '沙发主色')
  }
  
  function getCurtainColorInfo(index: number): ColorInfo | null {
    const curtain = curtainObjects.value[index]
    if (!curtain) return null
    return createColorInfo(curtain.currentColor, curtain.name)
  }
  
  function getPillowColorInfo(index: number): ColorInfo | null {
    const pillow = pillowObjects.value[index]
    if (!pillow) return null
    return createColorInfo(pillow.currentColor, pillow.name)
  }
  
  function setCurtainColor(index: number, hexColor: string) {
    const curtain = curtainObjects.value[index]
    if (!curtain) return
    
    const material = curtain.mesh.material as THREE.MeshStandardMaterial
    material.color.set(hexColor)
    curtain.currentColor = hexColor
  }
  
  function setAllCurtainColors(hexColor: string) {
    curtainObjects.value.forEach((_, index) => {
      setCurtainColor(index, hexColor)
    })
  }
  
  function setPillowColor(index: number, hexColor: string) {
    const pillow = pillowObjects.value[index]
    if (!pillow) return
    
    const material = pillow.mesh.material as THREE.MeshStandardMaterial
    material.color.set(hexColor)
    pillow.currentColor = hexColor
    
    updateAmbientOcclusion()
  }
  
  function setAllPillowColors(colors: string[]) {
    colors.forEach((color, index) => {
      if (index < pillowObjects.value.length) {
        setPillowColor(index, color)
      }
    })
  }
  
  function setSofaColor(hexColor: string) {
    sofaObjects.value.forEach(obj => {
      const material = obj.mesh.material as THREE.MeshStandardMaterial
      material.color.set(hexColor)
      obj.currentColor = hexColor
    })
  }
  
  function setAmbientOcclusionIntensity(intensity: number) {
    ambientOcclusionIntensity.value = intensity
    updateAmbientOcclusion()
  }
  
  function updateAmbientOcclusion() {
    const aoIntensity = ambientOcclusionIntensity.value
    
    pillowObjects.value.forEach((pillow, index) => {
      const material = pillow.mesh.material as THREE.MeshStandardMaterial
      
      const color = new THREE.Color(pillow.currentColor)
      const baseEmissive = color.clone().multiplyScalar(0.05)
      
      material.aoMapIntensity = aoIntensity
      material.emissive = baseEmissive
      material.emissiveIntensity = 0.2 + aoIntensity * 0.3
      
      material.needsUpdate = true
    })
    
    if (directionalLight) {
      directionalLight.intensity = 0.6 + (1 - aoIntensity) * 0.4
    }
    
    if (ambientLight) {
      ambientLight.intensity = 0.4 + aoIntensity * 0.4
    }
  }
  
  function resetToOriginal() {
    sofaObjects.value.forEach(obj => {
      const material = obj.mesh.material as THREE.MeshStandardMaterial
      material.color.set(obj.originalColor)
      obj.currentColor = obj.originalColor
    })
    
    pillowObjects.value.forEach(obj => {
      const material = obj.mesh.material as THREE.MeshStandardMaterial
      material.color.set(obj.originalColor)
      obj.currentColor = obj.originalColor
    })
    
    curtainObjects.value.forEach(obj => {
      const material = obj.mesh.material as THREE.MeshStandardMaterial
      material.color.set(obj.originalColor)
      obj.currentColor = obj.originalColor
    })
    
    selectedObject.value = null
    selectedPillowIndex.value = -1
    selectedCurtainIndex.value = -1
    ambientOcclusionIntensity.value = 0.5
    
    updateAmbientOcclusion()
  }
  
  function dispose() {
    cancelAnimationFrame(animationFrameId)
    
    if (renderer.value) {
      renderer.value.domElement.removeEventListener('click', onMouseClick)
      containerRef.value?.removeChild(renderer.value.domElement)
      renderer.value.dispose()
    }
    
    window.removeEventListener('resize', onWindowResize)
    
    scene.value?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }
  
  onMounted(() => {
    init()
    updateAmbientOcclusion()
  })
  
  onUnmounted(() => {
    dispose()
  })
  
  return {
    scene,
    camera,
    renderer,
    controls,
    sofaObjects,
    pillowObjects,
    curtainObjects,
    selectedObject,
    selectedPillowIndex,
    selectedCurtainIndex,
    ambientOcclusionIntensity,
    getSofaColorInfo,
    getPillowColorInfo,
    getCurtainColorInfo,
    setPillowColor,
    setAllPillowColors,
    setCurtainColor,
    setAllCurtainColors,
    setSofaColor,
    setAmbientOcclusionIntensity,
    resetToOriginal,
  }
}
