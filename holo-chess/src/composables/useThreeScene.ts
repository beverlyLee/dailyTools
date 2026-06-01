import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export function useThreeScene(containerRef: Ref<HTMLElement | null>) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  const composer: { value: EffectComposer | null } = { value: null }
  const controls: { value: OrbitControls | null } = { value: null }
  const clock = new THREE.Clock()

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  const isReady = ref(false)
  let animFrameId = 0

  const animationCallbacks: ((delta: number, elapsed: number) => void)[] = []

  function onAnimate(cb: (delta: number, elapsed: number) => void) {
    animationCallbacks.push(cb)
  }

  function init() {
    if (!containerRef.value) return

    const container = containerRef.value
    const width = container.clientWidth
    const height = container.clientHeight

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ReinhardToneMapping
    renderer.toneMappingExposure = 1.5
    container.appendChild(renderer.domElement)

    camera.position.set(0, 8, 8)
    camera.lookAt(0, 0, 0)

    const orbitControls = new OrbitControls(camera, renderer.domElement)
    orbitControls.enableDamping = true
    orbitControls.dampingFactor = 0.05
    orbitControls.minDistance = 6
    orbitControls.maxDistance = 20
    orbitControls.maxPolarAngle = Math.PI / 2.2
    orbitControls.target.set(0, 0, 0)
    controls.value = orbitControls

    scene.background = new THREE.Color(0x0a0e1a)
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.02)

    const ambientLight = new THREE.AmbientLight(0x112244, 0.5)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0x00e5ff, 2, 30)
    pointLight1.position.set(5, 8, 5)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xff00ff, 1, 30)
    pointLight2.position.set(-5, 8, -5)
    scene.add(pointLight2)

    const pointLight3 = new THREE.PointLight(0x00e5ff, 1, 20)
    pointLight3.position.set(0, 3, 0)
    scene.add(pointLight3)

    const effectComposer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    effectComposer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.5,
      0.4,
      0.85
    )
    bloomPass.threshold = 0.1
    bloomPass.strength = 1.8
    bloomPass.radius = 0.8
    effectComposer.addPass(bloomPass)
    composer.value = effectComposer

    createStarfield()

    isReady.value = true
    animate()
  }

  function createStarfield() {
    const count = 500
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: 0x4488cc,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    })
    const points = new THREE.Points(geometry, material)
    scene.add(points)
  }

  function animate() {
    animFrameId = requestAnimationFrame(animate)
    const delta = clock.getDelta()
    const elapsed = clock.getElapsedTime()

    controls.value?.update()

    for (const cb of animationCallbacks) {
      cb(delta, elapsed)
    }

    if (composer.value) {
      composer.value.render()
    }
  }

  function handleResize() {
    if (!containerRef.value) return
    const width = containerRef.value.clientWidth
    const height = containerRef.value.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    composer.value?.setSize(width, height)
  }

  function getIntersection(objects: THREE.Object3D[], event: MouseEvent): THREE.Intersection | null {
    if (!containerRef.value) return null
    const rect = containerRef.value.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(objects, true)
    return intersects.length > 0 ? intersects[0] : null
  }

  onMounted(() => {
    init()
    window.addEventListener('resize', handleResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    cancelAnimationFrame(animFrameId)
    renderer.dispose()
    controls.value?.dispose()
  })

  return {
    scene,
    camera,
    renderer,
    isReady,
    onAnimate,
    getIntersection,
  }
}
