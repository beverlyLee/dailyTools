import * as THREE from 'three'

export type TrafficLightState = 'red' | 'green'

export class TrafficLight {
  id: string
  position: THREE.Vector3
  state: TrafficLightState
  group: THREE.Group
  redLight: THREE.Mesh
  greenLight: THREE.Mesh
  glowLight: THREE.Mesh

  constructor(id: string, position: THREE.Vector3) {
    this.id = id
    this.position = position.clone()
    this.state = 'green'

    this.group = new THREE.Group()
    this.group.position.copy(position)

    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8)
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.position.y = 0.15
    this.group.add(base)

    const poleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 5, 8)
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 })
    const pole = new THREE.Mesh(poleGeometry, poleMaterial)
    pole.position.y = 2.8
    this.group.add(pole)

    const armGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3)
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 })
    const arm = new THREE.Mesh(armGeometry, armMaterial)
    arm.position.set(0.8, 5, 0)
    this.group.add(arm)

    const boxGeometry = new THREE.BoxGeometry(1.5, 2.5, 1)
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 })
    const box = new THREE.Mesh(boxGeometry, boxMaterial)
    box.position.set(0.8, 6.2, 0)
    this.group.add(box)

    const redGeometry = new THREE.CircleGeometry(0.4, 20)
    const redMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    this.redLight = new THREE.Mesh(redGeometry, redMaterial)
    this.redLight.position.set(0.8, 7, 0.51)
    this.group.add(this.redLight)

    const greenGeometry = new THREE.CircleGeometry(0.4, 20)
    const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    this.greenLight = new THREE.Mesh(greenGeometry, greenMaterial)
    this.greenLight.position.set(0.8, 5.8, 0.51)
    this.group.add(this.greenLight)

    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3
    })
    this.glowLight = new THREE.Mesh(glowGeometry, glowMaterial)
    this.glowLight.position.set(0.8, 6.4, 0)
    this.glowLight.scale.set(1.5, 1, 1.5)
    this.group.add(this.glowLight)

    this.group.userData = { trafficLight: this }

    this.updateLightDisplay()
  }

  toggleState(): TrafficLightState {
    this.state = this.state === 'red' ? 'green' : 'red'
    this.updateLightDisplay()
    return this.state
  }

  updateLightDisplay(): void {
    const redMaterial = this.redLight.material as THREE.MeshBasicMaterial
    const greenMaterial = this.greenLight.material as THREE.MeshBasicMaterial
    const glowMaterial = this.glowLight.material as THREE.MeshBasicMaterial

    if (this.state === 'red') {
      redMaterial.color.setHex(0xff0000)
      greenMaterial.color.setHex(0x000000)
      glowMaterial.color.setHex(0xff0000)
      glowMaterial.opacity = 0.35
    } else {
      redMaterial.color.setHex(0x000000)
      greenMaterial.color.setHex(0x00ff00)
      glowMaterial.color.setHex(0x00ff00)
      glowMaterial.opacity = 0.35
    }
  }

  getGroup(): THREE.Group {
    return this.group
  }
}

export class TrafficLightManager {
  trafficLights: Map<string, TrafficLight>
  scene: THREE.Scene
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  camera: THREE.PerspectiveCamera
  onStateChangeCallback: ((id: string, state: TrafficLightState) => void) | null

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    onStateChangeCallback?: (id: string, state: TrafficLightState) => void
  ) {
    this.trafficLights = new Map()
    this.scene = scene
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.camera = camera
    this.onStateChangeCallback = onStateChangeCallback || null

    this.setupClickHandler()
  }

  setupClickHandler(): void {
    const canvas = document.querySelector('.three-layer canvas') as HTMLCanvasElement | null
    if (!canvas) {
      setTimeout(() => this.setupClickHandler(), 500)
      return
    }

    canvas.style.pointerEvents = 'auto'

    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      this.raycaster.setFromCamera(this.mouse, this.camera)

      const clickableObjects: THREE.Object3D[] = []
      this.trafficLights.forEach((light) => {
        clickableObjects.push(light.getGroup())
      })

      const intersects = this.raycaster.intersectObjects(clickableObjects, true)

      if (intersects.length > 0) {
        let object: THREE.Object3D = intersects[0].object
        while (object.parent && !object.userData.trafficLight) {
          object = object.parent
        }

        if (object.userData.trafficLight) {
          const trafficLight = object.userData.trafficLight as TrafficLight
          const newState = trafficLight.toggleState()

          if (this.onStateChangeCallback) {
            this.onStateChangeCallback(trafficLight.id, newState)
          }
        }
      }
    })
  }

  addTrafficLight(id: string, position: THREE.Vector3): TrafficLight {
    const light = new TrafficLight(id, position)
    this.trafficLights.set(id, light)
    this.scene.add(light.getGroup())
    return light
  }

  getTrafficLight(id: string): TrafficLight | undefined {
    return this.trafficLights.get(id)
  }

  getAllStates(): Map<string, TrafficLightState> {
    const states = new Map<string, TrafficLightState>()
    this.trafficLights.forEach((light, id) => {
      states.set(id, light.state)
    })
    return states
  }

  clear(): void {
    this.trafficLights.forEach((light) => {
      this.scene.remove(light.getGroup())
    })
    this.trafficLights.clear()
  }
}

export function createTrafficLightsForIntersections(
  manager: TrafficLightManager,
  intersections: { id: string; x: number; y: number }[]
): void {
  intersections.forEach((intersection) => {
    const id = `light_${intersection.id}`
    const position = new THREE.Vector3(intersection.x, 0, intersection.y)
    manager.addTrafficLight(id, position)
  })
}
